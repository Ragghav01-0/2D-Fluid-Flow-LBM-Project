import taichi as ti
from Fields import *
from Initialize_Object import mask

@ti.kernel
def zou_he_outlet():
    nxo = nx - 1
    nxo2 = nx - 2

    for y in ti.ndrange(ny):
        if mask[nxo, y] == 0:
            for k in ti.static(range(9)):
                f_new[nxo, y][k] = f_new[nxo2, y][k]

            rho[nxo, y] = rho[nxo2, y]
            u[nxo, y] = u[nxo2, y]