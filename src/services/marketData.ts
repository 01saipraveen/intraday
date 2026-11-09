import { Candle, StockQuote, OrderBook } from '../types/trading';

export interface AssetDefinition {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
  volatility: number; // percentage volatility per bar
  avgVolume: number;
}

export const INITIAL_ASSETS: AssetDefinition[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductors', basePrice: 138.5, volatility: 0.0045, avgVolume: 45000000 },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Consumer Electronics', basePrice: 228.4, volatility: 0.0025, avgVolume: 32000000 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Automotive & Clean Energy', basePrice: 248.8, volatility: 0.0065, avgVolume: 58000000 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors', basePrice: 142.1, volatility: 0.005, avgVolume: 28000000 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Cloud & Software', basePrice: 422.6, volatility: 0.0022, avgVolume: 19000000 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'Broad Market ETF', basePrice: 586.2, volatility: 0.0018, avgVolume: 65000000 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', sector: 'Tech ETF', basePrice: 504.8, volatility: 0.0028, avgVolume: 42000000 },
];

// Calculate technical indicators across an array of candles
export function computeIndicators(candles: Omit<Candle, 'vwap' | 'ema9' | 'ema21' | 'rsi' | 'upperBB' | 'lowerBB' | 'macd' | 'macdSignal' | 'macdHist'>[]): Candle[] {
  const result: Candle[] = [];
  let cumVolume = 0;
  let cumVolPrice = 0;

  // EMA multipliers: 2 / (period + 1)
  const k9 = 2 / (9 + 1);
  const k21 = 2 / (21 + 1);
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  const kMacdSignal = 2 / (9 + 1);

  let ema9 = 0;
  let ema21 = 0;
  let ema12 = 0;
  let ema26 = 0;
  let macdSignal = 0;

  // RSI tracking
  const rsiPeriod = 14;
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;

    // VWAP
    cumVolume += c.volume;
    cumVolPrice += typicalPrice * c.volume;
    const vwap = cumVolume > 0 ? Number((cumVolPrice / cumVolume).toFixed(2)) : c.close;

    // EMA 9 & 21
    if (i === 0) {
      ema9 = c.close;
      ema21 = c.close;
      ema12 = c.close;
      ema26 = c.close;
    } else {
      ema9 = c.close * k9 + ema9 * (1 - k9);
      ema21 = c.close * k21 + ema21 * (1 - k21);
      ema12 = c.close * k12 + ema12 * (1 - k12);
      ema26 = c.close * k26 + ema26 * (1 - k26);
    }

    // MACD (12, 26, 9)
    const macd = Number((ema12 - ema26).toFixed(3));
    if (i === 0) {
      macdSignal = macd;
    } else {
      macdSignal = macd * kMacdSignal + macdSignal * (1 - kMacdSignal);
    }
    const macdHist = Number((macd - macdSignal).toFixed(3));

    // RSI 14
    let rsi = 50;
    if (i > 0) {
      const change = c.close - candles[i - 1].close;
      const gain = Math.max(0, change);
      const loss = Math.max(0, -change);

      if (i <= rsiPeriod) {
        avgGain = (avgGain * (i - 1) + gain) / i;
        avgLoss = (avgLoss * (i - 1) + loss) / i;
      } else {
        avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
        avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;
      }

      if (avgLoss === 0) {
        rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi = Number((100 - 100 / (1 + rs)).toFixed(1));
      }
    }

    // Bollinger Bands (20, 2)
    let upperBB = c.close * 1.01;
    let lowerBB = c.close * 0.99;
    if (i >= 19) {
      const slice = candles.slice(i - 19, i + 1).map((s) => s.close);
      const sma = slice.reduce((a, b) => a + b, 0) / 20;
      const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      upperBB = Number((sma + 2 * stdDev).toFixed(2));
      lowerBB = Number((sma - 2 * stdDev).toFixed(2));
    } else {
      upperBB = Number((c.close * 1.012).toFixed(2));
      lowerBB = Number((c.close * 0.988).toFixed(2));
    }

    result.push({
      ...c,
      vwap,
      ema9: Number(ema9.toFixed(2)),
      ema21: Number(ema21.toFixed(2)),
      rsi,
      upperBB,
      lowerBB,
      macd,
      macdSignal: Number(macdSignal.toFixed(3)),
      macdHist,
    });
  }

  return result;
}

// Generate realistic intraday candles (e.g. 70 bars representing morning to mid-afternoon session)
export function generateInitialCandles(asset: AssetDefinition, barCount = 75): Candle[] {
  const candles: Omit<Candle, 'vwap' | 'ema9' | 'ema21' | 'rsi' | 'upperBB' | 'lowerBB' | 'macd' | 'macdSignal' | 'macdHist'>[] = [];
  
  // Start session at 9:30 AM
  const sessionStartTime = new Date();
  sessionStartTime.setHours(9, 30, 0, 0);

  let currentPrice = asset.basePrice * (1 + (Math.random() * 0.01 - 0.005));
  const openPrice = currentPrice;

  for (let i = 0; i < barCount; i++) {
    const timestamp = sessionStartTime.getTime() + i * 5 * 60 * 1000;
    const dateObj = new Date(timestamp);
    const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

    // Drift factor: early morning trend + intraday oscillation
    const timeRatio = i / barCount;
    const trendDrift = Math.sin(timeRatio * Math.PI * 2.5) * asset.volatility * 0.4;
    const noise = (Math.random() - 0.49) * asset.volatility * 2;
    const barReturn = trendDrift + noise;

    const barOpen = currentPrice;
    const barClose = Number((barOpen * (1 + barReturn)).toFixed(2));
    const range = Math.max(Math.abs(barOpen - barClose), barOpen * asset.volatility * 0.8);
    const barHigh = Number((Math.max(barOpen, barClose) + Math.random() * range * 0.7).toFixed(2));
    const barLow = Number((Math.min(barOpen, barClose) - Math.random() * range * 0.7).toFixed(2));

    // Volume curves: higher at open and close
    const uCurve = 1 + 2 * Math.pow(timeRatio - 0.5, 2);
    const barVol = Math.floor((asset.avgVolume / 78) * uCurve * (0.7 + Math.random() * 0.6));

    candles.push({
      timestamp,
      timeStr,
      open: barOpen,
      high: barHigh,
      low: barLow,
      close: barClose,
      volume: barVol,
    });

    currentPrice = barClose;
  }

  return computeIndicators(candles);
}

// Generate stock quote summary
export function buildStockQuote(asset: AssetDefinition, candles: Candle[]): StockQuote {
  const last = candles[candles.length - 1];
  const first = candles[0];
  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  const totalVolume = candles.reduce((sum, c) => sum + c.volume, 0);
  const change = Number((last.close - first.open).toFixed(2));
  const changePercent = Number(((change / first.open) * 100).toFixed(2));

  // 15-point sparkline for sidebar
  const sparklineStep = Math.max(1, Math.floor(candles.length / 15));
  const sparkline = candles
    .filter((_, idx) => idx % sparklineStep === 0)
    .slice(-15)
    .map((c) => c.close);

  return {
    symbol: asset.symbol,
    name: asset.name,
    sector: asset.sector,
    price: last.close,
    open: first.open,
    high,
    low,
    previousClose: Number((first.open * (1 - 0.003)).toFixed(2)),
    change,
    changePercent,
    volume: totalVolume,
    vwap: last.vwap,
    rsi: last.rsi,
    ema9: last.ema9,
    ema21: last.ema21,
    sparkline,
  };
}

// Simulate a live tick
export function simulateTick(
  asset: AssetDefinition,
  candles: Candle[],
  tickCountInBar: number,
  maxTicksPerBar = 8
): { updatedCandles: Candle[]; newBarCreated: boolean; nextTickCount: number; currentPrice: number } {
  if (candles.length === 0) return { updatedCandles: candles, newBarCreated: false, nextTickCount: 0, currentPrice: 0 };

  const lastCandle = { ...candles[candles.length - 1] };
  const tickReturn = (Math.random() - 0.495) * asset.volatility * 0.35;
  const newPrice = Number((lastCandle.close * (1 + tickReturn)).toFixed(2));
  const tickVolume = Math.floor(200 + Math.random() * 800);

  if (tickCountInBar >= maxTicksPerBar) {
    // Spawn new 5-minute candle
    const nextTimestamp = lastCandle.timestamp + 5 * 60 * 1000;
    const dateObj = new Date(nextTimestamp);
    const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

    const rawNewCandle: Omit<Candle, 'vwap' | 'ema9' | 'ema21' | 'rsi' | 'upperBB' | 'lowerBB' | 'macd' | 'macdSignal' | 'macdHist'> = {
      timestamp: nextTimestamp,
      timeStr,
      open: lastCandle.close,
      high: Math.max(lastCandle.close, newPrice),
      low: Math.min(lastCandle.close, newPrice),
      close: newPrice,
      volume: tickVolume,
    };

    const newCandlesList = [...candles, rawNewCandle];
    // Keep max 100 bars for performance and clean visualization
    const trimmed = newCandlesList.length > 100 ? newCandlesList.slice(newCandlesList.length - 100) : newCandlesList;
    const computed = computeIndicators(trimmed);

    return {
      updatedCandles: computed,
      newBarCreated: true,
      nextTickCount: 1,
      currentPrice: newPrice,
    };
  } else {
    // Mutate current in-progress candle
    lastCandle.close = newPrice;
    lastCandle.high = Math.max(lastCandle.high, newPrice);
    lastCandle.low = Math.min(lastCandle.low, newPrice);
    lastCandle.volume += tickVolume;

    const updatedList = [...candles.slice(0, -1), lastCandle];
    const computed = computeIndicators(updatedList);

    return {
      updatedCandles: computed,
      newBarCreated: false,
      nextTickCount: tickCountInBar + 1,
      currentPrice: newPrice,
    };
  }
}

// Generate realistic Level 2 order book depth based on current price
export function generateOrderBook(currentPrice: number, spreadFactor = 0.0003): OrderBook {
  const spread = Math.max(0.01, Number((currentPrice * spreadFactor).toFixed(2)));
  const bestBid = Number((currentPrice - spread / 2).toFixed(2));
  const bestAsk = Number((currentPrice + spread / 2).toFixed(2));

  const bids = [];
  const asks = [];
  let bidTotal = 0;
  let askTotal = 0;

  for (let i = 0; i < 6; i++) {
    const bidPrice = Number((bestBid - i * 0.02).toFixed(2));
    const bidSize = Math.floor(100 + Math.random() * 900);
    bidTotal += bidSize;
    bids.push({ price: bidPrice, size: bidSize, total: bidTotal });

    const askPrice = Number((bestAsk + i * 0.02).toFixed(2));
    const askSize = Math.floor(100 + Math.random() * 900);
    askTotal += askSize;
    asks.push({ price: askPrice, size: askSize, total: askTotal });
  }

  return { bids, asks, spread };
}
