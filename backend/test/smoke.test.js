import test from 'node:test';
import assert from 'node:assert/strict';

// Make sure no real credentials or saved token leak into the tests.
process.env.UPSTOX_ACCESS_TOKEN = '';
const { config } = await import('../src/config.js');
const { createApp } = await import('../src/server.js');
const { tokenStore } = await import('../src/tokenStore.js');

tokenStore.clear();

const server = createApp();
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const get = async (p) => {
  const res = await fetch(base + p);
  return { status: res.status, body: await res.json().catch(() => null) };
};

test.after(() => server.close());

test('health says orders are off and Upstox is not connected', async () => {
  const { status, body } = await get('/api/health');
  assert.equal(status, 200);
  assert.equal(body.ordersEnabled, false);
  assert.equal(body.upstoxConnected, false);
});

test('symbols lists the ten watchlist stocks', async () => {
  const { body } = await get('/api/symbols');
  assert.equal(body.symbols.length, 10);
});

test('auto mode falls back to simulated data and says so', async () => {
  config.dataSource = 'auto';
  const { status, body } = await get('/api/candles?symbol=TCS&interval=1&date=2026-11-06');
  assert.equal(status, 200);
  assert.equal(body.source, 'simulated');
  assert.match(body.note, /simulated/);
  assert.equal(body.candles.length, 375);
});

test('simulated candles are ordered, sane and repeatable', async () => {
  config.dataSource = 'simulated';
  const a = (await get('/api/candles?symbol=SBIN&interval=1&date=2026-11-06')).body.candles;
  const b = (await get('/api/candles?symbol=SBIN&interval=1&date=2026-11-06')).body.candles;
  assert.deepEqual(a, b);
  for (let i = 0; i < a.length; i++) {
    assert.ok(a[i].h >= Math.max(a[i].o, a[i].c) && a[i].l <= Math.min(a[i].o, a[i].c));
    if (i) assert.equal(a[i].t - a[i - 1].t, 60000);
  }
  // First bar starts 09:15 IST = 03:45 UTC.
  assert.equal(new Date(a[0].t).toISOString(), '2026-11-06T03:45:00.000Z');
});

test('5 minute candles group five one-minute bars', async () => {
  config.dataSource = 'simulated';
  const one = (await get('/api/candles?symbol=ITC&interval=1&date=2026-11-06')).body.candles;
  const five = (await get('/api/candles?symbol=ITC&interval=5&date=2026-11-06')).body.candles;
  assert.equal(five.length, 75);
  assert.equal(five[0].o, one[0].o);
  assert.equal(five[0].c, one[4].c);
  assert.equal(five[0].v, one.slice(0, 5).reduce((s, x) => s + x.v, 0));
});

test('bad input gets a clear 400', async () => {
  assert.equal((await get('/api/candles?symbol=NOPE')).status, 400);
  assert.equal((await get('/api/candles?symbol=TCS&interval=7')).status, 400);
  assert.equal((await get('/api/candles?symbol=TCS&date=2026-13-40')).status, 400);
  assert.equal((await get('/api/candles?symbol=TCS&date=2099-01-01')).status, 400);
});

test('upstox-only mode refuses instead of faking data when not connected', async () => {
  config.dataSource = 'upstox';
  const { status, body } = await get('/api/candles?symbol=TCS');
  assert.equal(status, 503);
  assert.match(body.error, /not connected/i);
});

test('server has no way to place orders', async () => {
  const res = await fetch(base + '/api/orders', { method: 'POST' });
  assert.equal(res.status, 405);
});

test('Upstox adapter calls the v3 endpoint with the token and sorts newest-first rows', async () => {
  config.dataSource = 'upstox';
  tokenStore.set('test-token');
  const realFetch = globalThis.fetch;
  let seen;
  globalThis.fetch = async (u, init) => {
    seen = { u: String(u), init };
    return new Response(JSON.stringify({
      status: 'success',
      data: { candles: [
        ['2026-11-06T09:16:00+05:30', 101, 102, 100, 101.5, 900, 0],
        ['2026-11-06T09:15:00+05:30', 100, 101, 99.5, 101, 1200, 0]
      ] }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const res = await realFetch(base + '/api/candles?symbol=RELIANCE&interval=1&date=2026-11-06');
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.source, 'upstox');
    assert.equal(body.candles.length, 2);
    assert.ok(body.candles[0].t < body.candles[1].t);
    assert.equal(body.candles[0].o, 100);
    assert.match(seen.u, /\/v3\/historical-candle\/NSE_EQ%7CINE002A01018\/minutes\/1\/2026-11-06\/2026-11-06$/);
    assert.equal(seen.init.headers.Authorization, 'Bearer test-token');
  } finally {
    globalThis.fetch = realFetch;
    tokenStore.clear();
  }
});

test('an Upstox 401 clears the token and asks for a new login', async () => {
  config.dataSource = 'upstox';
  tokenStore.set('stale-token');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ errors: [{ message: 'Invalid token' }] }), { status: 401 });
  try {
    const res = await realFetch(base + '/api/candles?symbol=INFY&date=2026-11-05');
    assert.equal(res.status, 401);
    assert.equal(tokenStore.get(), '');
  } finally {
    globalThis.fetch = realFetch;
  }
});
