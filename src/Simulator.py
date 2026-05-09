import taichi as ti
ti.init(arch=ti.cpu) # Defines whether cpu or gpu is being used

# Imports kernels from the different files
from Initialization import initial_fluid
from Macro import macro_update
from Streaming import streaming
from Initialize_Object import *
from Swap import *
from Pixels import updating_pixels
from Collision import collide
from simple_inlet import *
from simple_outlet import *

# Sets the initial fluid state and obstacle
initialize_object()
initial_fluid()
gui = ti.GUI("LBM Simulation", res=(nx, ny))

# While to keep updating the simulation
while gui.running:
    collide()
    streaming()

    simple_inlet()
    simple_outlet()

    swap()
    macro_update()
    
    updating_pixels()
    gui.set_image(pixels)
    gui.show()