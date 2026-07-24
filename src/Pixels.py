from Fields import *

@ti.kernel
def updating_pixels():
    for x, y in ti.ndrange(nx, ny):
        if mask[x, y] == 1:
            # Draw the cylinder as solid dark gray
            pixels[x, y] = ti.Vector([0.15, 0.15, 0.15])
        elif 0 < x < nx - 1 and y > 0 and y < ny - 1:
            # 1. Calculate derivatives using central differences
            # du_y / dx (change in vertical velocity along X axis)
            duy_dx = (u[x + 1, y][1] - u[x - 1, y][1]) / 2.0

            # du_x / dy (change in horizontal velocity along Y axis)
            dux_dy = (u[x, y + 1][0] - u[x, y - 1][0]) / 2.0

            # 2. Compute the 2D vorticity (spin)
            vorticity = duy_dx - dux_dy

            # 3. Scale and normalize the vorticity for display.
            # Vorticity can be positive (spinning counter-clockwise) or negative (clockwise).
            # You can change 'scale' (e.g., 0.05 to 0.2) to adjust color contrast.
            scale = 0.005
            v_norm = vorticity / scale

            # Clamp v_norm between -1.0  and 1.0
            if v_norm > 1.0: v_norm = 1.0
            if v_norm < -1.0: v_norm = -1.0

            # 4. Map to a Diverging Color Scheme:
            # Positive vorticity (Red) vs Negative vorticity (Blue) vs Stable flow (White/Green)
            r = 0.0
            g = 0.0
            b = 0.0

            if v_norm > 0.0:
                # Shifting from neutral white/light gray up to bright Red
                r = 1.0
                g = 1.0 - v_norm
                b = 1.0 - v_norm
            else:
                # Shifting from neutral white/light gray down to bright Blue
                r = 1.0 + v_norm  # (Since v_norm is negative, this decreases Red)
                g = 1.0 + v_norm
                b = 1.0

            pixels[x, y] = ti.Vector([r, g, b])
        else:
            # Fallback for the absolute boundary frames
            pixels[x, y] = ti.Vector([1.0, 1.0, 1.0])