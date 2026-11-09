import React from 'react';
import { PaperAccount } from '../types/trading';
import { Play, Pause, Bell, RefreshCw, Volume2, VolumeX } from 'lucide-react';

interface TopNavProps {
  activeTab: 'terminal' | 'strategy' | 'backtest' | 'blotter' | 'alerts';
  setActiveTab: (tab: 'terminal' | 'strategy' | 'backtest' | 'blotter' | 'alerts') => void;
  account: PaperAccount;
  isSimulating: boolean;
  toggleSimulation: () => void;
  unreadAlertsCount: number;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  onResetPortfolio: () => void;
  onOpenOrderModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  account,
  isSimulating,
  toggleSimulation,
  unreadAlertsCount,
  soundEnabled,
  setSoundEnabled,
  onResetPortfolio,
  onOpenOrderModal,
}) => {
  const isProfit = account.unrealizedPnl + account.realizedPnl >= 0;
  const totalReturnPct = ((account.equity - account.initialCash) / account.initialCash) * 100;

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0D111A] border-b border-[#1E2638] select-none">
      {/* Zone 1: Single text element wordmark in display face */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setActiveTab('terminal')}
          className="text-lg font-bold tracking-tight text-white font-['Plus_Jakarta_Sans'] hover:text-blue-400 transition-colors whitespace-nowrap text-left"
        >
          TradePulse <span className="text-blue-500 font-normal text-sm ml-1">Terminal</span>
        </button>
      </div>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`transition-colors whitespace-nowrap py-1 ${
            activeTab === 'terminal'
              ? 'text-white border-b-2 border-blue-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Live Terminal
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          className={`transition-colors whitespace-nowrap py-1 ${
            activeTab === 'strategy'
              ? 'text-white border-b-2 border-blue-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Strategy Studio
        </button>
        <button
          onClick={() => setActiveTab('backtest')}
          className={`transition-colors whitespace-nowrap py-1 ${
            activeTab === 'backtest'
              ? 'text-white border-b-2 border-blue-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Backtest Lab
        </button>
        <button
          onClick={() => setActiveTab('blotter')}
          className={`transition-colors whitespace-nowrap py-1 ${
            activeTab === 'blotter'
              ? 'text-white border-b-2 border-blue-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Trade Blotter
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`relative transition-colors whitespace-nowrap py-1 flex items-center gap-1.5 ${
            activeTab === 'alerts'
              ? 'text-white border-b-2 border-blue-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Alerts</span>
          {unreadAlertsCount > 0 && (
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30">
              {unreadAlertsCount}
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: Portfolio telemetry & primary action */}
      <div className="flex items-center gap-4 shrink-0 text-xs">
        {/* Market Stream Status Control */}
        <button
          onClick={toggleSimulation}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-colors ${
            isSimulating
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
          title={isSimulating ? 'Pause tick simulation' : 'Resume tick simulation'}
        >
          {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="font-mono uppercase tracking-wider">{isSimulating ? 'Stream Active' : 'Paused'}</span>
        </button>

        {/* Paper Portfolio Balance Display */}
        <div className="hidden lg:flex flex-col items-end pl-3 border-l border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">
            Paper Equity{' '}
            <span className="text-slate-500 text-[10px]">· Cash ${account.cash.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tabular-nums text-white">
              ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`font-mono text-xs tabular-nums ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfit ? '+' : ''}
              {totalReturnPct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setSoundEnabled((prev) => !prev)}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title={soundEnabled ? 'Mute signal sounds' : 'Enable signal sounds'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Reset Account */}
        <button
          onClick={onResetPortfolio}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset paper trading account ($100,000)"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Primary Action Button */}
        <button
          onClick={onOpenOrderModal}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-500 transition-colors whitespace-nowrap shadow-sm"
        >
          New Order
        </button>
      </div>
    </header>
  );
};
