import taichi as ti
from colorama import Fore, Style
import time as timePy
import numpy as np

ti.init(arch=ti.cpu) # Defines whether cpu or gpu is being used

# Imports kernels from the different files
from Initialization import initial_fluid
from Macro import macro_update
from Initialize_Object import *
from Swap import *
from Pixels import updating_pixels
from Zou_he_inlet import *
from Zero_Gradient_Outlet import *
from TRT_and_Stream import *
from CLI_header import *
from Convergence_Checker import *
from Zou_he_outlet import *

# Simulation Metric Variables Initialization
start = timePy.perf_counter()
prev_time = start

# Sets the initial fluid state and obstacle
initialize_object()
initial_fluid()

# initialize CLI header
CLI_header()
# gui = ti.GUI("LBM Simulation", res=(nx, ny))

sysreport = False

while not converged:

    # EDS loop
    if is_unstable[None] == 1 and not sysreport:
        print("\n" + Fore.RED + Style.BRIGHT + "="*50)
        print(Fore.RED + Style.BRIGHT + "!! SIMULATION INSTABILITY DETECTED !!")
        print("\n" + Fore.RED + Style.BRIGHT + "="*50)
        print(f" {Fore.YELLOW}Error Code: {error_code[None]}")
        print(f" {Fore.YELLOW}Time: {step[None]}")
        print(f" {Fore.YELLOW}Location:  (x={err_x[None]}, y={err_y[None]})")
        print(f" {Fore.YELLOW}Density: {err_rho[None]:.6f}")
        print(f" {Fore.YELLOW}Speed (u2): {err_u2[None]:.6f}")
        print(f" {Fore.YELLOW}Speed (ux): {err_ux[None]:.6f}")
        print(f" {Fore.YELLOW}Speed (uy): {err_uy[None]:.6f}")
        print(f" {Fore.YELLOW}Discrete Distribution Function Populations (f): {err_f_pop}")
        print("\n" + Fore.RED + Style.BRIGHT + "="*50)
        sysreport = True

    if error_code[None] == 2 or error_code[None] == 4:   
        print("\n" + Fore.RED + Style.BRIGHT + "="*50)
        print(Fore.RED + Style.BRIGHT + "!! SIMULATION INSTABILITY DETECTED - STOPPING SIMULATION")
        print("\n" + Fore.RED + Style.BRIGHT + "="*50)
        print(f" {Fore.YELLOW}Error Code: {error_code[None]}")
        print(f" {Fore.YELLOW}Time: {step[None]}")
        print(f" {Fore.YELLOW}Location:  (x={err_x[None]}, y={err_y[None]})")
        print(f" {Fore.YELLOW}Density: {err_rho[None]:.6f}")
        print(f" {Fore.YELLOW}Speed (u2): {err_u2[None]:.6f}")
        print(f" {Fore.YELLOW}Speed (ux): {err_ux[None]:.6f}")
        print(f" {Fore.YELLOW}Speed (uy): {err_uy[None]:.6f}")
        print(f" {Fore.YELLOW}Discrete Distribution Function Populations (f): {err_f_pop}")
        print("\n" + Fore.RED + Style.BRIGHT + "="*50)
        running = False
        break

    stream()

    zou_he_inlet()
    zou_he_outlet()

    collide()

    swap()
    macro_update()

    # GUI pixel update loop
    # if step[None] % 5 == 0:
    #    updating_pixels()
    #    gui.set_image(pixels)
    #    gui.show()

    if step[None] > 0 and step[None] % interval == 0:
        Convergence_Checker()
        rel_change = max_diff[None] / (max_vel[None] + 1e-14)

        elapsed = timePy.perf_counter() - prev_time
        run_time = timePy.perf_counter() - start

        MLUPS = (nodes * interval) / (elapsed * 1e6)
        avg_mlups += MLUPS
        print(f"Step: {step[None]} | elapsed: {run_time:.2f} | Simulation Speed/MLUPS: {MLUPS:.2f} | Delta: {rel_change:.7f} | ")
        prev_time = timePy.perf_counter()
        log_count += 1

        if rel_change < tolerance:
            print(f"Simulation Converged Successfully at step: {step[None]}")
            converged = True
            break

    step[None] += 1

total_run_time = timePy.perf_counter() - start

if error_code[None] == 0:
    # Simulation Summary Reporter
    avg_mlups /= log_count
    print("=" * 40 + " Simulation Finished Successfully " + "=" * 40)
    print("")
    print("=" * 90)
    print(f"[Timer] Simulation Summary")
    print(f"[Timer] Average MLUPS: {avg_mlups:.3f}")
    print(f"[Timer] Simulation Time: {total_run_time:.2f}")
    print("=" * 90)

rho_np = rho.to_numpy()
col = rho_np[nx - 1, 1:ny - 1]   # last column, fluid rows only
print("rho at outlet: min", col.min(), "max", col.max())
print("any NaN:", np.isnan(rho_np).any())

v1000 = []

for i in ti.static(range(ny)):
    v1000.append(round(u[nx - 24, i][0], 9))

velocity1 = np.array(v1000)
np.savetxt("../Results/Result_1.csv", velocity1, delimiter=",", fmt="%f")

rho_np = rho.to_numpy()
u_np = u.to_numpy()            # expected shape (nx, ny, 2)
ux_np = u_np[..., 0]

rows = slice(1, ny - 1)        # fluid rows only (skip the two wall rows)

def mass_flux(x):
    return float(np.sum(rho_np[x, rows] * ux_np[x, rows]))

# --- mass flux at several columns ---
for x in (5, 50, 100, 150, 200, nx - 6):
    print(f"x={x:4d}  mass flux = {mass_flux(x):.6f}")

q_in, q_out = mass_flux(5), mass_flux(nx - 6)
print("flux mismatch (%):", 100 * abs(q_in - q_out) / abs(q_in))

# --- centerline density ---
mid = ny // 2                                    # 32 when ny = 64
cl = 0.5 * (rho_np[:, mid - 1] + rho_np[:, mid]) # average of the two middle fluid rows
for x in (5, 50, 100, 150, 200, 240, nx - 1):
    print(f"x={x:4d}  centerline rho = {cl[x]:.6f}")
