#ollision Using Two-Relaxation-Time
from Fields import *
e_opp = (0, 3, 4, 1, 2, 7, 8, 5, 6)
e_opp_static = ti.static(e_opp)
tau_a = 0.5 + lambda_magic / (tau_s - 0.5)
omega_s = 1.0 / tau_s                  
omega_a = 1.0 / tau_a
@ti.kernel
def collide():
    for i, j in ti.ndrange(nx, ny):
        curr_rho = rho[i, j]
        curr_u = u[i, j]
        curr_u2 = curr_u.dot(curr_u)

        # 1. Compute equilibrium distributions f_eq
        f_eq = ti.Vector([0.0] * 9)
        for k in ti.static(range(9)):
            eu = e_static[k].dot(curr_u)
            f_eq[k] = w_static[k] * curr_rho * (1.0 + 3.0 * eu + 4.5 * (eu ** 2) - 1.5 * curr_u2)

        # 2. Apply TRT collision step
        for k in ti.static(range(9)):
            k_opp = e_opp_static[k]

            # Separate symmetric (+) and anti-symmetric (-) components
            f_plus = 0.5 * (f[i, j][k] + f[i, j][k_opp])
            f_minus = 0.5 * (f[i, j][k] - f[i, j][k_opp])

            feq_plus = 0.5 * (f_eq[k] + f_eq[k_opp])
            feq_minus = 0.5 * (f_eq[k] - f_eq[k_opp])

            # Apply relaxation rates individually
            f[i, j][k] -= omega_s * (f_plus - feq_plus) + omega_a * (f_minus - feq_minus)
