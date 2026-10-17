from Fields import *

@ti.kernel
def Convergence_Checker():
  max_diff[None] = 0.0
  max_vel[None] = 0.0

  for I in ti.grouped(u):
    u_mag_old[I] = u_mag[I]
    current_mag = u[I].norm()
    u_mag[I] = current_mag

    # Track absolute change
    diff = ti.abs(current_mag - u_mag_old[I])
    ti.atomic_max(max_diff[None], diff)

    # Track peak velocity for normalization
    ti.atomic_max(max_vel[None], current_mag)