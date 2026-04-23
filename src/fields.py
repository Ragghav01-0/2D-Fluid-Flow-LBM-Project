import taichi as ti

# Lattice dimensions
nx = 512
ny = 256

# discrete velocities(f), density(rho) and velocity(u)
f = ti.Vector.field(9, dtype=ti.f32, shape=(nx, ny))
rho = ti.field(dtype=ti.f32, shape=(nx, ny))
u = ti.Vector.field(2, dtype=ti.f32, shape=(nx, ny))

# weights(w), directions(e)
w = (4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36)
e_values = ((0,0), (1,0), (0,-1), (-1,0), (0,1), (1,-1), (-1,-1), (-1,1), (1,1))
e_vector = ti.static([ti.Vector(i) for i in e_values])
e_static = ti.static(e_vector)
w_static = ti.static(w)

# collision stuff
# tau = ti.field(dtype=ti.f32, shape=(nx, ny))
tau=0.8