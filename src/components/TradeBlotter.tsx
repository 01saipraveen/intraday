import React from 'react';
import { PaperAccount, PaperOrder, Position } from '../types/trading';
import { ArrowUpRight, ArrowDownRight, XCircle, CheckCircle, Clock, ShieldCheck } from 'lucide-react';

interface TradeBlotterProps {
  account: PaperAccount;
  positions: Position[];
  orders: PaperOrder[];
  onClosePosition: (symbol: string) => void;
  onCloseAllPositions: () => void;
}

export const TradeBlotter: React.FC<TradeBlotterProps> = ({
  account,
  positions,
  orders,
  onClosePosition,
  onCloseAllPositions,
}) => {
  const isRealizedProfit = account.realizedPnl >= 0;

  return (
    <div className="flex-1 overflow-y-auto bg-[#090D16] p-6 text-slate-100 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2638]">
          <div>
            <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-white">Paper Trading Blotter</h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time audit log of active intraday positions and executed paper trading orders.
            </p>
          </div>

          {positions.length > 0 && (
            <button
              onClick={onCloseAllPositions}
              className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors self-start"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Flatten All Positions</span>
            </button>
          )}
        </div>

        {/* Account Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4">
            <div className="text-[11px] text-slate-400">Total Portfolio Value</div>
            <div className="text-lg font-bold font-mono text-white tabular-nums mt-1">
              ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Cash: ${account.cash.toLocaleString()}</div>
          </div>

          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4">
            <div className="text-[11px] text-slate-400">Realized P&L</div>
            <div
              className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                isRealizedProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isRealizedProfit ? '+' : ''}${account.realizedPnl.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Completed round-trips</div>
          </div>

          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4">
            <div className="text-[11px] text-slate-400">Unrealized Open P&L</div>
            <div
              className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                account.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {account.unrealizedPnl >= 0 ? '+' : ''}${account.unrealizedPnl.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">{positions.length} Active Positions</div>
          </div>

          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-4">
            <div className="text-[11px] text-slate-400">Paper Win Rate</div>
            <div className="text-lg font-bold font-mono text-blue-400 tabular-nums mt-1">
              {account.winCount + account.lossCount > 0
                ? ((account.winCount / (account.winCount + account.lossCount)) * 100).toFixed(1)
                : '0.0'}
              %
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {account.winCount}W / {account.lossCount}L
            </div>
          </div>
        </div>

        {/* Active Open Positions Table */}
        <div className="bg-[#101522] border border-[#1E2638] rounded-xl overflow-hidden space-y-0">
          <div className="p-4 border-b border-[#1E2638] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-white">Active Open Positions</span>
              <span className="text-[10px] font-mono text-slate-500">({positions.length})</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0C101A] text-slate-400 border-b border-[#1E2638] text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Symbol</th>
                  <th className="py-2.5 px-4 font-medium">Position</th>
                  <th className="py-2.5 px-4 font-medium">Shares</th>
                  <th className="py-2.5 px-4 font-medium">Entry Price</th>
                  <th className="py-2.5 px-4 font-medium">Current Price</th>
                  <th className="py-2.5 px-4 font-medium">Market Value</th>
                  <th className="py-2.5 px-4 font-medium">Unrealized P&L</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151D2C]">
                {positions.map((pos) => {
                  const isPosProfit = pos.unrealizedPnl >= 0;
                  const isLong = pos.shares > 0;
                  const absShares = Math.abs(pos.shares);
                  const marketValue = absShares * pos.currentPrice;

                  return (
                    <tr key={pos.symbol} className="hover:bg-[#131926] transition-colors">
                      <td className="py-2.5 px-4 font-bold text-white">{pos.symbol}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-semibold ${
                            isLong ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 tabular-nums">{absShares}</td>
                      <td className="py-2.5 px-4 text-slate-300 tabular-nums">${pos.avgEntryPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-white tabular-nums">${pos.currentPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-slate-300 tabular-nums">${marketValue.toFixed(2)}</td>
                      <td
                        className={`py-2.5 px-4 font-bold tabular-nums ${
                          isPosProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPosProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} ({isPosProfit ? '+' : ''}
                        {pos.unrealizedPnlPct.toFixed(2)}%)
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => onClosePosition(pos.symbol)}
                          className="px-2.5 py-1 bg-[#1C2538] hover:bg-rose-900/30 text-slate-300 hover:text-rose-300 rounded border border-[#26334B] hover:border-rose-700/50 text-[11px] transition-colors"
                        >
                          Close Out
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {positions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No active open positions. Submit orders in the Terminal or deploy an automated strategy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executed Orders History Table */}
        <div className="bg-[#101522] border border-[#1E2638] rounded-xl overflow-hidden space-y-0">
          <div className="p-4 border-b border-[#1E2638] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-white">Order Execution History</span>
              <span className="text-[10px] font-mono text-slate-500">({orders.length} events)</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0C101A] text-slate-400 border-b border-[#1E2638] text-[11px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Time</th>
                  <th className="py-2.5 px-4 font-medium">Symbol</th>
                  <th className="py-2.5 px-4 font-medium">Side</th>
                  <th className="py-2.5 px-4 font-medium">Type</th>
                  <th className="py-2.5 px-4 font-medium">Shares</th>
                  <th className="py-2.5 px-4 font-medium">Executed Price</th>
                  <th className="py-2.5 px-4 font-medium">Source</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Realized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151D2C]">
                {orders.map((ord) => {
                  const isBuy = ord.side === 'BUY';
                  return (
                    <tr key={ord.id} className="hover:bg-[#131926] transition-colors">
                      <td className="py-2.5 px-4 text-slate-400">{ord.timeStr}</td>
                      <td className="py-2.5 px-4 font-bold text-white">{ord.symbol}</td>
                      <td className="py-2.5 px-4 font-semibold">
                        <span className={isBuy ? 'text-emerald-400' : 'text-rose-400'}>
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{ord.type}</td>
                      <td className="py-2.5 px-4 text-slate-200 tabular-nums">{ord.shares}</td>
                      <td className="py-2.5 px-4 text-white tabular-nums">${ord.price.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {ord.source === 'STRATEGY_AUTO' ? (
                          <span className="text-blue-400 font-medium">AUTO: {ord.strategyName || 'Strategy'}</span>
                        ) : ord.source === 'AI_SETUP' ? (
                          <span className="text-purple-400 font-medium">AI Setup</span>
                        ) : (
                          <span>Manual</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle className="w-3 h-3" />
                          <span>{ord.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-semibold">
                        {ord.realizedPnl !== undefined ? (
                          <span className={ord.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {ord.realizedPnl >= 0 ? '+' : ''}${ord.realizedPnl.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      No executed orders yet.
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
