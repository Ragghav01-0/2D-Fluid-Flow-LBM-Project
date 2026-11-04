import { h, fmtNum, fmtTime } from '../ui.mjs';
import { drawFrame, drawLegend } from '../render.mjs';
import { severityWord } from '../geometry.mjs';
import { results } from './summary.mjs';

const when = id => {
  const m = /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(id) || /demo-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(id);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : id;
};
const label = r => `${Math.round(r.settings.clot.severity * 100)}% ${r.settings.clot.symmetric ? 'both walls' : 'one wall'}`;

export function mount(el, ctx, name, args) {
  return name === 'compare' ? compare(el, ctx, args) : list(el, ctx);
}

function list(el, ctx) {
  const { S, A } = ctx;
  const picked = new Set();
  const cmpBtn = h('button', { class: 'btn primary', disabled: true }, 'Compare selected');
  const body = h('div', { class: 'runs' });
  const draw = () => {
    if (!S.history.length) {
      body.replaceChildren(h('div', { class: 'card stack' }, h('b', {}, 'No runs yet'), h('p', { class: 'small' }, 'Finished runs show up here, so you can compare a mild blockage with a severe one.'), h('a', { class: 'btn primary', href: '#/setup' }, 'Start a simulation')));
      return;
    }
    body.replaceChildren(...S.history.map(r => {
      const cv = h('canvas', { width: 512, height: 128 });
      A.finalFrame(r.id).then(f => f && drawFrame(cv, f));
      const cb = h('input', { type: 'checkbox', 'aria-label': `Select run ${label(r)} for comparison`, checked: picked.has(r.id), onchange: e => { e.target.checked ? picked.add(r.id) : picked.delete(r.id); if (picked.size > 2) { picked.delete([...picked][0]); draw(); } sync(); } });
      return h('div', { class: 'card stack' },
        h('div', { class: 'row between' }, h('label', { class: 'row' }, cb, h('b', {}, label(r)), h('span', { class: 'tag' }, severityWord(r.settings.clot.severity))), h('span', { class: 'small' }, when(r.id))),
        h('a', { href: `#/summary/${r.id}`, class: 'thumb' }, cv),
        h('div', { class: 'row between' },
          h('span', { class: 'small' }, `${results(r.summary)[1].big} faster · ${results(r.summary)[2].big} pressure · ${r.summary.steps.toLocaleString()} steps`),
          h('div', { class: 'row' }, h('a', { class: 'btn', href: `#/summary/${r.id}` }, 'Open'), h('button', { class: 'btn danger', onclick: () => { picked.delete(r.id); A.deleteRun(r.id); } }, 'Delete'))));
    }));
  };
  const sync = () => { cmpBtn.disabled = picked.size !== 2; };
  cmpBtn.onclick = () => ctx.go(`#/compare/${[...picked].join('/')}`);
  el.append(h('div', { class: 'stack' },
    h('div', { class: 'row between' }, h('div', {}, h('p', { class: 'small' }, 'History'), h('h2', {}, 'Your recent runs')), cmpBtn),
    h('p', { class: 'small' }, 'The last three runs are kept; finishing a fourth deletes the oldest. Tick two to compare them side by side.'), body));
  draw();
  const off = A.on('ui:history', () => { for (const id of [...picked]) if (!S.history.some(r => r.id === id)) picked.delete(id); draw(); sync(); });
  return off;
}

function compare(el, ctx, ids) {
  const { S, A } = ctx;
  const runs = ids.map(id => S.history.find(r => r.id === id)).filter(Boolean);
  if (runs.length !== 2) { el.append(h('div', { class: 'stack' }, h('h2', {}, 'Pick two runs to compare'), h('a', { class: 'btn primary', href: '#/history' }, 'Back to History'))); return; }
  const cvs = runs.map(() => h('canvas', { width: 512, height: 128 })), legend = h('canvas'), lMax = h('span', {}, '—');
  const R = runs.map(r => results(r.summary));
  const rows = [
    ['Blockage', 0, r => `${Math.round(r.summary.severity * 100)}%`],
    ['Speed-up vs a clear vessel', 1, (r, i) => R[i][1].big],
    ['Pressure vs a clear vessel', 2, (r, i) => R[i][2].big],
    ['Shape', null, r => (r.settings.clot.symmetric ? 'Both walls' : 'One wall')],
    ['Steps run', null, r => r.summary.steps.toLocaleString()],
  ];
  el.append(h('div', { class: 'stack' },
    h('div', { class: 'row between' }, h('div', {}, h('p', { class: 'small' }, 'Compare'), h('h2', {}, `${label(runs[0])} vs ${label(runs[1])}`)), h('a', { class: 'btn', href: '#/history' }, 'Back')),
    h('p', { class: 'small' }, 'Both pictures use the same colour scale, so equal colours mean equal speeds.'),
    ...runs.map((r, i) => h('div', { class: 'field' }, cvs[i], h('div', { class: 'badge l' }, label(r)), h('div', { class: 'badge r' }, when(r.id)))),
    h('div', { class: 'field', style: 'border-radius:12px' }, h('div', { class: 'legend' }, h('span', {}, '0'), legend, lMax)),
    h('div', { class: 'card' }, h('table', { class: 'cmp' }, h('thead', {}, h('tr', {}, h('th', {}), ...runs.map(r => h('th', {}, label(r))))),
      h('tbody', {}, rows.map(([name, , f]) => h('tr', {}, h('th', {}, name), ...runs.map((r, i) => h('td', { class: 'num' }, f(r, i)))))))),
    h('p', { class: 'small' }, 'A simplified 2D model: read the trends, not the exact numbers.')));
  drawLegend(legend);
  Promise.all(runs.map(r => A.finalFrame(r.id))).then(fr => {
    const vmax = Math.max(...fr.filter(Boolean).map(f => f.vmax));
    fr.forEach((f, i) => f && drawFrame(cvs[i], f, vmax));
    lMax.textContent = fmtNum(vmax, 3);
  });
}
