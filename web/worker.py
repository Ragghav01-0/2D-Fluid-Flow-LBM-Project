"""One simulation run in its own process.  Usage:  python web/worker.py <config.json>

The engine in ../src is not edited. Taichi bakes the Python globals a kernel reads in at compile time, so the settings
are written onto the ``Fields`` module BEFORE the kernel modules are imported (each does ``from Fields import *``).
Messages go to the server over a private copy of stdout (the pipe protocol in protocol.py); the real stdout is pointed at
stderr so Taichi's own banner cannot corrupt the stream.

Solver thread = this (main) thread: it never waits for the browser. Every ``1/fps`` seconds it downsamples the velocity
into a small buffer and drops it in a one-slot mailbox; a sender thread ships whatever is newest.
"""
from __future__ import annotations

import json
import os
import queue
import sys
import threading
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from web import physics, protocol  # noqa: E402  (after sys.path)

FRAME_DS = 2                 # 1024x256 -> 512x128
TELEMETRY_EVERY = 0.25       # seconds
CONV_INTERVAL = 250          # steps between convergence checks (same as the engine's `interval`)


class Out:
    """Thread-safe writer for the private pipe."""

    def __init__(self, fd: int):
        self.f = os.fdopen(fd, "wb", buffering=0)
        self.lock = threading.Lock()

    def send(self, data: bytes) -> bool:
        try:
            with self.lock:
                self.f.write(data)
            return True
        except (BrokenPipeError, OSError):
            return False

    def json(self, obj: dict) -> bool:
        return self.send(protocol.encode_json(obj))


class Mailbox:
    """Holds only the newest frame; an older unsent frame is overwritten, never queued."""

    def __init__(self):
        self.cv = threading.Condition()
        self.item = None
        self.closed = False

    def put(self, item: bytes) -> None:
        with self.cv:
            self.item = item
            self.cv.notify()

    def get(self) -> bytes | None:
        with self.cv:
            while self.item is None and not self.closed:
                self.cv.wait()
            item, self.item = self.item, None
            return item

    def close(self) -> None:
        with self.cv:
            self.closed = True
            self.cv.notify_all()


def apply_settings(F, cfg: dict) -> None:
    """Overwrite engine globals; must run before the kernel modules are imported."""
    tau = float(cfg["tau_s"])
    F.tau_s = tau
    F.tau_a = 0.5 + F.lambda_magic / (tau - 0.5)
    F.omega_s = 1.0 / F.tau_s
    F.omega_a = 1.0 / F.tau_a
    F.ux_target = float(cfg["ux_target"])
    F.lattice_viscosity = (1.0 / 3.0) * (tau - 0.5)


def main(cfg_path: str) -> int:
    cfg = json.loads(Path(cfg_path).read_text())
    out_fd = os.dup(1)
    os.dup2(2, 1)
    out = Out(out_fd)
    out.json({"type": "status", "state": "preparing", "step": 0})

    import Fields as F                      # ti.init(arch=ti.cpu) happens here
    apply_settings(F, cfg)
    ti = F.ti
    from Initialization import initial_fluid
    from Macro import macro_update
    from Swap import swap
    from Zou_he_inlet import zou_he_inlet
    from Zero_Gradient_Outlet import zero_gradient_outlet
    from TRT_and_Stream import trt_and_stream
    from Convergence_Checker import Convergence_Checker

    nx, ny = F.nx, F.ny
    assert (nx, ny) == (physics.NX, physics.NY), "engine grid changed; update web/physics.py"
    tau, ux = float(cfg["tau_s"]), float(cfg["ux_target"])
    clot = physics.Clot(**cfg["clot"])
    mask_np = physics.build_mask(clot)
    F.mask.from_numpy(mask_np)
    initial_fluid()

    # ---- frame extraction (new code, read-only on the engine's fields)
    fw, fh = nx // FRAME_DS, ny // FRAME_DS
    stage = ti.field(ti.f32, shape=(fh, fw))      # [row from the top, column]: already the browser's layout
    vmax_f = ti.field(ti.f32, shape=())
    col_sum = ti.field(ti.f32, shape=(2,))        # sum of rho over fluid nodes at the two pressure stations
    col_cnt = ti.field(ti.f32, shape=(2,))
    mask_f, u_f, rho_f = F.mask, F.u, F.rho
    st_in, st_out = 5, nx - 6

    @ti.kernel
    def extract():
        vmax_f[None] = 0.0
        for r, i in stage:
            j = fh - 1 - r
            s = 0.0
            n = 0.0
            for a in ti.static(range(FRAME_DS)):
                for b in ti.static(range(FRAME_DS)):
                    if mask_f[i * FRAME_DS + a, j * FRAME_DS + b] == 0:
                        s += u_f[i * FRAME_DS + a, j * FRAME_DS + b].norm()
                        n += 1.0
            if n > 0.0:
                stage[r, i] = s / n
                ti.atomic_max(vmax_f[None], s / n)
            else:
                stage[r, i] = ti.math.nan

    @ti.kernel
    def pressure_stations():
        col_sum[0] = 0.0
        col_sum[1] = 0.0
        col_cnt[0] = 0.0
        col_cnt[1] = 0.0
        for y in range(ny):
            if mask_f[st_in, y] == 0:
                ti.atomic_add(col_sum[0], rho_f[st_in, y])
                ti.atomic_add(col_cnt[0], 1.0)
            if mask_f[st_out, y] == 0:
                ti.atomic_add(col_sum[1], rho_f[st_out, y])
                ti.atomic_add(col_cnt[1], 1.0)

    def make_frame() -> bytes:
        extract()
        vmax = float(vmax_f[None])
        return protocol.encode_msg(protocol.KIND_FRAME,
                                   protocol.pack_frame(fw, fh, 1, 0.0, vmax if vmax > 0 else 1e-6,
                                                       stage.to_numpy().tobytes()))

    # ---- control channel
    cmds: queue.Queue = queue.Queue()

    def read_stdin():
        for line in sys.stdin:
            try:
                cmds.put(json.loads(line))
            except ValueError:
                pass
        cmds.put({"cmd": "stop"})                  # server went away

    threading.Thread(target=read_stdin, daemon=True).start()

    stream = bool(cfg.get("stream", True))
    box = Mailbox()

    def sender():
        while True:
            item = box.get()
            if item is None:
                return
            if not out.send(item):
                return

    sender_thread = threading.Thread(target=sender, daemon=True)
    if stream:
        sender_thread.start()

    state = {"spf": int(cfg.get("spf", 20)), "turbo": bool(cfg.get("turbo", False)), "fps": float(cfg.get("fps", 30)),
             "paused": False, "stop": False}
    stop = cfg.get("stop", {"mode": "converge"})
    mode = stop.get("mode", "converge")
    step_limit = int(stop.get("steps", 0)) if mode == "steps" else int(stop.get("cap", 600_000))
    tol = float(F.tolerance)

    nodes = nx * ny
    step = 0
    residual = 1.0
    mlups_ewma = None
    win_t, win_steps = time.perf_counter(), 0
    last_frame = last_tel = 0.0
    total_t0 = time.perf_counter()
    mlups_acc = mlups_n = 0.0
    reason = None
    failure = None
    running_sent = False
    converged = False
    warned = False

    def frame_interval() -> float:
        return (0.2 if state["turbo"] else 1.0 / max(state["fps"], 1.0))

    def telemetry(now_steps_rate: float | None) -> None:
        pressure_stations()
        cs, cn = col_sum.to_numpy(), col_cnt.to_numpy()
        dp = (cs[0] / max(cn[0], 1.0) - cs[1] / max(cn[1], 1.0)) * physics.CS2
        out.json({"type": "telemetry", "step": step, "ft": step * ux / nx, "residual": residual, "dp": float(dp),
                  "peak_u": float(vmax_f[None]) if stream else 0.0, "peak_wss": None, "mlups": now_steps_rate})

    while True:
        # --- commands
        while True:
            try:
                c = cmds.get_nowait()
            except queue.Empty:
                break
            k = c.get("cmd")
            if k == "stop":
                state["stop"] = True
            elif k == "pause":
                state["paused"] = True
                out.json({"type": "status", "state": "paused", "step": step})
            elif k == "resume":
                state["paused"] = False
                win_t, win_steps = time.perf_counter(), 0
                out.json({"type": "status", "state": "running", "step": step})
            elif k == "set":
                if "spf" in c:
                    state["spf"] = max(1, min(500, int(c["spf"])))
                if "turbo" in c:
                    state["turbo"] = bool(c["turbo"])
        if state["stop"]:
            reason = "stopped"
            break
        if state["paused"]:
            time.sleep(0.02)
            continue

        # --- advance the solver (same order as src/Simulator.py)
        n = state["spf"] * (10 if state["turbo"] else 1)
        n = min(n, max(1, step_limit - step)) if mode == "steps" else n
        done = 0
        for _ in range(n):
            done += 1
            trt_and_stream()
            zou_he_inlet()
            zero_gradient_outlet()
            swap()
            macro_update()
            step += 1
            F.step[None] = step
            if step % CONV_INTERVAL == 0:
                Convergence_Checker()
                residual = F.max_diff[None] / (F.max_vel[None] + 1e-14)
                if F.is_unstable[None] == 1:
                    break
                if mode == "converge" and residual < tol:
                    converged = True
                    break
        win_steps += done
        if not running_sent:
            out.json({"type": "status", "state": "running", "step": step})
            running_sent = True
            win_t, win_steps = time.perf_counter(), 0

        # --- failure detection (the engine stops on codes 2 and 4)
        code = int(F.error_code[None])
        if F.is_unstable[None] == 1 and not warned and code not in (2, 4):
            warned = True                           # engine codes 1 (Mach) / 3 (density): report, keep running
            out.json({"type": "warning", "code": code, "step": step, "x": int(F.err_x[None]), "y": int(F.err_y[None]),
                      "rho": float(F.err_rho[None]), "u2": float(F.err_u2[None])})
        if code in (2, 4):
            failure = {"code": code, "step": step, "x": int(F.err_x[None]), "y": int(F.err_y[None]),
                       "rho": float(F.err_rho[None]), "u2": float(F.err_u2[None]),
                       "ux": float(F.err_ux[None]), "uy": float(F.err_uy[None]),
                       "f": [float(v) for v in F.err_f_pop.to_numpy()]}
            reason = "failed"
            break

        now = time.perf_counter()
        if stream and now - last_frame >= frame_interval():
            box.put(make_frame())
            last_frame = now
        if now - last_tel >= TELEMETRY_EVERY:
            rate = nodes * win_steps / ((now - win_t) * 1e6) if now > win_t and win_steps else None
            if rate:
                mlups_acc += rate
                mlups_n += 1
            telemetry(rate)
            last_tel = now
            win_t, win_steps = now, 0

        # --- stop conditions
        if converged:
            reason = "converged"
            break
        if step >= step_limit:
            reason = "steps" if mode == "steps" else "cap"
            break

    elapsed = time.perf_counter() - total_t0
    box.close()
    if stream and sender_thread.is_alive():
        sender_thread.join(timeout=2)

    if reason == "failed":
        out.json({"type": "failed", "error": failure, "step": step})
        return 1

    # --- save outputs and report
    u_np = F.u.to_numpy()
    rho_np = F.rho.to_numpy()
    baseline = cfg.get("baseline_dp") or physics.default_baseline_for(tau, ux)
    metrics = physics.compute_metrics(u_np, rho_np, mask_np, tau, ux, baseline)
    run_dir = Path(cfg["run_dir"])
    run_dir.mkdir(parents=True, exist_ok=True)
    col = physics.profile_column()
    np.savetxt(run_dir / "profile_ux.csv", np.round(u_np[col, :, 0], 5), delimiter=",", fmt="%f")
    np.savez_compressed(run_dir / "fields.npz", u=u_np, rho=rho_np, mask=mask_np)
    extract()
    (run_dir / "final_frame.bin").write_bytes(make_frame()[5:])      # strip the pipe header: browser-format frame
    summary = {"reason": reason, "steps": step, "flow_throughs": step * ux / nx, "residual": residual,
               "elapsed_s": elapsed, "avg_mlups": (mlups_acc / mlups_n) if mlups_n else None,
               "overall_mlups": nodes * step / (elapsed * 1e6) if elapsed > 0 else None, **metrics}
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    out.json({"type": "finished", "summary": summary})
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
