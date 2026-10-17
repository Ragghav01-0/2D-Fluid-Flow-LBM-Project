from Fields import *
import math

# Defines boundaries and/or obstacles in the fluid channel
@ti.kernel
def initialize_object():

    for x, y in ti.ndrange(nx, ny):
    #     # sets top and bottom row as an obstacle
        if y == 0 or y == ny - 1:
            mask[x, y] = 1
        else:
            mask[x, y] = 0

    # Obstacle definition - Currently creates a circle
    # for x, y in ti.ndrange(nx, (1, ny - 1)):
    #     distance = ti.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    #     if distance < circle_radius:
    #         mask[x, y] = 1
    #     else:
    #         mask[x, y] = 0

    # Plaque wall modeling - eccentric
    # for x, y in ti.ndrange((0, nx - 1), (1, ny - 2)):
    #     x_absolute_distance = abs(x - center)
    #
    #     if x_absolute_distance > (plaque_length / 2):
    #         mask[x,y] = 0
    #     else:
    #         y_plaque = (h_max / 2) * (1 + ti.cos(2 * math.pi * x_absolute_distance / plaque_length))
    #         if y <= y_plaque:
    #             mask[x,y] = 1
    #         else:
    #             mask[x,y] = 0