import { Candle, StrategyCondition, StrategyRule } from '../types/trading';

function getIndicatorValue(candle: Candle, indicator: string, prevCandle?: Candle): number {
  switch (indicator) {
    case 'PRICE':
      return candle.close;
    case 'VWAP':
      return candle.vwap;
    case 'RSI':
      return candle.rsi;
    case 'EMA_9':
      return candle.ema9;
    case 'EMA_21':
      return candle.ema21;
    case 'MACD':
      return candle.macd;
    case 'VOLUME_SPIKE': {
      if (!prevCandle) return 1.0;
      return candle.volume / Math.max(1, prevCandle.volume);
    }
    default:
      return candle.close;
  }
}

function evaluateSingleCondition(cond: StrategyCondition, candle: Candle, prevCandle?: Candle): boolean {
  const valA = getIndicatorValue(candle, cond.indicatorA, prevCandle);
  const valB = cond.indicatorB === 'CONSTANT' ? cond.threshold : getIndicatorValue(candle, cond.indicatorB, prevCandle);

  switch (cond.operator) {
    case 'GREATER_THAN':
      return valA > valB;
    case 'LESS_THAN':
      return valA < valB;
    case 'CROSSES_ABOVE': {
      if (!prevCandle) return false;
      const prevValA = getIndicatorValue(prevCandle, cond.indicatorA);
      const prevValB = cond.indicatorB === 'CONSTANT' ? cond.threshold : getIndicatorValue(prevCandle, cond.indicatorB);
      return prevValA <= prevValB && valA > valB;
    }
    case 'CROSSES_BELOW': {
      if (!prevCandle) return false;
      const prevValA = getIndicatorValue(prevCandle, cond.indicatorA);
      const prevValB = cond.indicatorB === 'CONSTANT' ? cond.threshold : getIndicatorValue(prevCandle, cond.indicatorB);
      return prevValA >= prevValB && valA < valB;
    }
    default:
      return false;
  }
}

export function evaluateStrategyRule(rule: StrategyRule, currentCandle: Candle, prevCandle?: Candle): boolean {
  if (!rule.conditions || rule.conditions.length === 0) return false;
  // All conditions must be satisfied (AND logic)
  return rule.conditions.every((cond) => evaluateSingleCondition(cond, currentCandle, prevCandle));
}
