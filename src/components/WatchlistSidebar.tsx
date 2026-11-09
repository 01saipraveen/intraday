import React, { useState } from 'react';
import { StockQuote } from '../types/trading';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

interface WatchlistSidebarProps {
  quotes: StockQuote[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  lastTickSymbols: Record<string, 'UP' | 'DOWN'>;
}

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({
  quotes,
  selectedSymbol,
  onSelectSymbol,
  lastTickSymbols,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<'ALL' | 'Semiconductors' | 'Tech ETF' | 'Broad Market ETF'>('ALL');

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = sectorFilter === 'ALL' || q.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  return (
    <aside className="w-72 bg-[#0D111A] border-r border-[#1E2638] flex flex-col h-full shrink-0 select-none">
      {/* Sidebar Header & Search */}
      <div className="p-3 border-b border-[#1E2638] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Watchlist</span>
          <span className="text-slate-500 font-mono text-[11px]">{quotes.length} Equities</span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ticker or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#131926] border border-[#232D42] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        {/* Sector Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
          {(['ALL', 'Semiconductors', 'Tech ETF', 'Broad Market ETF'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSectorFilter(filter)}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                sectorFilter === filter
                  ? 'bg-blue-600/30 border border-blue-500/40 text-blue-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {filter === 'Broad Market ETF' ? 'Broad' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Stock List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#151D2C]">
        {filteredQuotes.map((q) => {
          const isSelected = q.symbol === selectedSymbol;
          const isUp = q.change >= 0;
          const tickState = lastTickSymbols[q.symbol];

          return (
            <button
              key={q.symbol}
              onClick={() => onSelectSymbol(q.symbol)}
              className={`w-full text-left p-3 transition-colors flex items-center justify-between group ${
                isSelected
                  ? 'bg-[#182032] border-l-2 border-blue-500'
                  : 'hover:bg-[#121824]'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                    {q.symbol}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[85px]">{q.sector}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[130px] font-sans">
                  {q.name}
                </div>
              </div>

              {/* Price & Sparkline */}
              <div className="text-right shrink-0">
                <div
                  className={`font-mono font-semibold text-sm tabular-nums transition-colors duration-300 ${
                    tickState === 'UP'
                      ? 'text-emerald-400 bg-emerald-500/10 px-1 rounded'
                      : tickState === 'DOWN'
                      ? 'text-rose-400 bg-rose-500/10 px-1 rounded'
                      : 'text-white'
                  }`}
                >
                  ${q.price.toFixed(2)}
                </div>

                <div
                  className={`flex items-center justify-end gap-1 text-[11px] font-mono tabular-nums ${
                    isUp ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>
                    {isUp ? '+' : ''}
                    {q.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {filteredQuotes.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-xs">
            No equities match "{searchTerm}"
          </div>
        )}
      </div>

      {/* Sidebar Footer Stats */}
      <div className="p-3 border-t border-[#1E2638] bg-[#0A0E17] text-[11px] text-slate-500 flex justify-between items-center font-mono">
        <span>Active Feed</span>
        <span className="text-emerald-400">100% Synced</span>
      </div>
    </aside>
  );
};
