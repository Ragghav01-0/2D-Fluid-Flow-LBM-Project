# Vessel Flow Lab — web UI for the LBM solver (v1)

A browser front end for the D2Q9 / TRT solver in `../src`, for non-experts. The solver engine is **not edited**; everything
here wraps it. Plan and decisions: `../web_ui_plan.txt`.

```bash
python3 -m web              # serves http://127.0.0.1:8765 and opens the browser
python3 -m web --gui        # the engine's own ti.GUI window instead (src/Simulator.py)
python3 -m web --port 9000 --no-browser
```

Needs `taichi`, `numpy`, `websockets`, `psutil` (the first two are in `../requirements.txt`; packaging is handled separately).
Opening `static/index.html` any other way, or adding `?demo`, runs the **Demo** (an analytic stand-in, labelled everywhere).

## How it fits together

| Path | Role |
| --- | --- |
| `server.py` | One port, 127.0.0.1 only. Serves `static/`, relays one run over a WebSocket, keeps the last 3 runs, the cooldown, zip downloads |
| `worker.py` | One run = one fresh process. Sets `Fields` globals *before* importing the kernels (Taichi bakes globals in at compile time), writes the clot into `mask` from numpy, runs the engine's step order, streams frames |
| `physics.py` | Clot geometry, allowed ranges, result metrics. Pure NumPy |
| `system.py` | Memory / CPU / thermal-throttle monitor (warnings only) and the smart cooldown |
| `protocol.py` | Pipe framing and the binary frame format |
| `static/js/adapter.mjs` | **The only file that talks to the server** (live and Demo share one interface) |
| `static/js/screens/` | home, setup, running, summary, history (+compare), guide |
| `runs/` | Saved runs (git-ignored): `settings.json`, `summary.json`, `profile_ux.csv`, `fields.npz`, `final_frame.bin` |

## Rules this code keeps

* **Streaming must not slow the solver** — `tests/bench_stream.py` fails above 2% MLUPS loss (measured ≈1.4%).
* **Only the newest frame is sent**; a slow browser misses frames, the solver never waits.
* **Settings changes start a fresh run** (compile-time globals). Only pause/resume, steps per frame and turbo are live.
* **Safe ranges** come from measurement (`tests/sweep_safe_range.py`): the failures follow the speed at the narrowest point
  (inlet speed ÷ open fraction): stable at 0.25, failed at 0.30. `physics.THROAT_SPEED_MAX = 0.22` keeps a margin.
* **Pressure comparison** uses a *measured* clear-vessel baseline (stored for the default settings). The straight-channel
  formula is ~1.9× too low on this grid, so other settings fall back to it and are labelled "rough estimate".
* **Warnings only** while running; after a run, a cooldown (half the run time, 30 s–5 min, then until the machine is cool).

## Tests

```bash
python3 web/tests/test_physics.py            # geometry, limits, metrics, cooldown, protocol, JS/Python parity
python3 web/tests/test_server_contract.py    # real server + worker over a WebSocket (short run)
python3 web/tests/bench_stream.py            # streaming overhead (≈ 4 min)
python3 web/tests/sweep_safe_range.py --check  # worst corners of the allowed region stay stable (≈ 6 min)
```

## Not in v1

GPU, wall shear stress / pressure maps / streamlines, the online Demo site, packaging, a Playwright suite, a refactor of `src/`.
