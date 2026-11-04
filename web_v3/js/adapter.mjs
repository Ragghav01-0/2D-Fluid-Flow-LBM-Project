// The ONLY file that talks to the server. `createAdapter()` returns the same interface for the live solver and for the
// Demo, so every screen works unchanged in both. Events: hello, state, telemetry, frame, finished, failed, rejected,
// system, history, warning.
import { parseFrame } from './frame.mjs';
import { DemoRun, demoFrame, demoSummary } from './demo.mjs';

export function createAdapter() {
  const listeners = {};
  const on = (ev, fn) => { (listeners[ev] ||= []).push(fn); return () => { listeners[ev] = listeners[ev].filter(f => f !== fn); }; };
  const emit = (ev, data) => (listeners[ev] || []).forEach(fn => fn(data));
  const forceDemo = new URLSearchParams(location.search).has('demo');
  let ws = null, demo = null;
  const A = { mode: 'connecting', on, emit };

  // ---------------------------------------------------------------- live
  function connectLive() {
    return new Promise(resolve => {
      if (forceDemo || !/^https?:$/.test(location.protocol)) return resolve(false);
      let settled = false;
      const sock = new WebSocket(`ws://${location.host}/`);
      sock.binaryType = 'arraybuffer';
      const timer = setTimeout(() => { if (!settled) { settled = true; sock.close(); resolve(false); } }, 1500);
      sock.onopen = () => { settled = true; clearTimeout(timer); ws = sock; A.mode = 'live'; resolve(true); };
      sock.onerror = () => {};
      sock.onclose = () => {
        if (!settled) { settled = true; clearTimeout(timer); return resolve(false); }
        if (A.mode === 'live') { A.mode = 'lost'; emit('connection', { lost: true }); }
      };
      sock.onmessage = ev => {
        if (typeof ev.data !== 'string') return emit('frame', parseFrame(ev.data));
        const m = JSON.parse(ev.data);
        emit(m.type, m);
      };
    });
  }

  // ---------------------------------------------------------------- demo
  const DEMO_LIMITS = { severity: [0, 0.75], tau: [0.7, 1.5], ux: [0.01, 0.1], length: [100, 600], throat_speed_max: 0.22, throat_speed_warn: 0.15 };
  let demoHistory = [], demoCool = { active: false, until: 0 }, demoState = { state: 'idle', run_id: null, settings: null, step: 0 };
  function demoHello() {
    return { type: 'hello', limits: DEMO_LIMITS, defaults: { tau_s: 0.884, ux_target: 0.05, length: 450, location: 1 / 3 },
             grid: { nx: 1024, ny: 256 }, arch: 'Demo', cores: 0, lengths: { quick: 1, medium: 2.5, long: 5 },
             flow_through_steps: 20480, history: demoHistory, state: { type: 'state', ...demoState },
             system: { mem_used: 0.5, cpu: 10, throttle: 0, temp_c: null, level: 'ok', messages: [] }, cooldown: cooldownNow() };
  }
  function cooldownNow() {
    const rem = Math.max(0, (demoCool.until - Date.now()) / 1000);
    return { active: rem > 0, remaining: rem, reason: rem > 0 ? 'Giving the computer a short rest before the next run.' : '', min_total: 8 };
  }
  function demoStart(settings) {
    if (demo || cooldownNow().active) return emit('rejected', { reason: demo ? 'busy' : 'cooldown', cooldown: cooldownNow(), message: 'Not now.' });
    const id = 'demo-' + new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const s = {   // same shape the real server builds from the form
      tau_s: settings.tau_s, ux_target: settings.ux_target, spf: 20, turbo: false,
      clot: { severity: settings.severity, symmetric: !!settings.symmetric, location: settings.location, length: settings.length, lopsided: settings.lopsided ?? -1 },
      stop: settings.stop || { mode: 'converge' } };
    if (s.stop.mode === 'steps' && !s.stop.steps) s.stop.steps = Math.round(({ quick: 1, medium: 2.5, long: 5 }[s.stop.size] || 2.5) * 20480);
    demoState = { state: 'preparing', run_id: id, settings: s, step: 0 };
    demo = new DemoRun(s, m => {
      if (m.type === 'frame') return emit('frame', m.frame);
      if (m.type === 'status') { demoState = { ...demoState, state: m.state, step: m.step }; return emit('state', { type: 'state', ...demoState }); }
      if (m.type === 'done') {
        demo = null; demoState = { ...demoState, state: 'finished' };
        demoHistory = [{ id, settings: s, summary: m.summary }, ...demoHistory].slice(0, 3);
        demoCool = { until: Date.now() + 8000 };
        emit('finished', { type: 'finished', run_id: id, summary: m.summary, settings: s, history: demoHistory });
        return emit('state', { type: 'state', ...demoState });
      }
      emit(m.type, m);
    });
    emit('state', { type: 'state', ...demoState });
  }

  // ---------------------------------------------------------------- public interface
  A.connect = async () => {
    if (await connectLive()) return A.mode;
    A.mode = 'demo';
    setTimeout(() => { emit('hello', demoHello()); setInterval(() => emit('system', { type: 'system', system: demoHello().system, cooldown: cooldownNow() }), 1000); }, 0);
    return A.mode;
  };
  const send = obj => ws && ws.readyState === 1 && ws.send(JSON.stringify(obj));
  A.startRun = settings => (A.mode === 'live' ? send({ type: 'run', settings }) : demoStart(settings));
  A.command = (cmd, extra = {}) => (A.mode === 'live' ? send({ type: 'command', cmd, ...extra }) : demo && (cmd === 'set' ? 0 : demo.command(cmd)));
  A.deleteRun = id => {
    if (A.mode === 'live') return send({ type: 'delete_run', id });
    demoHistory = demoHistory.filter(r => r.id !== id); emit('history', { type: 'history', history: demoHistory });
  };
  A.downloadUrl = id => (A.mode === 'live' ? `/download/${id}` : null);
  /** The saved final flow picture of a finished run. */
  A.finalFrame = async id => {
    if (A.mode === 'live') {
      const r = await fetch(`/download/${id}/final_frame.bin`);
      return r.ok ? parseFrame(await r.arrayBuffer()) : null;
    }
    const run = demoHistory.find(r => r.id === id);
    return run ? demoFrame(run.settings, 1) : null;
  };
  A.demoPreviewFrame = (settings, ramp) => demoFrame(settings, ramp);
  return A;
}
