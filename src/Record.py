from Fields import *
from Measurements import *
import numpy as np
from datetime import datetime

# Measures pressure drop and WSS on the physical channel (buffer cropped)
def measure(peak):
    rho_crop = rho.to_numpy()[:nx_preBuffer]
    mask_crop = mask.to_numpy()[:nx_preBuffer]
    ux_crop = u.to_numpy()[:nx_preBuffer, :, 0]

    wss_bot, wss_top = WSS(rho_crop, mask_crop, ux_crop, lattice_viscosity)
    wss_walls = np.concatenate([wss_bot[5: nx_preBuffer - 6], wss_top[5: nx_preBuffer - 6]])

    del_p = pressure_drop(rho_crop, mask_crop, x_in=5)

    # Peak WSS with a plaque, mean WSS for a clear channel
    if peak:
        return del_p, float(wss_walls.max())
    return del_p, float(wss_walls.mean())

# Saves the run: the (step, dp, wss) history and one line in runs.csv
def save_record(status, history, use_peak, severity, total_run_time):
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    nan = float("nan")

    # The last check is the final value, since stops land on a check step
    final_dp, final_wss = nan, nan
    if len(history) > 0 and status != "UNSTABLE":
        final_dp, final_wss = history[-1][1], history[-1][2]

    spread_dp, spread_wss = plateau_spread(history, plateau_window) or (nan, nan)
    wss_kind = "peak" if use_peak else "mean"

    np.savetxt(f"../Results/history_{run_id}.csv", history, delimiter=",", header="step,dp,wss", comments="")

    header = "run_id,status,steps,nx_preBuffer,ny,tau_s,ux_target,severity,wss_kind,dp,wss,dp_spread,wss_spread,window,tol,run_time_s"
    line = (f"{run_id},{status},{step[None]},{nx_preBuffer},{ny},{tau_s},{ux_target},{severity},{wss_kind},"
            f"{final_dp},{final_wss},{spread_dp},{spread_wss},{plateau_window},{plateau_tol},{total_run_time:.2f}")

    with open("../Results/runs.csv", "a") as file:
        if file.tell() == 0:
            file.write(header + "\n")
        file.write(line + "\n")

    print(f"RESULTS ({status})")
    print(header)
    print(line)
