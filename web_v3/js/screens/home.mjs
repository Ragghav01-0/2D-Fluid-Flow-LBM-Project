import { h, fmtNum } from '../ui.mjs';
import { icon } from '../icons.mjs';
import { FlowStage, snapshot } from '../stage.mjs';
import { results } from './summary.mjs';

export const when = id => {
  const m = /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(id) || /demo-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(id);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : id;
};
export const runName = r => `${Math.round(r.settings.clot.severity * 100)}% blocked, ${r.settings.clot.symmetric ? 'both walls' : 'one wall'}`;

export function mount(el, ctx) {
  const { S, A } = ctx, g = S.hello.grid;
  const stage = new FlowStage({ mode: 'hero', view: [.32, .36], tilt: true, float: true });
  stage.hero.sev = .52;
  const tag = h('div', { class: 'corner' }, h('span', { class: 'tagpill' }, 'Illustration only'));
  stage.el.append(tag);
  stage.callouts([{ x: .5, y: .24, figure: '2.1×', label: 'faster at the narrowest point' }]);
  const lastRun = S.history[0];

  const recent = S.history.length ? h('section', { class: 'recent' }, h('div', { class: 'section-head' }, h('h2', {}, 'Recent runs'), h('a', { class: 'btn ghost', href: '#/history' }, 'See all')),
    h('div', { class: 'group' }, S.history.map(r => {
      const img = h('img', { alt: '', width: 112, height: 28 }); A.finalFrame(r.id).then(f => { if (f && img.isConnected !== undefined) img.src = snapshot(f, { w: 448, hgt: 112, clot: r.settings.clot }); });
      const R = results(r.summary);
      return h('a', { class: 'recent-item', href: `#/summary/${r.id}` }, img, h('div', {}, h('div', { class: 'name' }, runName(r)), h('div', { class: 'when' }, when(r.id))), h('div', { class: 'val' }, R[1].big, h('small', {}, 'faster')));
    }))) : null;

  el.append(
    h('section', { class: 'hero-card' },
      h('div', { class: 'hero-copy hero-in' },
        h('h1', { class: 'display' }, 'See how a blocked vessel changes the flow.'),
        h('p', { class: 'lede' }, 'Pick how much of an artery is blocked and watch a real simulation show what happens to the blood.'),
        h('div', { class: 'row' }, h('a', { class: 'btn primary lg', href: '#/setup' }, 'Start a simulation'), lastRun ? h('a', { class: 'btn ghost lg', href: `#/summary/${lastRun.id}` }, 'See your last result') : h('a', { class: 'btn ghost lg', href: '#/guide' }, 'How it works'))),
      h('div', { class: 'hero-stage' }, stage.el)),
    h('section', { class: 'facts', 'aria-label': 'About this simulation' },
      fact((g.nx * g.ny).toLocaleString(), 'lattice nodes'), fact(`${g.nx.toLocaleString()} × ${g.ny}`, 'grid, left to right'), fact(S.hello.arch === 'Demo' ? 'Demo' : S.hello.arch, S.hello.cores ? `${S.hello.cores} cores on this computer` : 'simulated results'), fact(`${S.history.length} of 3`, 'recent runs kept')),
    recent,
    h('section', { class: 'start-row' },
      tile('Start a simulation', 'Choose a blockage, press run and watch the flow develop.', '#/setup', 'Start', true),
      tile('Compare two runs', 'Put a mild blockage next to a severe one on one picture.', '#/history', 'Open history'),
      tile('Learn to read it', 'Short lessons on the colours, the numbers and the limits.', '#/guide', 'Open guide')),
    h('p', { class: 'small muted', style: 'max-width:56em;margin-top:40px' }, 'A simplified two-dimensional model of a rigid, straight vessel with a constant-thickness liquid, in lattice units. It shows trends, not patient numbers, and is not a medical tool.'));

  // the hero breathes: the blockage and the flow ease in and out on the GPU, and the callout figure follows
  let raf, t = 0, last = performance.now(), shown = '';
  const pill = stage.nodes[0].querySelector('b');
  const loop = now => {
    raf = requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    const sev = .52 + .09 * Math.sin(t * .55), ramp = .94 + .06 * Math.sin(t * 1.3);
    stage.setHero({ sev, ramp });
    const f = `${(1 / (1 - sev)).toFixed(1)}×`; if (f !== shown) { shown = f; pill.textContent = f; }
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); stage.destroy(); };
}
const fact = (v, l) => h('div', { class: 'fact' }, h('div', { class: 'value' }, v), h('div', { class: 'label' }, l));
const tile = (t, p, href, go, dark) => h('a', { class: `start-card${dark ? ' dark' : ''}`, href }, h('h3', {}, t), h('p', {}, p), h('span', { class: 'go' }, go));
