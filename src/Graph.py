import numpy as np
import matplotlib.pyplot as plt
from Fields import *

velocity_test = np.loadtxt('velocity_2045_test.csv', delimiter=',', skiprows=1)
height = [x for x in range(255)]

# Analytical Solution
velocity3 = []
mid = (ny - 1) / 2

for y in range(ny-1):
    dist = y - mid
    v = u_max[0] * (1 - (dist / mid)**2)
    velocity3.append(v)

max = np.max(velocity3)

plt.plot(velocity_test, height, color='red', ls="-", label="Velocity Profile at node 2045 (test)")
plt.plot( velocity3, height, color='g', ls="-.", label="Analytical Velocity Profile")

plt.xlabel("Velocity")
plt.ylabel("Height")
plt.legend(loc="upper right")
plt.xlim(0, max * 1.5)
plt.title('Poiseuille Flow')
plt.show()