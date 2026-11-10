"""Geometry, limits, metrics, cooldown, protocol, and JS/Python geometry parity.   python web/tests/test_physics.py"""
from __future__ import annotations

import io
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from web import physics as P, protocol, system  # noqa: E402


def test_mask():
    m = P.build_mask(P.Clot(0.5, False))
    assert m.shape == (1024, 256) and (m[:, 0] == 1).all() and (m[:, 255] == 1).all()
    assert P.throat_open_rows(m) == 128 and abs(P.actual_severity(m) - 0.5) < 0.01
    assert P.throat_open_rows(P.build_mask(P.Clot(0.0))) == 254
    sym = P.build_mask(P.Clot(0.5, True))
    assert sym[:, 1:128].sum() > 0 and sym[:, 128:255].sum() > 0, "symmetric clot must touch both walls"
    one = P.build_mask(P.Clot(0.5, False))
    cx = int(P.DEFAULT_LOCATION * 1024)
    assert one[cx, 1] == 1 and one[cx, 254] == 0, "one-sided clot sits on the bottom wall only"
    assert one[10, 1] == 0, "no clot far from its centre"


def test_validate():
    assert P.validate(0.884, 0.05, P.Clot()) == []
    assert P.validate(0.5, 0.05, P.Clot()), "tau below range"
    assert P.validate(0.884, 0.5, P.Clot()), "speed above range"
    assert P.validate(0.884, 0.05, P.Clot(location=0.01)), "clot too close to the inlet"
    assert P.validate(0.884, 0.05, P.Clot(severity=0.99))


def test_metrics_baseline():
    rho = np.ones((1024, 256), np.float32); u = np.zeros((1024, 256, 2), np.float32)
    rho[:512] += 0.01
    m = P.compute_metrics(u, rho, P.build_mask(P.Clot(0.0)), 0.884, 0.05, baseline_dp=0.0023238658905029297)
    assert m["effort_basis"] == "measured" and abs(m["dp"] - 0.01 / 3) < 1e-6
    assert P.compute_metrics(u, rho, P.build_mask(P.Clot(0.0)), 0.6, 0.05)["effort_basis"] == "formula"


def test_cooldown():
    assert system.cooldown_minimum(10) == 30 and system.cooldown_minimum(100) == 50 and system.cooldown_minimum(10_000) == 300
    cool = system.Health(0.5, 5.0, 0.0, None, "ok", []); hot = system.Health(0.5, 5.0, 0.3, None, "critical", ["hot"])
    c = system.Cooldown(); c.start(100, now=0)
    assert c.update(cool, now=10)["active"], "still inside the minimum wait"
    assert c.update(hot, now=60)["active"], "past the minimum but the machine is hot"
    assert not c.update(cool, now=61)["active"], "minimum passed and machine cool"


def test_protocol():
    buf = io.BytesIO(protocol.encode_json({"a": 1}) + protocol.encode_msg(protocol.KIND_FRAME, b"xyz"))
    assert protocol.read_msg(buf) == (0, b'{"a":1}') and protocol.read_msg(buf) == (1, b"xyz") and protocol.read_msg(buf) is None
    fr = protocol.pack_frame(4, 2, 1, 0.0, 1.5, bytes(32))
    assert protocol.unpack_frame_header(fr) == (4, 2, 1, 0.0, 1.5) and len(fr) == 20 + 32


def test_js_geometry_parity():
    js = f"""import {{ peakHeights, throatOpen }} from '{ROOT}/web_v3/js/geometry.mjs';
    const cases = {json.dumps([[0.5, False, -1.0], [0.5, True, -1.0], [0.8, False, 0.0], [0.3, False, 1.0], [0.0, True, -1.0]])};
    console.log(JSON.stringify(cases.map(([s, sym, l]) => {{ const c = {{severity: s, symmetric: sym, lopsided: l, location: .3, length: 450}}; const p = peakHeights(c); return [p.bot, p.top, throatOpen(c)]; }})));"""
    out = json.loads(subprocess.run(["node", "--input-type=module", "-e", js], capture_output=True, text=True, check=True).stdout)
    for (s, sym, l), got in zip([[0.5, False, -1.0], [0.5, True, -1.0], [0.8, False, 0.0], [0.3, False, 1.0], [0.0, True, -1.0]], out):
        bot, top = P.peak_heights(P.Clot(s, sym, lopsided=l))
        assert got == [bot, top, P.INTERIOR - bot - top], (s, sym, l, got, (bot, top))


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn(); print("ok", name)
