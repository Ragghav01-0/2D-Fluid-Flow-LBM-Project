// Clot geometry. Mirrors web/physics.py (the server is the authority; this only draws the preview and sizes the sliders).
export const NX = 1024, NY = 256, INTERIOR = NY - 2, EDGE_MARGIN = 16;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function peakHeights(c) {
  const total = Math.round(c.severity * INTERIOR);
  const e = c.symmetric ? 0 : clamp(c.lopsided ?? -1, -1, 1);
  const top = Math.round(total * (1 + e) / 2);
  return { bot: total - top, top };
}

/** 0..1 cosine bump at node position x */
export function bump(c, x) {
  const d = x - c.location * NX;
  return Math.abs(d) >= c.length / 2 ? 0 : 0.5 * (1 + Math.cos(2 * Math.PI * d / c.length));
}

export const throatOpen = c => INTERIOR - Object.values(peakHeights(c)).reduce((a, b) => a + b, 0);

export function locationRange(length) {
  const half = length / 2;
  return [(EDGE_MARGIN + half) / NX, 1 - (EDGE_MARGIN + half) / NX];
}

/** Our own rough wording, labelled as such in the UI. */
export function severityWord(s) {
  if (s < 0.05) return 'Clear';
  if (s < 0.3) return 'Mild';
  if (s < 0.5) return 'Moderate';
  if (s < 0.7) return 'Significant';
  return 'Severe';
}

/** Draws the vessel cross-section (walls + clot) into a canvas; `ghost` is an optional second clot drawn dashed. */
export function drawVessel(canvas, c, ghost = null, css = getComputedStyle(document.documentElement)) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const T = 14, B = H - 14, Hc = B - T;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0e1520'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#16202e'; g.fillRect(0, T, W, Hc);
  const path = (cl, side, close) => {
    const { bot, top } = peakHeights(cl), peak = side === 'top' ? top : bot;
    g.beginPath(); g.moveTo(0, side === 'top' ? T : B);
    for (let i = 0; i <= 300; i++) {
      const x = i / 300, h = peak / INTERIOR * bump(cl, x * NX) * Hc;
      g.lineTo(x * W, side === 'top' ? T + h : B - h);
    }
    g.lineTo(W, side === 'top' ? T : B);
    if (close) g.closePath();
  };
  if (ghost) {
    g.save(); g.setLineDash([6, 5]); g.strokeStyle = 'rgba(200,211,224,.55)'; g.lineWidth = 1.5;
    for (const s of ['top', 'bot']) { path(ghost, s, false); g.stroke(); }
    g.restore();
  }
  g.fillStyle = 'rgba(255,170,90,.38)'; g.strokeStyle = '#ffa95a'; g.lineWidth = 2;
  for (const s of ['top', 'bot']) { path(c, s, true); g.fill(); path(c, s, false); g.stroke(); }
  g.strokeStyle = '#8795a8'; g.lineWidth = 2; g.beginPath();
  g.moveTo(0, T); g.lineTo(W, T); g.moveTo(0, B); g.lineTo(W, B); g.stroke();
  g.fillStyle = 'rgba(200,211,224,.6)'; g.font = '13px ui-monospace, monospace';
  g.fillText('flow →', 10, H / 2 + 4);
}
