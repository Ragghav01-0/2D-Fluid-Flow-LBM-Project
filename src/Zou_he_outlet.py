from Fields import *
from Initialize_Object import mask

@ti.kernel
def zou_he_outlet():
    x = nx - 1
    for y in ti.ndrange(ny):
        if mask[x, y] == 0:

            f0 = f_pull[x, y][0]
            f2 = f_pull[x, y][2]
            f4 = f_pull[x, y][4]
            f1 = f_pull[x, y][1]
            f5 = f_pull[x, y][5]
            f8 = f_pull[x, y][8]

            ux = -1 + (f0 + f2 + f4 + 2 * (f1 + f5 + f8)) / rho_out
            ru = rho_out * ux

            f_pull[x,y][3] = f1 - (2.0/3.0) * ru
            f_pull[x, y][6] = f8 - 0.5 * (f2 - f4) - (1.0/6.0) * ru
            f_pull[x, y][7] = f5 + 0.5 * (f2 - f4) - (1.0/6.0) * ru