import time

from Fields import *

def CLI_header():
    lt_rho = (tau_s - 0.5) / 3.0
    bytes = nx * ny * 9 * 8
    memory = bytes / (1024**2)
    current_arch = ti.lang.impl.current_cfg().arch
    backend_name = ti._lib.core.arch_name(current_arch)

    print("=" * 90)
    print("    Lattice-Boltzmann Method Fluid Simulation (D2Q9, TRT, Zou-He) utilizing Taichi Lang     ")
    print("=" * 90)
    print(f" [Simulation Start Time] Time at Simulation Starting: {time.strftime('%H:%M:%S')}")
    print(f" [System Initialization] Architecture       : {backend_name}")
    print(f" [Fluid Domain Initialization] Dimensions   : {nx} * {ny}, {nx * ny:,} nodes")
    print(f" [Memory Allocation] Fluid Field Population : ~{memory:.2f} MB")
    print("-" * 90)
    print(" [Physical Unit Conversions")
    print(f"    -  Lattice Inlet Velocity (u)           : {ux_target:.4f}")
    print(f"    -  Lattice Kinematic Viscosity (rho)    : {lt_rho:.4f}")
    print(f"    -  Relaxation Time (tau_s)              : {tau_s:.4f}")
    print(f"    -  Convergence Precision                : {tolerance}")
    print(f"    -  Reynolds Number (Re)                 : {Re:.2f}")
    print( "    -  Collision Operator                   : Two Relaxation Time (TRT)")
    print("-" * 90)
    print("=" * 90)
