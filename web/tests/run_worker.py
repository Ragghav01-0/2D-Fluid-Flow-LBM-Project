"""Helper: run the worker as the server will, collect its messages. Used by the tests and by hand."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from web import protocol  # noqa: E402


def run(cfg: dict, timeout: float = 900, python: str | None = None):
    """Returns (messages, frames, stderr_tail, returncode)."""
    python = python or sys.executable
    run_dir = cfg.setdefault("run_dir", tempfile.mkdtemp(prefix="lbmrun_"))
    cfgp = Path(run_dir).with_suffix(".json")
    cfgp.write_text(json.dumps(cfg))
    p = subprocess.Popen([python, str(ROOT / "web" / "worker.py"), str(cfgp)], stdin=subprocess.PIPE,
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    msgs, frames = [], 0
    while True:
        m = protocol.read_msg(p.stdout)
        if m is None:
            break
        kind, payload = m
        if kind == protocol.KIND_FRAME:
            frames += 1
        else:
            msgs.append(json.loads(payload))
    p.wait(timeout=timeout)
    err = p.stderr.read().decode(errors="replace")[-1500:]
    return msgs, frames, err, p.returncode


if __name__ == "__main__":
    cfg = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    base = {"tau_s": 0.884, "ux_target": 0.05, "clot": {"severity": 0.5}, "stop": {"mode": "steps", "steps": 2000}}
    base.update(cfg)
    msgs, frames, err, rc = run(base)
    for m in msgs[-4:]:
        print(m)
    print("frames", frames, "rc", rc)
    if rc:
        print(err)
