// Shared candle helpers. A candle is { t: epoch ms (bar start), o, h, l, c, v }.

export function aggregate(bars, minutes) {
  if (minutes <= 1) return bars;
  const out = [];
  for (let i = 0; i < bars.length; i += minutes) {
    const g = bars.slice(i, i + minutes);
    out.push({
      t: g[0].t,
      o: g[0].o,
      h: Math.max(...g.map((b) => b.h)),
      l: Math.min(...g.map((b) => b.l)),
      c: g[g.length - 1].c,
      v: g.reduce((a, b) => a + b.v, 0)
    });
  }
  return out;
}

export function sortAscending(bars) {
  return bars.slice().sort((a, b) => a.t - b.t);
}

export function isSaneCandle(b) {
  return [b.t, b.o, b.h, b.l, b.c, b.v].every(Number.isFinite) && b.h >= b.l && b.h >= Math.max(b.o, b.c) && b.l <= Math.min(b.o, b.c);
}
