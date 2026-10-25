import taichi as ti
ti.init(arch=ti.cpu)

# Lattice dimensions
nx = 1024
ny = 256 #191

# discrete velocities(f), density(rho) and velocity(u)
f = ti.Vector.field(9, dtype=ti.f32, shape=(nx, ny))
f_new = ti.Vector.field(9, dtype=ti.f32, shape=(nx, ny))
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
ux_target = 0.05
uy = 0.0

step = ti.field(dtype=ti.i32, shape=())

# Pulsate model parameters
U0 = 0.05
A = 0.02
omega = 0.01

# TRT parameters
w0 = 4.0 / 9.0
w_straight = 1.0 / 9.0
w_diag = 1.0 / 36.0
tau_s = 0.884
lambda_magic = 3.0 / 16.0
tau_a = 0.5 + lambda_magic / (tau_s - 0.5)

omega_s = 1.0 / tau_s
omega_a = 1.0 / tau_a

# combined stream + collision
f_pull = ti.Vector.field(9, dtype=ti.f32, shape=(nx, ny))

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
interval = 250
nodes = nx * ny
avg_mlups = 0
log_count = 0
running = True

#Convergence check Variables
tolerance = 1e-5
converged = False

# Reynolds number, kinematic viscosity, tau - uncomment if using SRT collision kernel
u_mean = (2.0/3.0) * ux_target
lattice_viscosity = ( (1.0/3.0) * (tau_s - 0.5))
Re = (2 * circle_radius * u_mean) / lattice_viscosity
