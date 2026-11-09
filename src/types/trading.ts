export interface StockQuote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  vwap: number;
  rsi: number;
  ema9: number;
  ema21: number;
  sparkline: number[];
}

export interface Candle {
  timestamp: number;
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  ema9: number;
  ema21: number;
  rsi: number;
  upperBB: number;
  lowerBB: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'FILLED' | 'PENDING' | 'CANCELLED';

export interface PaperOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  shares: number;
  price: number;
  limitPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  status: OrderStatus;
  timestamp: number;
  timeStr: string;
  source: 'MANUAL' | 'STRATEGY_AUTO' | 'AI_SETUP';
  strategyName?: string;
  realizedPnl?: number;
}

export interface Position {
  symbol: string;
  shares: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  openedAt: number;
}

export interface PaperAccount {
  cash: number;
  initialCash: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  buyingPower: number;
  winCount: number;
  lossCount: number;
}

export type IndicatorType = 'PRICE' | 'VWAP' | 'RSI' | 'EMA_9' | 'EMA_21' | 'MACD' | 'VOLUME_SPIKE';
export type OperatorType = 'GREATER_THAN' | 'LESS_THAN' | 'CROSSES_ABOVE' | 'CROSSES_BELOW';
export type IndicatorTargetType = 'PRICE' | 'VWAP' | 'EMA_9' | 'EMA_21' | 'CONSTANT';

export interface StrategyCondition {
  id: string;
  indicatorA: IndicatorType;
  operator: OperatorType;
  indicatorB: IndicatorTargetType;
  threshold: number;
}

export interface StrategyRule {
  id: string;
  name: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  timeframe: '1m' | '5m' | '15m';
  conditions: StrategyCondition[];
  stopLossPct: number;
  takeProfitPct: number;
  positionSizePct: number;
  isAutoExecute: boolean;
  isAlertOnly: boolean;
  summary?: string;
  lastTriggered?: number;
}

export interface BacktestTrade {
  id: string;
  entryIndex: number;
  exitIndex: number;
  entryTime: string;
  exitTime: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPct: number;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_EXIT' | 'END_OF_SESSION';
}

export interface BacktestResult {
  strategyName: string;
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  netReturnPct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  avgTradePnl: number;
  bestTradePnl: number;
  worstTradePnl: number;
  trades: BacktestTrade[];
  equityCurve: { time: string; equity: number }[];
}

export interface AlertRule {
  id: string;
  symbol: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'RSI_OVERSOLD' | 'RSI_OVERBOUGHT' | 'VWAP_CROSS' | 'VOLUME_SPIKE';
  targetValue: number;
  note: string;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

export interface AlertNotification {
  id: string;
  alertId?: string;
  symbol: string;
  title: string;
  message: string;
  timestamp: number;
  timeStr: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  read: boolean;
}

export interface AITradeIdea {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  setupName: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: string;
  conviction: 'HIGH' | 'MEDIUM' | 'SPECULATIVE';
  timeframe: string;
  catalyst: string;
  keyLevels?: {
    support: number;
    resistance: number;
  };
}

export interface MarketExplanation {
  sentiment: string;
  regime: string;
  analysis: string;
  orderFlowBias: string;
  criticalPivot: number;
  riskWarning: string;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
}
