// Binary frame -> canvas, colour map, legend. Frame format: see web/protocol.py.
const STOPS = [[0, [48, 18, 59]], [.15, [70, 107, 227]], [.3, [40, 188, 235]], [.45, [50, 242, 150]],
  [.6, [164, 252, 60]], [.75, [250, 186, 57]], [.9, [225, 80, 22]], [1, [122, 4, 3]]];
const LUT = (() => {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255; let k = 0;
    while (k < STOPS.length - 2 && t > STOPS[k + 1][0]) k++;
    const [t0, c0] = STOPS[k], [t1, c1] = STOPS[k + 1], f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * f;
  }
  return lut;
})();
const SOLID = [34, 42, 56];

export function parseFrame(buf) {
  const dv = new DataView(buf);
  const w = dv.getUint32(0, true), h = dv.getUint32(4, true), channels = dv.getUint32(8, true);
  return { w, h, channels, vmin: dv.getFloat32(12, true), vmax: dv.getFloat32(16, true),
           data: new Float32Array(buf.slice(20, 20 + w * h * channels * 4)) };
}

const scratch = document.createElement('canvas');
/** Draws a frame scaled to fill `canvas`. `vmax` overrides the frame's own maximum (shared colour scale in Compare). */
export function drawFrame(canvas, f, vmax = f.vmax) {
  scratch.width = f.w; scratch.height = f.h;
  const sg = scratch.getContext('2d'), img = sg.createImageData(f.w, f.h), px = img.data, rng = (vmax - f.vmin) || 1;
  for (let i = 0; i < f.w * f.h; i++) {
    const v = f.data[i], o = i * 4;
    if (!Number.isFinite(v)) { px[o] = SOLID[0]; px[o + 1] = SOLID[1]; px[o + 2] = SOLID[2]; px[o + 3] = 255; continue; }
    const k = ((Math.min(1, Math.max(0, (v - f.vmin) / rng)) * 255) | 0) * 3;
    px[o] = LUT[k]; px[o + 1] = LUT[k + 1]; px[o + 2] = LUT[k + 2]; px[o + 3] = 255;
  }
  sg.putImageData(img, 0, 0);
  const g = canvas.getContext('2d');
  if (canvas.width !== f.w * 2 || canvas.height !== f.h * 2) { canvas.width = f.w * 2; canvas.height = f.h * 2; }
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(scratch, 0, 0, canvas.width, canvas.height);
}

export function drawLegend(canvas) {
  const g = canvas.getContext('2d'), im = g.createImageData(256, 1);
  for (let i = 0; i < 256; i++) { im.data.set([LUT[i * 3], LUT[i * 3 + 1], LUT[i * 3 + 2], 255], i * 4); }
  canvas.width = 256; canvas.height = 1; g.putImageData(im, 0, 0);
}
