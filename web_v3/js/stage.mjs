// The flow window: the product shot. A rounded WebGL view onto the vessel.
//  - frames mode: solver frames (512x128 speed + solid mask) are blended on the GPU between the previous and the next
//    frame, so the picture moves continuously at display rate instead of stepping at the solver's frame rate.
//  - hero mode: an analytic field computed per pixel on the GPU (no CPU work at all) for the Home screen.
// Ink streaks drift with the local speed and leave comet trails; callout pills are placed in vessel coordinates.
import { h } from './ui.mjs';

const VERT = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uA, uB; uniform float uMix, uVmax, uBands, uTime, uMode, uRamp, uSev, uLoc, uLen, uTopShare;
uniform vec2 uView, uTexel; uniform vec3 uStop[6]; uniform vec3 uWall, uGround; uniform float uDark; uniform vec4 uGeo; uniform float uUseGeo;
in vec2 vUv; out vec4 o;

vec3 ramp(float t){
  t = clamp(t, 0., 1.) * 5.;
  int i = int(min(floor(t), 4.)); float f = t - float(i);
  f = f * f * (3. - 2. * f);
  vec3 a = uStop[0], b = uStop[1];
  if (i == 1) { a = uStop[1]; b = uStop[2]; } else if (i == 2) { a = uStop[2]; b = uStop[3]; }
  else if (i == 3) { a = uStop[3]; b = uStop[4]; } else if (i == 4) { a = uStop[4]; b = uStop[5]; }
  return mix(a, b, f);
}
// frame textures: r = speed, g = solid flag (1 = wall or clot)
vec2 sampleFrames(vec2 q){ return mix(texture(uA, q).rg, texture(uB, q).rg, uMix); }
// hero: an analytic parabolic flow in a vessel with a one-sided cosine clot
vec2 hero(vec2 w){
  float d = (w.x - uLoc) / uLen;
  float b = abs(d) < .5 ? .5 * (1. + cos(6.2831853 * d)) : 0.;
  float lo = uSev * b * (1. - uTopShare), hi = 1. - uSev * b * uTopShare;
  float wd = max(hi - lo, .03), s = (w.y - lo) / wd;
  float inside = smoothstep(0., .008, w.y - lo) * smoothstep(0., .008, hi - w.y);
  float v = 4. * s * (1. - s) / wd * uRamp;
  v *= 1. + .16 * sin(26. * (w.x - uLoc) - uTime * 2.2) * smoothstep(.0, .35, w.x - uLoc) * exp(-2.4 * max(w.x - uLoc, 0.)) * uSev;
  return vec2(v * inside, 1. - inside);
}
vec2 field(vec2 w){
  if (uMode > .5) return hero(w);
  vec2 q = vec2(w.x, 1. - w.y);
  return sampleFrames(q);
}
// the wall from the exact cosine clot (bottom share, top share, centre, length): perfectly smooth, independent of the solver's blocky mask
vec2 geo(vec2 w){
  float d = (w.x - uGeo.z) / uGeo.w;
  float b = abs(d) < .5 ? .5 * (1. + cos(6.2831853 * d)) : 0.;
  float lo = uGeo.x * b, hi = 1. - uGeo.y * b, dist = min(w.y - lo, hi - w.y), e = max(fwidth(w.y), 1e-4);
  return vec2(1. - smoothstep(-e, e, dist), dist);
}
void main(){
  vec2 w = vec2(uView.x + vUv.x * uView.y, vUv.y);
  vec2 s = field(w);
  float m, mw, near;
  if (uUseGeo > .5 && uMode < .5) { vec2 g = geo(w); m = g.x; mw = g.x; near = 1. - smoothstep(0., .06, g.y); }
  else {
    // no geometry given: a soft mask from the solver's own wall flag (3x3 gaussian)
    float k = uMode > .5 ? .0035 : max(uTexel.x, uTexel.y * .5) * 1.5;
    vec2 kx = vec2(k, 0.), ky = vec2(0., k * 2.);
    m = s.g * 4. + 2. * (field(w + kx).g + field(w - kx).g + field(w + ky).g + field(w - ky).g)
      + (field(w + kx + ky).g + field(w - kx + ky).g + field(w + kx - ky).g + field(w - kx - ky).g);
    m /= 16.; mw = smoothstep(.30, .70, m); near = smoothstep(.02, .45, m) * (1. - mw);
  }
  float v = clamp(s.r / max(uVmax, 1e-5), 0., 1.);
  vec3 water = ramp(pow(v, .85));
  // depth: the water just beside a wall sits in a faint shadow
  water *= 1. - .09 * near;
  // fine isotach lines, translucent, every tenth a little firmer
  float bnd = v * uBands, fw = max(fwidth(bnd), 1e-4);
  float ln = 1. - clamp(abs(fract(bnd - .5) - .5) / (fw * 1.1), 0., 1.);
  float major = mod(floor(bnd + .5), 5.) < .5 ? 1. : 0.;
  float lineA = ln * mix(.10, .20, major) * smoothstep(.02, .12, v) * (1. - smoothstep(.97, 1., v));
  vec3 lineCol = mix(vec3(0., .12, .35), vec3(1.), uDark);
  vec3 col = mix(water, lineCol, lineA);
  vec3 wall = uWall * mix(.90, 1.06, smoothstep(.5, 1., m)) ;
  col = mix(col, wall, mw);
  // a hair of rim light on the wall edge
  o = vec4(col, 1.);
}`;

const STOPS = {
  light: ['#e8eef7', '#bcd6fb', '#5aa7ff', '#5e5ce6', '#ff6482', '#ff9f0a'],
  dark: ['#1b2433', '#173f78', '#0a84ff', '#7d7aff', '#ff6482', '#ff9f0a'],
};
const HERO = { loc: .5, len: .42 };
const hexVec = hex => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
export const isDark = () => document.documentElement.dataset.theme === 'dark' ||
  (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const hexOr = (v, d) => (/^#[0-9a-f]{6}$/i.test(v) ? v : d);

export class FlowStage {
  /**
   * opts: { mode: 'frames' | 'hero', view: [x0, span] (vessel fractions), ink = true, tilt = false, float = false,
   *         bands = 10, size: [w, h] (offscreen, fixed size) }
   */
  constructor(opts = {}) {
    this.o = { mode: 'frames', view: [0, 1], ink: true, tilt: false, float: false, bands: 10, compact: false, ...opts };
    this.view = [...this.o.view]; this.viewTo = [...this.o.view];
    this.frame = null; this.rg = null; this.fw = this.fh = 0;
    this.vmaxCur = this.vmaxTgt = 0.1; this.mix = 1; this.tArrive = 0; this.interval = 40; this.uploaded = 0;
    this.visible = true; this.t = 0; this.rx = this.ry = this.trx = this.try = 0;
    this.hero = { sev: .5, ramp: 1 };
    this.glc = h('canvas', { 'aria-hidden': 'true' }); this.ic = h('canvas', { 'aria-hidden': 'true' }); this.layer = h('div', { class: 'callouts' });
    this.el = h('div', { class: `stage${this.o.float ? ' float' : ''}` }, this.glc, this.ic, this.layer);
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.fixed = this.o.size;
    this.initGL();
    this.setAspect();
    if (!this.fixed) {
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.el);
      this.io = new IntersectionObserver(es => { if (!this.el.isConnected) return; this.visible = es[es.length - 1].isIntersecting; if (this.visible) this.loop(); });
      this.io.observe(this.el);
      this.themeObs = new MutationObserver(() => this.theme()); this.themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => this.theme());
    } else this.resizeTo(...this.fixed);
    if (this.o.tilt && !this.reduce) { this.onMove = e => { this.try = ((e.clientX / innerWidth) - .5) * 7; this.trx = -((e.clientY / innerHeight) - .5) * 5; }; addEventListener('pointermove', this.onMove, { passive: true }); }
    this.seedInk(); this.theme();
    if (!this.fixed) this.loop();
  }

  /** the window's shape follows what it shows: 4:1 for the whole vessel, narrower for a close-up, so nothing is stretched */
  setAspect() { this.el.style.aspectRatio = String(Math.max(1.2, this.viewTo[1] * 4)); }

  // ---------------------------------------------------------------- GL
  initGL() {
    const gl = this.gl = this.glc.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: !!this.fixed });
    if (!gl) { this.noGL = true; return; }
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const pr = this.prog = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = [0, 1].map(() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, 1, 1, 0, gl.RG, gl.FLOAT, new Float32Array(2)); return t; });
    this.U = {}; for (const n of ['uA', 'uB', 'uMix', 'uVmax', 'uBands', 'uTime', 'uMode', 'uRamp', 'uSev', 'uLoc', 'uLen', 'uTopShare', 'uView', 'uTexel', 'uStop', 'uWall', 'uGround', 'uDark', 'uGeo', 'uUseGeo']) this.U[n] = gl.getUniformLocation(pr, n);
    this.cur = 0;
  }
  theme() {
    const dark = isDark(); this.dark = dark;
    this.stops = (dark ? STOPS.dark : STOPS.light).flatMap(hexVec);
    this.wall = hexVec(hexOr(css('--stage-wall'), dark ? '#a4b2c7' : '#8593a8')); this.ground = hexVec(hexOr(css('--stage-ground'), dark ? '#1c1c1e' : '#f5f5f7'));
  }
  resize() { const r = this.el.getBoundingClientRect(); if (r.width) this.resizeTo(r.width, r.height); }
  resizeTo(w, hh) {
    const dpr = this.fixed ? 1 : Math.min(devicePixelRatio || 1, 2); this.W = Math.max(1, Math.round(w)); this.H = Math.max(1, Math.round(hh)); this.dpr = dpr;
    for (const c of [this.glc, this.ic]) { c.width = Math.round(this.W * dpr); c.height = Math.round(this.H * dpr); }
    this.placeCallouts();
  }

  // ---------------------------------------------------------------- data
  /** a solver frame: {w,h,data(Float32, NaN = solid), vmax}. Blended with the previous one on the GPU. */
  setFrame(frame, vmax = frame?.vmax) {
    if (!frame) return;
    this.frame = frame; this.vmaxTgt = Math.max(vmax || 1e-4, 1e-4);
    const { w, h: hh, data } = frame, n = w * hh;
    if (!this.rg || this.fw !== w || this.fh !== hh) { this.rg = new Float32Array(n * 2); this.fw = w; this.fh = hh; this.first = true; }
    const rg = this.rg;
    for (let i = 0; i < n; i++) { const v = data[i]; if (v === v) { rg[i * 2] = v; rg[i * 2 + 1] = 0; } else { rg[i * 2] = 0; rg[i * 2 + 1] = 1; } }
    // let the fluid value leak into the neighbouring wall cell so interpolation at the shore does not drag the colour to zero
    for (let y = 1; y < hh - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (rg[i * 2 + 1] !== 1) continue;
      let s = 0, c = 0; for (const j of [i - 1, i + 1, i - w, i + w]) if (rg[j * 2 + 1] !== 1) { s += rg[j * 2]; c++; } if (c) rg[i * 2] = s / c; }
    const now = performance.now();
    if (this.gl) {
      const gl = this.gl, next = this.first ? 0 : 1 - this.cur, up = idx => { gl.bindTexture(gl.TEXTURE_2D, this.tex[idx]); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, w, hh, 0, gl.RG, gl.FLOAT, rg); };
      if (this.first) { up(0); up(1); this.cur = 1; this.mix = 1; this.first = false; this.vmaxCur = this.vmaxTgt; }
      else { up(next); this.cur = next; this.mix = 0; }
    }
    if (this.tArrive) this.interval = Math.min(220, Math.max(16, this.interval * .7 + (now - this.tArrive) * .3));
    this.tArrive = now; this.mode = 'frames';
  }
  /** Home: drive the analytic hero. */
  setHero({ sev, ramp }) { this.hero.sev = sev; this.hero.ramp = ramp; }
  /** the exact clot (same fields the solver was given): the wall is drawn from this geometry, not from the blocky mask */
  setClot(c) {
    if (!c) { this.geoV = null; return; }
    const total = Math.round(c.severity * 254), e = c.symmetric ? 0 : Math.max(-1, Math.min(1, c.lopsided ?? -1)), top = Math.round(total * (1 + e) / 2);
    this.geoV = [(total - top) / 254, top / 254, c.location, c.length / 1024];
  }
  setView(x0, span, snap = false) { this.viewTo = [x0, span]; if (snap) this.view = [x0, span]; this.setAspect(); this.resize(); }

  // ---------------------------------------------------------------- field lookups (for ink and for the peak)
  speedAt(u, v) {                         // u: 0..1 along the view, v: 0..1 from the top. returns [speed 0..1, solid]
    const x = this.view[0] + u * this.view[1];
    if (this.o.mode === 'hero') {
      const P = HERO, y = 1 - v, d = (x - P.loc) / P.len, b = Math.abs(d) < .5 ? .5 * (1 + Math.cos(6.2831853 * d)) : 0;
      const lo = this.hero.sev * b, hi = 1, wd = Math.max(hi - lo, .03), s = (y - lo) / wd;
      if (y < lo) return [0, 1];
      return [Math.min(1, 4 * s * (1 - s) / wd * this.hero.ramp / this.heroVmax()), 0];
    }
    if (!this.rg) return [0, 0];
    const ix = Math.min(this.fw - 1, Math.max(0, (x * this.fw) | 0)), iy = Math.min(this.fh - 1, Math.max(0, (v * this.fh) | 0)), k = iy * this.fw + ix;
    return [this.rg[k * 2] / this.vmaxCur, this.rg[k * 2 + 1]];
  }
  heroVmax() { return 1.0 / Math.max(1 - this.hero.sev, .12) * this.hero.ramp * 1.0 + .0001; }
  /** where the speed peaks in the current frame: {x (vessel 0..1), y (0 top .. 1 bottom), v} */
  peak() {
    if (!this.rg) return null; let best = -1, bi = 0; const n = this.fw * this.fh;
    for (let i = 0; i < n; i++) if (this.rg[i * 2 + 1] !== 1 && this.rg[i * 2] > best) { best = this.rg[i * 2]; bi = i; }
    return { x: (bi % this.fw + .5) / this.fw, y: ((bi / this.fw | 0) + .5) / this.fh, v: best };
  }

  // ---------------------------------------------------------------- drawing
  draw(dt) {
    const gl = this.gl; if (!gl) return;
    this.t += dt;
    if (this.mix < 1) this.mix = Math.min(1, (performance.now() - this.tArrive) / this.interval);
    this.vmaxCur += (this.vmaxTgt - this.vmaxCur) * Math.min(1, dt * 7);
    for (let i = 0; i < 2; i++) this.view[i] += (this.viewTo[i] - this.view[i]) * Math.min(1, dt * 9);
    const hero = this.o.mode === 'hero', U = this.U;
    gl.viewport(0, 0, this.glc.width, this.glc.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[1 - this.cur]); gl.uniform1i(U.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex[this.cur]); gl.uniform1i(U.uB, 1);
    gl.uniform1f(U.uMix, this.mix); gl.uniform1f(U.uVmax, hero ? this.heroVmax() : this.vmaxCur); gl.uniform1f(U.uBands, this.o.bands); gl.uniform1f(U.uTime, this.t);
    gl.uniform1f(U.uMode, hero ? 1 : 0); gl.uniform1f(U.uRamp, this.hero.ramp); gl.uniform1f(U.uSev, this.hero.sev); gl.uniform1f(U.uLoc, HERO.loc); gl.uniform1f(U.uLen, HERO.len); gl.uniform1f(U.uTopShare, 0);
    gl.uniform2f(U.uView, this.view[0], this.view[1]); gl.uniform2f(U.uTexel, 1 / Math.max(this.fw, 1), 1 / Math.max(this.fh, 1));
    gl.uniform4fv(U.uGeo, this.geoV || [0, 0, .5, .4]); gl.uniform1f(U.uUseGeo, this.geoV ? 1 : 0);
    gl.uniform3fv(U.uStop, this.stops); gl.uniform3fv(U.uWall, this.wall); gl.uniform3fv(U.uGround, this.ground); gl.uniform1f(U.uDark, this.dark ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  /** one still render, used for history thumbnails */
  renderOnce() { this.draw(0.016); }
  snapshot(type = 'image/jpeg', q = .86) { this.renderOnce(); return this.glc.toDataURL(type, q); }

  // ---------------------------------------------------------------- ink: streaks with comet trails
  seedInk() { this.parts = Array.from({ length: 220 }, () => ({ u: Math.random(), v: Math.random(), a: Math.random() })); }
  stepInk(dt) {
    const c = this.ic.getContext('2d'), W = this.W, H = this.H, dpr = this.dpr || 1;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.o.ink || this.reduce || (this.o.mode === 'frames' && !this.rg)) { c.clearRect(0, 0, W, H); return; }
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(0, 0, W, H);          // fade the trails
    c.globalCompositeOperation = 'source-over'; c.lineCap = 'round'; c.lineWidth = 1.5;
    const span = this.view[1], k = dt * 0.5;
    for (const p of this.parts) {
      const [s, solid] = this.speedAt(p.u, p.v);
      if (solid > .5) { p.u = Math.random() * .04; p.v = Math.random(); continue; }
      const du = (0.02 + s * 0.55) * k / span;
      const x0 = p.u * W, x1 = (p.u + du) * W, y = p.v * H;
      c.strokeStyle = `rgba(255,255,255,${(.22 + .5 * Math.min(1, s * 1.3)) * (this.dark ? .85 : 1)})`;
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
      p.u += du; if (p.u > 1) { p.u = 0; p.v = Math.random(); }
    }
  }

  loop() {
    cancelAnimationFrame(this.raf); let last = performance.now();
    const tick = now => {
      if (!this.visible || !this.el.isConnected) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (this.o.tilt) { this.rx += (this.trx - this.rx) * Math.min(1, dt * 4); this.ry += (this.try - this.ry) * Math.min(1, dt * 4); this.el.style.setProperty('--rx', this.rx.toFixed(2) + 'deg'); this.el.style.setProperty('--ry', this.ry.toFixed(2) + 'deg'); }
      this.draw(this.reduce ? 0 : dt); this.stepInk(dt); this.placeCallouts();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  destroy() {
    cancelAnimationFrame(this.raf); this.visible = false; this.ro?.disconnect(); this.io?.disconnect(); this.themeObs?.disconnect();
    if (this.onMove) removeEventListener('pointermove', this.onMove);
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }

  // ---------------------------------------------------------------- callouts: glass pills pinned to vessel coordinates
  /** list: [{x (vessel 0..1), y (0 top..1 bottom), figure, label, dir: 'r'|'l', dy}]. They spring in, staggered. */
  callouts(list, { animate = true } = {}) {
    this.items = list; this.layer.replaceChildren();
    this.nodes = list.map((c, i) => {
      const n = h('div', { class: `callout${animate ? ' pop' : ''}${this.o.compact ? ' compact' : ''}`, style: `--d:${i * 140}ms` }, h('i', { class: 'pin' }),
        h('div', { class: 'pill', ...(this.o.compact ? { tabindex: 0, title: `${c.figure} ${c.label || ''}`.trim(), role: 'note' } : {}) }, h('b', {}, c.figure), c.label ? h('span', {}, c.label) : null));
      this.layer.append(n); return n;
    });
    this.placeCallouts(true);
  }
  /** update live callouts in place (no re-animation); falls back to a rebuild when the count changes */
  updateCallouts(list) {
    if (!this.nodes || this.nodes.length !== list.length) return this.callouts(list, { animate: false });
    this.items = list;
    list.forEach((c, i) => { const [b, sp] = [this.nodes[i].querySelector('b'), this.nodes[i].querySelector('span')]; if (b.textContent !== c.figure) b.textContent = c.figure; if (sp && sp.textContent !== (c.label || '')) sp.textContent = c.label || ''; });
    this.placeCallouts();
  }
  clearCallouts() { this.items = []; this.nodes = []; this.layer.replaceChildren(); }
  placeCallouts(force) {
    if (!this.items?.length || !this.W) return;
    this.items.forEach((c, i) => {
      const u = (c.x - this.view[0]) / this.view[1], n = this.nodes[i];
      const on = u > .04 && u < .96; n.style.display = on ? '' : 'none';
      if (!on) return;
      n.style.left = `${u * 100}%`; n.style.top = `${c.y * 100}%`;
      const pw = n.querySelector('.pill').offsetWidth + 30, x = u * this.W, fitsR = x + pw < this.W - 6, fitsL = x - pw > 6;
      const pref = c.dir ? c.dir === 'l' : u > .62, left = pref ? (fitsL || !fitsR) : !(fitsR || !fitsL);       // honour the preference when it fits, else the side that does
      n.classList.toggle('flip', left); n.style.setProperty('--dy', `${c.dy || 0}px`);
    });
  }
}

/** A still image of a finished run, for lists. Draws once, snapshots, and frees the GL context. */
export function snapshot(frame, { w = 640, hgt = 160, vmax, clot } = {}) {
  const s = new FlowStage({ ink: false, size: [w, hgt] }); s.setClot(clot); s.setFrame(frame, vmax); s.mix = 1; s.vmaxCur = s.vmaxTgt;
  const url = s.snapshot(); s.destroy(); return url;
}
