// Drawn icons: one 1.7 stroke, one 24px grid.
const NS = 'http://www.w3.org/2000/svg';
const P = {
  waves: '<path d="M3 8c2.5-3 5-3 7.5 0s5 3 7.5 0M3 13c2.5-3 5-3 7.5 0s5 3 7.5 0M3 18c2.5-3 5-3 7.5 0s5 3 7.5 0"/>',
  folio: '<rect x="4" y="4" width="13" height="10" rx="2"/><path d="M7 17.5h13v-10M10 20.5h13"/>',
  guide: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"/><path d="M8.5 9h6M8.5 12.5h6M8.5 16h3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="2.6"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/>',
  down: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  compare: '<path d="M12 4v16M4 8l4 4-4 4M20 8l-4 4 4 4"/>',
};
export function icon(name, size) {
  const e = document.createElementNS(NS, 'svg');
  e.setAttribute('viewBox', '0 0 24 24'); e.setAttribute('fill', 'none'); e.setAttribute('stroke', 'currentColor'); e.setAttribute('stroke-width', '1.7');
  e.setAttribute('stroke-linecap', 'round'); e.setAttribute('stroke-linejoin', 'round'); e.setAttribute('aria-hidden', 'true');
  if (size) { e.setAttribute('width', size); e.setAttribute('height', size); }
  e.innerHTML = P[name] || ''; return e;
}
/** The brand mark: a vessel with a squeeze, drawn as two soft shapes. */
export function mark() {
  const e = document.createElementNS(NS, 'svg'); e.setAttribute('viewBox', '0 0 32 32'); e.setAttribute('aria-hidden', 'true');
  e.innerHTML = '<defs><linearGradient id="mk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5e5ce6"/><stop offset="1" stop-color="#ff9f0a"/></linearGradient></defs><rect x="1" y="1" width="30" height="30" rx="9" fill="url(#mk)"/><path d="M5 11c5 0 6 3 11 3s6-3 11-3M5 21c5 0 6-3 11-3s6 3 11 3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>';
  return e;
}
