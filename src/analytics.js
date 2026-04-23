export const ANALYTICS_EVENTS = [
  'level_start',
  'level_win',
  'level_fail',
  'level_undo',
  'daily_start',
  'daily_win',
  'streak_extended',
  'streak_broken',
];

export const MAX_BUFFER = 500;

const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

const buffer = [];

function installGlobal() {
  if (typeof window !== 'undefined') {
    window.__PIXELPOWER_ANALYTICS__ = {
      events: buffer,
      track,
    };
  }
}

export function track(event, payload = {}) {
  if (!ANALYTICS_EVENTS.includes(event)) {
    throw new Error(`unknown analytics event: "${event}"`);
  }
  const entry = { event, payload, ts: Date.now() };
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) {
    buffer.splice(0, buffer.length - MAX_BUFFER);
  }
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, payload);
  }
}

export function getRecordedEvents() {
  return buffer.slice();
}

export function _resetForTests() {
  buffer.length = 0;
}

installGlobal();
