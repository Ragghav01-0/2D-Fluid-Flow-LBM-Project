import taichi as ti
ti.init(arch=ti.cpu) # Defines whether cpu or gpu is being used

from fields import *
from Initialization import initial_fluid
from macro import macro_update

initial_fluid()
macro_update()

cx, cy = 128, 128

print(f"Checking Cell ({cx}, {cy}):")
print(f"Calculated Density: {rho[cx, cy]}")
print(f"Calculated Velocity: {u[cx, cy]}")