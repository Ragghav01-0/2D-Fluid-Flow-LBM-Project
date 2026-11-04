import { h, $, fmtTime, fmtClock, clamp } from '../ui.mjs';
import { drawVessel, locationRange, severityWord, throatOpen, INTERIOR, NX } from '../geometry.mjs';

const SIZES = [
  { id: 'quick', name: 'Quick', blurb: 'A rough picture. The flow may still be settling.' },
  { id: 'medium', name: 'Medium', blurb: 'Good for most blockages.' },
  { id: 'long', name: 'Long', blurb: 'A careful run for severe blockages.' },
];

export function mount(el, ctx) {
  const { S, A } = ctx;
  const d = S.draft;                          // the draft survives leaving and coming back
  const limits = S.hello.limits, lengths = S.hello.lengths;
  const stepsPerSec = () => S.tel?.mlups ? S.tel.mlups * 1e6 / (NX * 256) : 700;
  const ftSteps = () => NX / d.ux_target;
  const estSteps = () => d.stop.mode === 'steps' ? (d.stop.steps ?? lengths[d.stop.size] * ftSteps()) : ftSteps() * (1.7 + 2.9 * d.severity);
  const estTime = () => estSteps() / stepsPerSec();

  const preview = h('canvas', { width: 1024, height: 256, style: 'width:100%;display:block;aspect-ratio:4/1', 'aria-label': 'Drawing of the vessel and the blockage' });
  const readout = h('div', { class: 'small mono', style: 'padding:10px 14px;background:var(--field-bg);color:var(--field-text);border-top:1px solid var(--field-line)' });
  const runBtn = h('button', { class: 'btn primary big', style: 'width:100%' }, 'Run simulation');
  const runNote = h('p', { class: 'small', style: 'text-align:center' });
  const problems = h('div', { class: 'stack' });

  // -------- controls
  const sevVal = h('span', { class: 'val' }), locVal = h('span', { class: 'val' });
  const sev = h('input', { type: 'range', min: 0, max: Math.round(limits.severity[1] * 100), step: 1, value: Math.round(d.severity * 100), 'aria-label': 'Stenosis severity' });
  const loc = h('input', { type: 'range', min: 0, max: 1000, step: 1, 'aria-label': 'Clot location' });
  const segShape = seg('shape', [['sym', 'Both walls'], ['one', 'One wall']], d.symmetric ? 'sym' : 'one');
  const lengthMode = h('div', { class: 'choice' });

  function seg(name, opts, val) {
    return h('div', { class: 'seg', role: 'radiogroup' }, opts.map(([v, label]) =>
      h('label', {}, h('input', { type: 'radio', name, value: v, checked: v === val }), h('span', {}, label))));
  }
  function stopChoices() {
    const mk = (id, name, blurb, time) => h('label', {}, h('input', { type: 'radio', name: 'stop', value: id, checked: current() === id }),
      h('span', {}, h('b', {}, name, h('span', { class: 'tag' }, time)), h('span', { class: 'help' }, blurb)));
    const current = () => d.stop.mode === 'steps' ? (d.stop.size || 'custom') : d.stop.mode;
    const t = s => '≈ ' + fmtTime(s * ftSteps() / stepsPerSec());
    lengthMode.replaceChildren(
      mk('converge', 'Until it settles', 'Stops by itself once the flow stops changing. Best answer.', '≈ ' + fmtTime(ftSteps() * (1.7 + 2.9 * d.severity) / stepsPerSec())),
      ...SIZES.map(s => mk(s.id, s.name, s.blurb, t(lengths[s.id]))),
      mk('manual', 'Until I stop it', 'Runs until you press Stop. Good for watching.', 'no limit'));
  }

  // -------- expert panel
  const tauIn = num(d.tau_s, limits.tau, 0.001), uxIn = num(d.ux_target, limits.ux, 0.005), lenIn = num(d.length, limits.length, 10), stepsIn = num(d.stop.steps ?? '', [500, 2e6], 500);
  const lopSel = h('div', {}, h('label', { class: 'small' }, 'Share of the blockage on the top wall'), h('input', { type: 'range', min: -100, max: 100, step: 5, value: Math.round(d.lopsided * 100) }), h('span', { class: 'small mono' }));
  const expertKv = h('dl', { class: 'kv' });
  const risk = h('div', { class: 'stack' });
  function num(v, [lo, hi], step) { return h('input', { type: 'number', value: v, min: lo, max: hi, step }); }
  const field = (label, input, help) => h('div', {}, h('label', { class: 'small', style: 'display:block;margin-bottom:4px' }, label), input, help ? h('p', { class: 'help small', style: 'margin-top:4px' }, help) : null);

  const expert = h('details', { class: 'expert' },
    h('summary', {}, 'Expert settings'),
    h('div', { class: 'body' },
      field(`Relaxation time τ (${limits.tau[0]}–${limits.tau[1]})`, tauIn, 'How "thick" the liquid is. The default 0.884 is the tested blood-like setting; lower values are thinner and less stable.'),
      field(`Inlet speed (${limits.ux[0]}–${limits.ux[1]}, lattice units)`, uxIn, 'How fast liquid enters the vessel.'),
      field(`Clot length (${limits.length[0]}–${limits.length[1]} nodes)`, lenIn),
      lopSel,
      field('Exact number of steps (leave empty to use the run length above)', stepsIn),
      risk, expertKv));

  const left = h('div', { class: 'sticky stack' },
    h('div', { class: 'field' }, preview, readout),
    h('p', { class: 'small' }, 'The drawing shows the vessel from the side, with blood flowing left to right. Orange is the blockage.'));
  const right = h('div', { class: 'stack' },
    h('h2', {}, 'Set up your vessel'),
    h('div', { class: 'group' },
      h('div', { class: 'item' }, h('div', { class: 'head' }, h('span', { class: 'name' }, 'How blocked is it?'), sevVal), sev,
        h('p', { class: 'help' }, 'The share of the vessel width that is blocked at its narrowest point. Words like "Mild" are our own rough labels.')),
      h('div', { class: 'item' }, h('div', { class: 'head' }, h('span', { class: 'name' }, 'Shape')), segShape),
      h('div', { class: 'item' }, h('div', { class: 'head' }, h('span', { class: 'name' }, 'Where along the vessel?'), locVal), loc)),
    h('div', {}, h('p', { class: 'name', style: 'margin:0 4px 8px' }, 'How long should it run?'), h('div', { class: 'group' }, lengthMode)),
    expert, problems, runBtn, runNote);
  el.append(h('div', { class: 'split' }, left, right));

  // -------- logic
  const clot = () => ({ severity: d.severity, symmetric: d.symmetric, location: d.location, length: d.length, lopsided: d.lopsided });
  function syncLocation() {
    const [lo, hi] = locationRange(d.length);
    d.location = clamp(d.location, lo, hi);
    loc.value = Math.round((d.location - lo) / (hi - lo) * 1000);
    locVal.textContent = `${Math.round(d.location * 100)}% of the way along`;
  }
  function validate() {
    const p = [];
    if (!(d.tau_s >= limits.tau[0] && d.tau_s <= limits.tau[1])) p.push(`τ must be between ${limits.tau[0]} and ${limits.tau[1]}.`);
    if (!(d.ux_target >= limits.ux[0] && d.ux_target <= limits.ux[1])) p.push(`Inlet speed must be between ${limits.ux[0]} and ${limits.ux[1]}.`);
    if (!(d.length >= limits.length[0] && d.length <= limits.length[1])) p.push(`Clot length must be between ${limits.length[0]} and ${limits.length[1]}.`);
    if (throat() > limits.throat_speed_max) p.push('The liquid would move too fast through the narrow part for this solver. Lower the inlet speed or the blockage (Expert settings).');
    return p;
  }
  const throat = () => d.ux_target / Math.max(1 - d.severity, 0.05);
  function risks() {
    const w = [];
    if (throat() > limits.throat_speed_warn) w.push('The flow through the narrow part will be very fast; the run may become unstable.');
    if (d.tau_s < 0.65) w.push('A very thin liquid (low τ) is less stable.');
    return w;
  }
  function refresh() {
    syncLocation();
    sevVal.textContent = `${Math.round(d.severity * 100)}% · ${severityWord(d.severity)}`;
    drawVessel(preview, clot());
    const open = throatOpen(clot());
    readout.textContent = `${open} of ${INTERIOR} nodes open at the narrowest point (${Math.round(open / INTERIOR * 100)}%)`;
    stopChoices();
    const nu = (d.tau_s - 0.5) / 3, re = d.ux_target * open / nu;
    expertKv.replaceChildren(h('dt', {}, 'viscosity ν'), h('dd', {}, nu.toFixed(4)), h('dt', {}, 'Reynolds number (at throat)'), h('dd', {}, re.toFixed(0)),
      h('dt', {}, 'steps (estimate)'), h('dd', {}, Math.round(estSteps()).toLocaleString()));
    risk.replaceChildren(...risks().map(t => h('div', { class: 'notice warn' }, t)));
    lopSel.hidden = d.symmetric;
    lopSel.querySelector('span').textContent = ` ${Math.round((1 + d.lopsided) / 2 * 100)}% top / ${Math.round((1 - d.lopsided) / 2 * 100)}% bottom`;
    const p = validate();
    problems.replaceChildren(...p.map(t => h('div', { class: 'notice bad' }, t)));
    gate(p);
  }
  function gate(p = validate()) {
    const cd = ctx.remainingCooldown(), cooling = S.cooldown.active && (cd > 0 || S.cooldown.reason);
    const busy = ['preparing', 'running', 'paused'].includes(S.state.state);
    runBtn.disabled = p.length > 0 || cooling || busy;
    runBtn.textContent = busy ? 'A run is in progress' : cooling ? `Resting… ${fmtClock(cd)}` : 'Run simulation';
    runNote.textContent = busy ? '' : cooling ? (S.cooldown.reason || 'Runs are spaced out to protect your computer.') : (d.stop.mode === 'manual' ? 'It will run until you press Stop.' : `About ${fmtTime(estTime())} on this computer.`);
  }

  sev.oninput = () => { d.severity = sev.value / 100; refresh(); };
  loc.oninput = () => { const [lo, hi] = locationRange(d.length); d.location = lo + loc.value / 1000 * (hi - lo); refresh(); };
  segShape.onchange = e => { d.symmetric = e.target.value === 'sym'; refresh(); };
  lengthMode.onchange = e => {
    const v = e.target.value; stepsIn.value = '';
    d.stop = v === 'converge' || v === 'manual' ? { mode: v } : { mode: 'steps', size: v };
    refresh();
  };
  const readNum = (input, key, parse = parseFloat) => input.oninput = () => { const v = parse(input.value); if (Number.isFinite(v)) { d[key] = v; refresh(); } };
  readNum(tauIn, 'tau_s'); readNum(uxIn, 'ux_target'); readNum(lenIn, 'length', parseInt);
  stepsIn.oninput = () => { const v = parseInt(stepsIn.value); d.stop = Number.isFinite(v) ? { mode: 'steps', steps: v } : { mode: 'converge' }; refresh(); };
  lopSel.querySelector('input').oninput = e => { d.lopsided = e.target.value / 100; refresh(); };
  runBtn.onclick = () => A.startRun({ ...clot(), tau_s: d.tau_s, ux_target: d.ux_target, stop: d.stop });
  if (d.tau_s !== S.hello.defaults.tau_s || d.ux_target !== S.hello.defaults.ux_target || d.length !== S.hello.defaults.length || d.stop.steps) expert.open = true;

  const offs = [A.on('ui:system', () => gate()), A.on('ui:state', () => gate()),
    A.on('ui:rejected', m => { problems.replaceChildren(h('div', { class: 'notice bad' }, m.message + (m.problems ? ' ' + m.problems.join(' ') : ''))); gate(); })];
  const tick = setInterval(() => gate(), 1000);
  refresh();
  return () => { offs.forEach(f => f()); clearInterval(tick); };
}
