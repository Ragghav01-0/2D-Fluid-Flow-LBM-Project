from Fields import *

#
@ti.kernel
def updating_pixels():
    for x, y in ti.ndrange(nx, ny):
        if mask[x, y] == 1:
            # Obstacle color (Grey)
            pixels[x, y] = 0.5
        else:
            # Color of fluid
            val = u[x, y].norm()
            pixels[x, y] = val * 5