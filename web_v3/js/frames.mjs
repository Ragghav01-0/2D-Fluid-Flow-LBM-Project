// Synthetic frames for charts that show geometry only (Setup) — no flow, honest about it.
import { NX, NY, INTERIOR, peakHeights, bump } from './geometry.mjs';
export function clotFrame(clot, w = 512, h = 128) {
  const { bot, top } = peakHeights(clot), data = new Float32Array(w * h);
  for (let i = 0; i < w; i++) {
    const b = bump(clot, (i + .5) / w * NX), lo = bot * b / INTERIOR, hi = 1 - top * b / INTERIOR;
    for (let j = 0; j < h; j++) { const y = 1 - (j + .5) / h; data[j * w + i] = (y < lo || y > hi) ? NaN : 0; }
  }
  return { w, h, channels: 1, vmin: 0, vmax: 1, data };
}
