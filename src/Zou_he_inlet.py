from Fields import *
from Initialize_Object import mask

@ti.kernel
def zou_he_inlet():
    ramp_time = ti.cast(ramp_steps, ti.f32)
    ux = ux_target

    if step[None] < ramp_time:
        x = step[None] / ramp_time
        ux = ux * (3.0 * x ** 2 - 2.0 * x ** 3)

    for y in ti.ndrange(ny):
        if mask[0, y] == 0:
            ux_row = ux * 4.0 * (y - 0.5) * (ny - 1.5 - y) / ((ny - 2) ** 2)

            f0 = f_pull[0, y][0]
            f2 = f_pull[0, y][2]
            f4 = f_pull[0, y][4]
            f3 = f_pull[0, y][3]
            f6 = f_pull[0, y][6]
            f7 = f_pull[0, y][7]

            rho_calc = (f0 + f2 + f4 + 2 * (f3 + f6 + f7)) / (1 - ux_row)

            # Calculating Unknown population distributions at inlet using Zou-He equations with predetermined density
            f_pull[0, y][1] = f3 + (2.0 / 3.0) * rho_calc * ux_row
            f_pull[0, y][5] = f7 - 0.5 * (f2 - f4) + (1.0 / 6.0) * rho_calc * ux_row + 0.5 * rho_calc * uy
            f_pull[0, y][8] = f6 + 0.5 * (f2 - f4) + (1.0 / 6.0) * rho_calc * ux_row - 0.5 * rho_calc * uy

            rho[0, y] = rho_calc
            u[0, y] = ti.Vector([ux_row, uy])