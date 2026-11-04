// App shell: store, router, top bar, popovers, tab bar. Screens live in js/screens/ and only talk to `ctx`.
import { createAdapter } from './adapter.mjs';
import { h, fmtClock } from './ui.mjs';
import { icon, mark } from './icons.mjs';
import * as home from './screens/home.mjs';
import * as setup from './screens/setup.mjs';
import * as running from './screens/running.mjs';
import * as summary from './screens/summary.mjs';
import * as history from './screens/history.mjs';
import * as guide from './screens/guide.mjs';

const A = createAdapter();
const S = { hello: null, state: { state: 'idle' }, tel: null, series: { dp: [], res: [] }, frame: null, failure: null, warnings: [],
  system: null, cooldown: { active: false, remaining: 0 }, cdAt: 0, history: [], finished: null, draft: null };
const DEFAULT_DRAFT = () => ({ severity: 0.5, symmetric: false, location: S.hello?.defaults.location ?? 1 / 3, length: S.hello?.defaults.length ?? 450,
  lopsided: -1, tau_s: S.hello?.defaults.tau_s ?? 0.884, ux_target: S.hello?.defaults.ux_target ?? 0.05, stop: { mode: 'converge' } });
const toast = msg => { const t = h('div', { class: 'toast' }, msg); document.getElementById('toasts').append(t); setTimeout(() => t.remove(), 2600); };
const ctx = { A, S, toast, go: hash => { location.hash = hash; }, newDraft: DEFAULT_DRAFT,
  remainingCooldown: () => Math.max(0, S.cooldown.remaining - (Date.now() - S.cdAt) / 1000) };

const SCREENS = { home, setup, run: running, summary, history, compare: history, guide };
let unmount = null, current = 'home';

function route() {
  const [name = 'home', ...args] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  const screen = SCREENS[name] ? name : 'home';
  if (unmount) { try { unmount(); } catch (e) { console.error(e); } unmount = null; }
  const app = document.getElementById('app'); app.replaceChildren();
  const el = h('div', { class: 'screen' }); app.append(el);
  current = screen; paintNav();
  if (!S.hello) { el.append(h('p', { class: 'lede' }, 'Connecting to the solver…')); return; }
  unmount = SCREENS[screen].mount(el, ctx, screen, args) || null;
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- appearance (light / dark / auto) and accent colour
const ACCENTS = [['Blue', '#0071e3', '#0a84ff'], ['Indigo', '#5856d6', '#7d7aff'], ['Green', '#248a3d', '#30d158'], ['Orange', '#c93400', '#ff9f0a'], ['Pink', '#d6336c', '#ff6482']];
const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
function applyTheme(pref) {
  const r = document.documentElement, sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = pref === 'light' || pref === 'dark' ? pref : (sysDark ? 'dark' : 'light');      // always explicit; Auto follows the system
  const accent = store.get('vfl-accent') || { light: ACCENTS[0][1], dark: ACCENTS[0][2] }, dark = r.dataset.theme === 'dark';
  r.style.setProperty('--accent', dark ? accent.dark : accent.light); r.style.setProperty('--link', dark ? accent.dark : accent.light);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(store.get('vfl-theme-pref') || 'auto'));
applyTheme(store.get('vfl-theme-pref') || 'auto');

// ---------------------------------------------------------------- top bar
const topbar = document.getElementById('topbar'), tabbar = document.getElementById('tabbar');
let openPop = null;
const closePop = () => { openPop?.remove(); openPop = null; };
addEventListener('click', e => { if (openPop && !openPop.contains(e.target) && !e.target.closest('[data-pop]')) closePop(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
addEventListener('scroll', () => topbar.classList.toggle('scrolled', scrollY > 4), { passive: true });

function popMachine() {
  const sys = S.system, cd = ctx.remainingCooldown(), mode = A.mode;
  const meter = (label, v, lvl) => h('div', {}, h('div', { class: 'row between small' }, h('span', {}, label), h('span', { class: 'nums muted' }, `${Math.round(v * 100)}%`)), h('div', { class: `meter ${lvl || ''}` }, h('i', { style: `width:${Math.min(100, v * 100)}%` })));
  const thermal = !sys ? '' : sys.throttle == null ? 'Not reported on this computer' : sys.throttle > 0 ? 'Slowing down to cool off' : 'Normal';
  return h('div', { class: 'pop glass', role: 'dialog', 'aria-label': 'This computer' },
    h('div', {}, h('h4', {}, mode === 'demo' ? 'Demo mode' : 'This computer'), h('p', { class: 'small muted' }, mode === 'demo' ? 'The real solver is not connected. Everything you see is simulated.' : `${S.hello?.arch || 'CPU'} · ${S.hello?.cores || '?'} cores · the solver runs here, not in the cloud.`)),
    sys ? [meter('Memory', sys.mem_used, sys.mem_used > .95 ? 'critical' : sys.mem_used > .85 ? 'warn' : ''), meter('Processor load', Math.min(1, sys.cpu / 100), sys.cpu > 90 ? 'warn' : ''),
      h('div', { class: 'row between small' }, h('span', {}, 'Heat'), h('span', { class: 'muted' }, thermal))] : null,
    sys?.messages?.length ? h('div', { class: 'notice warn small' }, sys.messages.join(' ')) : null,
    S.cooldown.active ? h('div', { class: 'notice small' }, `Resting between runs: ${fmtClock(cd)}. ${S.cooldown.reason || ''}`) : null);
}
function popSettings() {
  const pref = store.get('vfl-theme-pref') || 'auto', acc = store.get('vfl-accent') || { light: ACCENTS[0][1] };
  const seg = h('div', { class: 'seg full', role: 'radiogroup', 'aria-label': 'Appearance' }, [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].map(([v, l]) =>
    h('button', { role: 'radio', 'aria-checked': String(pref === v), onclick: () => { store.set('vfl-theme-pref', v); applyTheme(v); [...seg.children].forEach(b => b.setAttribute('aria-checked', String(b.textContent === l))); } }, l)));
  const sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Accent colour' }, ACCENTS.map(([n, l, d]) =>
    h('button', { role: 'radio', title: n, 'aria-label': n, 'aria-checked': String(acc.light === l), style: `background:${l}`, onclick: () => { store.set('vfl-accent', { light: l, dark: d }); applyTheme(store.get('vfl-theme-pref') || 'auto'); [...sw.children].forEach(b => b.setAttribute('aria-checked', String(b.title === n))); } })));
  return h('div', { class: 'pop glass', role: 'dialog', 'aria-label': 'Settings' }, h('div', {}, h('h4', {}, 'Appearance'), seg), h('div', {}, h('h4', {}, 'Accent colour'), sw));
}
function paintNav() {
  const sys = S.system, lvl = A.mode === 'demo' ? 'warn' : (sys?.level || 'ok'), run = ['preparing', 'running', 'paused', 'measuring'].includes(S.state.state);
  const link = (hash, label, ids) => h('a', { href: hash, 'aria-current': ids.includes(current) ? 'page' : null }, label);
  const open = (build, btn) => () => { if (openPop) { closePop(); return; } openPop = build(); btn.parentElement.append(openPop); };
  const chip = h('button', { class: 'chip', 'data-pop': '', 'aria-haspopup': 'dialog', title: 'This computer' }, h('span', { class: `dot ${lvl}` }), icon('chip', 16), h('span', {}, A.mode === 'demo' ? 'Demo' : (S.hello?.arch || 'CPU')));
  const gear = h('button', { class: 'btn icon', 'data-pop': '', 'aria-label': 'Settings', 'aria-haspopup': 'dialog' }, icon('gear', 20));
  chip.onclick = () => { if (openPop) { closePop(); return; } openPop = popMachine(); chip.parentElement.append(openPop); };
  gear.onclick = () => { if (openPop) { closePop(); return; } openPop = popSettings(); gear.parentElement.append(openPop); };
  const pct = S.tel ? Math.round((S.tel.step / Math.max((S.state.settings?.stop?.steps || 0), 1)) * 100) : 0;
  topbar.replaceChildren(
    h('a', { class: 'brand', href: '#/home' }, mark(), h('span', {}, 'Vessel Flow Lab')),
    h('nav', { class: 'nav-links', 'aria-label': 'Main' }, link('#/setup', 'Simulate', ['home', 'setup', 'run', 'summary']), link('#/history', 'History', ['history', 'compare']), link('#/guide', 'Guide', ['guide'])),
    h('div', { class: 'topbar-actions' }, run && current !== 'run' ? h('a', { class: 'run-pill', href: '#/run' }, h('i'), S.state.state === 'measuring' ? 'Comparing…' : 'Running') : null, chip, gear));
  tabbar.replaceChildren(
    h('a', { href: '#/setup', 'aria-current': ['home', 'setup', 'run', 'summary'].includes(current) ? 'page' : null }, icon('waves'), 'Simulate'),
    h('a', { href: '#/history', 'aria-current': ['history', 'compare'].includes(current) ? 'page' : null }, icon('folio'), 'History'),
    h('a', { href: '#/guide', 'aria-current': current === 'guide' ? 'page' : null }, icon('guide'), 'Guide'));
}

// ---------------------------------------------------------------- events
const setCooldown = c => { if (c) { S.cooldown = c; S.cdAt = Date.now(); } };
A.on('hello', m => { S.hello = m; S.history = m.history; S.system = m.system; setCooldown(m.cooldown); S.state = m.state; S.draft ||= DEFAULT_DRAFT(); route(); });
A.on('system', m => { S.system = m.system; setCooldown(m.cooldown); if (!openPop) paintNav(); A.emit('ui:system', m); });
A.on('history', m => { S.history = m.history; A.emit('ui:history', m); });
A.on('state', m => {
  const prev = S.state.state; S.state = m;
  if (m.state === 'preparing' && prev !== 'preparing') { S.tel = null; S.series = { dp: [], res: [] }; S.failure = null; S.warnings = []; S.frame = null; S.finished = null; if (current !== 'run') ctx.go('#/run'); }
  if (!openPop) paintNav(); A.emit('ui:state', m);
});
A.on('telemetry', m => { S.tel = m; S.series.dp.push(m.dp); S.series.res.push(Math.log10(Math.max(m.residual, 1e-12))); for (const k of ['dp', 'res']) if (S.series[k].length > 240) S.series[k].shift(); A.emit('ui:telemetry', m); });
A.on('frame', f => { S.frame = f; A.emit('ui:frame', f); });
A.on('warning', m => { S.warnings.push(m); A.emit('ui:warning', m); });
A.on('finished', m => { S.history = m.history; S.finished = m; setCooldown(m.cooldown); ctx.go(`#/summary/${m.run_id}`); });
A.on('summary_update', m => { S.history = m.history; if (S.finished && S.finished.run_id === m.run_id) S.finished.summary = m.summary; if (location.hash.includes(m.run_id) && current === 'summary') route(); });
A.on('failed', m => { S.failure = m; A.emit('ui:failed', m); if (current !== 'run') ctx.go('#/run'); });
A.on('rejected', m => { A.emit('ui:rejected', m); if (m.cooldown) setCooldown(m.cooldown); });
A.on('connection', () => paintNav());

addEventListener('hashchange', () => { closePop(); route(); });
paintNav();
A.connect();
if (!location.hash) location.hash = '#/home';
