"""Find where the solver stays stable. Runs the worker headless for STEPS at each setting and records whether the engine's
error detection fired (codes 2/4 stop the run; 1/3 are warnings). Writes web/tests/safe_range_results.json.

    python web/tests/sweep_safe_range.py            # full sweep
    python web/tests/sweep_safe_range.py --check    # test: the ranges in web/physics.py must all be stable (corners)
"""
from __future__ import annotations

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_worker import run  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).with_name("safe_range_results.json")
STEPS = 25000
D = {"tau": 0.884, "ux": 0.05, "sev": 0.5}


def one(tau, ux, sev, steps=STEPS, sym=False):
    cfg = {"tau_s": tau, "ux_target": ux, "clot": {"severity": sev, "symmetric": sym}, "stream": False,
           "stop": {"mode": "steps", "steps": steps}}
    msgs, _, err, rc = run(cfg)
    warn = [m for m in msgs if m["type"] == "warning"]
    fail = [m for m in msgs if m["type"] == "failed"]
    fin = [m for m in msgs if m["type"] == "finished"]
    status = "failed" if fail else "warning" if warn else "ok" if fin else "crashed"
    return {"tau": tau, "ux": ux, "severity": sev, "symmetric": sym, "status": status,
            "detail": (fail or warn or [{}])[0] if status != "ok" else None, "rc": rc,
            "err": err if status == "crashed" else ""}


def full_sweep():
    jobs = []
    jobs += [(t, D["ux"], D["sev"]) for t in (0.55, 0.60, 0.65, 0.75, 1.2, 1.5, 2.0)]
    jobs += [(D["tau"], u, D["sev"]) for u in (0.02, 0.08, 0.10, 0.12, 0.15)]
    jobs += [(D["tau"], D["ux"], s) for s in (0.7, 0.8, 0.85, 0.9, 0.95)]
    with ThreadPoolExecutor(3) as ex:
        res = list(ex.map(lambda j: one(*j), jobs))
    OUT.write_text(json.dumps(res, indent=1))
    for r in res:
        print(f"tau {r['tau']:<5} ux {r['ux']:<5} sev {r['severity']:<5} -> {r['status']}", flush=True)


def check():
    """Worst corners of the allowed region (longer runs) must all stay stable."""
    sys.path.insert(0, str(ROOT))
    from web import physics as P
    jobs = []
    for tau in P.TAU_RANGE:
        for ux in P.UX_RANGE:
            sev = round(min(P.SEVERITY_RANGE[1], 1 - ux / P.THROAT_SPEED_MAX), 2)
            for sym in (False, True):
                jobs.append((tau, ux, sev, 40000, sym))
    with ThreadPoolExecutor(3) as ex:
        res = list(ex.map(lambda j: one(*j), jobs))
    bad = [r for r in res if r["status"] != "ok"]
    for r in res:
        print(f"tau {r['tau']:<5} ux {r['ux']:<5} sev {r['severity']:<5} sym {r['symmetric']!s:<5} -> {r['status']}", flush=True)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    check() if "--check" in sys.argv else full_sweep()
