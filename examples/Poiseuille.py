from src.Fields import *

# Defines boundaries and/or obstacles in the fluid channel
@ti.kernel
def poiseuille():

    for x in ti.ndrange(nx):
        # sets top and bottom row as an obstacle
        mask[x, 0] = 1
        mask[x, ny - 1] = 1

