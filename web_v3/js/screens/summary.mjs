import { h, fmtTime, fmtNum, fmtClock } from '../ui.mjs';
import { icon } from '../icons.mjs';
import { FlowStage } from '../stage.mjs';
import { severityWord, NX } from '../geometry.mjs';

const WHY = { converged: ['The flow settled', 'ok', 'The flow stopped changing, so this is a steady picture.'],
  steps: ['Ran for the chosen length', 'warn', 'It stopped at the length you chose. The flow may not be completely settled.'],
  stopped: ['You stopped it', 'warn', 'You stopped the run early, so the flow may not be completely settled.'],
  cap: ['Reached the safety limit', 'warn', 'The flow kept changing, so the run stopped at its safety limit. Treat the numbers as rough.'] };

export function results(sum) {
  const sev = Math.round(sum.severity * 100), e = sum.effort_ratio;
  return [
    { big: `${sev}%`, what: `of the vessel is blocked at its tightest point. We call that ${severityWord(sum.severity).toLowerCase()}.`, tag: 'from your setting' },
    { big: `${sum.speed_up.toFixed(1)}×`, what: sum.speed_up > 1.15 ? 'faster at the tightest point than the fastest liquid in a clear vessel, so the liquid is squeezed into a jet.' : 'about the same peak speed as a clear vessel.', tag: 'approximate' },
    { big: e >= 10 ? `${e.toFixed(0)}×` : `${e.toFixed(1)}×`, what: e > 1.15 ? 'more pressure is needed to push the liquid through than for a clear vessel. In a body, the heart has to work harder.' : 'about the same pressure as a clear vessel.', tag: sum.effort_basis === 'measured' ? 'approximate' : 'rough estimate' },
  ];
}

export function mount(el, ctx, _n, [id]) {
  const { S, A } = ctx;
  const run = S.history.find(r => r.id === id) || (S.finished && S.finished.run_id === id ? { id, settings: S.finished.settings, summary: S.finished.summary } : null);
  if (!run) { el.append(h('div', { class: 'stack' }, h('h2', {}, 'Result not found'), h('p', { class: 'lede' }, 'Only your last three runs are kept.'), h('a', { class: 'btn primary lg', href: '#/setup', style: 'align-self:flex-start' }, 'Start a new one'))); return; }
  const sum = run.summary, set = run.settings, c = set.clot, [title, kind, why] = WHY[sum.reason] || WHY.steps, R = results(sum), dl = A.downloadUrl(id);
  const phone = matchMedia('(max-width: 600px)').matches;             // a phone starts in a taller close-up so the flow is not a thin strip
  let closeup = phone;
  const sp = phone ? .4 : .5, closeView = () => [Math.max(0, Math.min(1 - sp, c.location - sp / 2)), sp];
  const stage = new FlowStage({ mode: 'frames', ink: true, view: closeup ? closeView() : [0, 1], compact: true }); stage.setClot(c);
  const zoom = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'View' }, [['whole', 'Whole vessel'], ['close', 'Close-up']].map(([v, l]) =>
    h('button', { role: 'radio', 'aria-checked': String((v === 'close') === closeup), onclick: () => { closeup = v === 'close'; [...zoom.children].forEach(x => x.setAttribute('aria-checked', String(x.textContent === l))); const [x0, sp] = closeup ? closeView() : [0, 1]; stage.setView(x0, sp); } }, l)));
  const bar = h('div', { class: 'stage-bar' }, h('span', { class: 'stage-phase' }, A.mode === 'demo' ? 'Demo: simulated, not from the solver' : 'Final flow'), zoom);
  const nextBtn = h('a', { class: 'btn primary lg block', href: '#/setup' }, 'Run another');
  const measuring = h('div', { class: 'notice', id: 'measuring' }, 'Measuring a clear vessel at these settings so the pressure comparison is accurate. This takes about a minute; that number is a rough estimate until then.');
  measuring.hidden = !(S.state.state === 'measuring' && sum.effort_basis !== 'measured');
  const expert = h('details', { class: 'adv' }, h('summary', {}, 'Expert: raw numbers'), h('div', { class: 'pad' }, h('dl', { class: 'summary', style: 'background:none' }, ...[['τ (relaxation time)', set.tau_s], ['inlet speed', set.ux_target], ['clot length (nodes)', c.length], ['Reynolds number (throat)', fmtNum(sum.reynolds, 1)], ['open rows at throat', sum.open_rows_at_throat], ['peak speed', fmtNum(sum.peak_speed, 5)], ['peak speed at x =', sum.peak_speed_x], ['peak / inlet speed', fmtNum(sum.speed_over_inlet, 3)], ['pressure drop Δp', fmtNum(sum.dp, 5)], ['clear-vessel Δp (' + (sum.effort_basis || '') + ')', fmtNum(sum.dp_baseline, 5)], ['last change between checks', fmtNum(sum.residual, 7)], ['solver speed (MLUPS)', fmtNum(sum.avg_mlups, 1)]].flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]))),
    sum.effort_basis === 'formula' ? h('p', { class: 'tech' }, 'The pressure comparison for these settings uses a rough formula that overestimates by about 2×. A measured comparison is stored only for the default settings.') : null);

  el.append(h('div', { class: 'stack', style: 'gap:24px' },
    h('div', { class: 'result-head' }, h('h2', {}, 'What the blockage did'), h('a', { class: 'btn ghost', href: '#/history' }, icon('compare'), 'Compare runs')),
    h('div', { class: 'stage-wide' }, stage.el, bar, h('div', { class: 'legend' }, h('span', {}, 'slower'), h('div', { class: 'bar' }), h('span', {}, 'faster'))),
    h('div', { class: `notice ${kind}` }, h('b', {}, title + '. '), why), measuring,
    h('section', { class: 'result-grid', 'aria-label': 'Results' }, R.map(r => h('div', { class: 'result-cell' }, h('div', { class: 'big' }, r.big), h('p', {}, r.what), h('span', { class: 'tag' }, r.tag)))),
    h('div', { class: 'summary-cols' },
      h('dl', { class: 'summary' }, ...[['Steps run', sum.steps.toLocaleString()], ['Times across the vessel', sum.flow_throughs.toFixed(1)], ['Took', fmtTime(sum.elapsed_s)], ['Shape', c.symmetric ? 'Both walls' : 'One wall'], ['Position', `${Math.round(c.location * 100)}% along`]].flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
      h('div', { class: 'stack', style: 'gap:16px' },
        h('div', { class: 'group' }, h('div', { class: 'row-item' }, h('div', {}, h('div', { class: 'name' }, 'Download the data'), h('span', { class: 'tech' }, 'Settings, results, velocity profile and final fields.')),
          dl ? h('a', { class: 'btn sm', href: dl }, icon('down'), 'Download') : h('button', { class: 'btn sm', disabled: true, title: 'Demo results are simulated and cannot be downloaded' }, icon('down'), 'Download'))),
        nextBtn)),
    expert,
    h('p', { class: 'small muted' }, 'A simplified 2D model in lattice units: read the trends, not the exact numbers. Not a medical tool.')));

  A.finalFrame(id).then(f => {
    if (!f) return; stage.setFrame(f);
    const pk = stage.peak(), below = c.symmetric || c.lopsided <= 0;
    const pins = [
      { x: pk ? pk.x : sum.peak_speed_x / NX, y: pk ? pk.y : .5, figure: R[1].big, label: 'faster than a clear vessel' },
      { x: c.location, y: below ? .88 : .12, figure: R[0].big, label: 'of the vessel blocked', dir: 'r' },
      { x: Math.max(.04, c.location - .16), y: .5, figure: R[2].big, label: 'pressure vs a clear vessel', dir: 'r' }];
    stage.callouts(phone ? pins.slice(0, 1) : pins);      // on a phone only the main pin: the other figures are in the result cells below
  });
  const gate = () => { const cd = ctx.remainingCooldown(), cooling = S.cooldown.active; nextBtn.replaceChildren(...(cooling ? [`Resting… ${fmtClock(cd)}`] : [icon('play'), 'Run another'])); nextBtn.title = cooling ? (S.cooldown.reason || '') : ''; nextBtn.setAttribute('aria-disabled', String(cooling)); };
  gate(); const t = setInterval(gate, 1000);
  const off = A.on('ui:state', () => { measuring.hidden = !(S.state.state === 'measuring' && sum.effort_basis !== 'measured'); });
  return () => { clearInterval(t); off(); stage.destroy(); };
}
