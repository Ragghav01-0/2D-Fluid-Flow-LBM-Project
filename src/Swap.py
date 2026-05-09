from Fields import *

@ti.kernel
def swap():
    for x, y in ti.ndrange(nx, ny):
        for i in ti.static(range(9)):
            f[x, y][i] = f_new[x, y][i]