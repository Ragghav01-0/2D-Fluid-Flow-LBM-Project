"""Clot geometry, settings limits and result metrics. Pure NumPy: no Taichi import, so it is cheap to test.

Grid size is fixed by the engine (src/Fields.py): 1024 x 256, wall rows at y = 0 and y = ny - 1.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

NX, NY = 1024, 256
INTERIOR = NY - 2          # fluid rows between the two wall rows
CS2 = 1.0 / 3.0            # lattice speed of sound squared: p = rho * cs2

#: Engine defaults (src/Fields.py)
DEFAULT_TAU = 0.884
DEFAULT_UX = 0.05
DEFAULT_LENGTH = 450
DEFAULT_LOCATION = 1.0 / 3.0

#: Ranges the UI allows. SEVERITY_MAX, TAU_RANGE and UX_RANGE are set from the safe-range sweep
#: (web/tests/sweep_safe_range.py); see SAFE_RANGE_NOTES.md.
SEVERITY_RANGE = (0.0, 0.75)
TAU_RANGE = (0.70, 1.50)
UX_RANGE = (0.01, 0.10)
LENGTH_RANGE = (100, 600)
THROAT_SPEED_MAX = 0.22    # inlet speed / open fraction: stable at 0.25, failed at 0.30 in the sweep (margin kept)
THROAT_SPEED_WARN = 0.15
EDGE_MARGIN = 16           # keep the clot this many nodes away from inlet and outlet


@dataclass(frozen=True)
class Clot:
    severity: float = 0.5          # fraction of the channel blocked at the tightest point
    symmetric: bool = False        # False = bottom wall only (as in the engine)
    location: float = DEFAULT_LOCATION   # clot centre as a fraction of the vessel length
    length: int = DEFAULT_LENGTH
    lopsided: float = -1.0         # one-sided clots only: -1 = bottom wall only (engine default), 0 = even, +1 = top only


def location_range(length: int) -> tuple[float, float]:
    half = length / 2
    return ((EDGE_MARGIN + half) / NX, 1 - (EDGE_MARGIN + half) / NX)


def peak_heights(c: Clot) -> tuple[int, int]:
    """Peak intrusion in nodes from the (bottom, top) wall."""
    total = round(c.severity * INTERIOR)
    e = 0.0 if c.symmetric else max(-1.0, min(1.0, c.lopsided))
    top = round(total * (1 + e) / 2)
    return total - top, top


def build_mask(c: Clot) -> np.ndarray:
    """float32 (NX, NY) array, 1 = solid. Same cosine bump as the engine's plaque."""
    mask = np.zeros((NX, NY), dtype=np.float32)
    mask[:, 0] = 1
    mask[:, NY - 1] = 1
    bot, top = peak_heights(c)
    cx = c.location * NX
    x = np.arange(NX)
    d = x - cx
    bump = np.where(np.abs(d) < c.length / 2, 0.5 * (1 + np.cos(2 * math.pi * d / c.length)), 0.0)
    y = np.arange(NY)
    for peak, from_top in ((bot, False), (top, True)):
        if peak <= 0:
            continue
        h = peak * bump                                   # (NX,)
        dist = (NY - 1 - y) if from_top else y            # distance from the wall row
        solid = (dist[None, :] >= 1) & (dist[None, :] <= h[:, None])
        mask[solid] = 1
    return mask


def throat_open_rows(mask: np.ndarray) -> int:
    """Fewest open fluid rows in any column."""
    return int((mask[:, 1:NY - 1] == 0).sum(axis=1).min())


def actual_severity(mask: np.ndarray) -> float:
    return 1 - throat_open_rows(mask) / INTERIOR


def throat_speed(ux: float, severity: float) -> float:
    """Approximate speed at the narrowest point, flux conserved (lattice units)."""
    return ux / max(1 - severity, 0.05)


def validate(tau: float, ux: float, c: Clot) -> list[str]:
    """Human-readable problems; empty when the settings are inside the allowed ranges."""
    p = []
    if not TAU_RANGE[0] <= tau <= TAU_RANGE[1]:
        p.append(f"tau_s must be between {TAU_RANGE[0]} and {TAU_RANGE[1]}")
    if not UX_RANGE[0] <= ux <= UX_RANGE[1]:
        p.append(f"inlet speed must be between {UX_RANGE[0]} and {UX_RANGE[1]}")
    if not SEVERITY_RANGE[0] <= c.severity <= SEVERITY_RANGE[1]:
        p.append(f"severity must be between {SEVERITY_RANGE[0]:.0%} and {SEVERITY_RANGE[1]:.0%}")
    if not LENGTH_RANGE[0] <= c.length <= LENGTH_RANGE[1]:
        p.append(f"clot length must be between {LENGTH_RANGE[0]} and {LENGTH_RANGE[1]} nodes")
    if throat_speed(ux, c.severity) > THROAT_SPEED_MAX:
        p.append("The liquid would move too fast through the narrow part for this solver; lower the inlet speed or the blockage")
    lo, hi = location_range(c.length)
    if not lo <= c.location <= hi:
        p.append(f"clot location must be between {lo:.2f} and {hi:.2f} for this length")
    return p


def risk_warnings(tau: float, ux: float, c: Clot) -> list[str]:
    """Soft warnings for pairs that are inside the ranges but getting risky."""
    w = []
    if throat_speed(ux, c.severity) > THROAT_SPEED_WARN:
        w.append("The flow through the narrow part will be very fast; the run may become unstable.")
    if tau < 0.65:
        w.append("A very thin liquid (low tau_s) is less stable.")
    return w


def viscosity(tau: float) -> float:
    return (tau - 0.5) / 3.0


def reynolds(tau: float, ux: float, open_rows: int = INTERIOR) -> float:
    return ux * open_rows / viscosity(tau)


def flow_through_steps(ux: float) -> int:
    """Steps for the fluid to travel the whole vessel once at the inlet speed."""
    return round(NX / ux)


def clear_vessel_dp(tau: float, ux: float, x_in: int, x_out: int) -> float:
    """Fully developed 2D channel: dp = 12 nu U L / H^2, with U the mean speed (the inlet speed)."""
    return 12 * viscosity(tau) * ux * (x_out - x_in) / INTERIOR ** 2


#: Measured clear-vessel pressure drop (converged, severity 0) for the engine's default settings. The straight-channel
#: formula is ~1.9x too low on this grid because the flow is still developing along the vessel, so the comparison uses a
#: measured baseline; other settings get their own baseline run (see server.baseline_for).
DEFAULT_BASELINE_DP = 0.0023238658905029297
PEAK_OVER_MEAN_CLEAR = 1.5     # a developed parabolic profile peaks at 1.5x its mean speed


def baseline_key(tau: float, ux: float) -> str:
    return f"{tau:.4f}_{ux:.4f}"


def default_baseline_for(tau: float, ux: float) -> float | None:
    return DEFAULT_BASELINE_DP if baseline_key(tau, ux) == baseline_key(DEFAULT_TAU, DEFAULT_UX) else None


def dp_between(rho: np.ndarray, mask: np.ndarray) -> float:
    """Pressure drop between two stations near the inlet and outlet (p = rho / 3), lattice units."""
    x_in, x_out = 5, NX - 6
    def col(x):
        f = mask[x] == 0
        return float(rho[x][f].mean()) if f.any() else float("nan")
    return (col(x_in) - col(x_out)) * CS2


def compute_metrics(u: np.ndarray, rho: np.ndarray, mask: np.ndarray, tau: float, ux: float,
                    baseline_dp: float | None = None) -> dict:
    """u: (NX, NY, 2) lattice velocity, rho: (NX, NY). baseline_dp: measured clear-vessel dp for the same tau and ux."""
    fluid = mask == 0
    speed = np.where(fluid, np.hypot(u[..., 0], u[..., 1]), 0)
    dp = dp_between(rho, mask)
    peak = float(speed.max())
    px = int(np.unravel_index(speed.argmax(), speed.shape)[0])
    if baseline_dp:
        effort, basis = dp / baseline_dp, "measured"
    else:
        effort, basis = dp / clear_vessel_dp(tau, ux, 5, NX - 6), "formula"
    return {
        "severity": actual_severity(mask),
        "open_rows_at_throat": throat_open_rows(mask),
        "peak_speed": peak,
        "peak_speed_x": px,
        "speed_up": peak / (PEAK_OVER_MEAN_CLEAR * ux),     # vs the peak of a clear vessel at the same inlet speed
        "speed_over_inlet": peak / ux,
        "dp": dp,
        "dp_baseline": baseline_dp,
        "effort_ratio": effort,
        "effort_basis": basis,                              # "formula" = rough (about 2x too high), UI labels it
        "reynolds": reynolds(tau, ux),
    }


def profile_column() -> int:
    """Column used for the downloadable velocity profile; the engine's Test_2.csv uses x = 1000."""
    return NX - 24
