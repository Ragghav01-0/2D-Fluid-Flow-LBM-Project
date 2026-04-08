import taichi as ti
ti.init(arch=ti.gpu) # Defines whether cpu or gpu is being used

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
e = ti.static([ti.Vector(i) for i in e_values])

# initial fluid state kernel
@ti.kernel
def initial_fluid():
    for i,j in rho:

        rho[i,j] = 1.0
        u[i, j] = ti.Vector([0.1,0.0])

        for k in ti.static(range(9)):
            eu = e[k].dot(u[i,j])
            u2 = u[i,j].dot(u[i,j])
            fi_equilibirum = w[k]*rho[i,j]*(1+3*eu+4.5*(eu**2)-1.5*u2)
            f[i, j][k] = fi_equilibirum