import numpy as np
import matplotlib.pyplot as plt
from Fields import *
from Zou_he_inlet import ux_target

v1 = np.loadtxt('../Results/Test_1.csv', delimiter=',')
ny_value = len(v1)
height = np.arange(ny_value)

# Analytical Solution
y = height + 0.5
center = (ny_value - 1) / 2
R = ny_value / 2.0

max = 1.5 * ux_target
analytical = max * (1.0 - ((y - center) / R) ** 2)

print("=" * 90)
# Assuming v1 (simulation) and velocity_analytical are numpy arrays of the same length
u_num = v1[1:-1]
u_ana = analytical[1:-1]

# 1. L2 Relative Error Norm
l2_error = np.linalg.norm(u_num - u_ana) / np.linalg.norm(u_ana)

# 2. Maximum Absolute Error (L_inf)
max_abs_error = np.max(np.abs(u_num - u_ana))

# 3. Centerline Error Percentage
centerline_idx = len(u_num) // 2
centerline_error_pct = (abs(u_num[centerline_idx] - u_ana[centerline_idx]) / u_ana[centerline_idx]) * 100

print(f"--- LBM Poiseuille Flow Validation Report ---")
print(f"L2 Relative Error:       {l2_error:.5f} ({l2_error * 100:.2f}%)")
print(f"Maximum Absolute Error:  {max_abs_error:.5f} lattice units")
print(f"Centerline Deviation:    {centerline_error_pct:.2f}%")

plt.plot(v1, height, color='black', ls="-", label="LBM")
plt.plot( analytical, height, color='g', ls="-.", label="Analytical Velocity Profile")

plt.xlabel("Velocity (Lattice Units)")
plt.ylabel("Height (Lattice Units)")
plt.legend(loc="upper right")
plt.xlim(0, np.max(v1) * 1.2)
plt.title('Poiseuille Flow')
plt.show()

print()
