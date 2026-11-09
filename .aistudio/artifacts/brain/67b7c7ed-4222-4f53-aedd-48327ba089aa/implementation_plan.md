# TradePulse Terminal — Intraday Market Analyzer & Automated Strategy Engine

TradePulse is a high-performance intraday stock trading workstation and market analysis platform. It pairs live market data simulation with real-time technical indicators, visual and AI-assisted strategy engineering, backtesting, automated paper trade execution, and intelligent market condition synthesis powered by Gemini 3.8 Flash.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural and feature choices below incorporate your confirmed preferences from Phase 1 clarification:
> - **Broker Execution**: Full built-in paper trading engine with simulated cash balance ($100,000 default), realistic fill modeling, limit/market/stop orders, position tracking, realized/unrealized P&L, and trade blotter history.
> - **Strategy Builder**: Dual-mode strategy workshop supporting visual condition blocks (VWAP crosses, RSI overbought/oversold, MACD divergence, EMA golden/death crosses, ATR breakout channels) alongside natural language AI strategy refinement that converts English trading theses into executable rule parameters.
> - **Market Simulation & Charts**: Interactive high-resolution candlestick charts rendered with SVG/Canvas, multi-timeframe toggles (1m, 5m, 15m), real-time simulated tick progression, variable replay speed (1x, 2x, 5x, 10x, pause), and live indicator overlays.

---

### 1. Overview & Core Concept

- **What It Does**:
  - **Live Stock Dashboard**: Multi-asset watchlist (NVDA, AAPL, TSLA, AMD, MSFT, SPY, QQQ) with live intraday candlestick charts, order book depth simulation, volume profile, VWAP bands, RSI (14), and EMA (9/21).
  - **Intraday Strategy Builder & Backtester**: Visual condition builder where users specify entry/exit rules (e.g., `Long when Price > VWAP AND RSI < 40`, `Exit when Profit >= 1.8% OR Stop Loss <= 0.9%`), complemented by an AI prompt copilot that generates or fine-tunes parameters from trading prompts. Runs instant intraday backtests with win rate, profit factor, max drawdown, and equity curves.
  - **Automated Strategy Execution & Signal Engine**: Deploy active strategies into "Paper Live" execution mode. The engine continuously monitors tick streams, triggers entry/exit signals, and logs or automatically fills paper trades with audio/visual notifications.
  - **Alert Center & Notifications**: Custom price, indicator, and volume spike alerts with real-time in-app toasts, sound cues, and filterable notification ledger.
  - **AI Market Analyst**: On-demand Gemini 3.8 Flash market briefings explaining current price action, technical structure, support/resistance levels, and recommended trade setups with risk-reward ratios.
- **Target Audience / Persona**: Intraday active traders, quantitative hobbyists, and equity analysts who want structured rule-based execution without risking real capital before validating strategies.
- **Key Value**: Eliminates emotional trading by transforming subjective instincts into testable, backtested rules with automated paper execution and AI-grounded technical explanations.

---

### 2. User Experience & Visual Design

#### Layout Structure & Navigation
Following the SaaS Dashboard design constitution (`references/3_saas_dashboard.md`), TradePulse implements a full-width high-density workspace (1440px baseline):
- **Top Bar Contract**:
  - *Zone 1 (Brand)*: Single clean wordmark: `TradePulse Terminal` in `Plus Jakarta Sans`.
  - *Zone 2 (Navigation)*: 4 clean single-line links: `Market Terminal`, `Strategy Studio`, `Backtest Lab`, `Trade Blotter`.
  - *Zone 3 (Portfolio Summary & Actions)*: Monospace tabular portfolio equity (`$104,250.00 · +4.25%`), paper trading status indicator, and quick "New Order" trigger.
- **Workspace Layout**:
  - *Left Sidebar (260px)*: Dynamic watchlist with real-time price badges, percentage changes, mini sparkline trends, and sector tags.
  - *Center Mainstage*: Primary interactive candlestick chart with timeframe selector (1m, 5m, 15m), technical indicator overlays (VWAP, EMA 9/21, Bollinger Bands), sub-chart for RSI/MACD/Volume, and replay transport controls (Play, Pause, 1x/2x/5x/10x, Step Forward).
  - *Right Rail (340px)*: Dual tabbed panel:
    - Tab 1: **AI Trade Ideas & Market Explainer** (Gemini-generated trade setups, thesis rationale, key levels).
    - Tab 2: **Quick Order Execution & Level 2 Depth** (Buy/Sell market & limit ticket with stop-loss and take-profit calculators).
  - *Bottom Dock (collapsible, 200px)*: High-density active positions, open orders, executed trade blotter, and real-time alert trigger log.

#### Visual Identity & Theme
- **Aesthetic Direction**: Professional Institutional Financial Terminal. Utilitarian, high-contrast, dense yet breathable, zero distracting neon or generic AI sparkle clichés.
- **Color Palette (Strict 60-30-10 & WCAG AA)**:
  - *Dominant Canvas (60%)*: Deep slate-zinc dark mode (`#090D16` / `#0D1117`).
  - *Structural Surfaces (30%)*: Card backdrops (`#151B26`), hairline borders (`#212B3B`), muted secondary text (`#7E8B9F`).
  - *Accent Budget (10%)*:
    - Long / Gain / Up-tick: Clear institutional emerald (`#10B981` / `#059669`).
    - Short / Loss / Down-tick: Precision crimson (`#EF4444` / `#DC2626`).
    - Primary CTA & Active Indicator: Electric cyan / cobalt (`#2563EB` / `#38BDF8`).
- **Typography**:
  - Display & Headings: `Plus Jakarta Sans` (semibold 600, sharp tracking `-0.02em`).
  - Body & Labels: `DM Sans` (regular 400 and medium 500, clean scannability at 13px–14px).
  - Figures, Timestamps & Order Book: Monospace tabular numerals (`JetBrains Mono` / `tabular-nums`) ensuring vertical decimal alignment.
- **Zero-Pill Discipline**: Metadata uses unboxed typography with dot separators (`NVDA · Tech · Vol 42.8M · VWAP $138.40`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real-time Dynamic Stock Simulation Engine**:
  - *Chosen Approach*: Client-side Brownian motion / Ornstein-Uhlenbeck mean-reversion price tick generator seeded with real baseline historical stock data (NVDA, AAPL, TSLA, SPY, etc.). Supports time-dilation replay (1x to 10x) and pause/step.
  - *Why*: Provides instant, fluid intraday market action without external rate limits, market closure blackouts (e.g. night/weekend trading), or costly live market data subscriptions, while simulating realistic slippage and spread dynamics.
  - *Alternative Considered*: Free external AlphaVantage/Yahoo APIs were ruled out as primary because of 5-calls/minute rate limits, 15-minute delays, and inability to fast-forward or test strategies across varying market conditions.
- **Decision 2: Dual-Mode Visual + AI Strategy Builder**:
  - *Chosen Approach*: Visual conditional rule tree (Condition: Indicator [VWAP/RSI/MACD/EMA/Price] + Operator [Crosses Above, Greater Than, Drops Below] + Threshold/Indicator) combined with a Gemini AI Prompt Refiner where traders can type natural language (e.g., "Create a mean reversion strategy buying oversold dips below the 20-period lower Bollinger band with tight 1:2 risk-reward") and have it automatically compile into visual parameters.
  - *Why*: Gives non-programmers instant accessibility via AI while preserving precision control and deterministic execution via structured rule parameters.
- **Decision 3: Server-Side Gemini API Architecture**:
  - *Chosen Approach*: Express server / Vite API endpoints handling `@google/genai` calls with model `gemini-3.8-flash` for trade thesis generation, market condition explanation, and strategy conversion. No API keys exposed in client bundles.
  - *Why*: Conforms strictly to Gemini API and security guidelines, guarantees reliable structured JSON generation, and provides graceful fallback mock-synthesis if the API key is not yet configured.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TradePulse Web Client                           │
├────────────────────────────────────────────────────────────────────────┤
│  Top Navigation (Brand · Tab Routes · Live Equity · Time & Latency)    │
├───────────────────┬──────────────────────────────────┬─────────────────┤
│   Watchlist       │        Candlestick Chart         │  AI Copilot &   │
│   (7 Equities)    │   (Candles, VWAP, EMA, Volumes)  │  Order Ticket   │
│   • NVDA, AAPL    ├──────────────────────────────────┤  • AI Thesis    │
│   • TSLA, MSFT    │     Oscillator Pane (RSI/MACD)   │  • Trade Ideas  │
│   • SPY, QQQ, AMD ├──────────────────────────────────┤  • Market/Limit │
│                   │  Replay Controls (1x, 2x, 5x, ⏸) │  • P&L Preview  │
├───────────────────┴──────────────────────────────────┴─────────────────┤
│  Bottom Dock: Active Positions · Working Orders · Blotter · Alerts     │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Core State Store (Zustand)                     │
│  • MarketDataStore (candles, ticks, order book, current asset)         │
│  • StrategyStore (active rules, backtest results, trigger states)      │
│  • PortfolioStore (cash, positions, order blotter, metrics)            │
│  • AlertStore (price alerts, indicator triggers, notification history) │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
┌───────────────────────────┐             ┌──────────────────────────┐
│   Intraday Sim Engine     │             │    Server API Proxy      │
│  • Stochastic Tick Gen    │             │  • POST /api/ai/ideas    │
│  • Technical Indicators   │             │  • POST /api/ai/explain  │
│  • Backtest Evaluator     │             │  • POST /api/ai/strategy │
│  • Paper Order Matching   │             │  • @google/genai (3.8)   │
└───────────────────────────┘             └──────────────────────────┘
```

#### Core Data Entities
1. **StockQuote / Candle**: `{ symbol, timestamp, open, high, low, close, volume, vwap, ema9, ema21, rsi, macd }`
2. **StrategyRule**: `{ id, name, asset, timeframe, direction: 'LONG'|'SHORT', conditions: RuleCondition[], stopLossPct, takeProfitPct, positionSizePct, isActive }`
3. **PaperOrder & Position**: `{ id, symbol, side: 'BUY'|'SELL', type: 'MARKET'|'LIMIT', qty, price, status: 'FILLED'|'PENDING'|'CANCELLED', filledAt, pnl, unrealizedPnl }`
4. **AlertItem**: `{ id, symbol, conditionType, targetValue, message, triggeredAt, read: boolean }`
5. **AITradeIdea**: `{ symbol, direction, entryPrice, stopLoss, takeProfit, riskReward, conviction, catalyst, timeframe }`

#### Interactive Component & State Mapping
- **Asset Selection**: Clicking any asset in the Watchlist updates active symbol, re-renders the candlestick chart with its historical and live ticks, and refreshes the AI analyst context.
- **Replay & Live Simulation**: The replay bar controls tick interval timers (`requestAnimationFrame` / `setInterval`), pushing new micro-ticks that update the current candle, recompute moving VWAP/RSI, and evaluate active strategy triggers.
- **Visual Strategy Editor**: Interactive dropdowns and threshold sliders emit updated JSON rules. Pressing "Run Backtest" simulates execution over historical bars and renders equity curves, win rate %, and trade history.
- **AI Strategy Generator**: Text prompt textarea -> triggers `/api/ai/strategy` -> returns parsed condition blocks directly inserted into the visual builder for immediate backtesting.
- **Order Ticket & Automated Execution**: Traders can manually submit orders or toggle "Auto-Execute Approved Strategy". Fills update cash balance, open positions, and transaction history in the bottom blotter.
