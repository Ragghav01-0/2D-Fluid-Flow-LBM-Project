# Graph Report - FluidFlow_LBM_GpuAcceleration  (2026-11-07)

## Corpus Check
- Corpus is ~39,385 words - fits in a single context window. You may not need a graph.

## Summary
- 487 nodes · 981 edges · 28 communities (20 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Web UI Shell
- Server Imports & Stdlib
- Design Briefs & Review Notes
- Physics & Run Config
- Demo Frames & Geometry
- Clot Geometry & Metrics
- Running/Summary Screens
- Server Adapter
- Worker & Profiles
- Solver Case Scripts
- Compare & Home Screens
- Init & Macro Kernels
- Cooldown & Health
- Windows Install Animation
- Install Script Animation
- Mask & Outlet Kernels
- Setup Wizard Screens
- Zou-He Inlet
- venv Animation Script
- Splash Script
- Pipe Writer
- Conda Environment
- Home Hero Design
- Open Website Script
- Swap Kernel
- TRT Stream Kernel
- IDE Project

## God Nodes (most connected - your core abstractions)
1. `FlowStage` - 36 edges
2. `h()` - 34 edges
3. `main()` - 32 edges
4. `App` - 22 edges
5. `mount()` - 19 edges
6. `icon()` - 18 edges
7. `mount()` - 16 edges
8. `$` - 15 edges
9. `mount()` - 14 edges
10. `mount()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `Convergence_Checker()`  [INFERRED]
  web/worker.py → src/Convergence_Checker.py
- `main()` --calls--> `initial_fluid()`  [INFERRED]
  web/worker.py → src/Initialization.py
- `main()` --calls--> `macro_update()`  [INFERRED]
  web/worker.py → src/Macro.py
- `main()` --calls--> `swap()`  [INFERRED]
  web/worker.py → src/Swap.py
- `main()` --calls--> `trt_and_stream()`  [INFERRED]
  web/worker.py → src/TRT_and_Stream.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Web backend pipeline (server, worker, solver)** — web_server, web_worker, web_readme_src_solver, web_protocol [EXTRACTED 1.00]
- **Flow window design system pieces** — design_flow_window, design_flow_color_ramp, design_callouts, design_gpu_frame_blending [EXTRACTED 1.00]
- **Vessel Flow Lab main screens** — impeccable_review_desktop_dark, impeccable_review_desktop_history, impeccable_review_desktop_guide, impeccable_review_desktop_compare, impeccable_review_desktop_dark_summary [INFERRED 0.85]
- **Simulate flow: setup, running, summary** — impeccable_review_desktop_setup, impeccable_review_desktop_setup_review, impeccable_review_desktop_running, impeccable_review_desktop_summary [INFERRED 0.85]
- **Setup to Running to Summary flow** — impeccable_review_mobile_setup, impeccable_review_mobile_running, impeccable_review_mobile_summary [INFERRED 0.85]

## Communities (28 total, 8 thin omitted)

### Community 0 - "Web UI Shell"
Cohesion: 0.06
Nodes (53): icon(), mark(), P, A, ACCENTS, applyTheme(), closePop(), ctx (+45 more)

### Community 1 - "Server Imports & Stdlib"
Cohesion: 0.05
Nodes (24): encode_json(), encode_msg(), pack_frame(), read_exact(), read_msg(), unpack_frame_header(), adapter.mjs (only file talking to server), Vessel Flow Lab web UI v1 readme (+16 more)

### Community 2 - "Design Briefs & Review Notes"
Cohesion: 0.05
Nodes (42): web_v2 surface brief (nautical chart), Hydrographic chart direction (isotach contours, soundings), web_v3 surface brief (floating flow window), Dead error branch (codes 1 and 3 ignored), Double ti.init issue (Fields.py, Simulator.py), Possible off-by-one in Initialize_Object mask fill, Code review notes for src/, TRT_and_Stream skipped divide at low density (+34 more)

### Community 3 - "Physics & Run Config"
Cohesion: 0.12
Nodes (6): baseline_key(), default_baseline_for(), flow_through_steps(), App, explain_failure(), Run

### Community 4 - "Demo Frames & Geometry"
Cohesion: 0.19
Nodes (25): clotFrame(), bump(), clamp(), drawVessel(), EDGE_MARGIN, INTERIOR, locationRange(), NX (+17 more)

### Community 5 - "Clot Geometry & Metrics"
Cohesion: 0.13
Nodes (14): actual_severity(), build_mask(), clear_vessel_dp(), Clot, compute_metrics(), dp_between(), location_range(), peak_heights() (+6 more)

### Community 6 - "Running/Summary Screens"
Cohesion: 0.09
Nodes (23): Running screen (desktop), Live pressure and flow-change sparklines with Steps/Times across/MLUPS stats, Four-stage stepper (Starting up, Pressure builds, Squeezing through, Settling down), Summary screen: What the blockage did, Flow window: speed heatmap with streaks and annotation pins, Three headline metrics (61% blocked, 2.4x faster, 5.6x pressure) with approximate labels, Mobile History screen, Tick two runs and Compare button (+15 more)

### Community 7 - "Server Adapter"
Cohesion: 0.15
Nodes (10): createAdapter(), A, connectLive(), cooldownNow(), demoHello(), demoStart(), demoFrame(), DemoRun (+2 more)

### Community 8 - "Worker & Profiles"
Cohesion: 0.13
Nodes (6): profile_column(), apply_settings(), Mailbox, main(), pressure_stations(), telemetry()

### Community 9 - "Solver Case Scripts"
Cohesion: 0.15
Nodes (3): poiseuille(), von_karman(), Convergence_Checker()

### Community 10 - "Compare & Home Screens"
Cohesion: 0.17
Nodes (9): Compare screen (desktop light), A vs B metrics table (blockage, speed, pressure, shape, steps), Home screen (desktop dark), Recent runs grouped list, Run summary screen (desktop dark), Three headline results: 61% blocked, 2.4x faster, 5.6x pressure, Guide screen with six lesson cards, Guide lesson modal: Reading the picture (+1 more)

### Community 11 - "Init & Macro Kernels"
Cohesion: 0.24
Nodes (3): initial_fluid(), macro_update(), updating_pixels()

### Community 12 - "Cooldown & Health"
Cohesion: 0.27
Nodes (5): Cooldown, cooldown_minimum(), Health, is_cool(), test_cooldown()

### Community 13 - "Windows Install Animation"
Cohesion: 0.31
Nodes (6): Draw-Flow(), Draw-Panel(), Get-Elapsed(), Get-LogTail(), Step-Particle(), Write-Padded()

### Community 14 - "Install Script Animation"
Cohesion: 0.57
Nodes (6): fit_panel(), hold_animation(), render_caption(), render_flow(), run_step(), install.sh script

### Community 16 - "Setup Wizard Screens"
Cohesion: 0.33
Nodes (6): Resting cooldown run button, Setup step 1: Blockage screen, Setup step 3: Ready to run review screen, Expert settings panel (tau, inlet speed, clot length), Three-step wizard (Blockage, Run length, Review), Vessel preview with rows-open callout

### Community 18 - "venv Animation Script"
Cohesion: 0.70
Nodes (4): fit_panel(), render_flow(), render_progress(), venvAnimation.sh script

### Community 19 - "Splash Script"
Cohesion: 0.70
Nodes (4): fit_panel(), render_flow(), render_progress(), splash.sh script

### Community 21 - "Conda Environment"
Cohesion: 0.50
Nodes (3): dependencies, pip, name

### Community 22 - "Home Hero Design"
Cohesion: 0.50
Nodes (3): Home screen: See how a blocked vessel changes the flow, Recent runs list and three action cards, Home hero at 1280px viewport

## Knowledge Gaps
- **40 isolated node(s):** `my_project`, `Motion curves (ease, ease-sheet, ease-out)`, `GPU frame blending`, `Hydrographic chart direction (isotach contours, soundings)`, `js/main.mjs module entry` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 151 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Vessel Flow Lab web UI v1 readme` connect `Server Imports & Stdlib` to `Worker & Profiles`, `Design Briefs & Review Notes`, `Clot Geometry & Metrics`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `main()` (e.g. with `Convergence_Checker()` and `initial_fluid()`) actually correct?**
  _`main()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `my_project`, `Motion curves (ease, ease-sheet, ease-out)`, `GPU frame blending` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web UI Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.06165099268547544 - nodes in this community are weakly interconnected._
- **Why does `LBM web UI plan v1` connect `Design Briefs & Review Notes` to `Server Imports & Stdlib`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `Server Imports & Stdlib` be split into smaller, more focused modules?**
  _Cohesion score 0.05331510594668489 - nodes in this community are weakly interconnected._
- **Why does `main()` connect `Worker & Profiles` to `Server Imports & Stdlib`, `Physics & Run Config`, `Clot Geometry & Metrics`, `Solver Case Scripts`, `Init & Macro Kernels`, `Mask & Outlet Kernels`, `Zou-He Inlet`, `Pipe Writer`, `Swap Kernel`, `TRT Stream Kernel`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._