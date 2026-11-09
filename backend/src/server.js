import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { config, SYMBOLS } from './config.js';
import { pickAdapter, upstox } from './adapters/index.js';
import { UpstreamError, exchangeCode, loginUrl } from './adapters/upstox.js';
import { tokenStore } from './tokenStore.js';
import { isValidDate, istDateString } from './time.js';

// Read-only by design: this server has no route that places, changes or cancels an order.

const INTERVALS = [1, 5, 15, 30];
const pendingStates = new Map(); // OAuth state -> expiry ms

function send(res, status, body, extra = {}) {
  const isText = typeof body === 'string';
  res.writeHead(status, {
    'Content-Type': isText ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extra
  });
  res.end(isText ? body : JSON.stringify(body));
}

function page(title, message) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><body style="font:16px system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>${esc(title)}</h1><p>${esc(message)}</p></body>`;
}

async function candlesRoute(url, res) {
  const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
  const sym = SYMBOLS.find((s) => s.symbol === symbol);
  if (!sym) return send(res, 400, { error: `Unknown symbol. Use one of: ${SYMBOLS.map((s) => s.symbol).join(', ')}.` });

  const interval = Number(url.searchParams.get('interval') || 1);
  if (!INTERVALS.includes(interval)) return send(res, 400, { error: `interval must be one of ${INTERVALS.join(', ')} (minutes).` });

  let date = url.searchParams.get('date') || 'today';
  if (date === 'today') date = istDateString();
  if (!isValidDate(date)) return send(res, 400, { error: 'date must be YYYY-MM-DD or "today".' });
  if (date > istDateString()) return send(res, 400, { error: 'date is in the future.' });

  const picked = pickAdapter();
  if (picked.error) return send(res, 503, { error: picked.error, loginUrl: '/auth/upstox/login' });

  try {
    const candles = await picked.adapter.getCandles({ sym, interval, date });
    const body = { symbol, interval, date, source: picked.adapter.name, candles };
    if (picked.fallbackReason) body.note = picked.fallbackReason;
    return send(res, 200, body);
  } catch (e) {
    if (e instanceof UpstreamError) {
      // Do not quietly swap in simulated prices when a real feed was expected but failed.
      return send(res, e.status === 401 ? 401 : 502, { error: e.message, loginUrl: e.status === 401 ? '/auth/upstox/login' : undefined });
    }
    console.error('candles failed:', e.message);
    return send(res, 500, { error: 'Something went wrong while loading candles.' });
  }
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (config.allowOrigin && req.headers.origin === config.allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', config.allowOrigin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method !== 'GET') return send(res, 405, { error: 'Only GET is supported.' }, { Allow: 'GET' });

  switch (url.pathname) {
    case '/api/health': {
      const exp = tokenStore.expiresAt();
      return send(res, 200, {
        ok: true,
        dataSource: config.dataSource,
        upstoxConnected: upstox.isReady(),
        upstoxTokenExpiresAt: exp ? new Date(exp).toISOString() : null,
        ordersEnabled: false
      });
    }
    case '/api/symbols':
      return send(res, 200, { symbols: SYMBOLS.map(({ symbol, name }) => ({ symbol, name })) });
    case '/api/candles':
      return candlesRoute(url, res);

    case '/auth/upstox/login': {
      if (!config.upstox.apiKey || !config.upstox.apiSecret) {
        return send(res, 503, page('Upstox is not set up', 'Add UPSTOX_API_KEY and UPSTOX_API_SECRET to the server settings, then restart.'));
      }
      const state = crypto.randomBytes(16).toString('hex');
      pendingStates.set(state, Date.now() + 10 * 60_000);
      res.writeHead(302, { Location: loginUrl(state) });
      return res.end();
    }
    case '/auth/upstox/callback': {
      const state = url.searchParams.get('state') || '';
      const code = url.searchParams.get('code') || '';
      const expiry = pendingStates.get(state);
      pendingStates.delete(state);
      if (!expiry || expiry < Date.now()) return send(res, 400, page('Login expired', 'Start again from /auth/upstox/login.'));
      if (!code) return send(res, 400, page('Login not completed', 'Upstox did not send a login code.'));
      try {
        tokenStore.set(await exchangeCode(code));
        return send(res, 200, page('Upstox connected', 'You can close this tab. The connection lasts until 3:30 AM IST tomorrow.'));
      } catch (e) {
        return send(res, 502, page('Could not connect', e.message));
      }
    }
    default:
      return send(res, 404, { error: 'Not found.' });
  }
}

export function createApp() {
  return http.createServer((req, res) => {
    handler(req, res).catch((e) => {
      console.error('request failed:', e.message);
      if (!res.headersSent) send(res, 500, { error: 'Something went wrong.' });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  createApp().listen(config.port, config.host, () => {
    console.log(`Intraday backend on http://${config.host}:${config.port}  (data source: ${config.dataSource}, orders: off)`);
  });
}
