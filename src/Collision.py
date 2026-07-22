import taichi as ti
from Fields import *

# --- TRT Relaxation Parameters ---
tau_s = 0.8
lambda_magic = 3.0 / 16.0
tau_a = 0.5 + lambda_magic / (tau_s - 0.5)

omega_s = 1.0 / tau_s
omega_a = 1.0 / tau_a

# Hardcoded D2Q9 lattice weights
w0 = 4.0 / 9.0
w_straight = 1.0 / 9.0
w_diag = 1.0 / 36.0


@ti.kernel
def collide():
    for i, j in ti.ndrange(nx, ny):
        curr_rho = rho[i, j]

        # Guard against uninitialized/zero density
        if curr_rho > 1e-4:
            ux = u[i, j][0]
            uy = u[i, j][1]
            u_sq = ux * ux + uy * uy

            # --- 1. Stationary Direction (k = 0) ---
            feq_0 = w0 * curr_rho * (1.0 - 1.5 * u_sq)
            f[i, j][0] -= omega_s * (f[i, j][0] - feq_0)

            # --- 2. Pair 1: Directions 1 (1,0) and 3 (-1,0) ---
            f1, f3 = f[i, j][1], f[i, j][3]
            f_plus1 = 0.5 * (f1 + f3)
            f_minus1 = 0.5 * (f1 - f3)
            eu1 = ux  # dot((1,0), u)
            feq_plus1 = w_straight * curr_rho * (1.0 + 4.5 * (eu1 ** 2) - 1.5 * u_sq)
            feq_minus1 = w_straight * curr_rho * (3.0 * eu1)
            f[i, j][1] = f1 - omega_s * (f_plus1 - feq_plus1) - omega_a * (f_minus1 - feq_minus1)
            f[i, j][3] = f3 - omega_s * (f_plus1 - feq_plus1) + omega_a * (f_minus1 - feq_minus1)

            # --- 3. Pair 2: Directions 2 (0,-1) and 4 (0,1) ---
            f2, f4 = f[i, j][2], f[i, j][4]
            f_plus2 = 0.5 * (f2 + f4)
            f_minus2 = 0.5 * (f2 - f4)
            eu2 = -uy  # dot((0,-1), u)
            feq_plus2 = w_straight * curr_rho * (1.0 + 4.5 * (eu2 ** 2) - 1.5 * u_sq)
            feq_minus2 = w_straight * curr_rho * (3.0 * eu2)
            f[i, j][2] = f2 - omega_s * (f_plus2 - feq_plus2) - omega_a * (f_minus2 - feq_minus2)
            f[i, j][4] = f4 - omega_s * (f_plus2 - feq_plus2) + omega_a * (f_minus2 - feq_minus2)

            # --- 4. Pair 3: Directions 5 (1,-1) and 7 (-1,1) ---
            f5, f7 = f[i, j][5], f[i, j][7]
            f_plus3 = 0.5 * (f5 + f7)
            f_minus3 = 0.5 * (f5 - f7)
            eu3 = ux - uy  # dot((1,-1), u)
            feq_plus3 = w_diag * curr_rho * (1.0 + 4.5 * (eu3 ** 2) - 1.5 * u_sq)
            feq_minus3 = w_diag * curr_rho * (3.0 * eu3)
            f[i, j][5] = f5 - omega_s * (f_plus3 - feq_plus3) - omega_a * (f_minus3 - feq_minus3)
            f[i, j][7] = f7 - omega_s * (f_plus3 - feq_plus3) + omega_a * (f_minus3 - feq_minus3)

            # --- 5. Pair 4: Directions 6 (-1,-1) and 8 (1,1) ---
            f6, f8 = f[i, j][6], f[i, j][8]
            f_plus4 = 0.5 * (f6 + f8)
            f_minus4 = 0.5 * (f6 - f8)
            eu4 = -ux - uy  # dot((-1,-1), u)
            feq_plus4 = w_diag * curr_rho * (1.0 + 4.5 * (eu4 ** 2) - 1.5 * u_sq)
            feq_minus4 = w_diag * curr_rho * (3.0 * eu4)
            f[i, j][6] = f6 - omega_s * (f_plus4 - feq_plus4) - omega_a * (f_minus4 - feq_minus4)
            f[i, j][8] = f8 - omega_s * (f_plus4 - feq_plus4) + omega_a * (f_minus4 - feq_minus4)
