import { h } from '../ui.mjs';
import { icon } from '../icons.mjs';
import { FlowStage, snapshot } from '../stage.mjs';
import { results } from './summary.mjs';
import { when, runName } from './home.mjs';

export function mount(el, ctx, name, args) { return name === 'compare' ? compare(el, ctx, args) : list(el, ctx); }

function list(el, ctx) {
  const { S, A } = ctx, picked = new Set();
  const cmpBtn = h('button', { class: 'btn primary', disabled: true }, icon('compare'), 'Compare');
  const body = h('div');
  const sync = () => { cmpBtn.disabled = picked.size !== 2; };
  const draw = () => {
    if (!S.history.length) { body.replaceChildren(h('div', { class: 'card', style: 'padding:32px;display:grid;gap:12px;justify-items:start' }, h('h3', {}, 'No runs yet'), h('p', { class: 'muted' }, 'Finished runs are kept here, so you can set a mild blockage next to a severe one.'), h('a', { class: 'btn primary lg', href: '#/setup' }, 'Start a simulation'))); return; }
    body.replaceChildren(h('div', { class: 'group' }, S.history.map(r => {
      const img = h('img', { alt: '', width: 160, height: 40 }); A.finalFrame(r.id).then(f => { if (f) img.src = snapshot(f, { w: 640, hgt: 160, clot: r.settings.clot }); });
      const R = results(r.summary);
      const cb = h('input', { class: 'tick', type: 'checkbox', 'aria-label': `Select ${runName(r)} for comparison`, checked: picked.has(r.id), onchange: e => { e.target.checked ? picked.add(r.id) : picked.delete(r.id); if (picked.size > 2) { picked.delete([...picked][0]); draw(); } sync(); } });
      return h('div', { class: 'hist-row' }, cb, h('a', { href: `#/summary/${r.id}` }, img),
        h('a', { href: `#/summary/${r.id}`, style: 'color:inherit;display:block' }, h('div', { class: 'name' }, runName(r)), h('div', { class: 'when' }, `${when(r.id)} · ${R[1].big} faster · ${R[2].big} pressure`)),
        h('div', { class: 'acts' }, h('a', { class: 'btn ghost sm', href: `#/summary/${r.id}` }, 'Open'), h('button', { class: 'btn ghost sm', style: 'color:var(--danger)', onclick: () => { picked.delete(r.id); A.deleteRun(r.id); } }, 'Delete')));
    })));
  };
  cmpBtn.onclick = () => ctx.go(`#/compare/${[...picked].join('/')}`);
  el.append(h('div', { class: 'stack', style: 'gap:20px' }, h('div', { class: 'row between' }, h('h1', {}, 'History'), cmpBtn),
    h('p', { class: 'lede', style: 'max-width:48ch' }, 'Your last three runs. Tick two to put them on one picture.'), body));
  draw();
  const off = A.on('ui:history', () => { for (const id of [...picked]) if (!S.history.some(r => r.id === id)) picked.delete(id); draw(); sync(); });
  return off;
}

function compare(el, ctx, ids) {
  const { S, A } = ctx, runs = ids.map(id => S.history.find(r => r.id === id)).filter(Boolean);
  if (runs.length !== 2) { el.append(h('div', { class: 'stack' }, h('h2', {}, 'Pick two runs to compare'), h('a', { class: 'btn primary lg', href: '#/history', style: 'align-self:flex-start' }, 'Back to History'))); return; }
  const [a, b] = runs, R = runs.map(r => results(r.summary));
  const mk = (r, side) => { const s = new FlowStage({ mode: 'frames', ink: side === 'a', view: [0, 1] }); s.setClot(r.settings.clot); s.el.append(h('div', { class: `corner${side === 'b' ? ' r' : ''}` }, h('span', { class: 'tagpill' }, `${side.toUpperCase()} · ${runName(r)}`))); return s; };
  const sa = mk(a, 'a'), sb = mk(b, 'b');
  const wrap = h('div', { class: 'cmp-wrap', style: '--cut: 50%' }, sa.el, sb.el, h('div', { class: 'cmp-handle' }));
  const range = h('input', { type: 'range', min: 0, max: 100, value: 50, 'aria-label': 'Slide to reveal run B over run A' });
  const paint = () => { range.style.setProperty('--p', `${range.value}%`); wrap.style.setProperty('--cut', `${range.value}%`); };
  range.oninput = paint; paint();
  const rows = [['Blockage', i => `${Math.round(runs[i].summary.severity * 100)}%`], ['Faster than a clear vessel', i => R[i][1].big], ['Pressure vs a clear vessel', i => R[i][2].big], ['Shape', i => (runs[i].settings.clot.symmetric ? 'Both walls' : 'One wall')], ['Steps run', i => runs[i].summary.steps.toLocaleString()]];
  el.append(h('div', { class: 'stack', style: 'gap:20px' },
    h('div', { class: 'row between' }, h('h1', {}, 'Compare'), h('a', { class: 'btn', href: '#/history' }, icon('back'), 'History')),
    h('p', { class: 'lede', style: 'max-width:52ch' }, 'Both runs share one size and one colour scale. Drag the handle to reveal run B over run A.'),
    wrap, range,
    h('dl', { class: 'summary cmp-table' }, h('dt', {}), h('dd', { style: 'font-weight:600' }, `A · ${Math.round(a.summary.severity * 100)}%`), h('dd', { style: 'font-weight:600' }, `B · ${Math.round(b.summary.severity * 100)}%`),
      ...rows.flatMap(([n, f]) => [h('dt', {}, n), h('dd', {}, f(0)), h('dd', {}, f(1))])),
    h('p', { class: 'small muted' }, 'A simplified 2D model: read the trends, not the exact numbers.')));
  Promise.all(runs.map(r => A.finalFrame(r.id))).then(fr => { const vm = Math.max(...fr.filter(Boolean).map(f => f.vmax)); sa.setFrame(fr[0], vm); sb.setFrame(fr[1], vm); });
  return () => { sa.destroy(); sb.destroy(); };
}
