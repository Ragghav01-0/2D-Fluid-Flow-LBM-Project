import { h, fmtTime, fmtClock, clamp } from '../ui.mjs';
import { icon } from '../icons.mjs';
import { FlowStage } from '../stage.mjs';
import { clotFrame } from '../frames.mjs';
import { locationRange, severityWord, throatOpen, INTERIOR, NX } from '../geometry.mjs';

const SIZES = [['quick', 'Quick', 'A rough picture. The flow may still be settling.'], ['medium', 'Medium', 'Good for most blockages.'], ['long', 'Long', 'A careful run for severe blockages.']];
const STEPS = ['Blockage', 'Run length', 'Review'];

export function mount(el, ctx) {
  const { S, A } = ctx, d = S.draft, limits = S.hello.limits, lengths = S.hello.lengths;
  let step = 0, dir = 1, closeup = true;
  const stepsPerSec = () => S.tel?.mlups ? S.tel.mlups * 1e6 / (NX * 256) : 700;
  const ftSteps = () => NX / d.ux_target;
  const estSteps = () => d.stop.mode === 'steps' ? (d.stop.steps ?? lengths[d.stop.size] * ftSteps()) : ftSteps() * (1.7 + 2.9 * d.severity);
  const estTime = () => estSteps() / stepsPerSec();
  const clot = () => ({ severity: d.severity, symmetric: d.symmetric, location: d.location, length: d.length, lopsided: d.lopsided });
  const throat = () => d.ux_target / Math.max(1 - d.severity, 0.05);

  // ---- the flow window (left, stays put)
  const stage = new FlowStage({ mode: 'frames', ink: false, view: [0, .4] });
  const zoom = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'View' }, [['close', 'Close-up'], ['whole', 'Whole vessel']].map(([v, l]) =>
    h('button', { role: 'radio', 'aria-checked': String(v === 'close'), onclick: () => { closeup = v === 'close'; [...zoom.children].forEach(b => b.setAttribute('aria-checked', String(b.textContent === l))); frame(); } }, l)));
  const slot = h('div', { class: 'stage-slot' }, stage.el, h('div', { class: 'stage-bar' }, h('span', { class: 'stage-phase' }, 'Your vessel, before the flow'), zoom), h('p', { class: 'small muted', style: 'margin-top:14px' }, 'A side view of the vessel, with liquid flowing from left to right. The gray shape is the blockage.'));

  // ---- the panel (right)
  const stepsEl = h('ol', { class: 'steps', 'aria-label': 'Progress' });
  const panel = h('div', { class: 'panel-host' });
  el.append(h('div', { class: 'split' }, slot, h('div', {}, stepsEl, panel)));

  function frame() {
    const [lo, hi] = locationRange(d.length); d.location = clamp(d.location, lo, hi);
    stage.setClot(clot()); stage.setFrame(clotFrame(clot()), 1);
    const span = closeup ? .4 : 1, x0 = closeup ? clamp(d.location - span / 2, 0, 1 - span) : 0;
    stage.setView(x0, span, false);
    const open = throatOpen(clot());
    stage.callouts([{ x: d.location, y: d.symmetric ? .5 : (1 - d.severity) / 2, figure: String(open), label: `of ${INTERIOR} rows open`, dir: 'r' }], { animate: false });
  }
  function paintSteps() { stepsEl.replaceChildren(...STEPS.map((n, i) => h('li', { class: i < step ? 'done' : '', 'aria-current': i === step ? 'step' : null }, h('span', {}, n)))); }

  const rng = (min, max, step_, val, onInput, label) => { const i = h('input', { type: 'range', min, max, step: step_, value: val, 'aria-label': label }); const paint = () => i.style.setProperty('--p', `${(i.value - min) / (max - min) * 100}%`); i.oninput = () => { paint(); onInput(+i.value); }; paint(); return i; };
  const seg = (opts, val, on) => { const e = h('div', { class: 'seg full', role: 'radiogroup' }, opts.map(([v, l]) => h('button', { role: 'radio', 'aria-checked': String(v === val), onclick: () => { [...e.children].forEach(b => b.setAttribute('aria-checked', String(b.textContent === l))); on(v); } }, l))); return e; };

  function stepBlockage() {
    const n = h('div', { class: 'n' }), w = h('div', { class: 'w' }), loc = h('span', { class: 'muted nums' });
    const paint = () => { n.textContent = `${Math.round(d.severity * 100)}%`; w.textContent = severityWord(d.severity); const [lo, hi] = locationRange(d.length); loc.textContent = `${Math.round(d.location * 100)}% of the way along`; return [lo, hi]; };
    const sev = rng(0, Math.round(limits.severity[1] * 100), 1, Math.round(d.severity * 100), v => { d.severity = v / 100; paint(); frame(); }, 'Stenosis severity, percent of the vessel blocked');
    const [lo0, hi0] = locationRange(d.length);
    const loc_ = rng(0, 1000, 1, Math.round((d.location - lo0) / (hi0 - lo0) * 1000), v => { const [lo, hi] = locationRange(d.length); d.location = lo + v / 1000 * (hi - lo); paint(); frame(); }, 'Where along the vessel');
    paint();
    return [h('h2', { class: 'panel-title' }, 'How blocked is the vessel?'),
      h('div', {}, h('div', { class: 'bigval' }, n, w), sev, h('p', { class: 'tech', style: 'margin-top:6px' }, 'The share of the vessel width blocked at its narrowest point. Words like "Mild" are our own rough labels.')),
      h('div', {}, h('label', { class: 'field-label' }, 'Shape'), seg([['one', 'One wall'], ['sym', 'Both walls']], d.symmetric ? 'sym' : 'one', v => { d.symmetric = v === 'sym'; frame(); })),
      h('div', {}, h('div', { class: 'row between', style: 'margin-bottom:2px' }, h('label', { class: 'field-label', style: 'margin:0' }, 'Where along the vessel?'), loc), loc_),
      h('div', { class: 'panel-foot' }, h('span'), h('button', { class: 'btn primary lg', onclick: () => go(1) }, 'Next'))];
  }
  function stepLength() {
    const cur = () => d.stop.mode === 'steps' ? (d.stop.size || 'custom') : d.stop.mode;
    const t = s => '≈ ' + fmtTime(s * ftSteps() / stepsPerSec());
    const opts = [['converge', 'Until it settles', 'Stops by itself once the flow stops changing. The best answer.', '≈ ' + fmtTime(ftSteps() * (1.7 + 2.9 * d.severity) / stepsPerSec())],
      ...SIZES.map(([id, n, b]) => [id, n, b, t(lengths[id])]), ['manual', 'Until I stop it', 'Runs until you press Stop. Good for watching.', 'no limit']];
    const list = h('div', { class: 'group choice-list', role: 'radiogroup', 'aria-label': 'Run length' }, opts.map(([id, n, b, tt]) =>
      h('button', { class: 'choice', role: 'radio', 'aria-checked': String(cur() === id), onclick: () => { d.stop = id === 'converge' || id === 'manual' ? { mode: id } : { mode: 'steps', size: id }; [...list.children].forEach((c, i) => c.setAttribute('aria-checked', String(opts[i][0] === id))); } },
        h('span', {}, n, h('small', {}, b)), h('span', { class: 't' }, tt))));
    return [h('h2', { class: 'panel-title' }, 'How long should it run?'), list,
      h('div', { class: 'panel-foot' }, h('button', { class: 'btn', onclick: () => go(-1) }, icon('back'), 'Back'), h('button', { class: 'btn primary lg', onclick: () => go(1) }, 'Next'))];
  }
  function stepReview() {
    const num = (v, [lo, hi], st) => h('input', { class: 'field', type: 'number', value: v, min: lo, max: hi, step: st });
    const tauIn = num(d.tau_s, limits.tau, .001), uxIn = num(d.ux_target, limits.ux, .005), lenIn = num(d.length, limits.length, 10), stepsIn = num(d.stop.steps ?? '', [500, 2e6], 500);
    stepsIn.placeholder = 'Auto';
    const lop = h('input', { type: 'range', min: -100, max: 100, step: 5, value: Math.round(d.lopsided * 100), 'aria-label': 'Share of the blockage on the top wall' }); lop.style.setProperty('--p', `${(d.lopsided + 1) / 2 * 100}%`);
    const lopTxt = h('span', { class: 'tech' });
    const sum = h('dl', { class: 'summary' }), notes = h('div', { style: 'display:grid;gap:10px' }), runBtn = h('button', { class: 'btn primary lg block' }, 'Run simulation'), runNote = h('p', { class: 'small muted', style: 'text-align:center' });
    const kv = h('div', { class: 'pad nums small muted' });
    const set = (label, input, tech) => h('div', { class: 'set' }, h('label', {}, label), input, tech ? h('span', { class: 'tech' }, tech) : null);
    const lopSet = h('div', { class: 'set' }, h('label', {}, 'Top-wall share'), lop, lopTxt);
    const validate = () => { const p = [];
      if (!(d.tau_s >= limits.tau[0] && d.tau_s <= limits.tau[1])) p.push(`τ must be between ${limits.tau[0]} and ${limits.tau[1]}.`);
      if (!(d.ux_target >= limits.ux[0] && d.ux_target <= limits.ux[1])) p.push(`Inlet speed must be between ${limits.ux[0]} and ${limits.ux[1]}.`);
      if (!(d.length >= limits.length[0] && d.length <= limits.length[1])) p.push(`Clot length must be between ${limits.length[0]} and ${limits.length[1]}.`);
      if (throat() > limits.throat_speed_max) p.push('The liquid would move too fast through the narrow part for this solver. Lower the inlet speed or the blockage in Expert settings.');
      return p; };
    const refresh = () => {
      const label = d.stop.mode === 'converge' ? 'Until it settles' : d.stop.mode === 'manual' ? 'Until I stop it' : d.stop.steps && !d.stop.size ? `${d.stop.steps.toLocaleString()} steps` : SIZES.find(s => s[0] === d.stop.size)?.[1] || 'Medium';
      sum.replaceChildren(...[['Blockage', `${Math.round(d.severity * 100)}% · ${severityWord(d.severity)}`], ['Shape', d.symmetric ? 'Both walls' : 'One wall'], ['Position', `${Math.round(d.location * 100)}% along`], ['Run length', label], ['Estimated time', d.stop.mode === 'manual' ? 'until you stop it' : `about ${fmtTime(estTime())}`]]
        .flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
      const open = throatOpen(clot()), nu = (d.tau_s - .5) / 3;
      kv.textContent = `ν ${nu.toFixed(4)} · Reynolds ${(d.ux_target * open / nu).toFixed(0)} at the throat · about ${Math.round(estSteps()).toLocaleString()} steps`;
      lopSet.hidden = d.symmetric; lopTxt.textContent = `${Math.round((1 + d.lopsided) / 2 * 100)}% top, ${Math.round((1 - d.lopsided) / 2 * 100)}% bottom`;
      const p = validate(), warn = [throat() > limits.throat_speed_warn ? 'The flow through the narrow part will be very fast; the run may become unstable.' : null, d.tau_s < .78 ? 'A thin liquid (low τ) is less stable.' : null].filter(Boolean);
      notes.replaceChildren(...p.map(t => h('div', { class: 'notice bad' }, t)), ...warn.map(t => h('div', { class: 'notice warn' }, t))); gate(p); frame();
    };
    const gate = (p = validate()) => {
      const cd = ctx.remainingCooldown(), cooling = S.cooldown.active, busy = ['preparing', 'running', 'paused', 'measuring'].includes(S.state.state);
      runBtn.disabled = p.length > 0 || cooling || busy; runBtn.replaceChildren(...(busy ? ['A run is in progress'] : cooling ? [`Resting… ${fmtClock(cd)}`] : [icon('play'), 'Run simulation']));
      runNote.textContent = busy ? '' : cooling ? (S.cooldown.reason || 'Runs are spaced out to protect your computer.') : '';
    };
    const bind = (i, k, parse = parseFloat) => i.oninput = () => { const v = parse(i.value); if (Number.isFinite(v)) { d[k] = v; refresh(); } };
    bind(tauIn, 'tau_s'); bind(uxIn, 'ux_target'); bind(lenIn, 'length', parseInt);
    stepsIn.oninput = () => { const v = parseInt(stepsIn.value); d.stop = Number.isFinite(v) ? { mode: 'steps', steps: v } : { mode: 'converge' }; refresh(); };
    lop.oninput = () => { d.lopsided = lop.value / 100; lop.style.setProperty('--p', `${(d.lopsided + 1) / 2 * 100}%`); refresh(); };
    runBtn.onclick = () => A.startRun({ ...clot(), tau_s: d.tau_s, ux_target: d.ux_target, stop: d.stop });
    const adv = h('details', { class: 'adv', open: d.tau_s !== S.hello.defaults.tau_s || d.ux_target !== S.hello.defaults.ux_target || d.length !== S.hello.defaults.length || !!d.stop.steps },
      h('summary', {}, 'Expert settings'),
      set(`Relaxation time τ`, tauIn, `${limits.tau[0]} to ${limits.tau[1]}. How thick the liquid is; 0.884 is the tested blood-like setting.`), set('Inlet speed', uxIn, `${limits.ux[0]} to ${limits.ux[1]}, in lattice units.`), set('Clot length', lenIn, `${limits.length[0]} to ${limits.length[1]} nodes.`), lopSet,
      set('Exact steps', stepsIn, 'Leave empty to use the run length from the last step.'), kv);
    ctx._gate = gate; refresh();
    return [h('h2', { class: 'panel-title' }, 'Ready to run'), sum, adv, notes, h('div', { style: 'display:grid;gap:10px' }, runBtn, runNote),
      h('div', { class: 'panel-foot' }, h('button', { class: 'btn', onclick: () => go(-1) }, icon('back'), 'Back'), h('span'))];
  }
  function paint() { paintSteps(); const body = [stepBlockage, stepLength, stepReview][step](); panel.replaceChildren(h('div', { class: `panel${dir < 0 ? ' back' : ''}` }, body)); }
  function go(delta) { step = clamp(step + delta, 0, 2); dir = delta; ctx._gate = null; paint(); if (step < 2) frame(); }

  frame(); paint();
  const offs = [A.on('ui:system', () => ctx._gate?.()), A.on('ui:state', () => ctx._gate?.()),
    A.on('ui:rejected', m => { ctx.toast(m.message || 'That run could not start.'); ctx._gate?.(); })];
  const tick = setInterval(() => ctx._gate?.(), 1000);
  return () => { offs.forEach(f => f()); clearInterval(tick); ctx._gate = null; stage.destroy(); };
}
