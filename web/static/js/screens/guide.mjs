import { h } from '../ui.mjs';
import { drawLegend } from '../render.mjs';

const LESSONS = [
  ['What am I looking at?', ['The picture is a side view of a blood vessel, with the liquid flowing from left to right. The dark grey parts are the vessel wall and the blockage.', 'The colours show how fast the liquid is moving at each spot: deep purple and blue are slow, green and yellow are medium, orange and red are fast.'], true],
  ['What is a blockage (stenosis)?', ['Fatty deposits or clots can narrow a vessel. "Stenosis severity" is the share of the vessel width that is blocked at its narrowest point: 50% means half the width is closed off.', 'The words Mild, Moderate, Significant and Severe are our own rough labels, not medical categories.']],
  ['Why does the flow speed up?', ['The same amount of liquid must get through every second. When the gap narrows, the liquid has to move faster to keep up, like water through a pinched hose.', 'The fast, narrow stream is called a jet. It is why the red area appears right at the tightest point.']],
  ['What do the three results mean?', ['Blocked at the tightest point: simply the setting you chose.', 'Faster than a clear vessel: how much quicker the fastest liquid moves compared with the fastest liquid in an unblocked vessel.', 'More pressure than a clear vessel: how much harder you must push to get the liquid through. In a body, that extra work falls on the heart.', 'The second and third numbers are approximate: the model is simplified.']],
  ['Why does a run take a while?', ['The program calculates the flow thousands of times a second and waits until the picture stops changing ("settles"). Thicker blockages take longer to settle.', 'Between runs the app asks the computer to rest for a moment so it does not overheat. The wait ends once the computer reports it has cooled down.']],
  ['What can this not tell me?', ['It is a flat (2D), simplified model with a stiff vessel and a liquid of constant thickness. Real arteries are three-dimensional and flexible, and real blood thins under shear.', 'Use it to see trends and build intuition. It is not a medical tool and must not be used to judge any person\'s health.']],
  ['What are the Expert settings?', ['The Expert panels show the technical values behind a run: the relaxation time τ (how thick the liquid is), the inlet speed, and the clot length. Each has a limited range, because outside it the simulation becomes unstable.', 'If a run does become unstable, the app explains what happened in plain words, and the Expert panel shows the solver\'s own error report.']],
];

export function mount(el) {
  const legend = h('canvas', { class: 'swatch', style: 'width:100%' });
  el.append(h('div', { class: 'stack' }, h('div', {}, h('p', { class: 'small' }, 'Guide'), h('h2', {}, 'How to read the simulation')),
    h('div', { class: 'cols2' }, LESSONS.map(([t, ps, sw]) => h('div', { class: 'card lesson' }, h('h3', {}, t), ps.map(p => h('p', {}, p)),
      sw ? [legend, h('div', { class: 'row between small' }, h('span', {}, 'slow'), h('span', {}, 'fast'))] : null)))));
  drawLegend(legend); legend.style.height = '14px';
}
