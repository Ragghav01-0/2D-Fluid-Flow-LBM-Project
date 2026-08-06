import taichi as ti
from Fields import *

@ti.kernel
def collide_and_stream():
       #Collision Step (Compute temporary post-collision state)

    for x, y in ti.ndrange((1, nx - 1), ny):
        if mask[x, y] == 0:  # Only compute collision for fluid nodes
            curr_rho = rho[x, y]

            if curr_rho > 1e-4:
                ux = u[x, y][0]
                uy = u[x, y][1]
                u_sq = ux * ux + uy * uy

                # --- 1. Stationary Direction (k = 0) ---
                feq_0 = w0 * curr_rho * (1.0 - 1.5 * u_sq)
                f_post[x, y][0] = f[x, y][0] - omega_s * (f[x, y][0] - feq_0)

                # --- 2. Pair 1: Directions 1 (1,0) and 3 (-1,0) ---
                f1, f3 = f[x, y][1], f[x, y][3]
                f_plus1 = 0.5 * (f1 + f3)
                f_minus1 = 0.5 * (f1 - f3)
                eu1 = ux
                feq_plus1 = w_straight * curr_rho * (1.0 + 4.5 * (eu1 ** 2) - 1.5 * u_sq)
                feq_minus1 = w_straight * curr_rho * (3.0 * eu1)
                f_post[x, y][1] = f1 - omega_s * (f_plus1 - feq_plus1) - omega_a * (f_minus1 - feq_minus1)
                f_post[x, y][3] = f3 - omega_s * (f_plus1 - feq_plus1) + omega_a * (f_minus1 - feq_minus1)

                # --- 3. Pair 2: Directions 2 (0,-1) and 4 (0,1) ---
                f2, f4 = f[x, y][2], f[x, y][4]
                f_plus2 = 0.5 * (f2 + f4)
                f_minus2 = 0.5 * (f2 - f4)
                eu2 = -uy
                feq_plus2 = w_straight * curr_rho * (1.0 + 4.5 * (eu2 ** 2) - 1.5 * u_sq)
                feq_minus2 = w_straight * curr_rho * (3.0 * eu2)
                f_post[x, y][2] = f2 - omega_s * (f_plus2 - feq_plus2) - omega_a * (f_minus2 - feq_minus2)
                f_post[x, y][4] = f4 - omega_s * (f_plus2 - feq_plus2) + omega_a * (f_minus2 - feq_minus2)

                # --- 4. Pair 3: Directions 5 (1,-1) and 7 (-1,1) ---
                f5, f7 = f[x, y][5], f[x, y][7]
                f_plus3 = 0.5 * (f5 + f7)
                f_minus3 = 0.5 * (f5 - f7)
                eu3 = ux - uy
                feq_plus3 = w_diag * curr_rho * (1.0 + 4.5 * (eu3 ** 2) - 1.5 * u_sq)
                feq_minus3 = w_diag * curr_rho * (3.0 * eu3)
                f_post[x, y][5] = f5 - omega_s * (f_plus3 - feq_plus3) - omega_a * (f_minus3 - feq_minus3)
                f_post[x, y][7] = f7 - omega_s * (f_plus3 - feq_plus3) + omega_a * (f_minus3 - feq_minus3)

                # --- 5. Pair 4: Directions 6 (-1,-1) and 8 (1,1) ---
                f6, f8 = f[x, y][6], f[x, y][8]
                f_plus4 = 0.5 * (f6 + f8)
                f_minus4 = 0.5 * (f6 - f8)
                eu4 = -ux - uy
                feq_plus4 = w_diag * curr_rho * (1.0 + 4.5 * (eu4 ** 2) - 1.5 * u_sq)
                feq_minus4 = w_diag * curr_rho * (3.0 * eu4)
                f_post[x, y][6] = f6 - omega_s * (f_plus4 - feq_plus4) - omega_a * (f_minus4 - feq_minus4)
                f_post[x, y][8] = f8 - omega_s * (f_plus4 - feq_plus4) + omega_a * (f_minus4 - feq_minus4)
            else:
                # Fallback if density is zero/uninitialized
                for k in ti.static(range(9)):
                    f_post[x, y][k] = f[x, y][k]