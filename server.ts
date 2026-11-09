import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use((req, _res, next) => {
  console.log(`[SERVER REQ] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Initialize GoogleGenAI server-side with telemetry User-Agent header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Helper to provide realistic algorithmic fallback trade ideas if Gemini API key is unconfigured or rate limited
function getFallbackTradeIdeas(symbol: string, currentPrice: number, rsi: number, vwap: number) {
  const isOversold = rsi < 45;
  const isAboveVwap = currentPrice >= vwap;
  const direction = isOversold || isAboveVwap ? 'LONG' : 'SHORT';

  const entry = currentPrice;
  const stopLoss = direction === 'LONG' ? Number((entry * 0.992).toFixed(2)) : Number((entry * 1.008).toFixed(2));
  const takeProfit = direction === 'LONG' ? Number((entry * 1.018).toFixed(2)) : Number((entry * 0.982).toFixed(2));
  const rr = Math.abs((takeProfit - entry) / (entry - stopLoss)).toFixed(2);

  return [
    {
      symbol,
      direction,
      setupName: direction === 'LONG' ? 'VWAP Pullback & Reclaim' : 'Mean Reversion Fade',
      entryPrice: entry,
      stopLoss,
      takeProfit,
      riskReward: `${rr}:1`,
      conviction: isAboveVwap && isOversold ? 'HIGH' : 'MEDIUM',
      timeframe: '5m - 15m Intraday',
      catalyst: `${symbol} is showing ${direction === 'LONG' ? 'institutional accumulation' : 'distribution'} near VWAP ($${vwap.toFixed(2)}) with RSI at ${rsi.toFixed(1)}. Volume weighted structure favors a ${direction.toLowerCase()} scalp.`,
      keyLevels: {
        support: Number((entry * 0.988).toFixed(2)),
        resistance: Number((entry * 1.015).toFixed(2)),
      },
    },
    {
      symbol,
      direction: direction === 'LONG' ? 'SHORT' : 'LONG',
      setupName: 'Counter-Trend Volatility Breakout',
      entryPrice: Number((entry * (direction === 'LONG' ? 1.005 : 0.995)).toFixed(2)),
      stopLoss: Number((entry * (direction === 'LONG' ? 1.012 : 0.988)).toFixed(2)),
      takeProfit: Number((entry * (direction === 'LONG' ? 0.99 : 1.01)).toFixed(2)),
      riskReward: '1.85:1',
      conviction: 'MEDIUM',
      timeframe: '1m - 5m Scalp',
      catalyst: `Secondary contingency setup if price breaks the intraday session range with high tick velocity.`,
      keyLevels: {
        support: Number((entry * 0.99).toFixed(2)),
        resistance: Number((entry * 1.01).toFixed(2)),
      },
    },
  ];
}

// Helper to enforce tight execution budget and prevent nginx 5s gateway timeout
async function runWithTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI generation timeout')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// 1. POST /api/ai/trade-ideas
app.post('/api/ai/trade-ideas', async (req, res) => {
  const { symbol = 'NVDA', price = 135.5, change = 1.8, vwap = 134.8, rsi = 54, ema9 = 135.2, ema21 = 134.6, volume = '38.4M' } = req.body || {};

  if (!ai) {
    const ideas = getFallbackTradeIdeas(symbol, Number(price), Number(rsi), Number(vwap));
    return res.json({ success: true, ideas, source: 'algorithmic-desk' });
  }

  try {
    const prompt = `Analyze intraday technical data for equity ${symbol}:
Current Price: $${price}
Session Change: ${change}%
VWAP: $${vwap}
RSI (14): ${rsi}
EMA (9): $${ema9}
EMA (21): $${ema21}
Volume: ${volume}

Generate 2 distinct high-probability intraday trade setups (e.g., primary trend continuation, secondary pullback or mean-reversion). Ensure entry price, stop-loss, and take-profit prices are mathematically coherent with the current price and realistic for intraday stock scalping/momentum.`;

    const aiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a master institutional intraday equity trader and quantitative risk manager. Return disciplined, rigorous trade setups in structured JSON format.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              direction: { type: Type.STRING, description: 'LONG or SHORT' },
              setupName: { type: Type.STRING, description: 'Short descriptive strategy name' },
              entryPrice: { type: Type.NUMBER },
              stopLoss: { type: Type.NUMBER },
              takeProfit: { type: Type.NUMBER },
              riskReward: { type: Type.STRING, description: 'e.g. 2.2:1' },
              conviction: { type: Type.STRING, description: 'HIGH, MEDIUM, or SPECULATIVE' },
              timeframe: { type: Type.STRING, description: 'e.g. 1m Scalp, 5m Momentum, 15m Breakout' },
              catalyst: { type: Type.STRING, description: 'Technical rationale and order flow reasoning' },
              keyLevels: {
                type: Type.OBJECT,
                properties: {
                  support: { type: Type.NUMBER },
                  resistance: { type: Type.NUMBER },
                },
                required: ['support', 'resistance'],
              },
            },
            required: ['symbol', 'direction', 'setupName', 'entryPrice', 'stopLoss', 'takeProfit', 'riskReward', 'conviction', 'catalyst'],
          },
        },
      },
    });

    const response = await runWithTimeout(aiCall, 2500);
    const parsed = JSON.parse(response.text || '[]');
    return res.json({ success: true, ideas: parsed.length ? parsed : getFallbackTradeIdeas(symbol, Number(price), Number(rsi), Number(vwap)), source: 'gemini-3.8-flash' });
  } catch (error: any) {
    const fallback = getFallbackTradeIdeas(symbol, Number(price), Number(rsi), Number(vwap));
    return res.json({ success: true, ideas: fallback, source: 'fallback', note: error?.message });
  }
});

// 2. POST /api/ai/explain-market
app.post('/api/ai/explain-market', async (req, res) => {
  const { symbol = 'SPY', price = 585.2, vwap = 584.6, rsi = 58, ema9 = 585.0, ema21 = 583.9, high = 586.5, low = 582.4, trend = 'bullish' } = req.body || {};

  if (!ai) {
    const summary = `${symbol} is displaying a ${trend} bias in today's session, oscillating near $${price}. Price is trading ${price >= vwap ? 'above' : 'below'} the intraday Volume Weighted Average Price ($${vwap}), suggesting ${price >= vwap ? 'buyers are holding control of value' : 'seller liquidation pressure'}. The 14-period RSI at ${rsi} reflects balanced intraday momentum without extreme exhaustion. Traders should monitor support at $${low} and immediate overhead resistance at $${high}.`;
    return res.json({
      success: true,
      analysis: summary,
      sentiment: price >= vwap ? 'Bullish Dominance' : 'Bearish Pressure',
      regime: 'Intraday Trend Continuation',
      source: 'algorithmic-desk',
    });
  }

  try {
    const aiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Provide an executive intraday market breakdown for ${symbol}:
- Price: $${price} (High: $${high}, Low: $${low})
- VWAP: $${vwap}
- EMA 9: $${ema9}, EMA 21: $${ema21}
- RSI: ${rsi}
- Market Context: ${trend}

Synthesize market microstructure, buyer vs seller liquidity battle, key breakout pivot, and recommended posture for intraday traders.`,
      config: {
        systemInstruction: 'You are an institutional trading floor market analyst. Provide concise, high-value, professional commentary without fluff or generic filler.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, description: 'Bullish, Bearish, or Neutral Consolidation' },
            regime: { type: Type.STRING, description: 'e.g. Trend Continuation, Mean Reverting, Volatility Expansion' },
            analysis: { type: Type.STRING, description: '2-3 dense sentences explaining current market structure' },
            orderFlowBias: { type: Type.STRING, description: 'Aggressive Bids, Passive Offers, Absorbed Liquidity' },
            criticalPivot: { type: Type.NUMBER, description: 'The single most critical price level to watch' },
            riskWarning: { type: Type.STRING, description: 'Primary risk or invalidation scenario' },
          },
          required: ['sentiment', 'regime', 'analysis', 'orderFlowBias', 'criticalPivot', 'riskWarning'],
        },
      },
    });

    const response = await runWithTimeout(aiCall, 2500);
    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed, source: 'gemini-3.8-flash' });
  } catch (error: any) {
    return res.json({
      success: true,
      sentiment: price >= vwap ? 'Bullish Dominance' : 'Bearish Distribution',
      regime: 'Mean-Reversion Channel',
      analysis: `${symbol} is consolidating near $${price} with VWAP anchored at $${vwap}. Momentum indicators show ${rsi > 50 ? 'favorable buyer absorption' : 'cautious seller pressure'}. Key watch pivot at $${vwap}.`,
      orderFlowBias: 'Institutional Absorption',
      criticalPivot: Number(vwap),
      riskWarning: 'Fast tick velocity around volume nodes may trigger stop runs.',
      source: 'fallback',
    });
  }
});

// 3. POST /api/ai/strategy-generator
app.post('/api/ai/strategy-generator', async (req, res) => {
  const { prompt = '' } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!ai) {
    // Algorithmic parser fallback
    const isShort = prompt.toLowerCase().includes('short') || prompt.toLowerCase().includes('sell') || prompt.toLowerCase().includes('fade');
    return res.json({
      success: true,
      strategy: {
        name: isShort ? 'AI Short Fade Strategy' : 'AI Momentum Rebound Strategy',
        direction: isShort ? 'SHORT' : 'LONG',
        timeframe: '5m',
        conditions: [
          {
            indicatorA: 'PRICE',
            operator: isShort ? 'LESS_THAN' : 'GREATER_THAN',
            indicatorB: 'VWAP',
            threshold: 0,
          },
          {
            indicatorA: 'RSI',
            operator: isShort ? 'GREATER_THAN' : 'LESS_THAN',
            indicatorB: 'CONSTANT',
            threshold: isShort ? 65 : 35,
          },
        ],
        stopLossPct: 0.8,
        takeProfitPct: 1.6,
        positionSizePct: 15,
        summary: `Rule generated from: "${prompt}". Executes ${isShort ? 'short trades' : 'long trades'} when price aligns with VWAP and RSI signals confirmation.`,
      },
      source: 'algorithmic-parser',
    });
  }

  try {
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Translate this intraday trading strategy thesis into precise structured rules:
"${prompt}"

Available indicators for indicatorA: "PRICE", "VWAP", "RSI", "EMA_9", "EMA_21", "MACD", "VOLUME_SPIKE".
Available operators: "GREATER_THAN", "LESS_THAN", "CROSSES_ABOVE", "CROSSES_BELOW".
Available indicatorB: "PRICE", "VWAP", "EMA_9", "EMA_21", "CONSTANT".
If indicatorB is CONSTANT, threshold is the numeric cutoff (e.g. 30 or 70 for RSI, 1.5 for volume spike). Otherwise threshold is 0.`,
      config: {
        systemInstruction: 'You are a quantitative algorithmic trading developer. Convert English trading ideas into structured, backtestable rule objects.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Concise strategy name' },
            direction: { type: Type.STRING, description: 'LONG or SHORT' },
            timeframe: { type: Type.STRING, description: '1m, 5m, or 15m' },
            conditions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  indicatorA: { type: Type.STRING },
                  operator: { type: Type.STRING },
                  indicatorB: { type: Type.STRING },
                  threshold: { type: Type.NUMBER },
                },
                required: ['indicatorA', 'operator', 'indicatorB', 'threshold'],
              },
            },
            stopLossPct: { type: Type.NUMBER, description: 'Stop loss percentage (e.g. 0.8 for 0.8%)' },
            takeProfitPct: { type: Type.NUMBER, description: 'Take profit percentage (e.g. 1.8 for 1.8%)' },
            positionSizePct: { type: Type.NUMBER, description: 'Portfolio allocation percentage (e.g. 10 to 25)' },
            summary: { type: Type.STRING, description: 'Brief description of the trading mechanics' },
          },
          required: ['name', 'direction', 'timeframe', 'conditions', 'stopLossPct', 'takeProfitPct', 'positionSizePct', 'summary'],
        },
      },
    });

    const parsed = JSON.parse(aiResponse.text || '{}');
    return res.json({ success: true, strategy: parsed, source: 'gemini-3.8-flash' });
  } catch (error: any) {
    console.error('Error generating AI strategy:', error);
    return res.json({
      success: true,
      strategy: {
        name: 'AI Dynamic Momentum Scalp',
        direction: 'LONG',
        timeframe: '5m',
        conditions: [
          { indicatorA: 'PRICE', operator: 'GREATER_THAN', indicatorB: 'VWAP', threshold: 0 },
          { indicatorA: 'RSI', operator: 'GREATER_THAN', indicatorB: 'CONSTANT', threshold: 50 },
        ],
        stopLossPct: 0.9,
        takeProfitPct: 1.8,
        positionSizePct: 15,
        summary: `Parsed from prompt: "${prompt}". Targets long momentum upon VWAP confluence.`,
      },
      source: 'fallback',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TradePulse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
