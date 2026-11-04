import { h } from '../ui.mjs';
import { icon } from '../icons.mjs';

const LESSONS = [
  ['Reading the picture', 'What the colours and the numbers on the flow mean.', [
    ['A side view', 'The picture is the vessel seen from the side, with the liquid flowing from left to right. The gray shapes are the vessel wall and the blockage.'],
    ['Colour is speed', 'Pale blue is slow liquid. Blue and indigo are faster. Pink and orange mark the fastest liquid in the picture.', 'swatch'],
    ['Fine lines', 'The thin lines join places moving at the same speed, like the contour lines on a map. Where they bunch together, the speed changes quickly.'],
    ['Streaks and pins', 'Short streaks drift along with the liquid, faster where it is faster. A pin with a number marks a result at the place it applies to.']]],
  ['What is a blockage?', 'Stenosis, severity and the rough words we use.', [
    ['Narrowing', 'Fatty deposits or clots can narrow a vessel. Severity is the share of the vessel width blocked at its narrowest point: 50% means half the width is closed off.'],
    ['Our own words', 'Mild, Moderate, Significant and Severe are our own rough labels for the percentage. They are not medical categories.']]],
  ['Why the flow speeds up', 'The same amount of liquid has to get through.', [
    ['Keeping up', 'The same amount of liquid must pass every second. When the gap narrows, the liquid has to move faster to keep up, like water through a pinched hose.'],
    ['The jet', 'The narrow, fast stream is called a jet. It is why the picture turns orange right at the tightest point.']]],
  ['The three results', 'Blocked, faster, and harder to push.', [
    ['Blocked', 'The first number is simply the setting you chose.'],
    ['Faster', 'The second compares the quickest liquid with the quickest liquid in an unblocked vessel.'],
    ['Harder to push', 'The third is how much more pressure is needed than for a clear vessel. In a body, that extra work falls on the heart. The second and third numbers are approximate.']]],
  ['Why a run takes a while', 'And why the app asks your computer to rest.', [
    ['Settling', 'The program calculates the flow thousands of times a second and waits until the picture stops changing. Thicker blockages take longer to settle.'],
    ['Resting', 'Between runs the app asks the computer to rest so it does not overheat. The wait ends once the computer reports that it has cooled down.']]],
  ['What this can’t tell you', 'The limits of a simplified model.', [
    ['A simple model', 'It is a flat, two-dimensional model with a stiff vessel and a liquid of constant thickness. Real arteries are three-dimensional and flexible, and real blood thins under shear.'],
    ['Not medical', 'Use it to build intuition about trends. It is not a medical tool and must not be used to judge anyone’s health.'],
    ['Expert settings', 'The Expert settings show the values behind a run: how thick the liquid is, the inlet speed and the clot length. Each has a limited range, because outside it the simulation becomes unstable.']]],
];

export function mount(el, ctx) {
  const open = (title, steps) => {
    const dlg = h('dialog', { class: 'modal', 'aria-label': title },
      h('div', { class: 'dialog-head' }, h('h2', {}, title), h('button', { class: 'btn icon', 'aria-label': 'Close', onclick: () => dlg.close() }, icon('close', 18))),
      h('div', { class: 'dialog-body' }, steps.map(([t, p, extra]) => h('div', { class: 'stepcard' }, h('b', {}, t), p, extra === 'swatch' ? h('div', { class: 'swatch-demo', style: 'margin-top:12px' }) : null))));
    dlg.addEventListener('close', () => dlg.remove()); dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg); dlg.showModal();
  };
  el.append(h('div', { class: 'stack', style: 'gap:24px' }, h('h1', {}, 'Guide'), h('p', { class: 'lede', style: 'max-width:44ch' }, 'Short lessons on reading the simulation. Pick one.'),
    h('div', { class: 'lessons' }, LESSONS.map(([t, p, steps]) => h('button', { class: 'lesson', onclick: () => open(t, steps) }, h('h3', {}, t), h('p', {}, p), h('span', { class: 'more' }, 'Read the lesson'))))));
}
