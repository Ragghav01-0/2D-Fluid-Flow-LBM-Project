"""Machine health for the warning lamp and the cooldown. Warnings only: nothing here ever stops a run.

Memory and CPU load come from psutil. Thermal state: on macOS ``pmset -g therm`` (no admin rights) reports
``CPU_Speed_Limit`` when the machine is throttling itself; on Linux psutil may expose temperatures. Where the machine reports
nothing, the field is None and the UI says "not reported" instead of guessing.
"""
from __future__ import annotations

import re
import subprocess
import sys
import time
from dataclasses import dataclass

import psutil

MEM_WARN, MEM_CRIT = 0.85, 0.95
CPU_COOL = 35.0                 # percent: the machine counts as "idle enough" below this
TEMP_WARN, TEMP_CRIT = 85.0, 95.0


@dataclass
class Health:
    mem_used: float             # 0..1
    cpu: float                  # percent
    throttle: float | None      # 0..1 fraction of speed lost to heat (None = not reported)
    temp_c: float | None
    level: str                  # ok | warn | critical
    messages: list[str]

    def asdict(self) -> dict:
        return self.__dict__.copy()


def _throttle_macos() -> float | None:
    try:
        out = subprocess.run(["pmset", "-g", "therm"], capture_output=True, text=True, timeout=3).stdout
    except (OSError, subprocess.SubprocessError):
        return None
    m = re.search(r"CPU_Speed_Limit\s*=\s*(\d+)", out)
    if m:
        return max(0.0, 1 - int(m.group(1)) / 100)
    return 0.0 if "thermal" in out.lower() else None


def _temperature() -> float | None:
    fn = getattr(psutil, "sensors_temperatures", None)
    if fn is None:
        return None
    try:
        t = [x.current for v in fn().values() for x in v if x.current]
    except Exception:
        return None
    return max(t) if t else None


def read(cpu_interval: float | None = None) -> Health:
    mem = psutil.virtual_memory().percent / 100
    cpu = psutil.cpu_percent(interval=cpu_interval)
    throttle = _throttle_macos() if sys.platform == "darwin" else None
    temp = _temperature()
    msgs, level = [], "ok"
    def bump(lv, msg):
        nonlocal level
        msgs.append(msg)
        if lv == "critical" or level == "ok":
            level = lv
    if mem >= MEM_CRIT:
        bump("critical", "Memory is almost full.")
    elif mem >= MEM_WARN:
        bump("warn", "Memory is getting full.")
    if throttle is not None and throttle >= 0.25:
        bump("critical", "The computer is slowing itself down to cool off.")
    elif throttle is not None and throttle > 0:
        bump("warn", "The computer is running hot and has started to slow down.")
    if temp is not None and temp >= TEMP_CRIT:
        bump("critical", "The processor is very hot.")
    elif temp is not None and temp >= TEMP_WARN:
        bump("warn", "The processor is running hot.")
    return Health(mem, cpu, throttle, temp, level, msgs)


def cooldown_minimum(run_seconds: float) -> float:
    """Half the run's length, clamped to 30 s .. 5 min."""
    return min(300.0, max(30.0, 0.5 * run_seconds))


def is_cool(h: Health) -> bool:
    return (h.throttle in (None, 0.0)) and h.cpu < CPU_COOL and h.level != "critical"


class Cooldown:
    """Smart cooldown: a minimum wait, then keep waiting until the machine reports it has cooled."""

    def __init__(self):
        self.until = 0.0           # earliest end
        self.started = 0.0
        self.active = False
        self.reason = ""

    def start(self, run_seconds: float, now: float | None = None) -> None:
        now = time.time() if now is None else now
        self.started, self.until, self.active = now, now + cooldown_minimum(run_seconds), True
        self.reason = "Giving the computer a short rest before the next run."

    def update(self, h: Health, now: float | None = None) -> dict:
        now = time.time() if now is None else now
        if self.active and now >= self.until:
            if is_cool(h):
                self.active = False
            else:
                self.reason = "Waiting for the computer to cool down."
        remaining = max(0.0, self.until - now) if self.active else 0.0
        return {"active": self.active, "remaining": remaining, "reason": self.reason if self.active else "",
                "min_total": max(0.0, self.until - self.started) if self.active else 0.0}
