from Fields import *

@ti.kernel
def trt_and_stream():
    for x, y in ti.ndrange(nx, ny):
        if mask[x, y] == 1:
            for k in ti.static(range(9)):
                f_new[x, y][k] = f[x, y][e_opp[k]]

        # if current node is fluid
        else:
            for k in ti.static(range(9)):
                xn = (x - e_static[k][0] + nx) % nx
                yn = (y - e_static[k][1] + ny) % ny

                # if neighboring node is fluid
                if mask[xn, yn] == 0:
                    f_pull[x,y][k] = f[xn, yn][k]

                # if neighboring node is solid
                else:
                    f_pull[x,y][k] = f[x, y][e_opp[k]]

            c_rho = 0.0
            ux = 0.0
            uy = 0.0
            for k in ti.static(range(9)):
                c_rho += f_pull[x, y][k]
                ux += f_pull[x, y][k] * e_static[k][0]
                uy += f_pull[x, y][k] * e_static[k][1]

            if c_rho > 1e-4:

                ux /= c_rho
                uy /= c_rho
            u2 = (ux ** 2) + (uy ** 2)

            # k = 0
            feq_0 = (4.0 / 9.0) * c_rho * (1.0 - 1.5 * u2)
            f_new[x, y][0] = f_pull[x, y][0] - omega_s * (f_pull[x, y][0] - feq_0)

            # k = 1 & 3
            f_plus13 = 0.5 * (f_pull[x, y][1] + f_pull[x, y][3])
            f_minus13 = 0.5 * (f_pull[x, y][1] - f_pull[x, y][3])
            feq_plus_13 = (1.0 / 9.0) * c_rho * (1.0 + 4.5 * (ux) ** 2 - 1.5 * u2)
            feq_minus_13 = (1.0 / 3.0) * c_rho * ux

            f_new[x, y][1] = f_pull[x, y][1] - omega_s * (f_plus13 - feq_plus_13) - omega_a * (f_minus13 - feq_minus_13)
            f_new[x, y][3] = f_pull[x, y][3] - omega_s * (f_plus13 - feq_plus_13) + omega_a * (f_minus13 - feq_minus_13)

            # k = 2 & 4
            f_plus24 = 0.5 * (f_pull[x, y][2] + f_pull[x, y][4])
            f_minus24 = 0.5 * (f_pull[x, y][2] - f_pull[x, y][4])
            feq_plus_24 = (1.0 / 9.0) * c_rho * (1.0 + 4.5 * (uy) ** 2 - 1.5 * u2)
            feq_minus_24 = (1.0 / 3.0) * c_rho * uy

            f_new[x, y][2] = f_pull[x, y][2] - omega_s * (f_plus24 - feq_plus_24) - omega_a * (f_minus24 - feq_minus_24)
            f_new[x, y][4] = f_pull[x, y][4] - omega_s * (f_plus24 - feq_plus_24) + omega_a * (f_minus24 - feq_minus_24)

            # k = 5 & 7
            f_plus57 = 0.5 * (f_pull[x, y][5] + f_pull[x, y][7])
            f_minus57 = 0.5 * (f_pull[x, y][5] - f_pull[x, y][7])
            feq_plus_57 = (1.0 / 36.0) * c_rho * (1.0 + 4.5 * (ux + uy) ** 2 - 1.5 * u2)
            feq_minus_57 = (1.0 / 12.0) * c_rho * (ux + uy)

            f_new[x, y][5] = f_pull[x, y][5] - omega_s * (f_plus57 - feq_plus_57) - omega_a * (f_minus57 - feq_minus_57)
            f_new[x, y][7] = f_pull[x, y][7] - omega_s * (f_plus57 - feq_plus_57) + omega_a * (f_minus57 - feq_minus_57)

            # k = 6 & 8
            f_plus68 = 0.5 * (f_pull[x, y][6] + f_pull[x, y][8])
            f_minus68 = 0.5 * (f_pull[x, y][6] - f_pull[x, y][8])
            feq_plus_68 = (1.0 / 36.0) * c_rho * (1.0 + 4.5 * (-ux + uy) ** 2 - 1.5 * u2)
            feq_minus_68 = (1.0 / 12.0) * c_rho * (-ux + uy)

            f_new[x, y][6] = f_pull[x, y][6] - omega_s * (f_plus68 - feq_plus_68) - omega_a * (f_minus68 - feq_minus_68)
            f_new[x, y][8] = f_pull[x, y][8] - omega_s * (f_plus68 - feq_plus_68) + omega_a * (f_minus68 - feq_minus_68)

            if time[None] == 3500:
                u2= 0.5

        # ----------------------- Error Detection System (EDS) and origin pinpointer -----------------------
            local_error_code = 0

            if y > 3 and y < ny - 4 and x > 3 and x < nx - 4:
                if ti.math.isnan(u2) == 1 or ti.math.isnan(ux) == 1:
                    local_error_code = 4

                # Check if rho is out of bounds
                elif (c_rho < 0.6 or c_rho > 1.8) and time[None] > 3000:
                    local_error_code = 3

                # Check if simulation is exceeding Mach number
                elif u2 > 0.16  and time[None] > 3000:
                    local_error_code = 1

                else:
                    for k in ti.static(range(9)):
                        # Check if distribution populations are negative
                        if f_new[x, y][k] < -1e-3:
                            local_error_code = 2

                if local_error_code != 0:
                    atomic_return_value = ti.atomic_max(is_unstable[None], 1)

                    if atomic_return_value == 0:
                        err_x[None] = x
                        err_y[None] = y
                        err_rho[None] = c_rho
                        err_u2[None] = u2
                        err_ux[None] = ux
                        err_uy[None] = uy
                        error_code[None] = local_error_code

                        for k in ti.static(range(9)):
                            err_f_pop[k] = f_new[x, y][k]
