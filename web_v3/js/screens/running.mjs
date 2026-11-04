import { h, fmtNum, sparkline, clamp } from '../ui.mjs';
import { icon } from '../icons.mjs';
import { FlowStage } from '../stage.mjs';

// Plain-language narrative by how far the liquid has travelled (times across the vessel).
const PHASES = [
  [0, 'Starting up', 'The liquid starts from rest and the flow is building. Early numbers are not meaningful yet.'],
  [.15, 'Pressure builds', 'Liquid slows in front of the blockage and pressure builds up behind it.'],
  [.4, 'Squeezing through', 'The flow speeds up as it is forced through the narrow gap. Orange marks the fastest liquid.'],
  [.9, 'Behind the blockage', 'The jet spreads out again behind the blockage, leaving slower, swirling liquid there.'],
  [1.6, 'Settling down', 'The pattern is nearly steady. Only small changes are left.'],
];
const TRACK = ['Starting up', 'Pressure builds', 'Squeezing through', 'Settling down'];
const phaseIdx = ft => (ft >= 1.0 ? 3 : ft >= .4 ? 2 : ft >= .15 ? 1 : 0);
const phaseFor = ft => PHASES.reduce((p, q) => (ft >= q[0] ? q : p));

export function mount(el, ctx) {
  const { S, A } = ctx;
  const phone = matchMedia('(max-width: 600px)').matches;
  let closeup = phone;
  const clotX = () => S.state.settings?.clot?.location ?? .33, closeView = () => { const sp = .4; return [Math.max(0, Math.min(1 - sp, clotX() - sp / 2)), sp]; };
  const stage = new FlowStage({ mode: 'frames', ink: true, view: closeup ? closeView() : [0, 1], compact: true });
  const veil = h('div', { class: 'veil' }, h('div', {}, h('b', {}, 'Getting ready'), h('p', { class: 'small muted' }, 'The first start takes a few seconds while the solver warms up.')));
  const phaseTag = h('span', { class: 'stage-phase' }, 'Starting up');
  stage.el.append(veil);
  const zoom = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'View' }, [['whole', 'Whole vessel'], ['close', 'Close-up']].map(([v, l]) =>
    h('button', { role: 'radio', 'aria-checked': String((v === 'close') === closeup), onclick: () => { closeup = v === 'close'; [...zoom.children].forEach(x => x.setAttribute('aria-checked', String(x.textContent === l))); const [x0, sp] = closeup ? closeView() : [0, 1]; stage.setView(x0, sp); } }, l)));
  const title = h('h1', {}, 'Running'), narrative = h('p', { class: 'lede', style: 'max-width:none;font-size:19px' });
  const track = h('ol', { class: 'track' }, TRACK.map(n => h('li', {}, n)));
  const bar = h('i'), barTxt = h('span', { class: 'small muted' }), stopNote = h('span', { class: 'small muted' });
  const cards = {}, time = (id, label) => { cards[id] = h('b', {}, '—'); return h('div', {}, h('span', { class: 'small muted' }, label), cards[id]); };
  const dpSpark = h('canvas', { class: 'spark' }), resSpark = h('canvas', { class: 'spark' });
  const banners = h('div', { class: 'banners' }), failBox = h('div');
  const pauseBtn = h('button', { class: 'btn' }, icon('pause'), 'Pause'), stopBtn = h('button', { class: 'btn danger' }, icon('stop'), 'Stop');
  el.append(h('div', { class: 'running' },
    h('div', { class: 'run-stage' }, stage.el, h('div', { class: 'stage-bar' }, phaseTag, zoom)),
    h('div', { class: 'run-panel' },
      h('div', { class: 'row between' }, title, h('div', { class: 'row' }, pauseBtn, stopBtn)), banners, failBox, narrative, track,
      h('div', { style: 'display:grid;gap:8px' }, h('div', { class: 'bar' }, bar), h('div', { class: 'row between' }, barTxt, stopNote)),
      h('div', { class: 'run-meta' }, h('div', { class: 'times' }, time('step', 'Steps'), time('ft', 'Times across'), time('speed', 'Solver speed'))),
      h('div', { class: 'sparks' }, h('div', { class: 'card' }, h('div', { class: 'small muted' }, 'Pressure needed to push the liquid through'), dpSpark),
        h('div', { class: 'card' }, h('div', { class: 'small muted' }, 'How much the flow is still changing'), resSpark)))));
  if (S.state.settings) stage.setClot(S.state.settings.clot);
  if (S.frame) stage.setFrame(S.frame);

  const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  let lastMark = 0;
  function paintTelemetry() {
    const t = S.tel; if (!t) return;
    cards.step.textContent = t.step.toLocaleString(); cards.ft.textContent = t.ft.toFixed(2); cards.speed.textContent = t.mlups ? `${t.mlups.toFixed(0)} MLUPS` : '—';
    const [, name, text] = phaseFor(t.ft); narrative.textContent = text; phaseTag.textContent = name;
    const pi = phaseIdx(t.ft); [...track.children].forEach((li, i) => { li.className = i < pi ? 'done' : i === pi ? 'active' : ''; });
    sparkline(dpSpark, S.series.dp, css('--accent')); sparkline(resSpark, S.series.res, '#ff6482');
    const st = (S.state.settings || {}).stop || { mode: 'converge' }; let p = null;
    if (st.mode === 'steps') p = t.step / st.steps;
    else if (st.mode === 'converge') p = clamp((Math.log10(0.4) - Math.log10(Math.max(t.residual, 1e-12))) / (Math.log10(0.4) + 5), 0, 0.99);
    bar.style.width = p == null ? '100%' : `${Math.round(p * 100)}%`; bar.style.opacity = p == null ? .25 : 1;
    barTxt.textContent = st.mode === 'steps' ? `${Math.round(p * 100)}% of the chosen length` : st.mode === 'converge' ? `Settling… ${Math.round(p * 100)}%` : 'Running until you press Stop'; stopNote.textContent = '';
  }
  function paintMark() {                                   // the live callout follows the fastest liquid; updated in place, so it never re-animates
    const now = performance.now(); if (now - lastMark < 350) return; lastMark = now;
    const pk = stage.peak(), ux = (S.state.settings || {}).ux_target; if (!pk || !ux) return;
    stage.updateCallouts([{ x: pk.x, y: pk.y, figure: `${(pk.v / (1.5 * ux)).toFixed(1)}×`, label: 'faster than a clear vessel, so far' }]);
  }
  function paintState() {
    if (S.state.settings) { stage.setClot(S.state.settings.clot); if (closeup) stage.setView(...closeView()); }
    const st = S.state.state; veil.hidden = !(st === 'preparing' || st === 'paused');
    veil.querySelector('b').textContent = st === 'paused' ? 'Paused' : 'Getting ready';
    veil.querySelector('p').textContent = st === 'paused' ? 'Press Resume to continue.' : 'The first start takes a few seconds while the solver warms up.';
    pauseBtn.replaceChildren(icon(st === 'paused' ? 'play' : 'pause'), st === 'paused' ? 'Resume' : 'Pause');
    const active = ['preparing', 'running', 'paused'].includes(st); pauseBtn.disabled = !active || st === 'preparing'; stopBtn.disabled = !active;
    title.textContent = st === 'paused' ? 'Paused' : st === 'preparing' ? 'Getting ready' : S.failure ? 'Stopped' : 'Running';
    if (st === 'idle' && !S.failure && !S.tel) banners.replaceChildren(h('div', { class: 'notice' }, 'No run is going. ', h('a', { href: '#/setup' }, 'Set one up')));
  }
  function paintWarnings() {
    const out = [], sys = S.system;
    if (sys && sys.level !== 'ok') out.push(h('div', { class: `notice ${sys.level === 'critical' ? 'bad' : 'warn'}` }, sys.messages.join(' '),
      sys.level === 'critical' && S.state.state === 'running' ? [' ', h('button', { class: 'btn sm', onclick: () => A.command('pause') }, 'Pause now')] : ' The run keeps going; you can pause it any time.'));
    if (S.warnings.length) out.push(h('div', { class: 'notice warn' }, 'Part of the flow is getting very fast or dense. The result may be less reliable.'));
    banners.replaceChildren(...out);
  }
  function paintFailure() {
    const f = S.failure; failBox.replaceChildren(); if (!f) return;
    veil.hidden = true; title.textContent = 'Stopped'; const t = f.technical || {};
    failBox.append(h('div', { class: 'notice bad', style: 'display:grid;gap:12px' }, h('b', {}, f.title), h('span', {}, f.message),
      h('div', { class: 'row' }, f.suggested ? h('button', { class: 'btn primary', onclick: () => { S.draft = { ...S.draft, ...f.suggested.clot, tau_s: f.suggested.tau_s, ux_target: f.suggested.ux_target, stop: S.draft.stop }; ctx.go('#/setup'); } }, 'Use gentler settings') : null, h('a', { class: 'btn', href: '#/setup' }, 'Change settings')),
      h('details', { class: 'adv' }, h('summary', {}, 'Technical details (Expert)'),
        t.log ? h('div', { class: 'pad' }, h('pre', { class: 'small', style: 'white-space:pre-wrap;margin:0' }, t.log)) :
        h('div', { class: 'pad' }, h('dl', { class: 'summary', style: 'background:none' }, ...[['error code', t.code], ['step', t.step], ['where (x, y)', t.x != null ? `${t.x}, ${t.y}` : null], ['density ρ', fmtNum(t.rho, 5)], ['speed² (u²)', fmtNum(t.u2, 5)], ['ux', fmtNum(t.ux, 5)], ['uy', fmtNum(t.uy, 5)], ['populations f0…f8', (t.f || []).map(v => v.toFixed(3)).join(' ')]]
          .filter(([, v]) => v != null && v !== '—' && v !== '').flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]))))));
  }
  pauseBtn.onclick = () => A.command(S.state.state === 'paused' ? 'resume' : 'pause');
  stopBtn.onclick = () => { A.command('stop'); stopNote.textContent = 'Stopping…'; };
  const offs = [A.on('ui:frame', f => { stage.setFrame(f); veil.hidden = true; paintMark(); }), A.on('ui:telemetry', paintTelemetry),
    A.on('ui:state', () => { paintState(); paintWarnings(); }), A.on('ui:system', paintWarnings), A.on('ui:warning', paintWarnings), A.on('ui:failed', () => { paintFailure(); paintState(); })];
  paintState(); paintTelemetry(); paintWarnings(); paintFailure();
  return () => { offs.forEach(f => f()); stage.destroy(); };
}
