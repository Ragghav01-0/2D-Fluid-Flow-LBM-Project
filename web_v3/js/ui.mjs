// Small DOM helpers shared by every screen.
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}
export const $ = (r, s) => r.querySelector(s);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function fmtTime(sec) {
  if (!Number.isFinite(sec)) return '—';
  sec = Math.round(sec);
  return sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')} s`;
}
export function fmtNum(v, d = 3) {
  if (v == null || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  return a === 0 ? '0' : a < 0.001 || a >= 1e5 ? v.toExponential(2) : v.toFixed(d);
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
export function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

export function sparkline(canvas, data, color) {
  const dpr = devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return;
  if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  if (data.length < 2) return;
  let mn = Math.min(...data), mx = Math.max(...data);
  if (mx - mn < 1e-12) mx = mn + 1;
  g.strokeStyle = color; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
  data.forEach((v, i) => {
    const x = i / (data.length - 1) * W, y = H - 4 - (v - mn) / (mx - mn) * (H - 8);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  });
  g.stroke();
}
