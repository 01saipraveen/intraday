import { BacktestResult, BacktestTrade, Candle, StrategyRule } from '../types/trading';
import { evaluateStrategyRule } from './strategyEngine';

export function runBacktest(
  rule: StrategyRule,
  candles: Candle[],
  startingCapital = 100000
): BacktestResult {
  const trades: BacktestTrade[] = [];
  const equityCurve: { time: string; equity: number }[] = [];

  let currentCapital = startingCapital;
  let peakCapital = startingCapital;
  let maxDrawdownPct = 0;

  let inPosition = false;
  let entryIndex = 0;
  let entryPrice = 0;
  let entryTime = '';
  let positionShares = 0;
  let allocatedCapital = 0;

  equityCurve.push({
    time: candles[0]?.timeStr || '09:30',
    equity: currentCapital,
  });

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];

    if (!inPosition) {
      const signal = evaluateStrategyRule(rule, current, prev);
      if (signal) {
        // Open position
        inPosition = true;
        entryIndex = i;
        entryPrice = current.close;
        entryTime = current.timeStr;

        // Position sizing based on allocation percentage
        const alloc = Math.max(0.05, Math.min(0.5, rule.positionSizePct / 100));
        allocatedCapital = currentCapital * alloc;
        positionShares = Math.max(1, Math.floor(allocatedCapital / entryPrice));
      }
    } else {
      // Evaluate exit conditions
      const high = current.high;
      const low = current.low;
      const close = current.close;

      let exitPrice = 0;
      let exitReason: BacktestTrade['exitReason'] | null = null;

      if (rule.direction === 'LONG') {
        const stopLossPrice = entryPrice * (1 - rule.stopLossPct / 100);
        const takeProfitPrice = entryPrice * (1 + rule.takeProfitPct / 100);

        if (low <= stopLossPrice) {
          exitPrice = stopLossPrice;
          exitReason = 'STOP_LOSS';
        } else if (high >= takeProfitPrice) {
          exitPrice = takeProfitPrice;
          exitReason = 'TAKE_PROFIT';
        }
      } else {
        // SHORT
        const stopLossPrice = entryPrice * (1 + rule.stopLossPct / 100);
        const takeProfitPrice = entryPrice * (1 - rule.takeProfitPct / 100);

        if (high >= stopLossPrice) {
          exitPrice = stopLossPrice;
          exitReason = 'STOP_LOSS';
        } else if (low <= takeProfitPrice) {
          exitPrice = takeProfitPrice;
          exitReason = 'TAKE_PROFIT';
        }
      }

      // If last candle, force close
      if (!exitReason && i === candles.length - 1) {
        exitPrice = close;
        exitReason = 'END_OF_SESSION';
      }

      if (exitReason) {
        // Calculate P&L
        const pnlPerShare = rule.direction === 'LONG' ? exitPrice - entryPrice : entryPrice - exitPrice;
        const totalTradePnl = Number((pnlPerShare * positionShares).toFixed(2));
        const pnlPct = Number(((pnlPerShare / entryPrice) * 100).toFixed(2));

        currentCapital += totalTradePnl;
        if (currentCapital > peakCapital) {
          peakCapital = currentCapital;
        }
        const dd = ((peakCapital - currentCapital) / peakCapital) * 100;
        if (dd > maxDrawdownPct) {
          maxDrawdownPct = dd;
        }

        trades.push({
          id: `trade-${trades.length + 1}`,
          entryIndex,
          exitIndex: i,
          entryTime,
          exitTime: current.timeStr,
          direction: rule.direction,
          entryPrice,
          exitPrice: Number(exitPrice.toFixed(2)),
          shares: positionShares,
          pnl: totalTradePnl,
          pnlPct,
          exitReason,
        });

        inPosition = false;
        positionShares = 0;
      }
    }

    equityCurve.push({
      time: current.timeStr,
      equity: Number(currentCapital.toFixed(2)),
    });
  }

  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? Number(((winningTrades.length / trades.length) * 100).toFixed(1)) : 0;

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;

  const totalPnl = Number((currentCapital - startingCapital).toFixed(2));
  const netReturnPct = Number(((totalPnl / startingCapital) * 100).toFixed(2));
  const avgTradePnl = trades.length > 0 ? Number((totalPnl / trades.length).toFixed(2)) : 0;
  const bestTradePnl = trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0;
  const worstTradePnl = trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0;

  return {
    strategyName: rule.name,
    symbol: rule.symbol,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    totalPnl,
    netReturnPct,
    profitFactor,
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    avgTradePnl,
    bestTradePnl,
    worstTradePnl,
    trades,
    equityCurve,
  };
}
