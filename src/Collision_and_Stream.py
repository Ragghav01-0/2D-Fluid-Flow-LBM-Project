from Fields import *

@ti.kernel
def collide_and_stream():
    for x, y in ti.ndrange((1, nx - 1), ny):

        # Current node is a fluid
        if mask[x, y] == 0:
            for k in ti.static(range(9)):

                # Finding coordinates of the neighboring node
                xn = (x - e_static[k][0] + nx) % nx
                yn = (y - e_static[k][1] + ny) % ny

                if mask[xn, yn] == 0:
                    n_rho = rho[xn, yn]
                    n_u = u[xn, yn]
                    n_u2 = n_u.dot(n_u)
                    eu = e_static[k].dot(n_u)
                    eq = w_static[k] * n_rho * (1.0 + 3.0 * eu + 4.5 * (eu ** 2) - 1.5 * n_u2)

                    # Collision + Streaming Operator
                    f_new[x, y][k] = f[xn, yn][k] - (f[xn, yn][k] - eq) / tau
    
                else:

                    # Bounce back for solid nodes
                    f_new[x, y][k] = f[x, y][e_opp[k]]

