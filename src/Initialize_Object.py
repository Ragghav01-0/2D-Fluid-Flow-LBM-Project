from Fields import *

# Creates an obstacle for the fluid to flow around - currently the obstacle is a circle (cylinder in 3D)
@ti.kernel
def initialize_object():

    for x in ti.ndrange(nx):
        # sets top and bottom row as an obstacle for poiseuille flow
        mask[x, 1] = 1
        mask[x, ny - 1] = 1