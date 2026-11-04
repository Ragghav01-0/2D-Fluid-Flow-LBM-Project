import { h, $, fmtTime, fmtNum, sparkline, clamp } from '../ui.mjs';
import { drawFrame, drawLegend } from '../render.mjs';

// Plain-language narrative, by how far the liquid has travelled (flow-throughs).
const PHASES = [
  [0.00, 'Starting up', 'The liquid starts from rest and the flow is building. Early numbers are not meaningful yet.'],
  [0.15, 'Pressure builds', 'Liquid slows down in front of the blockage and pressure builds up behind it.'],
  [0.40, 'Squeezing through', 'The flow speeds up as it is forced through the narrow gap. Reds and oranges mark the fastest liquid.'],
  [0.90, 'Behind the blockage', 'The jet spreads out again behind the blockage, leaving slower, swirling liquid there.'],
  [1.60, 'Settling down', 'The pattern is nearly steady. Small changes are all that is left.'],
];
const phaseFor = ft => PHASES.reduce((p, q) => (ft >= q[0] ? q : p));

export function mount(el, ctx) {
  const { S, A } = ctx;
  const cv = h('canvas', { width: 512, height: 128, 'aria-label': 'Live flow field' });
  const legend = h('canvas', { 'aria-hidden': 'true' });
  const lMax = h('span', {}, '—');
  const phaseBadge = h('div', { class: 'badge l' }, 'Starting up');
  const veil = h('div', { class: 'veil' }, h('div', {}, h('b', {}, 'Preparing…'), h('p', { class: 'small', style: 'color:#c8d3e0' }, 'The first start takes a few seconds while the solver gets ready.')));
  const narrative = h('p', { class: 'lede', style: 'font-size:17px' });
  const bar = h('i'); const barTxt = h('span', { class: 'small' });
  const cards = {};
  const card = (id, label) => (cards[id] = h('div', { class: 'v' }, '—'), h('div', { class: 'card' }, h('div', { class: 'k' }, label), cards[id]));
  const dpSpark = h('canvas', { class: 'spark' }), resSpark = h('canvas', { class: 'spark' });
  const banners = h('div', { class: 'stack' });
  const failBox = h('div', { class: 'stack' });
  const pauseBtn = h('button', { class: 'btn' }, 'Pause');
  const stopBtn = h('button', { class: 'btn danger' }, 'Stop');
  const stopNote = h('p', { class: 'small' });
  const title = h('h2', {}, 'Simulation running');

  el.append(h('div', { class: 'stack' },
    h('div', { class: 'row between' }, title, h('div', { class: 'row' }, pauseBtn, stopBtn)),
    banners, failBox,
    h('div', { class: 'field' }, cv, phaseBadge, h('div', { class: 'badge r' }, 'Speed of the liquid'),
      h('div', { class: 'axis', style: 'left:12px' }, 'inlet →'), h('div', { class: 'axis', style: 'right:12px' }, '→ outlet'), veil,
      h('div', { class: 'legend' }, h('span', {}, '0'), legend, lMax)),
    narrative,
    h('div', {}, h('div', { class: 'progress' }, bar), h('div', { class: 'row between', style: 'margin-top:6px' }, barTxt, stopNote)),
    h('div', { class: 'cols4' }, card('step', 'Steps'), card('ft', 'Times across the vessel'), card('speed', 'Solver speed'), card('res', 'Still changing by')),
    h('div', { class: 'cols2' },
      h('div', { class: 'card' }, h('div', { class: 'k' }, 'Pressure needed to push the liquid through'), dpSpark),
      h('div', { class: 'card' }, h('div', { class: 'k' }, 'How much the flow is still changing (lower = more settled)'), resSpark))));
  drawLegend(legend);
  if (S.frame) drawFrame(cv, S.frame), (lMax.textContent = fmtNum(S.frame.vmax, 3));

  function paintTelemetry() {
    const t = S.tel; if (!t) return;
    cards.step.textContent = t.step.toLocaleString();
    cards.ft.textContent = t.ft.toFixed(2);
    cards.speed.textContent = t.mlups ? `${t.mlups.toFixed(0)} MLUPS` : '—';
    cards.res.textContent = t.residual < 1 ? t.residual.toExponential(1) : '—';
    const [, name, text] = phaseFor(t.ft);
    phaseBadge.textContent = name; narrative.textContent = text;
    sparkline(dpSpark, S.series.dp, '#0a84ff'); sparkline(resSpark, S.series.res, '#ff6b9d');
    const st = (S.state.settings || {}).stop || { mode: 'converge' };
    let p = null;
    if (st.mode === 'steps') p = t.step / st.steps;
    else if (st.mode === 'converge') p = clamp((Math.log10(0.4) - Math.log10(Math.max(t.residual, 1e-12))) / (Math.log10(0.4) + 5), 0, 0.99);
    bar.style.width = p == null ? '100%' : `${Math.round(p * 100)}%`;
    bar.style.opacity = p == null ? .25 : 1;
    barTxt.textContent = st.mode === 'steps' ? `${Math.round(p * 100)}% of the chosen length` : st.mode === 'converge' ? `Settling… ${Math.round(p * 100)}%` : 'Running until you press Stop';
    stopNote.textContent = '';
  }
  function paintState() {
    const st = S.state.state;
    veil.hidden = st !== 'preparing' && !(st === 'paused');
    veil.firstChild.firstChild.textContent = st === 'paused' ? 'Paused' : 'Preparing…';
    veil.firstChild.lastChild.textContent = st === 'paused' ? 'Press Resume to continue.' : 'The first start takes a few seconds while the solver gets ready.';
    pauseBtn.textContent = st === 'paused' ? 'Resume' : 'Pause';
    const active = ['preparing', 'running', 'paused'].includes(st);
    pauseBtn.disabled = !active || st === 'preparing'; stopBtn.disabled = !active;
    if (st === 'idle' && !S.failure && !S.tel) { banners.replaceChildren(h('div', { class: 'notice' }, 'No run is going. ', h('a', { href: '#/setup' }, 'Set one up'))); }
  }
  function paintWarnings() {
    const out = [];
    const sys = S.system;
    if (sys && sys.level !== 'ok') {
      out.push(h('div', { class: `notice ${sys.level === 'critical' ? 'bad' : 'warn'}` }, sys.messages.join(' '),
        sys.level === 'critical' && S.state.state === 'running' ? [' ', h('button', { class: 'btn', style: 'padding:4px 14px', onclick: () => A.command('pause') }, 'Pause now')] : ' The run keeps going; you can pause it any time.'));
    }
    if (S.warnings.length) out.push(h('div', { class: 'notice warn' }, 'Part of the flow is getting very fast or dense. The result may be less reliable.'));
    banners.replaceChildren(...out);
  }
  function paintFailure() {
    const f = S.failure; failBox.replaceChildren();
    if (!f) return;
    veil.hidden = true; title.textContent = 'Simulation stopped';
    const t = f.technical || {};
    failBox.append(h('div', { class: 'notice bad stack' },
      h('b', {}, f.title), h('span', {}, f.message),
      h('div', { class: 'row' },
        f.suggested ? h('button', { class: 'btn primary', onclick: () => { S.draft = { ...S.draft, ...f.suggested.clot, tau_s: f.suggested.tau_s, ux_target: f.suggested.ux_target, stop: S.draft.stop }; ctx.go('#/setup'); } }, 'Use gentler settings') : null,
        h('a', { class: 'btn', href: '#/setup' }, 'Change settings')),
      h('details', { class: 'expert' }, h('summary', {}, 'Technical details (Expert)'),
        h('div', { class: 'body' }, t.log ? h('pre', { class: 'small mono', style: 'white-space:pre-wrap' }, t.log) : h('dl', { class: 'kv' },
          ...[['error code', t.code], ['step', t.step], ['where (x, y)', t.x != null ? `${t.x}, ${t.y}` : null], ['density ρ', fmtNum(t.rho, 5)], ['speed² (u²)', fmtNum(t.u2, 5)],
              ['ux', fmtNum(t.ux, 5)], ['uy', fmtNum(t.uy, 5)], ['populations f0…f8', (t.f || []).map(v => v.toFixed(4)).join('  ')]]
            .filter(([, v]) => v != null && v !== '—' && v !== '').flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]))))));
  }

  pauseBtn.onclick = () => A.command(S.state.state === 'paused' ? 'resume' : 'pause');
  stopBtn.onclick = () => { A.command('stop'); stopNote.textContent = 'Stopping…'; };
  const offs = [A.on('ui:frame', f => { drawFrame(cv, f); lMax.textContent = fmtNum(f.vmax, 3); veil.hidden = true; }),
    A.on('ui:telemetry', paintTelemetry), A.on('ui:state', () => { paintState(); paintWarnings(); }),
    A.on('ui:system', paintWarnings), A.on('ui:warning', paintWarnings), A.on('ui:failed', () => { paintFailure(); paintState(); })];
  paintState(); paintTelemetry(); paintWarnings(); paintFailure();
  return () => offs.forEach(f => f());
}
