// Binary frame parsing (format: web/protocol.py). Row 0 is the top of the vessel; NaN marks solid nodes.
export function parseFrame(buf) {
  const dv = new DataView(buf);
  const w = dv.getUint32(0, true), h = dv.getUint32(4, true), channels = dv.getUint32(8, true);
  return { w, h, channels, vmin: dv.getFloat32(12, true), vmax: dv.getFloat32(16, true),
           data: new Float32Array(buf.slice(20, 20 + w * h * channels * 4)) };
}
