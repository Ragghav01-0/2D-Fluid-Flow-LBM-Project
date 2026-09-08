import taichi as ti
ti.init(arch=ti.gpu) # Defines whether cpu or gpu is being used

# Imports kernels from the different files
from Initialization import initial_fluid
from Macro import macro_update
from Initialize_Object import *
from Swap import *
from Pixels import updating_pixels
from Zou_he_inlet import *
from Zou_he_outlet import *
from Collide_and_Stream import *
from TRT_and_Stream import *

# Sets the initial fluid state and obstacle
initialize_object()
initial_fluid()
gui = ti.GUI("LBM Simulation", res=(nx, ny))

# While loop to keep updating the simulation
while gui.running:

    # collide_and_stream()
    trt_and_stream()

    zou_he_inlet()
    zou_he_outlet()

    swap()
    macro_update()

    if time[None] % 5 == 0:
        updating_pixels()
        gui.set_image(pixels)
        gui.show()

    time[None] += 1
