import { config } from '../config.js';
import { isSaneCandle, sortAscending } from '../candles.js';
import { istDateString } from '../time.js';
import { tokenStore } from '../tokenStore.js';

export class UpstreamError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
  }
}

// Upstox v3 candle endpoints (the v2 ones are marked deprecated):
//   today:  GET /v3/historical-candle/intraday/{instrument_key}/minutes/{interval}
//   past:   GET /v3/historical-candle/{instrument_key}/minutes/{interval}/{to_date}/{from_date}
// Each candle is [timestamp, open, high, low, close, volume, open_interest]. Rows come back newest first.
function candleUrl(instrumentKey, interval, date) {
  const base = config.upstox.baseUrl;
  const key = encodeURIComponent(instrumentKey);
  if (date === istDateString()) return `${base}/v3/historical-candle/intraday/${key}/minutes/${interval}`;
  return `${base}/v3/historical-candle/${key}/minutes/${interval}/${date}/${date}`;
}

function parse(rows) {
  const bars = rows.map((r) => ({ t: Date.parse(r[0]), o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]), v: Number(r[5]) }));
  return sortAscending(bars.filter(isSaneCandle));
}

export function createUpstoxAdapter() {
  const cache = new Map(); // key -> { at, bars }

  return {
    name: 'upstox',
    isReady: () => Boolean(tokenStore.get()),
    async getCandles({ sym, interval, date }) {
      const token = tokenStore.get();
      if (!token) throw new UpstreamError(401, 'Upstox is not connected.');

      const today = date === istDateString();
      const key = `${sym.symbol}|${interval}|${date}`;
      const hit = cache.get(key);
      const ttl = today ? 15_000 : 6 * 3600_000; // live bars refresh often, finished days barely change
      if (hit && Date.now() - hit.at < ttl) return hit.bars;

      const res = await fetch(candleUrl(sym.instrumentKey, interval, date), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401) tokenStore.clear(); // expired or revoked; force a fresh login
        const reason = body?.errors?.[0]?.message || res.statusText || 'request failed';
        throw new UpstreamError(res.status, `Upstox said: ${reason}`);
      }
      const rows = body?.data?.candles;
      if (!Array.isArray(rows)) throw new UpstreamError(502, 'Upstox returned an unexpected response.');

      const bars = parse(rows);
      cache.set(key, { at: Date.now(), bars });
      return bars;
    }
  };
}

// OAuth helpers. The login page is on Upstox; this server never sees the user's password.
export function loginUrl(state) {
  const u = new URL(`${config.upstox.baseUrl}/v2/login/authorization/dialog`);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', config.upstox.apiKey);
  u.searchParams.set('redirect_uri', config.upstox.redirectUri);
  u.searchParams.set('state', state);
  return u.toString();
}

export async function exchangeCode(code) {
  const res = await fetch(`${config.upstox.baseUrl}/v2/login/authorization/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code,
      client_id: config.upstox.apiKey,
      client_secret: config.upstox.apiSecret,
      redirect_uri: config.upstox.redirectUri,
      grant_type: 'authorization_code'
    })
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    throw new UpstreamError(res.status || 502, body?.errors?.[0]?.message || 'Upstox did not return a token.');
  }
  return body.access_token;
}
