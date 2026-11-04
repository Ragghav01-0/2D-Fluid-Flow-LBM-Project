"""Streaming overhead check: headless vs streamed MLUPS on the same machine. Fails above BUDGET (2%).

Alternates headless / streamed runs so slow drift (thermals, other load) hits both equally, then compares medians.
The streamed run's frames are really read from the pipe, like the server does.
"""
from __future__ import annotations

import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_worker import run  # noqa: E402

BUDGET = 0.02
STEPS = 8000
REPEATS = 6


def mlups(stream: bool) -> float:
    cfg = {"tau_s": 0.884, "ux_target": 0.05, "clot": {"severity": 0.5}, "stream": stream,
           "stop": {"mode": "steps", "steps": STEPS}}
    msgs, frames, err, rc = run(cfg)
    assert rc == 0, err
    fin = [m for m in msgs if m["type"] == "finished"][0]["summary"]
    if stream:
        assert frames > 20, f"only {frames} frames streamed"
    return fin["overall_mlups"]


def main() -> int:
    head, stre = [], []
    mlups(False)                                   # warm-up (disk cache, CPU clocks)
    for i in range(REPEATS):
        if i % 2 == 0:                              # alternate the order so drift hits both arms equally
            head.append(mlups(False)); stre.append(mlups(True))
        else:
            stre.append(mlups(True)); head.append(mlups(False))
        print(f"round {i + 1}: headless {head[-1]:.1f}  streamed {stre[-1]:.1f} MLUPS", flush=True)
    h, s = statistics.median(head), statistics.median(stre)
    loss = (h - s) / h
    print(f"median headless {h:.1f}  streamed {s:.1f}  overhead {loss:+.2%}  (budget {BUDGET:.0%})")
    return 0 if loss <= BUDGET else 1


if __name__ == "__main__":
    sys.exit(main())
