from fields import *

@ti.kernel
def macro_update():
    for i, j in ti.ndrange(nx, ny):
        new_rho = 0.0
        new_u = ti.Vector([0.0, 0.0])

        for k in ti.static(range(9)):
            # new density
            distri = f[i,j][k]
            new_rho += distri

            # new velocity
            new_u += f[i,j][k]*e_static[k]

        #updating velocity & density
        rho[i, j] = new_rho
        u[i, j] = new_u/ new_rho