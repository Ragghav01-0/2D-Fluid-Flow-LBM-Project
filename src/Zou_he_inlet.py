from Fields import *
from Initialize_Object import mask

@ti.kernel
def zou_he_inlet():
    ramp_time = 1500.0
    ux = ux_target

    if step[None] < ramp_time:
        x = step[None] / ramp_time
        ux *= (3.0 * x ** 2 - 2.0 * x ** 3)

    for y in ti.ndrange(ny):
        if mask[0, y] == 0:
            # parabolic = 4.0 * y * ( (ny -1) - y) / ((ny - 1) ** 2)
            # ux *= parabolic
            # uy = 0.0

            f0 = f_new[0, y][0]
            f2 = f_new[0, y][2]
            f4 = f_new[0, y][4]
            f3 = f_new[0, y][3]
            f6 = f_new[0, y][6]
            f7 = f_new[0, y][7]

            rho_calc = (f0 + f2 + f4 + 2 * (f3 + f6 + f7)) / (1 - ux)

            # Calculating Unknown population distributions at inlet using Zou-He equations with predetermined density
            f_new[0, y][1] = f3 + (2.0 / 3.0) *rho_calc * ux
            f_new[0, y][5] = f7 - 0.5 * (f2 - f4) + (1.0 / 6.0) * rho_calc * ux + 0.5 * rho_calc * uy
            f_new[0, y][8] = f6 + 0.5 * (f2 - f4) + (1.0 / 6.0) * rho_calc * ux - 0.5 * rho_calc * uy

            rho[0, y] = rho_calc
            u[0, y] = ti.Vector([ux, uy])