import taichi as ti
ti.init(arch=ti.cpu)

import argparse
parser = argparse.ArgumentParser()
parser.add_argument("--tau_s", type=float, default=0.884)
parser.add_argument("--ny", type=int, default=256)
parser.add_argument("--ux", type=float, default=0.05)
args, _ = parser.parse_known_args()

assert 0.7 <= args.tau_s <= 1.5, f" tau_s is {args.tau_s}, which is below the limit and would cause NaN crashes"
assert 0.01 <= args.ux <= 0.1, f" ux inlet speed is {args.ux}, which is below the limit and would cause NaN crashes"

# Lattice dimensions
ny = args.ny
nx_preBuffer = 4 * ny

nx = nx_preBuffer + 60


# discrete velocities(f) + buffers, density(rho) and velocity(u)
f = ti.Vector.field(9, dtype=ti.f32, shape=(nx, ny))
f_new = ti.Vector.field(9, dtype=ti.f32, shape=(nx, ny))
f_pull = ti.Vector.field(9, dtype=ti.f32, shape=(nx,ny))
rho = ti.field(dtype=ti.f32, shape=(nx, ny))
u = ti.Vector.field(2, dtype=ti.f32, shape=(nx, ny))

# weights(w)
w = (4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36)
w_static = ti.static(w)

# directions(e)
e_values = ((0,0), (1,0), (0,1), (-1,0), (0,-1), (1,1), (-1,1), (-1,-1), (1,-1))
e_vector = [ti.Vector(i) for i in e_values]
e_static = ti.static(e_vector)

# opposite directions
e_opp = (0, 3, 4, 1, 2, 7, 8, 5, 6)

# identifies whether a node is a fluid(0) or a wall(1)
mask = ti.field(dtype=ti.f32, shape=(nx, ny))

# initializes pixels for GUI
pixels = ti.Vector.field(3, dtype=ti.f32, shape=(nx, ny))

# Zou-He Inlet parameters
ux_target = args.ux
uy = 0.0

# Zou-He Outlet parameters
rho_out = 1.0

step = ti.field(dtype=ti.i32, shape=())

# TRT parameters
w0 = 4.0 / 9.0
w_straight = 1.0 / 9.0
w_diag = 1.0 / 36.0
tau_s = args.tau_s
lambda_magic = 3.0 / 16.0
tau_a = 0.5 + lambda_magic / (tau_s - 0.5)

omega_s = 1.0 / tau_s
omega_a = 1.0 / tau_a


# Error Detection System
is_unstable = ti.field(dtype=ti.i32, shape=())
error_code = ti.field(dtype=ti.i32, shape=())
err_x = ti.field(dtype=ti.i32, shape=())
err_y = ti.field(dtype=ti.i32, shape=())
err_rho = ti.field(dtype=ti.f32, shape=())
err_u2 = ti.field(dtype=ti.f32, shape=())
err_ux = ti.field(dtype=ti.f32, shape=())
err_uy = ti.field(dtype=ti.f32, shape=())
err_f_pop = ti.field(dtype=ti.f32, shape=(9,))

# Initialize_Object.py variables
cx, cy = 93, 93
circle_radius = 30
plaque_type = "eccentric"
center = int(nx/3)
plaque_length = 450
h_max = 0.5 * ny # Change the constant to change plaque severity
spread = 120

# Convergence Checker
u_mag = ti.field(dtype=ti.f32, shape=(nx, ny))
u_mag_old = ti.field(dtype=ti.f32, shape=(nx, ny))
max_diff = ti.field(dtype=ti.f32, shape=())
max_vel = ti.field(dtype=ti.f32, shape=())

# Simulation metric calculation
interval = 150
nodes = nx * ny
avg_mlups = 0
log_count = 0
running = True

# Velocity check (log line only, no longer a stop condition)
tolerance = 1e-5
converged = False

# Plateau stop rule on (dp, WSS)
ramp_steps = 1500        # inlet ramp length (used by Zou_he_inlet)
check_interval = 1000    # steps between dp/WSS measurements
plateau_window = 10      # last N checks (10,000 steps)
plateau_tol = 1e-3
min_steps = 20000
max_steps = 600000       # cap: run is flagged NOT converged

# Reynolds number, kinematic viscosity, tau - uncomment if using SRT collision kernel
u_mean = (2.0/3.0) * ux_target
lattice_viscosity = ( (1.0/3.0) * (tau_s - 0.5))
Re = ((ny - 2) * u_mean) / lattice_viscosity  # H = fluid rows between the two walls
