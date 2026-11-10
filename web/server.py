"""Local server: serves web_v3 and relays one solver run to the browser over a WebSocket.

    python -m web            # opens the browser
    python -m web --gui      # the engine's own ti.GUI window instead (src/Simulator.py, unchanged)

One port, 127.0.0.1 only. One run at a time; each run is a fresh worker process (web/worker.py).
"""
from __future__ import annotations

import argparse
import asyncio
import io
import json
import mimetypes
import shutil
import subprocess
import sys
import time
import webbrowser
import zipfile
from pathlib import Path

import numpy as np
import psutil
from websockets.asyncio.server import serve
from websockets.datastructures import Headers
from websockets.exceptions import ConnectionClosed
from websockets.http11 import Response

from . import physics, protocol, system

ROOT = Path(__file__).resolve().parent.parent
STATIC = Path(__file__).resolve().parent.parent / "web_v3"
SPLASH = Path(__file__).resolve().parent / "splash.sh"
RUNS = Path(__file__).resolve().parent / "runs"
KEEP_RUNS = 3
BASELINES = RUNS / "baselines.json"       # measured clear-vessel pressure drops, keyed by tau and inlet speed
BUSY = ("preparing", "running", "paused", "measuring")
DOWNLOADABLE = ("summary.json", "settings.json", "profile_ux.csv", "fields.npz", "final_frame.bin")
SYSTEM_EVERY = 2.0

#: Flow-throughs for the layman run lengths (a flow-through = the liquid crossing the whole vessel once)
LENGTHS = {"quick": 1.0, "medium": 2.5, "long": 5.0}


def explain_failure(err: dict, settings: dict) -> dict:
    """Plain-language message, a gentler setting to try, and the engine's raw report for the Expert panel."""
    code = err.get("code")
    s = settings
    clot = dict(s["clot"])
    clot["severity"] = round(max(0.0, min(clot["severity"] - 0.15, 0.6)), 2)
    suggested = {**s, "clot": clot, "ux_target": min(s["ux_target"], physics.DEFAULT_UX),
                 "tau_s": max(s["tau_s"], physics.DEFAULT_TAU)}
    why = {4: "The numbers inside the simulation stopped making sense (they became invalid).",
           2: "Part of the simulation went out of range and could not recover."}.get(code, "The simulation became unstable.")
    return {"title": "The simulation became unstable", "message": why + " This usually means the vessel is blocked too much "
            "or the blood is moving too fast for the model. Try a gentler setting.", "suggested": suggested,
            "technical": err, "code": code}


class Run:
    def __init__(self, run_id: str, settings: dict, run_dir: Path):
        self.id, self.settings, self.dir = run_id, settings, run_dir
        self.proc: asyncio.subprocess.Process | None = None
        self.state = "preparing"
        self.t0 = time.time()
        self.step = 0


class App:
    def __init__(self, static: Path = STATIC):
        self.static = static
        self.clients: set = set()
        self.run: Run | None = None
        self.cooldown = system.Cooldown()
        self.health = system.read()
        self.last_summary: dict | None = None
        RUNS.mkdir(exist_ok=True)

    # ---------------------------------------------------------------- clear-vessel baselines
    def known_baseline(self, tau: float, ux: float) -> float | None:
        d = physics.default_baseline_for(tau, ux)
        if d:
            return d
        try:
            return json.loads(BASELINES.read_text()).get(physics.baseline_key(tau, ux))
        except (OSError, ValueError):
            return None

    def save_baseline(self, tau: float, ux: float, dp: float) -> None:
        try:
            cur = json.loads(BASELINES.read_text())
        except (OSError, ValueError):
            cur = {}
        cur[physics.baseline_key(tau, ux)] = dp
        BASELINES.write_text(json.dumps(cur, indent=1))

    async def measure_baseline(self, run: Run, elapsed: float) -> None:
        """A clear-vessel run for this tau and speed, then re-score the finished run against it."""
        tau, ux = run.settings["tau_s"], run.settings["ux_target"]
        run.state = "measuring"
        self.tell(self.state_msg())
        tmp = RUNS / "_baseline"
        shutil.rmtree(tmp, ignore_errors=True)
        tmp.mkdir(parents=True)
        cfg = {"tau_s": tau, "ux_target": ux, "clot": {"severity": 0.0}, "stop": {"mode": "converge", "cap": 200_000},
               "stream": False, "run_dir": str(tmp)}
        (tmp / "config.json").write_text(json.dumps(cfg))
        proc = await asyncio.create_subprocess_exec(sys.executable, str(Path(__file__).with_name("worker.py")),
                                                    str(tmp / "config.json"), stdin=asyncio.subprocess.PIPE,
                                                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        run.proc = proc
        dp = None
        try:
            while True:
                head = await proc.stdout.readexactly(protocol._HEAD.size)
                kind, n = protocol._HEAD.unpack(head)
                payload = await proc.stdout.readexactly(n) if n else b""
                if kind == protocol.KIND_JSON:
                    m = json.loads(payload)
                    if m.get("type") == "finished":
                        dp = m["summary"]["dp"]
        except (asyncio.IncompleteReadError, ConnectionResetError):
            pass
        await proc.wait()
        shutil.rmtree(tmp, ignore_errors=True)
        if dp and dp > 0:
            self.save_baseline(tau, ux, dp)
            f = np.load(run.dir / "fields.npz")
            sj = run.dir / "summary.json"
            summary = json.loads(sj.read_text())
            summary.update(physics.compute_metrics(f["u"], f["rho"], f["mask"], tau, ux, dp))
            sj.write_text(json.dumps(summary, indent=2))
            self.last_summary = summary
            self.tell({"type": "summary_update", "run_id": run.id, "summary": summary, "history": self.history()})
        run.state = "finished"
        self.cooldown.start(elapsed + 60)              # the extra run heated the machine too
        self.tell(self.state_msg())
        self.tell({"type": "system", "system": self.health.asdict(), "cooldown": self.cooldown.update(self.health)})

    # ---------------------------------------------------------------- history
    def history(self) -> list[dict]:
        out = []
        for d in sorted(RUNS.iterdir(), reverse=True):
            sj, st = d / "summary.json", d / "settings.json"
            if d.is_dir() and not d.name.startswith("_") and sj.exists() and st.exists():
                out.append({"id": d.name, "settings": json.loads(st.read_text()), "summary": json.loads(sj.read_text())})
        return out

    def prune(self) -> None:
        dirs = [d for d in sorted(RUNS.iterdir(), reverse=True) if d.is_dir() and not d.name.startswith("_")]
        keep = [d for d in dirs if (d / "summary.json").exists()][:KEEP_RUNS]
        for d in dirs:
            if d not in keep and (self.run is None or d != self.run.dir):
                shutil.rmtree(d, ignore_errors=True)

    # ---------------------------------------------------------------- broadcasting
    def tell(self, obj: dict) -> None:
        data = json.dumps(obj, separators=(",", ":"))
        for c in list(self.clients):
            asyncio.ensure_future(self._safe_send(c, data))

    def tell_bytes(self, data: bytes) -> None:
        for c in list(self.clients):
            # latest-wins at the socket too: a client that is behind simply misses frames
            tr = getattr(c, "transport", None)
            if tr is not None and tr.get_write_buffer_size() > 1_000_000:
                continue
            asyncio.ensure_future(self._safe_send(c, data))

    @staticmethod
    async def _safe_send(c, data) -> None:
        try:
            await c.send(data)
        except ConnectionClosed:
            pass

    def hello(self) -> dict:
        return {"type": "hello", "limits": {"severity": physics.SEVERITY_RANGE, "tau": physics.TAU_RANGE,
                                            "ux": physics.UX_RANGE, "length": physics.LENGTH_RANGE,
                                            "throat_speed_max": physics.THROAT_SPEED_MAX, "throat_speed_warn": physics.THROAT_SPEED_WARN},
                "defaults": {"tau_s": physics.DEFAULT_TAU, "ux_target": physics.DEFAULT_UX,
                             "length": physics.DEFAULT_LENGTH, "location": physics.DEFAULT_LOCATION},
                "grid": {"nx": physics.NX, "ny": physics.NY}, "arch": "CPU", "cores": psutil.cpu_count(logical=True),
                "lengths": LENGTHS, "flow_through_steps": physics.flow_through_steps(physics.DEFAULT_UX),
                "history": self.history(), "state": self.state_msg(), "system": self.health.asdict(),
                "cooldown": self.cooldown.update(self.health)}

    def state_msg(self) -> dict:
        r = self.run
        return {"type": "state", "state": r.state if r else "idle", "run_id": r.id if r else None,
                "settings": r.settings if r else None, "step": r.step if r else 0}

    # ---------------------------------------------------------------- run control
    def build_settings(self, raw: dict) -> tuple[dict | None, list[str]]:
        try:
            clot = physics.Clot(severity=float(raw.get("severity", 0.5)), symmetric=bool(raw.get("symmetric", False)),
                                location=float(raw.get("location", physics.DEFAULT_LOCATION)),
                                length=int(raw.get("length", physics.DEFAULT_LENGTH)),
                                lopsided=float(raw.get("lopsided", -1.0)))
            tau = float(raw.get("tau_s", physics.DEFAULT_TAU))
            ux = float(raw.get("ux_target", physics.DEFAULT_UX))
        except (TypeError, ValueError):
            return None, ["Some settings are not valid numbers."]
        problems = physics.validate(tau, ux, clot)
        stop = raw.get("stop") or {"mode": "converge"}
        mode = stop.get("mode", "converge")
        if mode not in ("converge", "steps", "manual"):
            problems.append("Unknown run length.")
        s = {"tau_s": tau, "ux_target": ux, "clot": clot.__dict__.copy(), "spf": int(raw.get("spf", 20)),
             "turbo": bool(raw.get("turbo", False))}
        if mode == "steps":
            n = int(stop.get("steps") or round(LENGTHS.get(stop.get("size", "medium"), 2.5) * physics.flow_through_steps(ux)))
            s["stop"] = {"mode": "steps", "steps": max(500, min(n, 2_000_000)), "size": stop.get("size")}
        elif mode == "manual":
            s["stop"] = {"mode": "manual", "cap": 2_000_000}
        else:
            s["stop"] = {"mode": "converge", "cap": 600_000}
        return (None if problems else s), problems

    async def start_run(self, raw: dict) -> None:
        if self.run and self.run.state in BUSY:
            return self.tell({"type": "rejected", "reason": "busy", "message": "A run is already going."})
        cd = self.cooldown.update(self.health)
        if cd["active"]:
            return self.tell({"type": "rejected", "reason": "cooldown", "cooldown": cd,
                              "message": "The computer is resting between runs."})
        settings, problems = self.build_settings(raw)
        if problems:
            return self.tell({"type": "rejected", "reason": "invalid", "problems": problems,
                              "message": "Some settings are outside the allowed range."})
        base = time.strftime("%Y%m%d-%H%M%S")
        run_id, n = base, 1
        while (RUNS / run_id).exists():                  # two runs in the same second, or a leftover folder: never collide
            n += 1
            run_id = f"{base}-{n}"
        run_dir = RUNS / run_id
        run_dir.mkdir(parents=True)
        (run_dir / "settings.json").write_text(json.dumps(settings, indent=2))
        cfg = {**settings, "run_dir": str(run_dir), "stream": True, "fps": 30,
               "baseline_dp": self.known_baseline(settings["tau_s"], settings["ux_target"])}
        cfgp = run_dir / "config.json"
        cfgp.write_text(json.dumps(cfg))
        self.run = Run(run_id, settings, run_dir)
        self.last_summary = None
        log = open(run_dir / "worker.log", "wb")
        self.run.proc = await asyncio.create_subprocess_exec(
            sys.executable, str(Path(__file__).with_name("worker.py")), str(cfgp),
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=log)
        self.tell(self.state_msg())
        asyncio.ensure_future(self.pump(self.run))

    async def pump(self, run: Run) -> None:
        """Relay the worker's messages until it exits, then settle the run's final state."""
        r = run.proc.stdout
        finished = failed = None
        try:
            while True:
                head = await r.readexactly(protocol._HEAD.size)
                kind, n = protocol._HEAD.unpack(head)
                payload = await r.readexactly(n) if n else b""
                if kind == protocol.KIND_FRAME:
                    self.tell_bytes(payload)
                    continue
                msg = json.loads(payload)
                t = msg.get("type")
                if t == "status":
                    run.state = msg["state"]
                    run.step = msg.get("step", run.step)
                    self.tell(self.state_msg())
                    continue
                if t == "telemetry":
                    run.step = msg["step"]
                if t == "finished":
                    finished = msg
                    continue
                if t == "failed":
                    failed = msg
                    continue
                self.tell(msg)
        except (asyncio.IncompleteReadError, ConnectionResetError):
            pass
        await run.proc.wait()
        elapsed = time.time() - run.t0
        if failed:
            run.state = "failed"
            info = explain_failure(failed["error"], run.settings)
            shutil.rmtree(run.dir, ignore_errors=True)         # failed runs never reach History
            self.tell({"type": "failed", **info})
            if self.health.level != "ok":
                self.cooldown.start(elapsed)
        elif finished:
            run.state = "finished"
            self.last_summary = finished["summary"]
            self.prune()
            self.cooldown.start(elapsed)
            self.tell({"type": "finished", "run_id": run.id, "summary": finished["summary"], "settings": run.settings,
                       "history": self.history(), "cooldown": self.cooldown.update(self.health)})
            if finished["summary"].get("effort_basis") != "measured" and finished["summary"].get("reason") != "stopped":
                self.tell(self.state_msg())
                await self.measure_baseline(run, elapsed)
                return
        else:
            run.state = "failed"
            tail = (run.dir / "worker.log").read_text(errors="replace")[-1500:] if (run.dir / "worker.log").exists() else ""
            self.tell({"type": "failed", "title": "The simulation stopped unexpectedly",
                       "message": "The solver closed without finishing. Please try again.", "technical": {"log": tail},
                       "suggested": None, "code": None})
        self.tell(self.state_msg())

    def command(self, msg: dict) -> None:
        r = self.run
        if not r or not r.proc or r.proc.returncode is not None:
            return
        cmd = msg.get("cmd")
        if cmd in ("pause", "resume", "stop"):
            payload = {"cmd": cmd}
        elif cmd == "set":
            payload = {"cmd": "set", **{k: msg[k] for k in ("spf", "turbo") if k in msg}}
        else:
            return
        try:
            r.proc.stdin.write((json.dumps(payload) + "\n").encode())
        except (BrokenPipeError, ConnectionResetError):
            pass

    # ---------------------------------------------------------------- connections
    async def ws_handler(self, ws) -> None:
        self.clients.add(ws)
        try:
            await ws.send(json.dumps(self.hello()))
            async for raw in ws:
                try:
                    msg = json.loads(raw)
                except ValueError:
                    continue
                t = msg.get("type")
                if t == "run":
                    try:
                        await self.start_run(msg.get("settings") or {})
                    except Exception as e:                  # a run that cannot start must say so, not leave the page waiting
                        self.run = None
                        self.tell({"type": "rejected", "reason": "error", "message": f"The run could not start: {e}"})
                elif t == "command":
                    self.command(msg)
                elif t == "delete_run":
                    d = RUNS / str(msg.get("id", ""))
                    if d.parent == RUNS and d.is_dir() and not (self.run and d == self.run.dir):
                        shutil.rmtree(d, ignore_errors=True)
                        self.tell({"type": "history", "history": self.history()})
        except ConnectionClosed:
            pass
        finally:
            self.clients.discard(ws)

    async def monitor(self) -> None:
        while True:
            await asyncio.sleep(SYSTEM_EVERY)
            self.health = await asyncio.get_running_loop().run_in_executor(None, system.read, 0.5)
            self.tell({"type": "system", "system": self.health.asdict(), "cooldown": self.cooldown.update(self.health)})

    # ---------------------------------------------------------------- plain HTTP (static files, downloads)
    def http(self, connection, request):
        if request.headers.get("Upgrade", "").lower() == "websocket":
            return None
        path = request.path.split("?")[0]
        if path.startswith("/download/"):
            return self.download(path)
        rel = "index.html" if path in ("/", "") else path.lstrip("/")
        root = self.static.resolve()
        f = (self.static / rel).resolve()
        if root not in f.parents or not f.is_file():
            return Response(404, "Not Found", Headers([("Content-Type", "text/plain")]), b"not found")
        ctype = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        if f.suffix == ".mjs":
            ctype = "text/javascript"
        return Response(200, "OK", Headers([("Content-Type", ctype), ("Cache-Control", "no-cache")]), f.read_bytes())

    def download(self, path: str):
        parts = path.split("/")                    # /download/<run_id>[/<file>]
        d = RUNS / parts[2] if len(parts) > 2 else None
        if d is None or d.parent != RUNS or not d.is_dir():
            return Response(404, "Not Found", Headers([("Content-Type", "text/plain")]), b"no such run")
        if len(parts) > 3:
            name = parts[3]
            if name not in DOWNLOADABLE or not (d / name).is_file():
                return Response(404, "Not Found", Headers([("Content-Type", "text/plain")]), b"no such file")
            return Response(200, "OK", Headers([("Content-Type", mimetypes.guess_type(name)[0] or "application/octet-stream"),
                                                ("Content-Disposition", f'attachment; filename="{self.file_label(d, name)}"')]),
                            (d / name).read_bytes())
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            for name in DOWNLOADABLE:
                if (d / name).is_file():
                    z.write(d / name, self.file_label(d, name))
        return Response(200, "OK", Headers([("Content-Type", "application/zip"),
                                            ("Content-Disposition", f'attachment; filename="{self.file_label(d, "run.zip")}"')]),
                        buf.getvalue())

    @staticmethod
    def file_label(d: Path, name: str) -> str:
        """lbm_<date>_sev50_tau0.884_ux0.050_<file>: results never overwrite each other."""
        s = json.loads((d / "settings.json").read_text())
        stem = f"lbm_{d.name}_sev{round(s['clot']['severity'] * 100)}_tau{s['tau_s']:g}_ux{s['ux_target']:g}"
        return f"{stem}_{name}" if name != "run.zip" else f"{stem}.zip"


async def amain(port: int, open_browser: bool, static: Path = STATIC) -> None:
    app = App(static)
    async with serve(app.ws_handler, "127.0.0.1", port, process_request=app.http, max_size=2**20,
                     compression=None) as server:
        asyncio.ensure_future(app.monitor())
        url = f"http://127.0.0.1:{port}/"
        print(f"LBM web UI running at {url}   (Ctrl+C to quit)", flush=True)
        if open_browser:
            webbrowser.open(url)
        await server.serve_forever()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m web")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--static", type=Path, default=STATIC, help="front end folder to serve (default: web_v3)")
    ap.add_argument("--no-anim", action="store_true", help="skip the start-up animation")
    ap.add_argument("--gui", action="store_true", help="run the engine's own ti.GUI window instead of the web UI")
    a = ap.parse_args(argv)
    if a.gui:
        return subprocess.call([sys.executable, "Simulator.py"], cwd=ROOT / "src")
    if not a.no_anim and sys.stdout.isatty() and SPLASH.is_file():
        try:
            subprocess.call(["bash", str(SPLASH)])
        except KeyboardInterrupt:
            return 130
    try:
        asyncio.run(amain(a.port, not a.no_browser, a.static.resolve()))
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
