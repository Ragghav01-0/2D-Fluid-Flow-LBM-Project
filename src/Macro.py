from Fields import *

# updates the velocity and density
@ti.kernel
def macro_update():
    for i, j in ti.ndrange(nx, ny):
        if mask[i, 0] == 1.0 and mask[i, ny-1] == 1.0:
            pass
        else:
            new_rho = 0.0
            new_u = ti.Vector([0.0, 0.0])

            for k in ti.static(range(9)):
                # new density
                distribution = f[i,j][k]
                new_rho += distribution

                # new velocity
                new_u += f[i,j][k]*e_static[k]

            #updating velocity & density
            rho[i, j] = new_rho

            # Makes sure that velocity can't be divided by 0
            if rho[i, j] > 0.0:
                u[i, j] = new_u/ new_rho
            else:
                u[i, j] = ti.Vector([0.0, 0.0])