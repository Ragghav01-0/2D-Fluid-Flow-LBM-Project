import { h } from '../ui.mjs';
import { drawFrame, drawLegend } from '../render.mjs';
import { drawVessel } from '../geometry.mjs';
import { demoFrame } from '../demo.mjs';

export function mount(el, ctx) {
  const { S } = ctx;
  const cv = h('canvas', { width: 512, height: 128, 'aria-label': 'Animated preview of blood flowing past a blockage' });
  const legend = h('canvas', { 'aria-hidden': 'true' });
  const last = S.history[0];
  el.append(
    h('section', { class: 'hero' },
      h('p', { class: 'small' }, 'An educational simulation'),
      h('h1', {}, 'See how a blocked vessel', h('br'), 'changes the way blood flows.'),
      h('p', { class: 'lede' }, 'Choose how much of an artery is blocked, press start, and watch the flow speed up, squeeze and swirl. No physics needed.'),
      h('div', { class: 'row' },
        h('a', { class: 'btn primary big', href: '#/setup' }, 'Start a simulation'),
        last ? h('a', { class: 'btn big', href: `#/summary/${last.id}` }, 'Last result') : null),
      h('div', { class: 'field' },
        cv,
        h('div', { class: 'badge l' }, 'Preview'),
        h('div', { class: 'axis', style: 'left:12px' }, 'inlet →'), h('div', { class: 'axis', style: 'right:12px' }, '→ outlet'),
        h('div', { class: 'legend' }, h('span', {}, 'slow'), legend, h('span', {}, 'fast')))),
    h('section', { class: 'cols3 steps3' },
      h('div', { class: 'card' }, h('span', { class: 'n' }, '1'), h('b', {}, 'Pick a blockage'), h('span', { class: 'small' }, 'How much of the vessel is blocked, whether it is on both walls, and where it sits.')),
      h('div', { class: 'card' }, h('span', { class: 'n' }, '2'), h('b', {}, 'Watch the flow'), h('span', { class: 'small' }, 'A real fluid simulation runs on your computer and draws the flow as it develops.')),
      h('div', { class: 'card' }, h('span', { class: 'n' }, '3'), h('b', {}, 'Understand why'), h('span', { class: 'small' }, 'A summary explains in plain words what the blockage did, and you can compare two runs.'))),
    h('p', { class: 'small', style: 'margin-top:28px;max-width:46em' },
      'This is a simplified 2D model of a rigid, straight vessel with a Newtonian fluid, in lattice units. It shows trends, not patient numbers, and is not a medical tool.'));
  drawLegend(legend);
  // slow loop of a developing flow past a varying blockage, labelled Preview
  let t = 0, raf;
  const demoSettings = sev => ({ clot: { severity: sev, symmetric: false, location: 1 / 3, length: 450, lopsided: -1 }, ux_target: 0.05, tau_s: 0.884 });
  const draw = () => {
    t += 0.004;
    const sev = 0.45 + 0.2 * Math.sin(t * 2.2), ramp = 0.75 + 0.25 * Math.sin(t * 9);
    drawFrame(cv, demoFrame(demoSettings(sev), ramp));
    raf = requestAnimationFrame(draw);
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) draw(); else drawFrame(cv, demoFrame(demoSettings(0.5), 1));
  return () => cancelAnimationFrame(raf);
}
