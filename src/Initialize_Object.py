from Fields import *

# Defines boundaries and/or obstacles in the fluid channel
@ti.kernel
def initialize_object():
    cx, cy = ny, (ny // 2)
    radius = 30

    for x in ti.ndrange(nx):
        # sets top and bottom row as an obstacle
        mask[x, 0] = 1
        mask[x, ny - 1] = 1

    # Obstacle definition - Currently creates a circle
    for x, y in ti.ndrange(nx, (1, ny - 1)):
        distance = ti.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if distance < radius:
            mask[x, y] = 1
        else:
            mask[x, y] = 0