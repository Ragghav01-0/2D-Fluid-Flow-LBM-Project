import taichi as ti
from colorama import Fore, Style
ti.init(arch=ti.gpu) # Defines whether cpu or gpu is being used

# Imports kernels from the different files
from Initialization import initial_fluid
from Macro import macro_update
from Initialize_Object import *
from Swap import *
from Pixels import updating_pixels
from Zou_he_inlet import *
from Zero_Gradient_Outlet import *
from Collide_and_Stream import *
from TRT_and_Stream import *

# Sets the initial fluid state and obstacle
initialize_object()
initial_fluid()
gui = ti.GUI("LBM Simulation", res=(nx, ny))

while gui.running:

    # EDS loop
    if is_unstable[None] == 1:
        print("\n" + Fore.RED + Style.BRIGHT + "="*50)
        print(Fore.RED + Style.BRIGHT + "!! SIMULATION INSTABILITY DETECTED - STOPPING SIMULATION")
        print("\n" + Fore.RED + Style.BRIGHT + "="*50)
        print(f" {Fore.YELLOW}Error Code: {error_code[None]}")
        print(f" {Fore.YELLOW}Time: {time[None]}")
        print(f" {Fore.YELLOW}Location:  (x={err_x[None]}, y={err_y[None]})")
        print(f" {Fore.YELLOW}Density: {err_rho[None]:.6f}")
        print(f" {Fore.YELLOW}Speed (u2): {err_u2[None]:.6f}")
        print(f" {Fore.YELLOW}Speed (ux): {err_ux[None]:.6f}")
        print(f" {Fore.YELLOW}Speed (uy): {err_uy[None]:.6f}")
        print(f" {Fore.YELLOW}Discrete Distribution Function Populations (f): {err_f_pop}")
        print("\n" + Fore.RED + Style.BRIGHT + "="*50)

        gui.running = False
        break

    # collide_and_stream()
    trt_and_stream()

    zou_he_inlet()
    zero_gradient_outlet()

    swap()
    macro_update()

    # GUI pixel update loop
    if time[None] % 5 == 0:
        updating_pixels()
        gui.set_image(pixels)
        gui.show()

    time[None] += 1