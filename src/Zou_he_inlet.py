from Fields import *
from Initialize_Object import mask

@ti.kernel
def zou_he_inlet():
    ramp_time = 2500.0
    ux_target = 0.13
    ux = 0.0

    if time[None] < ramp_time:
        x = time[None] / ramp_time
        ux = ux_target * (3.0 * x**2 - 2.0 * x**3) #U0 + A * ti.sin(omega * time[None])
    else:
        ux = ux_target

    uy = 0.0
    u2 = ux * ux + uy * uy

    for y in ti.ndrange(ny):
        if mask[0, y] == 0:
            rho_calc = 1.0

            for k in ti.static(range(9)):
                eu = e_static[k][0] * ux + e_static[k][1] * uy
                f_new[0, y][k] = w_static[k] * rho_calc * (1.0 + 3.0 * eu + 4.5 * (eu ** 2) - 1.5 * u2)

            f_new[0, y][1] += (2.0 / 3.0) * rho_calc * ux
            f_new[0, y][5] += (1.0 / 6.0) * rho_calc * ux + 0.5 * rho_calc * uy
            f_new[0, y][8] += (1.0 / 6.0) * rho_calc * ux - 0.5 * rho_calc * uy

            rho[0, y] = rho_calc
            u[0, y] = ti.Vector([ux, uy])