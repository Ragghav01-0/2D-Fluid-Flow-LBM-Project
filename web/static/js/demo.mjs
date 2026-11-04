// Demo solver: an analytic stand-in (NOT lattice Boltzmann) so the whole UI works without the real solver.
// Parabolic profile in the open part of the vessel + mass conservation. Everything it produces is labelled "Demo".
import { NX, NY, INTERIOR, peakHeights, bump, throatOpen } from './geometry.mjs';

const W = 256, Hh = 64;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** One flow-field frame for these settings; `ramp` (0..1) is how developed the flow is. */
export function demoFrame(settings, ramp = 1) {
  const c = settings.clot, ux = settings.ux_target, { bot, top } = peakHeights(c);
  const data = new Float32Array(W * Hh); let vmax = 1e-6;
  for (let i = 0; i < W; i++) {
    const b = bump(c, (i + 0.5) / W * NX), lo = bot * b / INTERIOR, hi = 1 - top * b / INTERIOR, wd = hi - lo;
    const uMax = 1.5 * ux * ramp / wd;
    for (let j = 0; j < Hh; j++) {
      const y = 1 - (j + 0.5) / Hh;
      if (y < lo || y > hi) { data[j * W + i] = NaN; continue; }
      const s = (y - lo) / wd;
      let v = uMax * 4 * s * (1 - s);
      if (i / W > c.location + c.length / NX / 2 && b === 0) v *= 1 + 0.18 * (c.severity ** 2) * Math.sin(2 * Math.PI * (i / W * 9)) * Math.sin(Math.PI * s) * Math.exp(-(i / W - c.location) * 3) * ramp;
      data[j * W + i] = v; vmax = Math.max(vmax, v);
    }
  }
  return { w: W, h: Hh, channels: 1, vmin: 0, vmax, data };
}

export function demoSummary(settings, steps, reason) {
  const c = settings.clot, ux = settings.ux_target, open = throatOpen(c) / INTERIOR;
  const speedUp = 1 / open, effort = Math.pow(open, -2.6);
  return { reason, steps, flow_throughs: steps * ux / NX, residual: reason === 'converged' ? 9e-6 : 4e-4, elapsed_s: 12,
    avg_mlups: null, overall_mlups: null, severity: 1 - open, open_rows_at_throat: throatOpen(c),
    peak_speed: 1.5 * ux * speedUp, peak_speed_x: Math.round(c.location * NX), speed_up: speedUp,
    speed_over_inlet: 1.5 * speedUp, dp: 0.0023 * effort, dp_baseline: 0.0023, effort_ratio: effort, effort_basis: 'measured',
    reynolds: ux * INTERIOR / ((settings.tau_s - 0.5) / 3) };
}

/** A fake run: emits the same events the live server does, on a timer. */
export class DemoRun {
  constructor(settings, emit) {
    this.s = settings; this.emit = emit; this.step = 0; this.paused = false; this.stopped = false;
    const ftSteps = NX / settings.ux_target, st = settings.stop;
    this.total = st.mode === 'steps' ? st.steps : st.mode === 'converge' ? Math.round(ftSteps * (1.7 + 2.9 * settings.clot.severity)) : 1e9;
    this.perTick = Math.max(50, Math.round((st.mode === 'manual' ? 600 : this.total / 160)));
    this.res = []; this.t = setInterval(() => this.tick(), 70);
    emit({ type: 'status', state: 'preparing', step: 0 });
    setTimeout(() => emit({ type: 'status', state: 'running', step: 0 }), 600);
  }
  tick() {
    if (this.paused || this.stopped || performance.now() < (this.startAt ??= performance.now() + 650)) return;
    this.step += this.perTick;
    const ft = this.step * this.s.ux_target / NX, ramp = 1 - Math.exp(-ft / 0.5);
    const residual = Math.max(0.4 * Math.exp(-ft / 0.45), 8e-6);
    this.emit({ type: 'telemetry', step: this.step, ft, residual, dp: 0.0023 * Math.pow(throatOpen(this.s.clot) / INTERIOR, -2.6) * ramp,
                peak_u: 0.075 * ramp, peak_wss: null, mlups: null });
    this.emit({ type: 'frame', frame: demoFrame(this.s, ramp) });
    if (this.stopped) return;
    if (this.step >= this.total) this.finish(this.s.stop.mode === 'converge' ? 'converged' : 'steps');
  }
  finish(reason) {
    clearInterval(this.t); this.stopped = true;
    this.emit({ type: 'done', reason, summary: demoSummary(this.s, this.step, reason) });
  }
  command(cmd) {
    if (cmd === 'pause') { this.paused = true; this.emit({ type: 'status', state: 'paused', step: this.step }); }
    if (cmd === 'resume') { this.paused = false; this.emit({ type: 'status', state: 'running', step: this.step }); }
    if (cmd === 'stop') this.finish('stopped');
  }
}
