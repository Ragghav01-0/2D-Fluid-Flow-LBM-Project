import taichi as ti
import numpy as np
ti.init(arch=ti.gpu) # Defines whether cpu or gpu is being used

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
from Reynolds_num import calc_reynolds

# Sets the initial fluid state and obstacle
initialize_object()
initial_fluid()
print("Reynolds number: ", calc_reynolds())
gui = ti.GUI("LBM Simulation", res=(nx, ny))

# While loop to keep updating the simulation
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

# Saving Velocity values at node 2045
# v2045 = []
#
# for i in ti.static(range(ny)):
#     v2045.append(round(u[2045, i][0], 5))
#
# velocity = np.array(v2045)
# np.savetxt("velocity_2045_test.csv", velocity, delimiter=",", fmt="%f")