import React, { useState } from 'react';
import { AlertNotification, AlertRule, StockQuote } from '../types/trading';
import { Bell, Plus, Trash2, CheckCheck, AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AlertCenterProps {
  alerts: AlertRule[];
  notifications: AlertNotification[];
  availableQuotes: StockQuote[];
  onCreateAlert: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'triggered'>) => void;
  onDeleteAlert: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  alerts,
  notifications,
  availableQuotes,
  onCreateAlert,
  onDeleteAlert,
  onMarkAllAsRead,
  onClearNotifications,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState(availableQuotes[0]?.symbol || 'NVDA');
  const [alertType, setAlertType] = useState<AlertRule['type']>('PRICE_ABOVE');
  const [targetValue, setTargetValue] = useState<string>('140.00');
  const [note, setNote] = useState<string>('');

  const currentQuote = availableQuotes.find((q) => q.symbol === selectedSymbol);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(targetValue);
    if (isNaN(val)) return;

    onCreateAlert({
      symbol: selectedSymbol,
      type: alertType,
      targetValue: val,
      note: note.trim() || `${selectedSymbol} ${alertType.replace('_', ' ')} ${val}`,
    });

    setNote('');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#090D16] p-6 text-slate-100 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2638]">
          <div>
            <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-white">Alerts & Signal Center</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure precision technical triggers, price breaks, and stream notifications without placing orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={onMarkAllAsRead}
                  className="px-3 py-1.5 bg-[#151D2C] hover:bg-[#1E293B] border border-[#232F46] rounded text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark Read</span>
                </button>
                <button
                  onClick={onClearNotifications}
                  className="px-3 py-1.5 bg-rose-900/20 hover:bg-rose-900/30 text-rose-300 border border-rose-800/40 rounded text-xs transition-colors"
                >
                  Clear Log
                </button>
              </>
            )}
          </div>
        </div>

        {/* Create Alert Form & Rules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Alert Card */}
          <div className="bg-[#101522] border border-[#1E2638] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Configure New Technical Alert</span>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Asset</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => {
                    setSelectedSymbol(e.target.value);
                    const q = availableQuotes.find((item) => item.symbol === e.target.value);
                    if (q) setTargetValue(q.price.toFixed(2));
                  }}
                  className="w-full bg-[#151D2C] border border-[#232F46] rounded p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                >
                  {availableQuotes.map((q) => (
                    <option key={q.symbol} value={q.symbol}>
                      {q.symbol} — ${q.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Trigger Condition</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as AlertRule['type'])}
                  className="w-full bg-[#151D2C] border border-[#232F46] rounded p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="PRICE_ABOVE">Price Crosses Above ($)</option>
                  <option value="PRICE_BELOW">Price Crosses Below ($)</option>
                  <option value="RSI_OVERSOLD">RSI Drops Below (Oversold)</option>
                  <option value="RSI_OVERBOUGHT">RSI Rises Above (Overbought)</option>
                  <option value="VWAP_CROSS">Price Reclaims Above VWAP</option>
                  <option value="VOLUME_SPIKE">Volume Spike &gt; Multiplier (e.g. 2.0x)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Cutoff Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full bg-[#151D2C] border border-[#232F46] rounded p-2 text-white font-mono focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Custom Note / Signal Label</label>
                <input
                  type="text"
                  placeholder="e.g. Morning breakout level test"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-[#151D2C] border border-[#232F46] rounded p-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md mt-2"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Arm Technical Alert</span>
              </button>
            </form>
          </div>

          {/* Active Rules List */}
          <div className="lg:col-span-2 bg-[#101522] border border-[#1E2638] rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#1E2638] flex items-center justify-between">
              <span className="font-semibold text-xs text-white">Active Watched Alerts ({alerts.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#151D2C]">
              {alerts.map((al) => (
                <div key={al.id} className="p-3.5 flex items-center justify-between hover:bg-[#131926] transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30">
                        {al.symbol}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">{al.type.replace('_', ' ')}</span>
                      <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                        {al.type.includes('PRICE') ? `$${al.targetValue.toFixed(2)}` : al.targetValue}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{al.note}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        al.triggered
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {al.triggered ? 'TRIGGERED' : 'ARMED'}
                    </span>
                    <button
                      onClick={() => onDeleteAlert(al.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {alerts.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No alerts currently armed. Set a price or RSI trigger on the left.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Notification Log */}
        <div className="bg-[#101522] border border-[#1E2638] rounded-xl overflow-hidden space-y-0">
          <div className="p-4 border-b border-[#1E2638] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-white">Live Signal Trigger Ledger</span>
              <span className="text-[10px] font-mono text-slate-500">({notifications.length} events)</span>
            </div>
          </div>

          <div className="divide-y divide-[#151D2C] max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 flex items-start gap-3 transition-colors ${
                  !n.read ? 'bg-blue-950/15' : 'hover:bg-[#131926]'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {n.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {n.type === 'DANGER' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                  {n.type === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {n.type === 'INFO' && <Info className="w-4 h-4 text-blue-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">{n.symbol}</span>
                      <span className="text-xs font-semibold text-slate-200">{n.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{n.timeStr}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-sans leading-relaxed">{n.message}</div>
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No signal events recorded. Alerts and strategy triggers will log here live.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
