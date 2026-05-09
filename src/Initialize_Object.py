from Fields import *

# Creates an obstacle for the fluid to flow around - currently the obstacle is a circle (cylinder in 3D)
@ti.kernel
def initialize_object():
    cx, cy = nx // 3, ny // 2 # center of the cylinder
    radius = 35

    for x,y in ti.ndrange(nx, ny):
        distance = ti.sqrt((x - cx) ** 2 + (y - cy) ** 2)

        if distance < radius:
            mask[x, y] = 1
        else:
            mask[x, y] = 0