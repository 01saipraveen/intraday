import { aggregate } from '../candles.js';
import { BARS_PER_SESSION, barsElapsed, istDateString, sessionOpenMs } from '../time.js';

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  let u = 0;
  while (!u) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}
const tick = (x) => Math.round(x / 0.05) * 0.05;

// One full generated session. The same symbol and date always give the same prices.
function genSession(sym, date) {
  const r = rng(hash(`${sym.symbol}:${date}`));
  const open = sessionOpenMs(date);
  let p = sym.base * (1 + 0.004 * gauss(r));
  let trend = 0;
  const regime = gauss(r) * 0.00004;
  const bars = [];
  for (let i = 0; i < BARS_PER_SESSION; i++) {
    trend = trend * 0.96 + gauss(r) * 0.00006;
    let o = p;
    const ret = regime + trend + sym.vol * gauss(r);
    let c = o * (1 + ret);
    let h = Math.max(o, c) * (1 + Math.abs(gauss(r)) * sym.vol * 0.45);
    let l = Math.min(o, c) * (1 - Math.abs(gauss(r)) * sym.vol * 0.45);
    const shape = 1 + 1.2 * Math.exp(-i / 25) + 0.9 * Math.exp(-(BARS_PER_SESSION - 1 - i) / 30);
    const v = Math.round((20000 + r() * 15000) * shape * (1 + (Math.abs(ret) / sym.vol) * 0.3));
    o = tick(o); c = tick(c); h = tick(Math.max(h, o, c)); l = tick(Math.min(l, o, c));
    bars.push({ t: open + i * 60000, o, h, l, c, v });
    p = c;
  }
  return bars;
}

export function createSimulatedAdapter() {
  return {
    name: 'simulated',
    async getCandles({ sym, interval, date }) {
      let bars = genSession(sym, date);
      if (date === istDateString()) bars = bars.slice(0, barsElapsed(date)); // do not show bars from the future
      return aggregate(bars, interval);
    }
  };
}
