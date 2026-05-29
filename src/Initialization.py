from Fields import *
from Initialize_Object import mask

# Initial fluid state kernel
@ti.kernel
def initial_fluid():
    for i,j in ti.ndrange(nx,ny): # loops over every node

        if mask[i,0] == 1 and mask[i, ny-1] == 1:
            rho[i, j] = 0.0
            u[i, j] = ti.Vector([0.0, 0.0])
        else:
            rho[i,j] = 1.0
            u[i, j] = ti.Vector([0.00,0.0])

        u2 = u[i, j].dot(u[i, j])
        for k in ti.static(range(9)): # loops over all the 9 directions
            eu = e_static[k].dot(u[i,j])
            fi_equilibrium = w_static[k]*rho[i,j]*(1 + 3*eu + 4.5*(eu**2) - 1.5*u2) # LBM equilibrium function
            f[i, j][k] = fi_equilibrium
            f_new[i, j][k] = fi_equilibrium