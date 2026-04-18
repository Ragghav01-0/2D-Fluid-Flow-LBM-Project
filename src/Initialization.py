import taichi as ti
from fields import f, rho, u, w_static, e_static ,nx, ny

# initial fluid state kernel
@ti.kernel
def initial_fluid():
    for i,j in ti.ndrange(nx,ny):

        rho[i,j] = 1.0
        u[i, j] = ti.Vector([0.1,0.0])
        u2 = u[i,j].dot(u[i,j])

        for k in ti.static(range(9)):
            eu = e_static[k].dot(u[i,j])
            fi_equilibirum = w_static[k]*rho[i,j]*(1+3*eu+4.5*(eu**2)-1.5*u2)
            f[i, j][k] = fi_equilibirum
