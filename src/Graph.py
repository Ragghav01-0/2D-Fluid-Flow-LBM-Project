import numpy as np
import matplotlib.pyplot as plt

velocity = np.loadtxt('velocity_2045.csv', delimiter=',', skiprows=1)
height = [x for x in range(255)]
max = np.max(velocity)

def analytical_solution(y):
    # ux =
    pass

plt.plot(velocity, height)
plt.xlim(0, max * 1.5)
plt.title('Poiseuille Flow')
plt.xlabel('Velocity')
plt.ylabel('Height')
plt.show()