"""A run at non-default settings is re-scored against a measured clear-vessel baseline (adds ~1 min).

    python web/tests/test_baseline.py
"""
from __future__ import annotations

import asyncio
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import websockets

ROOT = Path(__file__).resolve().parents[2]
PORT = 8792


async def main() -> None:
    cache = ROOT / "web" / "runs" / "baselines.json"
    cache.unlink(missing_ok=True)
    srv = subprocess.Popen([sys.executable, "-m", "web", "--no-browser", "--port", str(PORT)], cwd=ROOT,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=1); break
            except OSError:
                time.sleep(0.2)
        async with websockets.connect(f"ws://127.0.0.1:{PORT}/") as ws:
            await ws.recv()
            await ws.send(json.dumps({"type": "run", "settings": {"severity": 0.4, "tau_s": 1.0, "ux_target": 0.04,
                                                                   "stop": {"mode": "steps", "steps": 800}}}))
            first = updated = None
            states = []
            while updated is None:
                raw = await asyncio.wait_for(ws.recv(), 400)
                if isinstance(raw, bytes):
                    continue
                m = json.loads(raw)
                if m["type"] == "state":
                    states.append(m["state"])
                if m["type"] == "failed":
                    raise AssertionError(m)
                if m["type"] == "finished":
                    first = m["summary"]
                if m["type"] == "summary_update":
                    updated = m["summary"]
            assert first["effort_basis"] == "formula", first["effort_basis"]
            assert "measuring" in states, states
            assert updated["effort_basis"] == "measured" and updated["dp_baseline"] > 0
            assert json.loads(cache.read_text())["1.0000_0.0400"] == updated["dp_baseline"], "baseline not cached"
            print(f"baseline OK: formula said {first['effort_ratio']:.1f}x, measured says {updated['effort_ratio']:.1f}x")
    finally:
        srv.terminate(); srv.wait(timeout=10)


asyncio.run(main())
