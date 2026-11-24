import time
from Fields import *

def CLI_header():
    lt_rho = (tau_s - 0.5) / 3.0
    bytes = nx * ny * (3 * 9 + 1 + 2 + 1) * 4  # f, f_new, f_pull (9 each) + rho + u(2) + mask, float32
    memory = bytes / (1024**2)
    current_arch = ti.lang.impl.current_cfg().arch
    backend_name = ti._lib.core.arch_name(current_arch)

    print("=" * 90)
    print("    Lattice-Boltzmann Method Fluid Simulation (D2Q9, TRT, Zou-He) utilizing Taichi Lang     ")
    print("=" * 90)
    print(f" [Simulation Start Time] Time at Simulation Starting: {time.strftime('%H:%M:%S')}")
    print(f" [System Initialization] Architecture       : {backend_name}")
    print(f" [Fluid Domain Initialization] Dimensions   : {nx_preBuffer} * {ny}, {nx_preBuffer * ny:,} nodes")
    print( " [Fluid Domain] Dimensional Buffer          : 60 nodes")
    print(f" [Memory Allocation] Total Field Memory     : ~{memory:.2f} MB")
    print("-" * 90)
    print(" [Physical Unit Conversions")
    print(f"    -  Lattice Inlet Velocity (u)           : {ux_target:.4f}")
    print(f"    -  Lattice Kinematic Viscosity (nu)     : {lt_rho:.4f}")
    print(f"    -  Relaxation Time (tau_s)              : {tau_s:.4f}")
    print(f"    -  Convergence Condition                : Δp/WSS plateau ({plateau_window} checks x {check_interval} steps, {plateau_tol*100:.1f}% spread, {max_steps:,} cap)")
    print(f"    -  Reynolds Number (Re)                 : {Re:.2f}")
    print( "    -  Collision Operator                   : Two Relaxation Time (TRT)")
    print("-" * 90)
    print("=" * 90)
