from Fields import *

@ti.kernel
def collide_and_stream():
    for x, y in ti.ndrange((1, nx - 1), ny):

        # if current node is fluid
        if mask[x, y] == 0:

            # Macro values
            c_rho = rho[x, y]
            ux = u[x, y][0]
            uy = u[x, y][1]
            u2 = (ux ** 2) + (uy ** 2)

            if c_rho > 1e-4:
                for k in ti.static(range(9)):
                    xn = (x - e_static[k][0] + nx) % nx
                    yn = (y - e_static[k][1] + ny) % ny

                    # if neighboring node is fluid
                    if mask[xn, yn] == 0:
                        f_pull[k] = f[xn, yn][k]

                        # k = 0

                        # k = 1 & 3
                        f_plus1 = 0.5 * (f_pull[1] + f_pull[3])
                        f_minus1 = 0.5 * (f_pull[0] - f_pull[3])
                        feq_13 = 0.0 # left here at 10:22 pm - Aug 5 2026


                        # k = 2 & 4

                        # k = 5 & 7

                        # k = 6 & 8

                    # if neighboring node is solid
                    else:
                        f_pull[k] = f[x,y][e_opp[k]]