from Fields import *
from Measurements import *
import numpy as np
from datetime import datetime
import subprocess, os

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

    # Final ux(y) at the chosen x positions, one column per x position
    columns = [(nx_preBuffer - 25)]
    profiles = u.to_numpy()[columns, :, 0].T
    np.savetxt(f"../Results/profile_{run_id}.csv", profiles, delimiter=",", header=",".join(f"ux_x{c}" for c in columns), comments="")

    np.savetxt(f"../Results/history_{run_id}.csv", history, delimiter=",", header="step,dp,wss", comments="")

    # Test 1: profile error against the exact parabola (clear channel only; a plaque makes the profile non-parabolic)
    if severity <= 1e-9:
        profile = profiles[:, 0]
        l2, max_abs, centerline_pct = poiseuille_error(profile, ux_target)
        shape_l2, fit_peak = poiseuille_shape_error(profile)
    else:
        l2 = max_abs = centerline_pct = shape_l2 = fit_peak = nan

    rho_crop, mask_crop, ux_crop = rho.to_numpy()[:nx_preBuffer], mask.to_numpy()[:nx_preBuffer], u.to_numpy()[:nx_preBuffer, :, 0]
    q_in, q_out, flux_imbalance = mass_flux_balance(rho_crop, mask_crop, ux_crop)
    mean_rho = float(rho_crop[mask_crop == 0].mean())
    inlet_rho = float(rho_crop[5][mask_crop[5] == 0].mean())

    try:
        commit = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL, text=True).strip()
        if subprocess.check_output(["git", "status", "--porcelain", "--untracked-files=no"], text=True).strip():
            commit += "+dirty"  # run used uncommitted code
    except (OSError, subprocess.CalledProcessError):
        commit = "unknown"

    header = ("run_id,status,steps,nx_preBuffer,ny,tau_s,ux_target,severity,wss_kind,dp,wss,dp_spread,wss_spread,window,tol,run_time_s,"
              "commit,precision,mean_rho,inlet_rho,flux_imbalance,"
              "profile_l2,profile_max_err,centerline_err_pct,shape_l2,fit_peak")
    line = (f"{run_id},{status},{step[None]},{nx_preBuffer},{ny},{tau_s},{ux_target},{severity},{wss_kind},"
            f"{final_dp},{final_wss},{spread_dp},{spread_wss},{plateau_window},{plateau_tol},{total_run_time:.2f},"
            f"{commit},{rho_crop.dtype},{mean_rho},{inlet_rho},{flux_imbalance},"
            f"{l2},{max_abs},{centerline_pct},{shape_l2},{fit_peak}")

    # An older file with a different header would misalign the columns, so set it aside
    runs_path = "../Results/runs.csv"
    if os.path.exists(runs_path):
        with open(runs_path) as old:
            if old.readline().strip() != header:
                os.rename(runs_path, f"../Results/runs_old_{run_id}.csv")

    with open(runs_path, "a") as file:
        if file.tell() == 0:
            file.write(header + "\n")
        file.write(line + "\n")

    # Print only the essentials; everything else is in runs.csv
    wss_bot, wss_top = WSS(rho_crop, mask_crop, ux_crop, lattice_viscosity)
    print(f"RESULTS ({status})")
    print(f"  Pressure drop : {final_dp:.6g}")
    print(f"  WSS bottom    : {wss_bot[5: nx_preBuffer - 6].mean():.6g}  (mean)")
    print(f"  WSS top       : {wss_top[5: nx_preBuffer - 6].mean():.6g}  (mean)")
    print(f"  Flux imbalance: {flux_imbalance:.3%}  (inlet vs outlet)")
    if severity <= 1e-9:
        print(f"  Profile L2    : {l2:.3%}  (shape only {shape_l2:.3%}, fitted peak {fit_peak:.5f})")
    print(f"  Saved to ../Results/runs.csv (run {run_id})")
