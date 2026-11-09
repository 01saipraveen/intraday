/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AITradeIdea,
  AlertNotification,
  AlertRule,
  BacktestResult,
  Candle,
  OrderBook,
  PaperAccount,
  PaperOrder,
  Position,
  StockQuote,
  StrategyRule,
} from './types/trading';
import {
  INITIAL_ASSETS,
  buildStockQuote,
  generateInitialCandles,
  generateOrderBook,
  simulateTick,
} from './services/marketData';
import { runBacktest } from './services/backtester';
import { evaluateStrategyRule } from './services/strategyEngine';
import { TopNav } from './components/TopNav';
import { WatchlistSidebar } from './components/WatchlistSidebar';
import { CandlestickChart } from './components/CandlestickChart';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { OrderTicket } from './components/OrderTicket';
import { StrategyStudio } from './components/StrategyStudio';
import { BacktestLab } from './components/BacktestLab';
import { TradeBlotter } from './components/TradeBlotter';
import { AlertCenter } from './components/AlertCenter';

// Web Audio sound synthesizer for trading notifications
function playSound(type: 'FILL' | 'ALERT' | 'STOP') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'FILL') {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'ALERT') {
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1000, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Audio context may be restricted before first gesture
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'strategy' | 'backtest' | 'blotter' | 'alerts'>('terminal');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NVDA');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m'>('5m');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(2);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Initialize Candle History for each asset
  const [candlesMap, setCandlesMap] = useState<Record<string, Candle[]>>(() => {
    const initial: Record<string, Candle[]> = {};
    INITIAL_ASSETS.forEach((asset) => {
      initial[asset.symbol] = generateInitialCandles(asset, 75);
    });
    return initial;
  });

  const [tickCounters, setTickCounters] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    INITIAL_ASSETS.forEach((asset) => {
      initial[asset.symbol] = 0;
    });
    return initial;
  });

  const [lastTickSymbols, setLastTickSymbols] = useState<Record<string, 'UP' | 'DOWN'>>({});

  // Compute Quotes list from current candles
  const quotes = useMemo(() => {
    return INITIAL_ASSETS.map((asset) => {
      const candles = candlesMap[asset.symbol] || [];
      return buildStockQuote(asset, candles);
    });
  }, [candlesMap]);

  const selectedQuote = useMemo(() => {
    return quotes.find((q) => q.symbol === selectedSymbol) || quotes[0];
  }, [quotes, selectedSymbol]);

  const selectedCandles = useMemo(() => {
    return candlesMap[selectedSymbol] || [];
  }, [candlesMap, selectedSymbol]);

  // Order Book for active asset
  const currentOrderBook = useMemo(() => {
    return generateOrderBook(selectedQuote.price);
  }, [selectedQuote.price]);

  // Paper Portfolio Account State ($100,000 Starting Balance)
  const [account, setAccount] = useState<PaperAccount>({
    cash: 100000,
    initialCash: 100000,
    equity: 100000,
    realizedPnl: 0,
    unrealizedPnl: 0,
    buyingPower: 100000,
    winCount: 0,
    lossCount: 0,
  });

  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<PaperOrder[]>([]);

  // Alerts State
  const [alerts, setAlerts] = useState<AlertRule[]>([
    {
      id: 'al_1',
      symbol: 'NVDA',
      type: 'PRICE_ABOVE',
      targetValue: 142.0,
      note: 'Breakout above morning high test',
      createdAt: Date.now(),
      triggered: false,
    },
    {
      id: 'al_2',
      symbol: 'SPY',
      type: 'RSI_OVERSOLD',
      targetValue: 35.0,
      note: 'Oversold intraday dip trigger',
      createdAt: Date.now(),
      triggered: false,
    },
  ]);

  const [notifications, setNotifications] = useState<AlertNotification[]>([]);

  // Strategy State
  const [currentStrategy, setCurrentStrategy] = useState<StrategyRule>({
    id: 'strat_1',
    name: 'VWAP Dip Rebound & Scalp',
    symbol: 'NVDA',
    direction: 'LONG',
    timeframe: '5m',
    conditions: [
      { id: 'c1', indicatorA: 'PRICE', operator: 'GREATER_THAN', indicatorB: 'VWAP', threshold: 0 },
      { id: 'c2', indicatorA: 'RSI', operator: 'LESS_THAN', indicatorB: 'CONSTANT', threshold: 45 },
    ],
    stopLossPct: 0.8,
    takeProfitPct: 1.8,
    positionSizePct: 15,
    isAutoExecute: true,
    isAlertOnly: false,
    summary: 'Buys when stock dips but holds above institutional VWAP with RSI showing oversold discount.',
  });

  const [savedStrategies, setSavedStrategies] = useState<StrategyRule[]>([currentStrategy]);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);

  // Order Ticket Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalParams, setOrderModalParams] = useState<any>(undefined);

  // Bottom blotter collapsible dock state in terminal view
  const [isBottomDockOpen, setIsBottomDockOpen] = useState(true);

  // Helper to add notification
  const addNotification = useCallback((n: Omit<AlertNotification, 'id' | 'timestamp' | 'timeStr' | 'read'>) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const newNotif: AlertNotification = {
      ...n,
      id: `notif_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      timeStr,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
  }, []);

  // Submit Paper Order
  const handleExecuteOrder = useCallback(
    (params: {
      symbol: string;
      side: 'BUY' | 'SELL';
      type: 'MARKET' | 'LIMIT';
      shares: number;
      price: number;
      stopLossPrice?: number;
      takeProfitPrice?: number;
      source?: PaperOrder['source'];
      strategyName?: string;
    }) => {
      const { symbol, side, type, shares, price, stopLossPrice, takeProfitPrice, source = 'MANUAL', strategyName } = params;
      const cost = shares * price;
      const isLong = side === 'BUY';

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Check buying power
      if (isLong && cost > account.buyingPower) {
        addNotification({
          symbol,
          title: 'Order Rejected',
          message: `Insufficient buying power for ${shares} shares of ${symbol}.`,
          type: 'DANGER',
        });
        return;
      }

      // Check if closing or reducing existing opposite position
      const existingPos = positions.find((p) => p.symbol === symbol);
      let newPositions = [...positions];
      let cashDelta = -cost;
      let realizedPnl: number | undefined = undefined;

      if (existingPos) {
        const isExistingLong = existingPos.shares > 0;
        if ((isExistingLong && !isLong) || (!isExistingLong && isLong)) {
          // Closing / Flattening
          const closeQty = Math.min(Math.abs(existingPos.shares), shares);
          const pnlPerShare = isExistingLong ? price - existingPos.avgEntryPrice : existingPos.avgEntryPrice - price;
          realizedPnl = Number((pnlPerShare * closeQty).toFixed(2));
          cashDelta = isLong ? -cost : cost + realizedPnl;

          const remainingShares = isExistingLong ? existingPos.shares - closeQty : existingPos.shares + closeQty;
          if (Math.abs(remainingShares) < 0.001) {
            newPositions = newPositions.filter((p) => p.symbol !== symbol);
          } else {
            newPositions = newPositions.map((p) =>
              p.symbol === symbol ? { ...p, shares: remainingShares } : p
            );
          }
        } else {
          // Adding to position
          const totalShares = existingPos.shares + (isLong ? shares : -shares);
          const newAvg = (Math.abs(existingPos.shares) * existingPos.avgEntryPrice + cost) / Math.abs(totalShares);
          newPositions = newPositions.map((p) =>
            p.symbol === symbol
              ? {
                  ...p,
                  shares: totalShares,
                  avgEntryPrice: Number(newAvg.toFixed(2)),
                  stopLossPrice: stopLossPrice || p.stopLossPrice,
                  takeProfitPrice: takeProfitPrice || p.takeProfitPrice,
                }
              : p
          );
        }
      } else {
        // Open brand new position
        const newPos: Position = {
          symbol,
          shares: isLong ? shares : -shares,
          avgEntryPrice: price,
          currentPrice: price,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          stopLossPrice,
          takeProfitPrice,
          openedAt: Date.now(),
        };
        newPositions.push(newPos);
      }

      setPositions(newPositions);

      // Create Order Blotter Entry
      const newOrder: PaperOrder = {
        id: `ord_${Date.now()}`,
        symbol,
        side,
        type,
        shares,
        price,
        stopLossPrice,
        takeProfitPrice,
        status: 'FILLED',
        timestamp: Date.now(),
        timeStr,
        source,
        strategyName,
        realizedPnl,
      };

      setOrders((prev) => [newOrder, ...prev]);

      // Update Account Cash & Stats
      setAccount((prev) => {
        const nextCash = prev.cash + cashDelta;
        const nextRealized = prev.realizedPnl + (realizedPnl || 0);
        const win = realizedPnl && realizedPnl > 0 ? prev.winCount + 1 : prev.winCount;
        const loss = realizedPnl && realizedPnl <= 0 ? prev.lossCount + 1 : prev.lossCount;
        return {
          ...prev,
          cash: Number(nextCash.toFixed(2)),
          realizedPnl: Number(nextRealized.toFixed(2)),
          winCount: win,
          lossCount: loss,
          buyingPower: Math.max(0, nextCash),
        };
      });

      if (soundEnabled) playSound('FILL');

      addNotification({
        symbol,
        title: `Paper ${side} Order Executed`,
        message: `Filled ${shares} shares at $${price.toFixed(2)} (${source}).`,
        type: 'SUCCESS',
      });
    },
    [account.buyingPower, positions, soundEnabled, addNotification]
  );

  // Close specific position
  const handleClosePosition = useCallback(
    (symbol: string) => {
      const pos = positions.find((p) => p.symbol === symbol);
      if (!pos) return;
      const quote = quotes.find((q) => q.symbol === symbol);
      const closePrice = quote ? quote.price : pos.currentPrice;

      handleExecuteOrder({
        symbol,
        side: pos.shares > 0 ? 'SELL' : 'BUY',
        type: 'MARKET',
        shares: Math.abs(pos.shares),
        price: closePrice,
        source: 'MANUAL',
      });
    },
    [positions, quotes, handleExecuteOrder]
  );

  // Flatten all positions
  const handleCloseAllPositions = useCallback(() => {
    positions.forEach((p) => handleClosePosition(p.symbol));
  }, [positions, handleClosePosition]);

  // Reset portfolio
  const handleResetPortfolio = useCallback(() => {
    if (window.confirm('Reset paper trading balance back to $100,000?')) {
      setAccount({
        cash: 100000,
        initialCash: 100000,
        equity: 100000,
        realizedPnl: 0,
        unrealizedPnl: 0,
        buyingPower: 100000,
        winCount: 0,
        lossCount: 0,
      });
      setPositions([]);
      setOrders([]);
      addNotification({
        symbol: 'SYSTEM',
        title: 'Portfolio Reset',
        message: 'Paper trading balance re-initialized to $100,000 cash.',
        type: 'INFO',
      });
    }
  }, [addNotification]);

  // Advance single tick
  const advanceTick = useCallback(() => {
    const updatedMap: Record<string, Candle[]> = {};
    const nextTicks: Record<string, number> = {};
    const newTickDirections: Record<string, 'UP' | 'DOWN'> = {};

    INITIAL_ASSETS.forEach((asset) => {
      const candles = candlesMap[asset.symbol] || [];
      const currentTickCount = tickCounters[asset.symbol] || 0;

      const { updatedCandles, nextTickCount, currentPrice } = simulateTick(
        asset,
        candles,
        currentTickCount,
        8
      );

      updatedMap[asset.symbol] = updatedCandles;
      nextTicks[asset.symbol] = nextTickCount;

      const prevPrice = candles[candles.length - 1]?.close || currentPrice;
      if (currentPrice > prevPrice) newTickDirections[asset.symbol] = 'UP';
      else if (currentPrice < prevPrice) newTickDirections[asset.symbol] = 'DOWN';
    });

    setCandlesMap(updatedMap);
    setTickCounters(nextTicks);
    setLastTickSymbols(newTickDirections);

    // Update positions mark-to-market and check stop loss / take profit
    setPositions((prevPositions) => {
      return prevPositions.map((pos) => {
        const assetCandles = updatedMap[pos.symbol];
        if (!assetCandles || assetCandles.length === 0) return pos;
        const currentCandle = assetCandles[assetCandles.length - 1];
        const currentPrice = currentCandle.close;
        const isLong = pos.shares > 0;
        const pnlPerShare = isLong ? currentPrice - pos.avgEntryPrice : pos.avgEntryPrice - currentPrice;
        const unrealizedPnl = Number((pnlPerShare * Math.abs(pos.shares)).toFixed(2));
        const unrealizedPnlPct = Number(((pnlPerShare / pos.avgEntryPrice) * 100).toFixed(2));

        // Auto Stop-Loss / Take-Profit Trigger Check
        if (pos.stopLossPrice) {
          const hitStop = isLong ? currentPrice <= pos.stopLossPrice : currentPrice >= pos.stopLossPrice;
          if (hitStop) {
            setTimeout(() => {
              handleClosePosition(pos.symbol);
              if (soundEnabled) playSound('STOP');
              addNotification({
                symbol: pos.symbol,
                title: 'Stop Loss Triggered',
                message: `Paper position closed at $${currentPrice.toFixed(2)} to protect downside.`,
                type: 'DANGER',
              });
            }, 0);
          }
        }

        if (pos.takeProfitPrice) {
          const hitTarget = isLong ? currentPrice >= pos.takeProfitPrice : currentPrice <= pos.takeProfitPrice;
          if (hitTarget) {
            setTimeout(() => {
              handleClosePosition(pos.symbol);
              if (soundEnabled) playSound('FILL');
              addNotification({
                symbol: pos.symbol,
                title: 'Take Profit Reached',
                message: `Paper profit locked in at $${currentPrice.toFixed(2)}.`,
                type: 'SUCCESS',
              });
            }, 0);
          }
        }

        return {
          ...pos,
          currentPrice,
          unrealizedPnl,
          unrealizedPnlPct,
        };
      });
    });

    // Check custom alerts
    setAlerts((prevAlerts) => {
      return prevAlerts.map((al) => {
        if (al.triggered) return al;
        const assetCandles = updatedMap[al.symbol];
        if (!assetCandles || assetCandles.length === 0) return al;
        const cur = assetCandles[assetCandles.length - 1];

        let shouldTrigger = false;
        if (al.type === 'PRICE_ABOVE' && cur.close >= al.targetValue) shouldTrigger = true;
        else if (al.type === 'PRICE_BELOW' && cur.close <= al.targetValue) shouldTrigger = true;
        else if (al.type === 'RSI_OVERSOLD' && cur.rsi <= al.targetValue) shouldTrigger = true;
        else if (al.type === 'RSI_OVERBOUGHT' && cur.rsi >= al.targetValue) shouldTrigger = true;
        else if (al.type === 'VWAP_CROSS' && cur.close >= cur.vwap) shouldTrigger = true;

        if (shouldTrigger) {
          if (soundEnabled) playSound('ALERT');
          addNotification({
            symbol: al.symbol,
            title: `Alert Triggered: ${al.type.replace('_', ' ')}`,
            message: `${al.symbol} reached $${cur.close.toFixed(2)} (${al.note})`,
            type: 'WARNING',
          });
          return { ...al, triggered: true, triggeredAt: Date.now() };
        }
        return al;
      });
    });

    // Evaluate Deployed Strategy Live Execution
    if (currentStrategy && currentStrategy.conditions.length > 0) {
      const stratCandles = updatedMap[currentStrategy.symbol];
      if (stratCandles && stratCandles.length >= 2) {
        const cur = stratCandles[stratCandles.length - 1];
        const prev = stratCandles[stratCandles.length - 2];
        const matches = evaluateStrategyRule(currentStrategy, cur, prev);

        if (matches) {
          const nowTime = Date.now();
          const cooldown = 60000; // 1 minute signal cooldown
          if (!currentStrategy.lastTriggered || nowTime - currentStrategy.lastTriggered > cooldown) {
            currentStrategy.lastTriggered = nowTime;

            if (currentStrategy.isAlertOnly) {
              if (soundEnabled) playSound('ALERT');
              addNotification({
                symbol: currentStrategy.symbol,
                title: `Strategy Signal: ${currentStrategy.name}`,
                message: `${currentStrategy.direction} signal triggered at $${cur.close.toFixed(2)}!`,
                type: 'INFO',
              });
            }

            if (currentStrategy.isAutoExecute) {
              // Position sizing
              const allocPct = currentStrategy.positionSizePct / 100;
              const allocDollars = account.cash * allocPct;
              const sharesToTrade = Math.max(1, Math.floor(allocDollars / cur.close));

              const slPrice =
                currentStrategy.direction === 'LONG'
                  ? cur.close * (1 - currentStrategy.stopLossPct / 100)
                  : cur.close * (1 + currentStrategy.stopLossPct / 100);

              const tpPrice =
                currentStrategy.direction === 'LONG'
                  ? cur.close * (1 + currentStrategy.takeProfitPct / 100)
                  : cur.close * (1 - currentStrategy.takeProfitPct / 100);

              handleExecuteOrder({
                symbol: currentStrategy.symbol,
                side: currentStrategy.direction === 'LONG' ? 'BUY' : 'SELL',
                type: 'MARKET',
                shares: sharesToTrade,
                price: cur.close,
                stopLossPrice: Number(slPrice.toFixed(2)),
                takeProfitPrice: Number(tpPrice.toFixed(2)),
                source: 'STRATEGY_AUTO',
                strategyName: currentStrategy.name,
              });
            }
          }
        }
      }
    }
  }, [
    candlesMap,
    tickCounters,
    soundEnabled,
    currentStrategy,
    account.cash,
    handleExecuteOrder,
    handleClosePosition,
    addNotification,
  ]);

  // Real-time loop
  useEffect(() => {
    if (!isSimulating) return;
    const intervalMs = Math.max(150, Math.floor(1000 / simSpeed));
    const timer = setInterval(() => {
      advanceTick();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isSimulating, simSpeed, advanceTick]);

  // Recalculate Portfolio Equity
  useEffect(() => {
    const openPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const totalEquity = account.cash + openPnl + positions.reduce((sum, p) => sum + Math.abs(p.shares) * p.avgEntryPrice, 0);

    setAccount((prev) => ({
      ...prev,
      unrealizedPnl: Number(openPnl.toFixed(2)),
      equity: Number(totalEquity.toFixed(2)),
      buyingPower: Math.max(0, prev.cash),
    }));
  }, [positions, account.cash]);

  // Handle Trade Idea Action from AI Assistant
  const handleApplyTradeIdea = useCallback(
    (idea: AITradeIdea) => {
      setOrderModalParams({
        side: idea.direction === 'LONG' ? 'BUY' : 'SELL',
        price: idea.entryPrice,
        stopLossPrice: idea.stopLoss,
        takeProfitPrice: idea.takeProfit,
      });
      setIsOrderModalOpen(true);
    },
    []
  );

  const handleSendToStrategyStudio = useCallback(
    (idea: AITradeIdea) => {
      const newRule: StrategyRule = {
        id: `strat_ai_${Date.now()}`,
        name: `AI: ${idea.setupName}`,
        symbol: idea.symbol,
        direction: idea.direction,
        timeframe: '5m',
        conditions: [
          { id: 'c1', indicatorA: 'PRICE', operator: 'GREATER_THAN', indicatorB: 'VWAP', threshold: 0 },
          { id: 'c2', indicatorA: 'RSI', operator: idea.direction === 'LONG' ? 'LESS_THAN' : 'GREATER_THAN', indicatorB: 'CONSTANT', threshold: idea.direction === 'LONG' ? 42 : 68 },
        ],
        stopLossPct: Number((Math.abs(idea.entryPrice - idea.stopLoss) / idea.entryPrice * 100).toFixed(1)),
        takeProfitPct: Number((Math.abs(idea.takeProfit - idea.entryPrice) / idea.entryPrice * 100).toFixed(1)),
        positionSizePct: 15,
        isAutoExecute: true,
        isAlertOnly: false,
        summary: idea.catalyst,
      };
      setCurrentStrategy(newRule);
      setActiveTab('strategy');
      addNotification({
        symbol: idea.symbol,
        title: 'Strategy Loaded',
        message: `AI setup "${idea.setupName}" configured in Strategy Studio.`,
        type: 'INFO',
      });
    },
    [addNotification]
  );

  // Run backtest action
  const handleRunBacktest = useCallback(
    (rule: StrategyRule) => {
      const candles = candlesMap[rule.symbol] || selectedCandles;
      const res = runBacktest(rule, candles, 100000);
      setBacktestResult(res);
      setActiveTab('backtest');
      addNotification({
        symbol: rule.symbol,
        title: 'Backtest Completed',
        message: `${res.strategyName}: ${res.totalTrades} trades, ${res.winRate}% win rate.`,
        type: 'SUCCESS',
      });
    },
    [candlesMap, selectedCandles, addNotification]
  );

  const unreadAlertsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090D16] text-slate-100 font-sans overflow-hidden">
      {/* Top Bar Navigation */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        account={account}
        isSimulating={isSimulating}
        toggleSimulation={() => setIsSimulating(!isSimulating)}
        unreadAlertsCount={unreadAlertsCount}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onResetPortfolio={handleResetPortfolio}
        onOpenOrderModal={() => {
          setOrderModalParams(undefined);
          setIsOrderModalOpen(true);
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* VIEW 1: LIVE TERMINAL */}
        {activeTab === 'terminal' && (
          <div className="flex-1 flex h-full overflow-hidden">
            {/* Left Watchlist Sidebar */}
            <WatchlistSidebar
              quotes={quotes}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={(sym) => setSelectedSymbol(sym)}
              lastTickSymbols={lastTickSymbols}
            />

            {/* Center Area: Chart + Collapsible Bottom Blotter */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <CandlestickChart
                quote={selectedQuote}
                candles={selectedCandles}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                isSimulating={isSimulating}
                toggleSimulation={() => setIsSimulating(!isSimulating)}
                speed={simSpeed}
                setSpeed={setSimSpeed}
                onStepTick={advanceTick}
              />

              {/* Collapsible Bottom Position / Orders Bar */}
              <div className="bg-[#0C101A] border-t border-[#1C2538] shrink-0">
                <div className="flex items-center justify-between px-4 py-2 text-xs border-b border-[#182133]">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsBottomDockOpen(!isBottomDockOpen)}
                      className="font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors font-mono"
                    >
                      <span>Positions & Blotter ({positions.length} open)</span>
                      <span className="text-slate-500 text-[10px]">{isBottomDockOpen ? '▼' : '▲'}</span>
                    </button>
                    {positions.length > 0 && (
                      <span className="text-[11px] font-mono tabular-nums text-slate-400">
                        Open P&L:{' '}
                        <strong
                          className={account.unrealizedPnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}
                        >
                          {account.unrealizedPnl >= 0 ? '+' : ''}${account.unrealizedPnl.toFixed(2)}
                        </strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('blotter')}
                      className="text-[11px] text-blue-400 hover:underline font-mono"
                    >
                      Full Blotter →
                    </button>
                  </div>
                </div>

                {isBottomDockOpen && (
                  <div className="max-h-36 overflow-y-auto divide-y divide-[#151D2C] px-4 py-1 text-xs font-mono">
                    {positions.length > 0 ? (
                      positions.map((pos) => {
                        const isPosProfit = pos.unrealizedPnl >= 0;
                        return (
                          <div key={pos.symbol} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-white">{pos.symbol}</span>
                              <span className={pos.shares > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {pos.shares > 0 ? 'LONG' : 'SHORT'} {Math.abs(pos.shares)}
                              </span>
                              <span className="text-slate-400">Entry: ${pos.avgEntryPrice.toFixed(2)}</span>
                              <span className="text-slate-200">Current: ${pos.currentPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={isPosProfit ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                {isPosProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} ({isPosProfit ? '+' : ''}
                                {pos.unrealizedPnlPct}%)
                              </span>
                              <button
                                onClick={() => handleClosePosition(pos.symbol)}
                                className="px-2 py-0.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[10px] border border-rose-800/40"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-2 text-slate-500 text-[11px] text-center font-mono">
                        No active paper positions. Place an order or activate an automated strategy.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Rail: AI Trade Ideas & Market Structure */}
            <AIAssistantPanel
              quote={selectedQuote}
              onApplyTradeIdea={handleApplyTradeIdea}
              onSendToStrategyStudio={handleSendToStrategyStudio}
            />
          </div>
        )}

        {/* VIEW 2: STRATEGY STUDIO */}
        {activeTab === 'strategy' && (
          <StrategyStudio
            currentRule={currentStrategy}
            onUpdateRule={(rule) => {
              setCurrentStrategy(rule);
              setSavedStrategies((prev) => {
                const idx = prev.findIndex((s) => s.id === rule.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = rule;
                  return copy;
                }
                return [...prev, rule];
              });
            }}
            onDeployStrategy={(rule) => {
              setCurrentStrategy(rule);
              setActiveTab('terminal');
              addNotification({
                symbol: rule.symbol,
                title: 'Strategy Deployed to Live Feed',
                message: `"${rule.name}" is actively listening to ${rule.symbol} ticks.`,
                type: 'SUCCESS',
              });
            }}
            onRunBacktest={handleRunBacktest}
            savedStrategies={savedStrategies}
            onSelectStrategy={(rule) => setCurrentStrategy(rule)}
            availableSymbols={INITIAL_ASSETS.map((a) => a.symbol)}
          />
        )}

        {/* VIEW 3: BACKTEST LAB */}
        {activeTab === 'backtest' && (
          <BacktestLab
            result={backtestResult}
            currentRule={currentStrategy}
            onTweakStrategy={() => setActiveTab('strategy')}
            onRunAgain={() => handleRunBacktest(currentStrategy)}
          />
        )}

        {/* VIEW 4: FULL TRADE BLOTTER */}
        {activeTab === 'blotter' && (
          <TradeBlotter
            account={account}
            positions={positions}
            orders={orders}
            onClosePosition={handleClosePosition}
            onCloseAllPositions={handleCloseAllPositions}
          />
        )}

        {/* VIEW 5: ALERT CENTER */}
        {activeTab === 'alerts' && (
          <AlertCenter
            alerts={alerts}
            notifications={notifications}
            availableQuotes={quotes}
            onCreateAlert={(newRule) => {
              const rule: AlertRule = {
                ...newRule,
                id: `al_${Date.now()}`,
                createdAt: Date.now(),
                triggered: false,
              };
              setAlerts((prev) => [rule, ...prev]);
              addNotification({
                symbol: rule.symbol,
                title: 'Technical Alert Armed',
                message: `${rule.symbol} ${rule.type.replace('_', ' ')} ${rule.targetValue}`,
                type: 'INFO',
              });
            }}
            onDeleteAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
            onMarkAllAsRead={() =>
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
            }
            onClearNotifications={() => setNotifications([])}
          />
        )}
      </main>

      {/* Floating Order Entry Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <OrderTicket
            quote={selectedQuote}
            orderBook={currentOrderBook}
            account={account}
            onClose={() => setIsOrderModalOpen(false)}
            onSubmitOrder={handleExecuteOrder}
            initialParams={orderModalParams}
          />
        </div>
      )}
    </div>
  );
}
