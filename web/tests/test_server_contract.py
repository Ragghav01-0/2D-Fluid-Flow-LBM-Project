"""Contract check: a real WebSocket client talks to the real server and worker (short run).

    python web/tests/test_server_contract.py
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
PORT = 8791


async def main() -> None:
    srv = subprocess.Popen([sys.executable, "-m", "web", "--no-browser", "--port", str(PORT)], cwd=ROOT,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    try:
        for _ in range(50):
            try:
                html = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=1).read()
                break
            except OSError:
                time.sleep(0.2)
        else:
            raise AssertionError("server did not start")
        assert b"<html" in html.lower(), "index.html not served"

        async with websockets.connect(f"ws://127.0.0.1:{PORT}/") as ws:
            hello = json.loads(await ws.recv())
            assert hello["type"] == "hello" and hello["arch"] == "CPU" and hello["grid"]["nx"] == 1024
            assert {"limits", "defaults", "history", "system", "cooldown", "lengths"} <= hello.keys()

            await ws.send(json.dumps({"type": "run", "settings": {"severity": 5.0}}))      # out of range
            while True:
                m = json.loads(await ws.recv())
                if m["type"] == "rejected":
                    assert m["reason"] == "invalid" and m["problems"]
                    break

            await ws.send(json.dumps({"type": "run", "settings": {"severity": 0.4, "stop": {"mode": "steps", "steps": 800}}}))
            frames, kinds, fin = 0, set(), None
            while fin is None:
                raw = await asyncio.wait_for(ws.recv(), 180)
                if isinstance(raw, bytes):
                    import struct
                    w, h, ch, vmin, vmax = struct.unpack_from("<IIIff", raw)
                    assert (w, h, ch) == (512, 128, 1) and len(raw) == 20 + w * h * ch * 4, "bad frame"
                    frames += 1
                    continue
                m = json.loads(raw)
                kinds.add(m["type"])
                if m["type"] == "finished":
                    fin = m
                if m["type"] == "failed":
                    raise AssertionError(m)
            assert frames >= 1 and {"state", "telemetry"} <= kinds, (frames, kinds)
            s = fin["summary"]
            assert s["reason"] == "steps" and s["steps"] == 800 and s["effort_basis"] == "measured"
            assert len(fin["history"]) >= 1 and len(fin["history"]) <= 3

            await ws.send(json.dumps({"type": "run", "settings": {}}))                    # cooldown must refuse
            while True:
                m = json.loads(await ws.recv())
                if m["type"] == "rejected":
                    assert m["reason"] == "cooldown" and m["cooldown"]["active"]
                    break

        zbytes = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/download/{fin['run_id']}", timeout=10).read()
        assert zbytes[:2] == b"PK", "download is not a zip"
        print("server contract OK:", frames, "frames,", len(fin["history"]), "run(s) in history")
    finally:
        srv.terminate()
        srv.wait(timeout=10)


asyncio.run(main())
