from Fields import *

# Force sets the initial velocity and density at the inlet (left side)
@ti.kernel
def simple_inlet():
    for j in range(ny):
        u_max = ti.Vector([0.005, 0.0])
        rho_inlet = 1.0
        u_inlet = 4 * u_max * (j * (ny - j)) / (ny ** 2)

        for k in ti.static(range(9)):
            # Recalculate equilibrium for the wall
            eu = e_static[k].dot(u_inlet)
            f_new[0, j][k] = w_static[k] * rho_inlet * (1 + 3 * eu + 4.5 * (eu ** 2) - 1.5 * (u_inlet.dot(u_inlet)))

    # for j in range(ny):
    #     u_inlet = ti.Vector([0.01, 0.0])
    #     rho_inlet = 1.0
    #
    #     for k in ti.static(range(9)):
    #         # Recalculate equilibrium for the wall
    #         eu = e_static[k].dot(u_inlet)
    #         f_new[0, j][k] = w_static[k] * rho_inlet * (1 + 3*eu + 4.5*(eu**2) - 1.5*(0.02**2))