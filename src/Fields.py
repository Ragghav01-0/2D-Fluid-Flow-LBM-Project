import taichi as ti
ti.init(arch=ti.gpu)

# Lattice dimensions
nx = 1024
ny = 256

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

# max velocity
u_max = ti.Vector([0.05, 0.0])

# Reynolds number, kinematic viscosity, tau
re = 125

nyf = float(ny)
u_m1 = u_max.norm()
u_f = (2/3) * float(u_m1)

nu = (u_f * nyf) / re
tau = 0.54 #(3 * nu) + 0.5

time = ti.field(dtype=ti.i32, shape=())

# Pulsate model parameters
U0 = 0.05
A = 0.02
omega = 0.01
