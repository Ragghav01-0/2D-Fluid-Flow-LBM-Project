from Initialize_Object import *

# pulls in f values from the neighboring nodes to stream (pull scheme)
@ti.kernel
def streaming():
    for x,y in ti.ndrange(nx, ny):
        for i in ti.static(range(9)):
            xn, yn = (x-e_static[i][0] + nx) % nx, (y-e_static[i][1] + ny) % ny

            # No-slip Bounce back Condition
            if mask[x,y] == 0:
                if mask[xn, yn] == 0:
                    f_new[x, y][i] = f[xn, yn][i]
                else:
                    f_new[x, y][i] = f[x, y][e_opp[i]]
            else:
                f_new[x, y][i] = 0.0