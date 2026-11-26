# LBM Solver & Web App Documentation

Creator: Ragghav Karunagaran - 16 yrs old

# Part A: Solver

## 1. Overview
- **Purpose:** The fluid flow solver computes the movement or distribution of fluid populations and how it flows past obstacles.
- **Method:** D2Q9 Lattice-Boltzmann, TRT collision, pull streaming, Zou-He Boundary Conditions
- **Hardware Acceleration:** Taichi Lang (CPU / GPU)
- **Web app:** https://enskoglbm.vercel.app/ (Demo only)

## 2. Installation

### 2.1 Requirements
| Item | Version                |
|------|------------------------|
| Python | 3.12 or older          |
| taichi | 1.7.4                  |
| numpy / matplotlib / colorama | 2.4.6 , 3.11.2 , 0.4.6 |

### 2.2 Steps
```bash
# macOS / Linux
./install.sh
./run.sh solver # This runs with the default parameters - you can change them through --ny, --tau_s, --ux

# Windows
install.bat
run.bat
```

### 2.3 Troubleshooting
| Symptom | Cause | Fix                                                            |
|---------|-------|----------------------------------------------------------------|
| `No module named 'taichi'` | venv not activated | `source run.sh (or run.bat)`                                   |
| `taichi==1.7.4` fails to install | Python newer than 3.12 | Use Python 3.12 or older                                       |
| `Error Code: 1` (warning) | Speed `u2 > 0.16` after step 3000, Mach limit exceeded | Lower inlet velocity                                           |
| `Error Code: 2` (stops) | Negative distribution populations (`f < -1e-3`) | Same as above; check the `Location` printed to find the origin |
| `Error Code: 3` (warning) | Density outside 0.6–1.8 after step 3000 | Lower inlet velocity; check boundary setup                     |
| `Error Code: 4` (stops) | NaN in velocity, simulation diverged | Lower inlet velocity or raise viscosity (relaxation time)      |

## 3. Running the Solver
```bash
./run.sh solver # User can change the parameters (ux inlet speed, tau_s for viscosity, ny for # of rows) using a flag

# For windows
run.bat
```
- Select CPU/GPU: `ti.init(arch= ~type either ti.cpu or ti.gpu~ )` in `Simulator.py and Fields.py`
- Outputs: `Results/runs.csv, history_<run_id>.csv, profile_<run_id>.csv`
- Stop conditions: WSS and Δp plateau: 10 checks with each being 1000 steps apart. Or the solver stops if steps > 600,000 steps.

## 4. Governing Equations & Numerics
### 4.1 Lattice
- D2Q9 velocities `e_k`, weights `w_k`, `c_s^2 = 1/3`
### 4.2 Collision (TRT)
- `tau_s`, `tau_a`, magic parameter `Λ = 3/16`
- Viscosity: `ν = (tau_s - 0.5)/3`
### 4.3 Boundary conditions
| Boundary | Scheme                  | File                | Notes |
|----------|-------------------------|---------------------|-------|
| Inlet | Zou-He (fixed velocity) | `Zou_he_inlet.py`   | n/a   |
| Outlet | Zou-He (fixed density)  | `Zou_he_outlet.py`  | n/a   |
| Walls / obstacle | Half-way bounce-back    | `TRT_and_Stream.py` | n/a   |
### 4.4 Units & scaling
- Lattice → physical conversion (`dx`, `dt`, `ρ`): TODO
- Reynolds number definition: `Re = TODO`

## 5. Parameters
| Name | Symbol | Value (default)  | Where | Meaning |
|------|--------|------------------|-------|---------|
| `nx, ny` | | 4 * ny + 60, 256 | `Fields.py` | Grid size |
| `tau_s` | τ | 0.884            | `Fields.py` | Relaxation time |
| `ux_target` | u_in | 0.05             | `Fields.py` | Inlet velocity |

There is a +60 nodes buffer for nx as an outlet buffer. But all results are obtained from the original nx value.
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

### 6.5 Known limitations
- Weakly compressible fluid assumption
- Newtonian Fluid
- Constrained by python's overhead memory management, despite hardware acceleration using taichi.

## 7. Performance
| Backend | Grid       | MLUPS | Hardware                 |
|---------|------------|-------|--------------------------|
| CPU | 1024 x 256 | 214.7 | Macbook Air M4, 16gb RAM |
| GPU | n/a        | n/a   | n/a                      |

## 8. Project Layout
```
src/        solver kernels (one kernel per file; shared state in Fields.py)
examples/   validation / demo cases
Results/    simulation output (gitignored)
```
## 9. Current Progress
- Implementing a Web-based, interactive platform to be accessible for non-coders. A demo with sample data and results is deployed - link above at 1. Overview.
- Validating Von Karman Vortex Shedding according to DFG Case 2D-2 at Re = 100.

## 10. Gallery
Put images in `images/` and replace each TODO with `![caption](images/file.png)`.

### 10.1 Validation
![Poiseuille validation: LBM vs analytical velocity profile](poiseuille_validation.png)


## References
1. Krüger et al., *The Lattice Boltzmann Method: Principles and Practice*, 2017.
2. Ginzburg et al., "Two-relaxation-time Lattice Boltzmann scheme", 2008.
3. Zou & He, "On pressure and velocity boundary conditions for the LBM", 1997.
4. Schäfer & Turek, "Benchmark computations of laminar flow around a cylinder" (DFG benchmark, 2D-2 time-periodic case, Re = 100), in *Flow Simulation with High-Performance Computers II*, Notes on Numerical Fluid Mechanics 48, Vieweg, 1996, pp. 547–566.
