import React from 'react';
import { BacktestResult, StrategyRule } from '../types/trading';
import { ArrowUpRight, ArrowDownRight, TrendingUp, ShieldAlert, Award, Percent, RefreshCw, Sliders } from 'lucide-react';

interface BacktestLabProps {
  result: BacktestResult | null;
  currentRule: StrategyRule;
  onTweakStrategy: () => void;
  onRunAgain: () => void;
}

export const BacktestLab: React.FC<BacktestLabProps> = ({
  result,
  currentRule,
  onTweakStrategy,
  onRunAgain,
}) => {
  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#090D16] p-8 text-center select-none">
        <TrendingUp className="w-12 h-12 text-blue-500/50 mb-3" />
        <h2 className="text-lg font-bold text-white">No Backtest Results Yet</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
          Select or construct a strategy in the Strategy Studio, then click "Run Historical Backtest" to evaluate performance metrics.
        </p>
        <button
          onClick={onTweakStrategy}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors"
        >
          Open Strategy Studio
        </button>
      </div>
    );
  }

  const isNetProfit = result.totalPnl >= 0;

  // Build SVG path for equity curve
  const curvePoints = result.equityCurve;
  const svgWidth = 800;
  const svgHeight = 220;
  const pad = { top: 20, right: 30, bottom: 25, left: 55 };

  const equities = curvePoints.map((p) => p.equity);
  const minEquity = Math.min(...equities) * 0.995;
  const maxEquity = Math.max(...equities) * 1.005;
  const equityRange = maxEquity - minEquity || 1;

  const getCurveX = (idx: number) =>
    pad.left + (idx / Math.max(1, curvePoints.length - 1)) * (svgWidth - pad.left - pad.right);
  const getCurveY = (eq: number) =>
    pad.top + (1 - (eq - minEquity) / equityRange) * (svgHeight - pad.top - pad.bottom);

  const pathD = curvePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getCurveX(i).toFixed(1)} ${getCurveY(p.equity).toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${getCurveX(curvePoints.length - 1).toFixed(1)} ${svgHeight - pad.bottom} L ${pad.left} ${svgHeight - pad.bottom} Z`;

  return (
    <div className="flex-1 overflow-y-auto bg-[#090D16] p-6 text-slate-100 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2638]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold">
                {result.symbol}
              </span>
              <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-white">
                Backtest: {result.strategyName}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Simulated over {result.trades.length} completed trade signals on intraday historical bars.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRunAgain}
              className="px-3.5 py-1.5 bg-[#151D2C] hover:bg-[#1E293B] border border-[#232F46] rounded text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Re-run Test</span>
            </button>
            <button
              onClick={onTweakStrategy}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Tweak Rules</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Net Profit */}
          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4 space-y-1">
            <div className="text-[11px] text-slate-400">Net Profit</div>
            <div
              className={`text-lg font-bold font-mono tabular-nums ${
                isNetProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isNetProfit ? '+' : ''}${result.totalPnl.toLocaleString()}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {isNetProfit ? '+' : ''}{result.netReturnPct}% on equity
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4 space-y-1">
            <div className="text-[11px] text-slate-400">Win Rate</div>
            <div className="text-lg font-bold font-mono tabular-nums text-white">
              {result.winRate}%
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {result.winningTrades}W · {result.losingTrades}L
            </div>
          </div>

          {/* Profit Factor */}
          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4 space-y-1">
            <div className="text-[11px] text-slate-400">Profit Factor</div>
            <div className="text-lg font-bold font-mono tabular-nums text-blue-400">
              {result.profitFactor}
            </div>
            <div className="text-[10px] font-mono text-slate-500">Gross win / loss</div>
          </div>

          {/* Max Drawdown */}
          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4 space-y-1">
            <div className="text-[11px] text-slate-400">Max Drawdown</div>
            <div className="text-lg font-bold font-mono tabular-nums text-rose-400">
              -{result.maxDrawdownPct}%
            </div>
            <div className="text-[10px] font-mono text-slate-500">Peak-to-trough</div>
          </div>

          {/* Total Trades */}
          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4 space-y-1">
            <div className="text-[11px] text-slate-400">Total Trades</div>
            <div className="text-lg font-bold font-mono tabular-nums text-white">
              {result.totalTrades}
            </div>
            <div className="text-[10px] font-mono text-slate-500">Avg ${result.avgTradePnl}</div>
          </div>

          {/* Best / Worst Trade */}
          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4 space-y-1">
            <div className="text-[11px] text-slate-400">Best / Worst</div>
            <div className="text-xs font-bold font-mono tabular-nums text-emerald-400">
              +${result.bestTradePnl}
            </div>
            <div className="text-xs font-bold font-mono tabular-nums text-rose-400">
              ${result.worstTradePnl}
            </div>
          </div>
        </div>

        {/* Equity Growth Curve */}
        <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-white">Simulated Equity Curve ($100k Account)</span>
            <span className="text-[11px] font-mono text-slate-400">
              Final: ${curvePoints[curvePoints.length - 1]?.equity.toLocaleString()}
            </span>
          </div>

          <div className="w-full h-56">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full">
              {/* Y Axis gridlines */}
              {[minEquity, (minEquity + maxEquity) / 2, maxEquity].map((val, idx) => (
                <g key={idx}>
                  <line
                    x1={pad.left}
                    y1={getCurveY(val)}
                    x2={svgWidth - pad.right}
                    y2={getCurveY(val)}
                    stroke="#1C2538"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={pad.left - 8}
                    y={getCurveY(val) + 3}
                    fill="#64748B"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    textAnchor="end"
                  >
                    ${Math.round(val).toLocaleString()}
                  </text>
                </g>
              ))}

              {/* Area gradient */}
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <path d={areaD} fill="url(#equityGrad)" />
              <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />

              {/* Start & End Points */}
              <circle cx={getCurveX(0)} cy={getCurveY(curvePoints[0].equity)} r="3" fill="#3B82F6" />
              <circle
                cx={getCurveX(curvePoints.length - 1)}
                cy={getCurveY(curvePoints[curvePoints.length - 1].equity)}
                r="3"
                fill={isNetProfit ? '#10B981' : '#EF4444'}
              />
            </svg>
          </div>
        </div>

        {/* Detailed Trades Log */}
        <div className="bg-[#101522] border border-[#1E2638] rounded-xl overflow-hidden space-y-0">
          <div className="p-4 border-b border-[#1E2638] flex items-center justify-between">
            <span className="font-semibold text-xs text-white">Trade Blotter Breakdown</span>
            <span className="text-[11px] font-mono text-slate-500">{result.trades.length} Executed Cycles</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0C101A] text-slate-400 border-b border-[#1E2638] text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Trade #</th>
                  <th className="py-2.5 px-4 font-medium">Direction</th>
                  <th className="py-2.5 px-4 font-medium">Entry Time</th>
                  <th className="py-2.5 px-4 font-medium">Exit Time</th>
                  <th className="py-2.5 px-4 font-medium">Entry Price</th>
                  <th className="py-2.5 px-4 font-medium">Exit Price</th>
                  <th className="py-2.5 px-4 font-medium">Shares</th>
                  <th className="py-2.5 px-4 font-medium">P&L ($)</th>
                  <th className="py-2.5 px-4 font-medium">Exit Catalyst</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151D2C]">
                {result.trades.map((trade, idx) => {
                  const isTradeWin = trade.pnl > 0;
                  return (
                    <tr key={trade.id} className="hover:bg-[#131926] transition-colors">
                      <td className="py-2.5 px-4 text-slate-400">#{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold">
                        <span
                          className={trade.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}
                        >
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">{trade.entryTime}</td>
                      <td className="py-2.5 px-4 text-slate-300">{trade.exitTime}</td>
                      <td className="py-2.5 px-4 text-white tabular-nums">${trade.entryPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-white tabular-nums">${trade.exitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-slate-300 tabular-nums">{trade.shares}</td>
                      <td
                        className={`py-2.5 px-4 font-bold tabular-nums ${
                          isTradeWin ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isTradeWin ? '+' : ''}${trade.pnl.toFixed(2)} ({isTradeWin ? '+' : ''}
                        {trade.pnlPct}%)
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {trade.exitReason === 'TAKE_PROFIT' && <span className="text-emerald-400">Take Profit</span>}
                        {trade.exitReason === 'STOP_LOSS' && <span className="text-rose-400">Stop Loss</span>}
                        {trade.exitReason === 'END_OF_SESSION' && <span>Session Close</span>}
                        {trade.exitReason === 'SIGNAL_EXIT' && <span>Rule Reversal</span>}
                      </td>
                    </tr>
                  );
                })}

                {result.trades.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      No trades triggered with current threshold parameters. Try widening indicator filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
