from Fields import *

@ti.kernel
def simple_outlet():
    for j in range(ny):
        for k in ti.static(range(9)):
            f_new[nx-1, j][k] = f_new[nx-2, j][k] # read and use value of the neighbor