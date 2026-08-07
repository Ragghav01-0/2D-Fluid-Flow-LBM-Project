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
                        f_pull[x,y][k] = f[xn, yn][k]

                        # k = 0
                        feq_0 = (4.0/9.0) * c_rho * (1.0 - 1.5 * u2)
                        f_new[x,y][0] = f_pull[x,y][0] - omega_s * (f_pull[x,y][0] - feq_0)

                        # k = 1 & 3
                        f_plus13 = 0.5 * (f_pull[x,y][1] + f_pull[x,y][3])
                        f_minus13 = 0.5 * (f_pull[x,y][1] - f_pull[x,y][3])
                        feq_plus_13 = (1.0/9.0) * c_rho * (1.0 + 4.5 * (ux)**2 - 1.5 * u2)
                        feq_minus_13 = (1.0/9.0) * c_rho * ( 3.0 * ux)

                        f_new[x,y][1] = f_pull[x,y][1] - omega_s * (f_plus13 - feq_plus_13) - omega_a * (f_minus13 - feq_minus_13)
                        f_new[x,y][3] = f_pull[x,y][3] - omega_s * (f_plus13 - feq_plus_13) + omega_a * (f_minus13 - feq_minus_13)

                        # k = 2 & 4
                        f_plus24 = 0.5 * (f_pull[x,y][2] + f_pull[x,y][4])
                        f_minus24 = 0.5 * (f_pull[x,y][2] - f_pull[x,y][4])
                        feq_plus_24 = (1.0 / 9.0) * c_rho * (1.0 + 4.5 * (uy) ** 2 - 1.5 * u2)
                        feq_minus_24 = (1.0 / 9.0) * c_rho * (3.0 * uy)

                        f_new[x,y][2] = f_pull[x,y][2] - omega_s * (f_plus24 - feq_plus_24) - omega_a * (f_minus24 - feq_minus_24)
                        f_new[x,y][4] = f_pull[x,y][4] - omega_s * (f_plus24 - feq_plus_24) + omega_a * (f_minus24 - feq_minus_24)

                        # k = 5 & 7
                        f_plus57 = 0.5 * (f_pull[x,y][2] + f_pull[x,y][4])
                        f_minus57 = 0.5 * (f_pull[x,y][2] - f_pull[x,y][4])
                        feq_plus_57 = (1.0 / 9.0) * c_rho * (1.0 + 4.5 * (ux + uy) ** 2 - 1.5 * u2)
                        feq_minus_57 = (1.0 / 9.0) * c_rho * (3.0 * (ux + uy))

                        f_new[x,y][5] = f_pull[x,y][5] - omega_s * (f_plus57 - feq_plus_57) - omega_a * (f_minus57 - feq_minus_57)
                        f_new[x,y][7] = f_pull[x,y][7] - omega_s * (f_plus57 - feq_plus_57) + omega_a * (f_minus57 - feq_minus_57)

                        # k = 6 & 8
                        f_plus68 = 0.5 * (f_pull[x,y][2] + f_pull[x,y][4])
                        f_minus68 = 0.5 * (f_pull[x,y][2] - f_pull[x,y][4])
                        feq_plus_68 = (1.0 / 9.0) * c_rho * (1.0 + 4.5 * (uy - ux) ** 2 - 1.5 * u2)
                        feq_minus_68 = (1.0 / 9.0) * c_rho * (3.0 * (uy - ux))

                        f_new[x,y][6] = f_pull[x,y][6] - omega_s * (f_plus68 - feq_plus_68) - omega_a * (f_minus68 - feq_minus_68)
                        f_new[x,y][8] = f_pull[x,y][8] - omega_s * (f_plus68 - feq_plus_68) + omega_a * (f_minus68 - feq_minus_68)

                    # if neighboring node is solid
                    else:
                        f_pull[x,y][k] = f[x,y][e_opp[k]]