from Fields import *

@ti.kernel
def updating_pixels():
    for x, y in ti.ndrange(nx, ny):
        if mask[x, y] == 1:

            pixels[x, y] = ti.Vector([0.15, 0.15, 0.15])
        elif 0 < x < nx - 1 and y > 0 and y < ny - 1:

            duy_dx = (u[x + 1, y][1] - u[x - 1, y][1]) / 2.0
            dux_dy = (u[x, y + 1][0] - u[x, y - 1][0]) / 2.0

            vorticity = duy_dx - dux_dy

            scale = 0.03
            v_norm = vorticity / scale

            if v_norm > 1.0:
                v_norm = 1.0

            if v_norm < -1.0:
                v_norm = -1.0

            r = 0.0
            g = 0.0
            b = 0.0

            if v_norm > 0.0:
                r = 1.0
                g = 1.0 - v_norm
                b = 1.0 - v_norm
            else:
                r = 1.0 + v_norm
                g = 1.0 + v_norm
                b = 1.0

            pixels[x, y] = ti.Vector([r, g, b])
        else:
            pixels[x, y] = ti.Vector([1.0, 1.0, 1.0])