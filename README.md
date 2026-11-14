# LBM Solver & Web App Documentation

# Creator: Ragghav Karunagaran, 16 yrs old

---

# Part A: Solver

## 1. Overview
- **Purpose:** The fluid flow solver computes the movement or distribution of fluid populations and how it flows past obstacles.
- **Method:** D2Q9 Lattice-Boltzmann, TRT collision, pull streaming, Zou-He Boundary Conditions
- **Backend:** Taichi Lang (CPU / GPU)
- **Web app:** [enskoglbm.vercel.app](https://enskoglbm.vercel.app/#/home)

## 2. Installation

### 2.1 Requirements
| Item | Version |
|------|---------|
| Python | 3.12 or older |
| taichi | 1.7.4 |
| numpy / matplotlib / colorama | 2.4.6 , 3.11.2 , 0.4.6 |

### 2.2 Steps
```bash
# macOS / Linux
./install.sh
./run.sh web        # web UI (or: demo, solver, stop)
./run.sh solver     # terminal solver, no GUI

# Windows
install.bat
run.bat web         # web UI (or: demo, solver)
run.bat solver      # terminal solver, no GUI
```
`run.sh` / `run.bat` find the environment themselves, so no activate step is needed (`venvActivate.sh` is only for working in the environment by hand).


On macOS/Linux, `install.sh` plays a terminal animation of flow past a cylinder while the packages install (about 37 s minimum). The full log goes to `install.log`. The animation is skipped when output is not a terminal (CI, piped output) or the window is too small. `source venvActivate.sh` plays a short flow-past-a-stenosis splash before activating the environment (set `LBM_NO_ANIM=1` to skip it).

### 2.3 Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| `No module named 'taichi'` | environment not found | Run `./install.sh` (`install.bat`), then start with `./run.sh` (`run.bat`) |
| `taichi==1.7.4` fails to install | Python newer than 3.12 | Use Python 3.12 or older |
| `Error Code: 1` (warning) | Speed `u2 > 0.16` after step 3000, Mach limit exceeded | Lower inlet velocity |
| `Error Code: 2` (stops) | Negative distribution populations (`f < -1e-3`) | Same as above; check the `Location` printed to find the origin |
| `Error Code: 3` (warning) | Density outside 0.6–1.8 after step 3000 | Lower inlet velocity; check boundary setup |
| `Error Code: 4` (stops) | NaN in velocity, simulation diverged | Lower inlet velocity or raise viscosity (relaxation time) |

## 3. Running the Solver
```bash
cd src
python Simulator.py
```
- Select CPU/GPU: `ti.init(arch=type your choice here)` in `Simulator.py and Fields.py`
- Outputs: `Results/Result_1`
- Stop conditions: convergence (`tolerance`), instability (error codes 2, 4)

## 4. Governing Equations & Numerics
### 4.1 Lattice
- D2Q9 velocities `e_k`, weights `w_k`, `c_s^2 = 1/3`
### 4.2 Collision (TRT)
- `tau_s`, `tau_a`, magic parameter `Λ = 3/16`
- Viscosity: `ν = (tau_s - 0.5)/3`
### 4.3 Boundary conditions
| Boundary | Scheme | File | Notes |
|----------|--------|------|-------|
| Inlet | Zou-He velocity | `Zou_he_inlet.py` | n/a |
| Outlet | Zero-gradient | `Zero_Gradient_Outlet.py` | Advanced Outlet implementation in progress |
| Walls / obstacle | Half-way bounce-back | `TRT_and_Stream.py` | n/a |
### 4.4 Units & scaling
- Lattice → physical conversion (`dx`, `dt`, `ρ`): TODO
- Reynolds number definition: `Re = TODO`

## 5. Parameters
| Name | Symbol | Value (default) | Where | Meaning |
|------|--------|-------|-------|---------|
| `nx, ny` | | 1024, 256 | `Fields.py` | Grid size |
| `tau_s` | τ | 0.884 | `Fields.py` | Relaxation time |
| `ux_target` | u_in | 0.05 | `Fields.py` | Inlet velocity |
| `tolerance` | | 1e-5 | `Fields.py` | Convergence threshold |

Stability limits: Mach `u² < 0.16`, `0.6 < ρ < 1.8`, `τ > 0.5`. All parameters must be under the given range for the simulator to run smoothly, and out-of-range values that occur during the simulation run will be detected by the Error Detection System (EDS).

## 6. Validation

### 6.1 Case A: Poiseuille flow
- **Setup:** `examples/Poiseuille.py`, grid 1024 x 256, `tau_s` 0.884, `u_max` 0.05, BCs: Top and bottom rows as obstacles/walls.
- **Analytical solution:** `u(y) = 4 u_max (y/H)(1 - y/H)`
- **Metric:** L2 relative error `‖u_num − u_ana‖₂ / ‖u_ana‖₂`
- **Result:** error = 2.85% L2 error norm at 1e-5 tolerance for convergence.
- **Figure:** `poiseuille_validation.png`

![Poiseuille validation: LBM vs analytical velocity profile](poiseuille_validation.png)

### 6.2 Case B: Grid convergence - Ongoing 
| Grid | L2 error | Observed order |
|------|----------|----------------|
| n/a | n/a      | — |

### 6.3 Case C: Von Kármán vortex street (`examples/Von_Karman.py`) - Ongoing
- Re = 100, measured Strouhal number = n/a, reference = n/a
- Replicating conditions tested by DFG flow around cylinder benchmark 2D-2, time-periodic case Re=100

### 6.4 Case D: Stenosis / plaque (scientific target)
- Geometry: `plaque_type`, `h_max`, `spread`
- Compared against: TODO (literature / reference)

### 6.5 Known limitations
- Weakly compressible fluid assumption
- Newtonian Fluid
- constrained by python's overhead memory management, despite hardware acceleration using taichi.

## 7. Performance
| Backend | Grid | MLUPS | Hardware |
|---------|------|-------|----------|
| CPU | 1024 x 256 | 214.7 | Macbook Air M4, 16gb RAM |
| GPU | n/a        | n/a   | n/a                      |

## 8. Project Layout
```
src/        solver kernels (one kernel per file; shared state in Fields.py)
examples/   validation / demo cases
Results/    simulation output (gitignored)
docs/       this file
web/        web backend: server, worker, physics, system, protocol, tests (wraps src/, never edits it)
web_v3/     current browser front end (no build step)
web_v2/     rejected front end, kept for reference
web/runs/   saved web runs (gitignored)
```

## Current Progress
- Implementing a Web-based, interactive platform to be accessible for non-coders.
- Validating Von Karman Vortex Shedding according to DFG Case 2D-2 at Re = 100.
- Implementing Zou-He Outlet BC, with fixed pressure.

## Gallery
Put images in `images/` and replace each TODO with `![caption](images/file.png)`.

### Gallery 1. Validation
![Poiseuille validation: LBM vs analytical velocity profile](poiseuille_validation.png)

### Gallery 2. Von Kármán vortex street
TODO: velocity / vorticity snapshot at Re = 100

### Gallery 3. Stenosis / plaque
TODO: velocity field through the stenosis

### Gallery 4. Terminal & installer
TODO: screenshot of the CLI header and install animation

### Gallery 5. Web app
TODO: screenshots once the web app exists

---

# Part B: Web App

## 9. Web App Overview
- **Purpose:** An educational interface for exploring how a vessel narrowing affects simulated flow. Users can configure a blockage, watch the flow develop, review and compare recent runs, download run data, and read short lessons about the model and its results.
- **Audience:** Students, teachers, and science-fair audiences is what it is made for, and expert settings and downloadable data are also available for users who want more detail.
- **Status:** The current interface is `web_v3`, backed by the local Python service in `web/`. A browser opened on this computer can run the solver locally. A hosted or otherwise non-local copy uses the clearly labelled Demo instead; its results are simulated and are not solver output.
- **Run history:** The app retains the three most recent runs. Completed local runs include a summary, flow profile, final fields, and a final flow image; Demo runs cannot be downloaded.
- **Not clinical:** This is a simplified educational model, not a medical tool. Results are approximate trends, not patient-specific predictions; the interface labels estimates accordingly.
- **Implementation constraints:** The web service wraps the solver in `src/` without editing it. The browser communicates with the service using its WebSocket/HTTP protocol, and frame streaming is designed not to slow the solver (the benchmark target is less than 2% MLUPS overhead).

## 10. Web Architecture
In local live mode, the browser sends run settings and controls to the service, which launches one worker process for the run. The worker streams telemetry and flow frames while the solver runs; completed results are saved locally. In Demo mode, the browser uses an analytic stand-in and does not connect to the solver.

```
Local live mode
Browser (web_v3: ES modules; WebGL2 renders the flow)
   ^  WebSocket: JSON control/telemetry + binary flow frames
   |  HTTP: front-end files and completed-run downloads
   v
web/server.py   binds to 127.0.0.1; serves the UI, manages one active run and keeps the last 3 runs
   ^  private process pipe: JSON messages + frames; newest frame only
   v
web/worker.py   fresh process per run; configures settings, steps the solver, saves run outputs
   |
   v
src/            existing LBM solver; wrapped, not modified by the web app

Demo mode (hosted/non-local browser, or explicit demo)
Browser (web_v3) --> analytic stand-in in web_v3/js/demo.mjs
                     no connection to web/server.py or src/
```

### 10.1 Files
| Path | Role |
|------|------|
| `web/server.py` | One port, WebSocket + static files + zip downloads, cooldown, run history |
| `web/worker.py` | One run per process; sets `Fields` globals before importing kernels; writes the clot into `mask`; streams frames |
| `web/physics.py` | Clot geometry, allowed ranges, result metrics (pure NumPy) |
| `web/system.py` | Memory / CPU / thermal monitor (warnings only) and the cooldown |
| `web/protocol.py` | Pipe framing and binary frame format |
| `web_v3/js/adapter.mjs` | The only file that talks to the server (live adapter + Demo adapter) |
| `web_v3/js/stage.mjs` | WebGL2 flow window |
| `web_v3/js/screens/` | home, setup, running, summary, history (with Compare), guide |
| `web/tests/` | physics, server contract, baseline, streaming benchmark, safe-range sweep |

### 10.2 Design decisions
- **One run = one fresh process.** Taichi bakes Python globals in at compile time, so settings must be written onto `Fields` before the kernel modules are imported. Changing a physics setting therefore starts a new run. Only pause/resume, steps per frame and turbo are live.
- **Newest frame wins.** The worker keeps a one-slot mailbox; a slow browser skips frames and the solver never waits.
- **Local only.** The server binds to 127.0.0.1. TODO (state whether a hosted version is planned)
- **Processor:** CPU only in v1. TODO (what changes for GPU)

## 11. Installing & Running the Web App

### 11.1 Requirements
| Item | Version |
|------|---------|
| Python (virtual env `.venv`, git-ignored) | TODO |
| taichi | 1.7.4 *(from `CLAUDE.md`)* |
| numpy | TODO |
| websockets | TODO |
| psutil | TODO |
| Browser (WebGL2 required) | TODO |

### 11.2 Commands
```bash
./run.sh web  (Windows: run.bat web)        # recommended launcher; also demo, solver, stop
# Manual alternative, with the environment active:
python -m web                               # current UI (web_v3), opens http://127.0.0.1:8765
python -m web --gui               # the engine's own ti.GUI window
python -m web --port 9000 --no-browser
```
- Demo mode: open the page with `?demo`, or without a solver. It runs an analytic stand-in and is labelled "Demo" everywhere.
- Verify install: `TODO command` → expected output: `TODO`
- Stop the server: `Ctrl+C`

### 11.3 Folders created at run time
| Path | Contents | Git |
|------|----------|-----|
| `web/runs/` | the last 3 runs, plus `baselines.json` | ignored |
| `.venv/` | Python environment | ignored |

## 12. Web Protocol (fixed)

### 12.1 Browser → server
| Message | Fields | Purpose |
|---------|--------|---------|
| `run` | `settings` | Start a run with these settings |
| `command` | `cmd` (`pause`, `resume`, `stop`, `set`), `spf`, `turbo` | Control the running solver |
| `delete_run` | `id` | Remove a saved run |

### 12.2 Server → browser
| Event | Meaning | Key fields |
|-------|---------|------------|
| `hello` | Sent on connect | `limits`, `defaults`, `flow_through_steps`, `history`, `state` |
| `state` | Run state changed | `state`, `run_id`, `step` |
| `telemetry` | About every 0.25 s | `step`, `ft`, `residual`, `dp`, `peak_u`, `peak_wss` (null for now), `mlups` |
| `frame` | Binary field frame | see 12.3 |
| `warning` | Engine code 1 (Mach) or 3 (density), run continues | `code`, `step`, `x`, `y`, `rho`, `u2` |
| `failed` | Run stopped (codes 2 or 4, or the worker died) | plain-language text + the engine's report |
| `finished` | Run ended normally | `run_id`, `summary`, `settings`, `history` |
| `rejected` | Start refused | `reason` (`busy`, `cooldown`, `invalid`, `error`), `message` / `problems` |
| `system` | Machine health and cooldown | memory, CPU, thermal, cooldown state |
| `history` | Saved-run list changed | `history` |
| `summary_update` | A baseline finished and updated a summary | `run_id`, `summary`, `history` |

TODO (confirm field lists against `web/server.py` when the protocol is next touched)

### 12.3 Binary frame
`uint32 width, uint32 height, uint32 channels, float32 vmin, float32 vmax`, then `float32 data[width*height*channels]`.
- Currently 512 × 128, one channel (speed), row 0 is the top of the vessel, NaN marks solid nodes.
- Worker → server pipe: `[kind: u8][length: u32 LE][payload]`, kind 0 = JSON, kind 1 = frame.

### 12.4 HTTP
| Path | Returns |
|------|---------|
| `/` and static files | the front end chosen with `--static` |
| `/download/<run>` | zip of `summary.json`, `settings.json`, `profile_ux.csv`, `fields.npz`, `final_frame.bin` |

## 13. Settings, Safe Ranges & Limits
| Setting | Default | Allowed range | Where enforced |
|---------|---------|---------------|----------------|
| Blockage (`severity`) | 0.5 | 0 to 0.75 | `web/physics.py` |
| Relaxation time `tau_s` | 0.884 | 0.70 to 1.50 | `web/physics.py` |
| Inlet speed `ux_target` | 0.05 | 0.01 to 0.10 | `web/physics.py` |
| Clot length (nodes) | 450 | 100 to 600 | `web/physics.py` |
| Clot location (fraction of length) | 1/3 | keeps 16 nodes from each end | `web/physics.py` |
| Throat speed (inlet speed ÷ open fraction) | | ≤ 0.22 (warning above 0.15) | `web/physics.py` |
| Clot sides | bottom wall only | symmetric / one-sided / lopsided | `web/physics.py` |
| Run length | until settled | Quick / Medium / Long (1 / 2.5 / 5 flow-throughs), exact steps, until stopped | `web/server.py` |

- The sweep found failures follow the throat speed: stable at 0.25, failed at 0.30. TODO (link the sweep results)
- `tau_s` 0.6 failed at the speed corner, so the floor is 0.70.
- A step cap of 600,000 guards against a run that never settles.
- TODO (open decision: the experiment plan includes 80% blockage but the app caps at 75%)

## 14. Run Lifecycle & Saved Outputs

### 14.1 Lifecycle
1. The server validates the settings, refuses if busy or cooling down, then writes a config and starts a worker.
2. The worker applies the settings, builds the mask, initialises the fluid and runs the engine's step order.
3. It streams a frame about 30 times a second and telemetry every 0.25 s.
4. The run ends when it settles (`rel_change < 1e-5` checked every 250 steps), hits its step count or cap, is stopped, or fails.
5. The worker writes the outputs and a summary, and the server updates the history.
6. Cooldown: half the run time (30 s to 5 min), then until the machine reports it is cool.

### 14.2 Saved files (`web/runs/<run id>/`)
| File | Contents |
|------|----------|
| `settings.json` | everything needed to reproduce the run |
| `summary.json` | reason, steps, flow-throughs, residual, elapsed time, MLUPS and the metrics in section 15 |
| `profile_ux.csv` | velocity profile at x = 1000 (the engine's `Test_2.csv` column) |
| `fields.npz` | `u`, `rho`, `mask` |
| `final_frame.bin` | last frame in browser format |

- Only the last 3 runs are kept; failed runs are not saved.
- Run IDs are timestamps; a second run in the same second gets a `-2`, `-3` suffix.

### 14.3 Failures
| Engine code | Meaning | App behaviour |
|-------------|---------|---------------|
| 1 | speed above the Mach limit | warning, run continues |
| 2 | negative population | run stops, plain-language message + Expert report |
| 3 | density out of bounds | warning, run continues |
| 4 | NaN | run stops, plain-language message + Expert report |

## 15. Results & Metrics
| Result | Definition | Notes |
|--------|------------|-------|
| Percent blocked | 1 − (fewest open fluid rows in any column) ÷ 254 | from the mask |
| Pressure drop | (mean ρ at x = 5 − mean ρ at x = 1018) × 1/3 | lattice units |
| Effort ratio | pressure drop ÷ clear-vessel pressure drop | baseline is measured |
| Peak speed | maximum speed in the fluid, and its x | |
| Speed-up | peak speed ÷ (1.5 × inlet speed) | 1.5 = peak of a developed parabola |
| Reynolds number | inlet speed × 254 ÷ ν | clear vessel |
| Wall shear stress | TODO (not built; telemetry carries `peak_wss: null`) | validate against the exact plain-channel value first |

### 15.1 Clear-vessel baseline
- Stored value for the default settings: 0.00232 *(from `web/physics.py`)*.
- Other settings: measured automatically after the run and cached in `web/runs/baselines.json`.
- Fallback: the straight-channel formula `12 ν U L / H²`, labelled "rough estimate". It is about 1.9× too low on this grid because the flow is still developing.
- TODO (re-measure the baseline after the boundary fix; the stored value belongs to the old inlet and outlet)

## 16. Front End (`web_v3`)
- **Stack:** native ES modules, WebGL2 and CSS. No build step; served as static files.
- **Design language:** HybriDock-Pep (see `DESIGN.md`, `PRODUCT.md`, `.impeccable/`).
- **Screens:**
  | Screen | Job |
  |--------|-----|
  | Home | explanation, live preview, Start |
  | Setup | three-step wizard for the clot and run-length settings; collapsed Expert panel |
  | Running | live flow, phase track, system-warning lamp, Pause / Stop |
  | Summary | opens when a run ends: three big results, final flow picture, Download data |
  | History | last 3 runs, with Compare |
  | Guide | lesson sheets on reading colours and numbers |
- **Smoothness:** frames are blended on the GPU between the previous and next frame.
- **Accessibility:** keyboard operable, light and dark themes, reduced-motion respected, works at phone width. TODO (record what was actually tested)
- **Supported browsers:** TODO
- **Adding a front end:** talk to the server only through an adapter like `adapter.mjs`; do not change the protocol.

## 17. Web Testing
| Command | What it checks | Time |
|---------|----------------|------|
| `python web/tests/test_physics.py` | geometry, limits, metrics, cooldown, protocol, JS/Python agreement | no solver run |
| `python web/tests/test_server_contract.py` | real server and worker over a WebSocket | short |
| `python web/tests/test_baseline.py` | clear-vessel baseline | about 3 min |
| `python web/tests/bench_stream.py` | streaming overhead against the 2% budget | about 4 min |
| `python web/tests/sweep_safe_range.py --check` | worst corners of the allowed ranges stay stable | about 6 min |

- Run real-solver tests one at a time; they use all cores and heat the laptop.
- Browser checks: TODO (the Playwright suite is parked; checks so far were done by hand in headless Chromium)
- Pass criteria and last run date: TODO

## 18. Web Performance
| Item | Value | Notes |
|------|-------|-------|
| Streaming overhead | about 1.4% | budget 2%, `bench_stream.py` |
| Solver speed with the web app | about 190 to 230 MLUPS | author's machine |
| Frame rate in the browser | 60 fps | headless Chromium, software GL |
| Frame size | 512 × 128 | 2 × 2 average of the 1024 × 256 field |
| Telemetry interval | 0.25 s | |

- Headless Chromium draws WebGL on the CPU, so it competes with the solver and its timings are pessimistic.
- TODO (GPU numbers, other machines)

## 19. Web Known Limitations & Troubleshooting

### 19.1 Known limitations
- 2D slice, one fixed fluid thickness, rigid walls, steady inlet. Not a medical tool.
- Wall shear stress, pressure maps and streamlines are not in the app yet.
- Tested only in headless Chromium; the cooldown against a genuinely hot machine is unit-tested only.
- TODO

### 19.2 Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| Page shows "Demo" | no solver connected, or the page was opened as a file | start with `python -m web` and open `http://127.0.0.1:8765` |
| "A run is already going." | one run at a time | wait, or stop the current run |
| Start refused during cooldown | the post-run cooldown is active | wait for it to finish; Expert cannot skip it |
| Run fails with code 2 or 4 | settings too aggressive for this solver | use "Use gentler settings"; read the Expert report |
| Port already in use | another server is running | stop it or pass `--port` |
| TODO | TODO | TODO |

## 20. Deployment & Packaging
- Install scripts (`install.sh`, `install.bat`): TODO (owned by the author; state current status)
- Online Demo site: parked. TODO
- Hosted version / authentication: TODO (not planned in v1)
- Release checklist: TODO

---

## 21. Change Log
| Date | Part | Change | Validation re-run? |
|------|------|--------|--------------------|
| TODO | Solver / Web | TODO | TODO |

## 22. References
1. Krüger et al., *The Lattice Boltzmann Method: Principles and Practice*, 2017.
2. Ginzburg et al., "Two-relaxation-time Lattice Boltzmann scheme", 2008.
3. Zou & He, "On pressure and velocity boundary conditions for the LBM", 1997.
4. Schäfer & Turek, "Benchmark computations of laminar flow around a cylinder" (DFG benchmark, 2D-2 time-periodic case, Re = 100), in *Flow Simulation with High-Performance Computers II*, Notes on Numerical Fluid Mechanics 48, Vieweg, 1996, pp. 547–566.
5. TODO (Taichi documentation)
6. TODO (`websockets` library documentation)
7. TODO (WebGL2 / design references)
