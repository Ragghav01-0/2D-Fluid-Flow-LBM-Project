// App shell: shared store, router, top bar. Screens live in js/screens/ and only talk to `ctx`.
import { createAdapter } from './adapter.mjs';
import { h, fmtClock } from './ui.mjs';
import * as home from './screens/home.mjs';
import * as setup from './screens/setup.mjs';
import * as running from './screens/running.mjs';
import * as summary from './screens/summary.mjs';
import * as history from './screens/history.mjs';
import * as guide from './screens/guide.mjs';

const A = createAdapter();
const S = {
  hello: null, state: { state: 'idle' }, tel: null, series: { dp: [], res: [] }, frame: null, failure: null, warnings: [],
  system: null, cooldown: { active: false, remaining: 0 }, cdAt: 0, history: [], finished: null,
  draft: null,
};
const DEFAULT_DRAFT = () => ({
  severity: 0.5, symmetric: false, location: S.hello?.defaults.location ?? 1 / 3, length: S.hello?.defaults.length ?? 450,
  lopsided: -1, tau_s: S.hello?.defaults.tau_s ?? 0.884, ux_target: S.hello?.defaults.ux_target ?? 0.05,
  stop: { mode: 'converge' },
});
const ctx = { A, S, go: hash => { location.hash = hash; }, newDraft: DEFAULT_DRAFT, remainingCooldown: () => Math.max(0, S.cooldown.remaining - (Date.now() - S.cdAt) / 1000) };
export { ctx };

const SCREENS = { home, setup, run: running, summary, history, compare: history, guide };
let unmount = null, current = '';

function route() {
  const [name = 'home', ...args] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  let screen = SCREENS[name] ? name : 'home';
  const key = location.hash;
  if (unmount) { try { unmount(); } catch (e) { console.error(e); } unmount = null; }
  const root = document.getElementById('app');
  root.replaceChildren();
  const el = h('div', { class: 'screen' });
  root.append(el);
  if (!S.hello) { el.append(h('p', { class: 'lede' }, 'Connecting…')); current = screen; drawNav(); return; }
  unmount = SCREENS[screen].mount(el, ctx, screen, args) || null;
  current = screen;
  drawNav();
  window.scrollTo(0, 0);
}

function drawNav() {
  const nav = document.getElementById('nav');
  const tab = (hash, label, ids) => h('a', { href: hash, 'aria-current': ids.includes(current) ? 'page' : null }, label);
  const sys = S.system, lvl = sys?.level || 'ok';
  const live = A.mode === 'live';
  nav.replaceChildren(...[
    h('a', { class: 'brand', href: '#/home' }, h('i'), h('span', {}, 'Vessel Flow Lab')),
    h('nav', { class: 'tabs' }, tab('#/setup', 'Simulate', ['home', 'setup', 'run', 'summary']), tab('#/history', 'History', ['history', 'compare']), tab('#/guide', 'Guide', ['guide'])),
    h('div', { class: 'grow' }),
    A.mode === 'demo' ? h('span', { class: 'chip', title: 'The real solver is not connected. Results are simulated.' }, h('span', { class: 'dot warn' }), 'Demo') : null,
    A.mode === 'lost' ? h('span', { class: 'chip' }, h('span', { class: 'dot critical' }), 'Disconnected') : null,
    live ? h('span', { class: 'chip', title: `${S.hello?.cores ?? ''} logical cores` }, h('span', { class: 'dot ok' }), S.hello?.arch || 'CPU') : null,
    h('span', { class: 'chip', id: 'sysLamp', title: sys ? (sys.messages.join(' ') || 'Memory, CPU and heat look fine.') : '' },
      h('span', { class: `dot ${lvl}` }), sys ? `${Math.round(sys.mem_used * 100)}% memory` : '…'),
    h('button', { class: 'chip', title: 'Light / dark', onclick: toggleTheme, 'aria-label': 'Toggle light or dark appearance' }, '◐'),
  ].filter(Boolean));
}
function toggleTheme() {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (_) {}
}

// ---------------------------------------------------------------- events
const setCooldown = c => { if (c) { S.cooldown = c; S.cdAt = Date.now(); } };
A.on('hello', m => {
  S.hello = m; S.history = m.history; S.system = m.system; setCooldown(m.cooldown); S.state = m.state;
  S.draft ||= DEFAULT_DRAFT();
  route();
});
A.on('system', m => { S.system = m.system; setCooldown(m.cooldown); drawNav(); A.emit('ui:system', m); });
A.on('history', m => { S.history = m.history; A.emit('ui:history', m); });
A.on('state', m => {
  const prev = S.state.state;
  S.state = m;
  if (m.state === 'preparing' && prev !== 'preparing') {
    S.tel = null; S.series = { dp: [], res: [] }; S.failure = null; S.warnings = []; S.frame = null; S.finished = null;
    if (current !== 'run') ctx.go('#/run');
  }
  A.emit('ui:state', m);
});
A.on('telemetry', m => {
  S.tel = m; S.series.dp.push(m.dp); S.series.res.push(Math.log10(Math.max(m.residual, 1e-12)));
  for (const k of ['dp', 'res']) if (S.series[k].length > 240) S.series[k].shift();
  A.emit('ui:telemetry', m);
});
A.on('frame', f => { S.frame = f; A.emit('ui:frame', f); });
A.on('warning', m => { S.warnings.push(m); A.emit('ui:warning', m); });
A.on('finished', m => { S.history = m.history; S.finished = m; setCooldown(m.cooldown); ctx.go(`#/summary/${m.run_id}`); });
A.on('summary_update', m => {
  S.history = m.history;
  if (S.finished && S.finished.run_id === m.run_id) S.finished.summary = m.summary;
  if (location.hash.includes(m.run_id) && current === 'summary') route();    // redraw with the measured comparison
});
A.on('failed', m => { S.failure = m; A.emit('ui:failed', m); if (current !== 'run') ctx.go('#/run'); });
A.on('rejected', m => { A.emit('ui:rejected', m); if (m.cooldown) setCooldown(m.cooldown); });
A.on('connection', () => { drawNav(); });

addEventListener('hashchange', route);
drawNav();
A.connect().then(() => { if (A.mode === 'live') { /* hello arrives as the first message */ } });
if (!location.hash) location.hash = '#/home';
