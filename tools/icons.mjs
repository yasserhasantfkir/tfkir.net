/* ============================================================
   tools/icons.mjs — مجموعة الأيقونات (SVG inline)
   ============================================================ */

const P = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;

export const icons = {
  /* ---- brand / ui ---- */
  moon: P('<path d="M20.5 14.6A8.5 8.5 0 1 1 9.4 3.5a6.8 6.8 0 0 0 11.1 11.1Z"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  menu: P('<path d="M3.5 7h17M3.5 12h17M3.5 17h17"/>'),
  close: P('<path d="M6 6l12 12M18 6L6 18"/>'),
  arrowUp: P('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>'),
  arrowRight: P('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  arrowLeft: P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  chevronDown: P('<path d="M6 9.5l6 6 6-6"/>'),
  copy: P('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  check: P('<path d="M4.5 12.5l5 5 10-11"/>'),
  checkCircle: P('<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.6 2.6L16 9.5"/>'),
  alert: P('<circle cx="12" cy="12" r="9"/><path d="M12 7.6v5M12 16.2h.01"/>'),
  share: P('<circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="M8.3 10.8l7.4-3.9M8.3 13.2l7.4 3.9"/>'),
  link: P('<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3"/>'),
  external: P('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
  download: P('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/>'),
  play: P('<circle cx="12" cy="12" r="9"/><path d="M10.2 8.6l5.6 3.4-5.6 3.4V8.6Z" fill="currentColor" stroke="none"/>'),
  quote: P('<path d="M9.5 6.5C7 7.8 5.5 10 5.5 12.6c0 2.2 1.3 3.6 3.1 3.6 1.7 0 2.9-1.2 2.9-2.8 0-1.6-1.1-2.7-2.6-2.7-.3 0-.6 0-.8.1.4-1.5 1.5-2.6 3-3.4l-1.6-.9ZM18 6.5c-2.5 1.3-4 3.5-4 6.1 0 2.2 1.3 3.6 3.1 3.6 1.7 0 2.9-1.2 2.9-2.8 0-1.6-1.1-2.7-2.6-2.7-.3 0-.6 0-.8.1.4-1.5 1.5-2.6 3-3.4L18 6.5Z"/>'),
  spark: P('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z"/>'),
  search: P('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  filter: P('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  clock: P('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6V12l3 1.8"/>'),
  calendar: P('<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/>'),
  location: P('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>'),
  video: P('<rect x="3" y="6" width="12.5" height="12" rx="2.5"/><path d="M15.5 10.5 21 7.2v9.6l-5.5-3.3V10.5Z"/>'),
  doc: P('<path d="M6 3.5h7l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M13 3.5V9h5"/><path d="M8.5 13h7M8.5 16.5h5"/>'),
  file: P('<path d="M6 3.5h7l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M13 3.5V9h5"/>'),
  bookmark: P('<path d="M6.5 4.5h11a1 1 0 0 1 1 1v14.2l-6.5-3.6-6.5 3.6V5.5a1 1 0 0 1 1-1Z"/>'),
  database: P('<ellipse cx="12" cy="6.5" rx="7.5" ry="3"/><path d="M4.5 6.5v11c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-11"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>'),
  globe: P('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.4 3.6 8.5S14.4 18.1 12 20.5c-2.4-2.4-3.6-5.4-3.6-8.5S9.6 5.9 12 3.5Z"/>'),
  brain: P('<path d="M12 5.2a2.7 2.7 0 0 0-5.1-1.1A2.8 2.8 0 0 0 4 6.6a2.9 2.9 0 0 0-.6 4.6A2.9 2.9 0 0 0 4.3 15a2.8 2.8 0 0 0 3.2 2.7A2.7 2.7 0 0 0 12 18.8V5.2Z"/><path d="M12 5.2a2.7 2.7 0 0 1 5.1-1.1A2.8 2.8 0 0 1 20 6.6a2.9 2.9 0 0 1 .6 4.6A2.9 2.9 0 0 1 19.7 15a2.8 2.8 0 0 1-3.2 2.7A2.7 2.7 0 0 1 12 18.8V5.2Z"/><path d="M9 9.5h1.6M13.4 13.2H15"/>'),
  heart: P('<path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4c0 4.8-7.5 9.4-7.5 9.4Z"/>'),
  stethoscope: P('<path d="M6 3.5v4a3.5 3.5 0 0 0 7 0v-4"/><path d="M4.5 3.5h3M11.5 3.5h3"/><path d="M9.5 11v2.2a4.3 4.3 0 0 0 8.6 0V12"/><circle cx="18.1" cy="10.4" r="1.9"/>'),
  book: P('<path d="M5 4.5h5.2a2.8 2.8 0 0 1 2.8 2.8v12.2a2.2 2.2 0 0 0-2.2-2.2H5V4.5Z"/><path d="M19 4.5h-5.2A2.8 2.8 0 0 0 11 7.3v12.2a2.2 2.2 0 0 1 2.2-2.2H19V4.5Z"/>'),
  pen: P('<path d="M4 20l1-4.2L15.8 5a2.1 2.1 0 0 1 3 3L8 18.8 4 20Z"/><path d="M14.2 6.6l3.2 3.2"/>'),
  layers: P('<path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z"/><path d="M3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>'),
  compass: P('<circle cx="12" cy="12" r="8.5"/><path d="M15.4 8.6l-2 4.8-4.8 2 2-4.8 4.8-2Z"/>'),
  target: P('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>'),
  scales: P('<path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 5.5a3 3 0 0 0 5 0L5 8ZM19 8l-2.5 5.5a3 3 0 0 0 5 0L19 8Z"/><path d="M12 6.5 5 8M12 6.5 19 8"/>'),
  mic: P('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>'),
  users: P('<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2"/><path d="M16 6.2a3.2 3.2 0 0 1 0 6M17 14.6c2.1.6 3.5 2.5 3.5 4.9"/>'),
  user: P('<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20c0-3.6 3.2-6.2 7.2-6.2s7.2 2.6 7.2 6.2"/>'),
  send: P('<path d="M20.5 3.5 10.8 13.2"/><path d="M20.5 3.5 14 20.5l-3.2-7.3L3.5 10l17-6.5Z"/>'),
  mail: P('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.8 7 12 13 20.2 7"/>'),
  phone: P('<path d="M6.2 3.8h2.3l1.6 4-2 1.4a12 12 0 0 0 5.7 5.7l1.4-2 4 1.6v2.3a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 4.2 6a2 2 0 0 1 2-2.2Z"/>'),
  pin: P('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/>'),
  message: P('<path d="M20.5 12.5c0 3.9-3.8 7-8.5 7-1 0-2-.15-2.9-.43L4 20.5l1.6-3.7A6.7 6.7 0 0 1 3.5 12.5c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7Z"/>'),
  shield: P('<path d="M12 3.2 5 5.8v5.6c0 4.2 2.9 7.6 7 9.4 4.1-1.8 7-5.2 7-9.4V5.8L12 3.2Z"/><path d="M9 12.2l2.2 2.2 4-4.2"/>'),
  key: P('<circle cx="8.5" cy="12" r="4"/><path d="M12.5 12h8M17.5 12v3M20 12v2.2"/>'),
  eye: P('<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>'),
  pulse: P('<path d="M3 12.5h4l2-5.5 3.5 10.5 2.5-6 1.6 3h4.4"/>'),
  lock: P('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  infinity: P('<path d="M8.4 8.5a3.5 3.5 0 1 0 0 7c2.6 0 3.4-3.5 7.2-7a3.5 3.5 0 1 1 0 7c-3.8 0-4.6-7-7.2-7Z"/>'),
  refresh: P('<path d="M20 11.5a8 8 0 0 0-14-4.4L4 9.5"/><path d="M4 4.5v5h5M4 12.5a8 8 0 0 0 14 4.4l2-2.4"/><path d="M20 19.5v-5h-5"/>'),
  building: P('<path d="M4.5 20.5V5.2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15.3M14.5 10.2h4a1 1 0 0 1 1 1v9.3M3 20.5h18"/><path d="M8 8h3M8 11.5h3M8 15h3"/>'),

  /* ---- socials ---- */
  x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.2 3h3.3l-7.2 8.3 8.5 11.4h-6.7l-5.2-6.9-6 6.9H.6l7.7-8.8L.1 3h6.8l4.7 6.3L17.2 3Zm-1.2 16.7h1.8L7.9 4.6H5.9l10.1 15.1Z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.9 9.75h4.15V21H2.9V9.75Zm6.85 0h3.98v1.55h.06c.55-1.05 1.9-2.16 3.92-2.16 4.19 0 4.96 2.76 4.96 6.34V21h-4.14v-5.02c0-1.2-.02-2.74-1.67-2.74-1.67 0-1.93 1.3-1.93 2.65V21H9.75V9.75Z"/></svg>',
  instagram: P('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/>'),
  youtube: P('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.3 9.6l4.6 2.4-4.6 2.4V9.6Z" fill="currentColor" stroke="none"/>'),
  telegram: P('<path d="M21 5.2 2.8 11.5c-.9.35-.88 1.63.03 1.95l4.3 1.4 1.6 4.9c.26.8 1.3 1.02 1.86.4l2.3-2.6 4.3 3.2c.72.53 1.74.13 1.9-.75L22.6 6.5c.18-1-.8-1.75-1.6-1.3Z"/><path d="M7.1 14.9 19.3 7.4l-8.6 9.4"/>'),
  whatsapp: P('<path d="M3.5 20.5 5 16.4A8 8 0 1 1 8.2 19.4l-4.7 1.1Z"/><path d="M9.2 8.4c.3 0 .5.1.7.5l.7 1.4c.1.3 0 .5-.1.7l-.5.6c.5 1 1.4 1.8 2.4 2.2l.6-.6c.2-.2.4-.2.7-.1l1.4.7c.3.1.4.3.4.6 0 .9-.8 1.5-1.7 1.5-3.4 0-6.5-3.1-6.5-6.4 0-.9.6-1.6 1.5-1.6h.4Z"/>'),
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 8.5V6.5c0-1.1.9-2 2-2h2V1.5h-3c-2.8 0-4.5 1.7-4.5 4.5v2.5h-2.5v3h2.5V22.5h3V11.5h2.5l.5-3h-3Z"/></svg>',
  github: P('<path d="M9.2 20.5c-4 1.2-4-2.2-5.6-2.7m11.2 5.2v-3.3c0-.9.1-1.3-.4-1.8 2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.3s-1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 5.1 5.5 5.4 5.5 5.4a4.3 4.3 0 0 0-.1 3.3A4.6 4.6 0 0 0 4 11.9c0 4.7 2.8 5.7 5.5 6-.4.4-.4 1-.4 1.6v4"/>'),
  telegramX: '',
};

export function icon(name, cls = "") {
  const svg = icons[name] || icons.spark;
  if (!cls) return svg;
  return svg.replace('<svg ', `<svg class="${cls}" `);
}

export function socialIcon(key) {
  return icon(key in icons ? key : (key==="facebook"?"facebook":"link"));
}