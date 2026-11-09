// All market logic runs on India Standard Time (UTC+05:30, no daylight saving).
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
export const BARS_PER_SESSION = 375; // 09:15 to 15:30, one-minute bars

function ist(ms) {
  return new Date(ms + IST_OFFSET_MS);
}

export function istDateString(ms = Date.now()) {
  const d = ist(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Epoch ms of 09:15 IST on a YYYY-MM-DD date.
export function sessionOpenMs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 9, 15) - IST_OFFSET_MS;
}

// Number of one-minute bars that exist right now for today's session (0 before the open, 375 after the close).
export function barsElapsed(dateStr, nowMs = Date.now()) {
  const n = Math.floor((nowMs - sessionOpenMs(dateStr)) / 60000) + 1;
  return Math.max(0, Math.min(BARS_PER_SESSION, n));
}

// Epoch ms of the next 03:30 IST after the given time. Upstox access tokens lapse then.
export function nextTokenExpiryMs(fromMs = Date.now()) {
  const d = ist(fromMs);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 3, 30) - IST_OFFSET_MS;
  if (t <= fromMs) t += 24 * 3600 * 1000;
  return t;
}

export function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
