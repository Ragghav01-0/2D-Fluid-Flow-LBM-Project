import numpy as np

def severity_from_mask(mask):
    ny = mask.shape[1]
    height = ny - 2

    interior = mask[ :, 1:ny-1]
    fluid_nodes = (interior == 0).sum(axis=1)

    throat = int(np.argmin(fluid_nodes))
    narrow = fluid_nodes[throat]

    severity = 1.0 - narrow / height
    return float(severity), throat

def pressure_drop(rho, mask, x_in = 5, x_out=None):
    rho = np.asarray(rho, dtype=np.float64)
    nx,ny = rho.shape
    if x_out is None:
        x_out = nx - 6

    assert 0 < x_in < x_out < nx - 1, "x_in is out of the simulations bounds"

    fluid_in = (mask[x_in, :] == 0)
    fluid_out = (mask[x_out, :] == 0)
    assert fluid_in.any(), f"column x_in={x_in} has no fluid cells"
    assert fluid_out.any(), f"column x_out={x_out} has no fluid cells"

    rho_in_station = rho[x_in, :][fluid_in].mean()
    rho_out_station = rho[x_out, :][fluid_out].mean()

    p = (rho_in_station - rho_out_station) / 3
    return float(p)

def WSS(rho, mask, ux, nu):
    rho = np.asarray(rho, dtype=np.float64)
    nx,ny = rho.shape

    fluid = (mask[ :, 1:ny-1] == 0)

    x = np.arange(nx)
    j_bot = np.argmax(fluid, axis=1) + 1
    j_top = (ny - 2) - np.argmax(fluid[:, ::-1], axis=1)

    slope_bot = (9.0 * ux[x, j_bot] - ux[x, j_bot + 1]) / 3.0
    slope_top = (9.0 * ux[x, j_top] - ux[x, j_top - 1]) / 3.0

    wss_bot = rho[x, j_bot] * nu * np.abs(slope_bot)
    wss_top = rho[x, j_top] * nu * np.abs(slope_top)
    return wss_bot, wss_top


def plateau_spread(history, window=10):
    if len(history) < window:
        return None
    h = np.asarray(history[-window:], dtype=np.float64)   # columns: step, dp, wss
    out = []
    for col in (1, 2):
        latest = h[-1, col]
        if not np.isfinite(h[:, col]).all() or latest == 0:
            return None
        out.append(float((h[:, col].max() - h[:, col].min()) / abs(latest)))
    return tuple(out)

def has_plateaued(history, window=10, tol=1e-3, min_step=20000):
    if not history or history[-1][0] < min_step:
        return False
    s = plateau_spread(history, window)
    return s is not None and s[0] < tol and s[1] < tol
