from src.Fields import *

@ti.kernel
def von_karman():

    for x in ti.ndrange(nx):
        # sets top and bottom row as an obstacle
        mask[x, 0] = 1
        mask[x, ny - 1] = 1
        # print("top & bottom done")

    # Obstacle definition - Currently creates a circle
    for x, y in ti.ndrange(nx, (1, ny - 1)):
        distance = ti.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if distance < circle_radius:
            mask[x, y] = 1
            # print("circle done")
        else:
            mask[x, y] = 0