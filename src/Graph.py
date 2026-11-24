import glob
import numpy as np
import matplotlib.pyplot as plt
from Fields import ux_target
from Measurements import poiseuille_error

# Newest profile written by Record.save_record (one header line, then ux(y))
path = sorted(glob.glob('../Results/profile_*.csv'))[-1]
v1 = np.loadtxt(path, delimiter=',', skiprows=1)
height = np.arange(len(v1))

l2, max_abs, centerline_pct = poiseuille_error(v1, ux_target)
print("--- LBM Poiseuille Flow Validation Report ---")
print(f"L2 Relative Error:       {l2:.5f} ({l2 * 100:.2f}%)")
print(f"Maximum Absolute Error:  {max_abs:.5f} lattice units")
print(f"Centerline Deviation:    {centerline_pct:.2f}%")

center, R = (len(v1) - 1) / 2, (len(v1) - 2) / 2.0
analytical = ux_target * (1.0 - ((height - center) / R) ** 2)

plt.plot(v1, height, color='black', ls="-", label="LBM")
plt.plot(analytical, height, color='g', ls="-.", label="Analytical Velocity Profile")
plt.xlabel("Velocity (Lattice Units)")
plt.ylabel("Height (Lattice Units)")
plt.legend(loc="upper right")
plt.xlim(0, np.max(v1) * 1.2)
plt.title('Poiseuille Flow')
plt.show()
