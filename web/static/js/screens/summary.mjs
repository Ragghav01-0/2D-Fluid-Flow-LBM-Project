import { h, fmtTime, fmtNum, fmtClock, toast } from '../ui.mjs';
import { drawFrame, drawLegend } from '../render.mjs';
import { severityWord } from '../geometry.mjs';

const WHY = { converged: ['The flow settled', 'ok', 'The flow stopped changing, so this is a steady picture.'],
  steps: ['Ran for the chosen length', 'warn', 'It stopped at the length you chose. The flow may not be completely settled.'],
  stopped: ['You stopped it', 'warn', 'You stopped the run early, so the flow may not be completely settled.'],
  cap: ['Reached the safety limit', 'warn', 'The flow kept changing, so the run stopped at its safety limit. Treat the numbers as rough.'] };

export function results(sum) {
  const sev = Math.round(sum.severity * 100);
  const effort = sum.effort_ratio;
  return [
    { big: `${sev}%`, what: `of the vessel is blocked at its tightest point. We call that ${severityWord(sum.severity).toLowerCase()}.`, tag: 'from your setting' },
    { big: `${sum.speed_up.toFixed(1)}×`, what: sum.speed_up > 1.15 ? 'faster at the tightest point than the fastest liquid in a clear vessel, so the liquid is squeezed into a jet.'
        : 'about the same peak speed as a clear vessel.', tag: 'approximate' },
    { big: effort >= 10 ? `${effort.toFixed(0)}×` : `${effort.toFixed(1)}×`, what: effort > 1.15 ? 'more pressure is needed to push the liquid through than for a clear vessel. In a body, the heart has to work harder.'
        : 'about the same pressure as a clear vessel.', tag: sum.effort_basis === 'measured' ? 'approximate' : 'rough estimate' },
  ];
}

export function mount(el, ctx, _name, [id]) {
  const { S, A } = ctx;
  const run = S.history.find(r => r.id === id) || (S.finished && S.finished.run_id === id ? { id, settings: S.finished.settings, summary: S.finished.summary } : null);
  if (!run) { el.append(h('div', { class: 'stack' }, h('h2', {}, 'Result not found'), h('p', { class: 'lede' }, 'Only your last three runs are kept.'), h('a', { class: 'btn primary', href: '#/setup' }, 'Start a new one'))); return; }
  const sum = run.summary, set = run.settings;
  const [title, kind, why] = WHY[sum.reason] || WHY.steps;
  const cv = h('canvas', { width: 512, height: 128 }), legend = h('canvas'); const lMax = h('span', {}, '—');
  const nextBtn = h('a', { class: 'btn primary', href: '#/setup' }, 'Run another');
  const dl = A.downloadUrl(id);
  el.append(h('div', { class: 'stack' },
    h('div', { class: 'row between' }, h('div', {}, h('p', { class: 'small' }, 'Summary'), h('h2', {}, 'What the blockage did')), h('div', { class: 'row' },
      h('a', { class: 'btn', href: `#/history` }, 'Compare runs'), nextBtn)),
    h('div', { class: `notice ${kind}` }, h('b', {}, title + '. '), why),
    S.state.state === 'measuring' && sum.effort_basis !== 'measured'
      ? h('div', { class: 'notice', id: 'measuring' }, 'Measuring a clear vessel at these settings so the pressure comparison is accurate. This takes about a minute; the pressure number below is a rough estimate until then.') : null,
    h('div', { class: 'field' }, cv, h('div', { class: 'badge l' }, 'Final flow'), h('div', { class: 'badge r' }, A.mode === 'demo' ? 'Demo' : 'Speed of the liquid'),
      h('div', { class: 'legend' }, h('span', {}, '0'), legend, lMax)),
    h('div', { class: 'cols3' }, results(sum).map(r => h('div', { class: 'card result' }, h('div', { class: 'big' }, r.big), h('div', { class: 'what' }, r.what), h('span', { class: 'tag', style: 'margin:10px 0 0;display:inline-block' }, r.tag)))),
    h('div', { class: 'group' },
      h('div', { class: 'item' }, h('div', { class: 'head' }, h('span', { class: 'name' }, 'This run'), h('span', { class: 'small' }, `${sum.steps.toLocaleString()} steps · ${sum.flow_throughs.toFixed(1)} times across the vessel · took ${fmtTime(sum.elapsed_s)}`)),
        h('p', { class: 'small' }, `${set.clot.symmetric ? 'Blockage on both walls' : 'Blockage on one wall'} · centred ${Math.round(set.clot.location * 100)}% along the vessel`)),
      h('div', { class: 'item row between' }, h('div', {}, h('span', { class: 'name' }, 'Download the data'), h('p', { class: 'small' }, 'Settings, results, the velocity profile (CSV) and the final fields. Every file is named with the settings that made it.')),
        dl ? h('a', { class: 'btn', href: dl }, 'Download') : h('button', { class: 'btn', disabled: true, title: 'Demo results are simulated and cannot be downloaded' }, 'Download'))),
    h('details', { class: 'expert' }, h('summary', {}, 'Expert: raw numbers'),
      h('div', { class: 'body' }, h('dl', { class: 'kv' },
        ...[['τ (relaxation time)', set.tau_s], ['inlet speed', set.ux_target], ['clot length (nodes)', set.clot.length], ['Reynolds number (throat)', fmtNum(sum.reynolds, 1)],
          ['open rows at throat', sum.open_rows_at_throat], ['peak speed', fmtNum(sum.peak_speed, 5)], ['peak speed at x =', sum.peak_speed_x], ['peak / inlet speed', fmtNum(sum.speed_over_inlet, 3)],
          ['pressure drop Δp', fmtNum(sum.dp, 5)], ['clear-vessel Δp (' + (sum.effort_basis || '') + ')', fmtNum(sum.dp_baseline, 5)],
          ['last change between checks', fmtNum(sum.residual, 7)], ['solver speed (MLUPS)', fmtNum(sum.avg_mlups, 1)]]
          .flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]))),
      sum.effort_basis === 'formula' ? h('p', { class: 'small', style: 'padding:0 16px 14px' }, 'The pressure comparison for these settings uses a rough formula that overestimates by about 2×. A measured comparison is only stored for the default settings.') : null),
    h('p', { class: 'small' }, 'A simplified 2D model in lattice units: read the trends, not the exact numbers. Not a medical tool.')));
  drawLegend(legend);
  A.finalFrame(id).then(f => { if (f) { drawFrame(cv, f); lMax.textContent = fmtNum(f.vmax, 3); } });
  const gate = () => { const cd = ctx.remainingCooldown(); const cooling = S.cooldown.active; nextBtn.textContent = cooling ? `Resting… ${fmtClock(cd)}` : 'Run another'; nextBtn.title = cooling ? (S.cooldown.reason || '') : ''; };
  gate(); const t = setInterval(gate, 1000);
  const off = A.on('ui:state', () => { if (S.state.state !== 'measuring') document.getElementById('measuring')?.remove(); });
  return () => { clearInterval(t); off(); };
}
