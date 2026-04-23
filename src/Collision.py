from fields import *

@ti.kernel
def collide():
    for i , j in ti.ndrange(nx, ny):
        curr_rho= rho [i,j]
        curr_u = u [i,j]
        curr_u2 = curr_u.dot(curr_u)
        for k in ti.static(range(9)):
            eu= e_static[k].dot(curr_u)
            f_eq = w_static[k] * curr_rho * (
                    1.0 + 3.0 * eu + 4.5 * (eu ** 2) - 1.5 * curr_u2)

        f[i, j][k] -= (f[i, j][k] - f_eq) / tau
