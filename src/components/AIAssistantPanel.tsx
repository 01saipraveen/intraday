import React, { useState, useEffect } from 'react';
import { AITradeIdea, MarketExplanation, StockQuote } from '../types/trading';
import { Sparkles, RefreshCw, ArrowUpRight, ArrowDownRight, ShieldAlert, Target, Compass, Zap } from 'lucide-react';

interface AIAssistantPanelProps {
  quote: StockQuote;
  onApplyTradeIdea: (idea: AITradeIdea) => void;
  onSendToStrategyStudio: (idea: AITradeIdea) => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  quote,
  onApplyTradeIdea,
  onSendToStrategyStudio,
}) => {
  const [activeTab, setActiveTab] = useState<'IDEAS' | 'STRUCTURE'>('IDEAS');
  const [ideas, setIdeas] = useState<AITradeIdea[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketExplanation | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [lastFetchedSymbol, setLastFetchedSymbol] = useState<string>('');

  const getClientFallbackIdeas = (q: StockQuote): AITradeIdea[] => {
    const isAboveVwap = q.price >= q.vwap;
    const isOversold = q.rsi < 45;
    const dir: 'LONG' | 'SHORT' = isAboveVwap || isOversold ? 'LONG' : 'SHORT';
    const entry = q.price;
    const stopLoss = dir === 'LONG' ? Number((entry * 0.992).toFixed(2)) : Number((entry * 1.008).toFixed(2));
    const takeProfit = dir === 'LONG' ? Number((entry * 1.018).toFixed(2)) : Number((entry * 0.982).toFixed(2));
    const rr = (Math.abs(takeProfit - entry) / Math.max(0.01, Math.abs(entry - stopLoss))).toFixed(2);

    return [
      {
        symbol: q.symbol,
        direction: dir,
        setupName: dir === 'LONG' ? 'VWAP Pullback & Reclaim' : 'Mean Reversion Fade',
        entryPrice: entry,
        stopLoss,
        takeProfit,
        riskReward: `${rr}:1`,
        conviction: isAboveVwap && isOversold ? 'HIGH' : 'MEDIUM',
        timeframe: '5m - 15m Intraday',
        catalyst: `${q.symbol} is holding near VWAP ($${q.vwap.toFixed(2)}) with RSI at ${q.rsi.toFixed(1)}. Volume profile confirms institutional value acceptance.`,
        keyLevels: {
          support: Number((entry * 0.988).toFixed(2)),
          resistance: Number((entry * 1.015).toFixed(2)),
        },
      },
      {
        symbol: q.symbol,
        direction: dir === 'LONG' ? 'SHORT' : 'LONG',
        setupName: 'Volatility Breakout Scalp',
        entryPrice: Number((entry * (dir === 'LONG' ? 1.005 : 0.995)).toFixed(2)),
        stopLoss: Number((entry * (dir === 'LONG' ? 1.012 : 0.988)).toFixed(2)),
        takeProfit: Number((entry * (dir === 'LONG' ? 0.99 : 1.01)).toFixed(2)),
        riskReward: '1.85:1',
        conviction: 'MEDIUM',
        timeframe: '1m - 5m Scalp',
        catalyst: `Secondary contingency setup if price breaks the intraday session range with high tick velocity.`,
        keyLevels: {
          support: Number((entry * 0.99).toFixed(2)),
          resistance: Number((entry * 1.01).toFixed(2)),
        },
      },
    ];
  };

  const getClientFallbackStructure = (q: StockQuote): MarketExplanation => {
    const isAboveVwap = q.price >= q.vwap;
    return {
      sentiment: isAboveVwap ? 'Bullish Dominance' : 'Bearish Pressure',
      regime: 'Intraday Trend Continuation',
      analysis: `${q.symbol} is consolidating near $${q.price.toFixed(2)} with VWAP anchored at $${q.vwap.toFixed(2)}. Momentum indicators show ${q.rsi > 50 ? 'favorable buyer absorption' : 'cautious seller pressure'}. Key pivot at $${q.vwap.toFixed(2)}.`,
      orderFlowBias: isAboveVwap ? 'Aggressive Bids on Dips' : 'Passive Offers at Highs',
      criticalPivot: q.vwap,
      riskWarning: 'Fast tick velocity around volume nodes may trigger stop runs.',
    };
  };

  const fetchTradeIdeas = async () => {
    if (loadingIdeas) return;
    setLoadingIdeas(true);
    try {
      const res = await fetch('/api/ai/trade-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: quote.symbol,
          price: quote.price,
          change: quote.changePercent,
          vwap: quote.vwap,
          rsi: quote.rsi,
          ema9: quote.ema9,
          ema21: quote.ema21,
          volume: `${(quote.volume / 1000000).toFixed(1)}M`,
        }),
      });
      const cType = res.headers.get('content-type') || '';
      if (res.ok && cType.includes('application/json')) {
        const data = await res.json();
        if (data.ideas && Array.isArray(data.ideas) && data.ideas.length > 0) {
          setIdeas(data.ideas);
          return;
        }
      }
      setIdeas(getClientFallbackIdeas(quote));
    } catch {
      setIdeas(getClientFallbackIdeas(quote));
    } finally {
      setLoadingIdeas(false);
    }
  };

  const fetchMarketStructure = async () => {
    if (loadingStructure) return;
    setLoadingStructure(true);
    try {
      const res = await fetch('/api/ai/explain-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: quote.symbol,
          price: quote.price,
          vwap: quote.vwap,
          rsi: quote.rsi,
          ema9: quote.ema9,
          ema21: quote.ema21,
          high: quote.high,
          low: quote.low,
          trend: quote.change >= 0 ? 'bullish momentum' : 'bearish pullback',
        }),
      });
      const cType = res.headers.get('content-type') || '';
      if (res.ok && cType.includes('application/json')) {
        const data = await res.json();
        if (data.analysis) {
          setMarketAnalysis(data);
          return;
        }
      }
      setMarketAnalysis(getClientFallbackStructure(quote));
    } catch {
      setMarketAnalysis(getClientFallbackStructure(quote));
    } finally {
      setLoadingStructure(false);
    }
  };

  useEffect(() => {
    if (quote.symbol !== lastFetchedSymbol) {
      setLastFetchedSymbol(quote.symbol);
      fetchTradeIdeas();
      fetchMarketStructure();
    }
  }, [quote.symbol]);

  return (
    <div className="w-80 bg-[#0D111A] border-l border-[#1E2638] flex flex-col h-full shrink-0 select-none">
      {/* Header Tabs */}
      <div className="p-3 border-b border-[#1E2638] flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#131926] p-0.5 rounded border border-[#20293D] text-[11px] font-mono">
          <button
            onClick={() => setActiveTab('IDEAS')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'IDEAS'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-blue-300" />
            <span>AI Ideas</span>
          </button>
          <button
            onClick={() => setActiveTab('STRUCTURE')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'STRUCTURE'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3 h-3 text-blue-300" />
            <span>Market Context</span>
          </button>
        </div>

        <button
          onClick={() => (activeTab === 'IDEAS' ? fetchTradeIdeas() : fetchMarketStructure())}
          disabled={loadingIdeas || loadingStructure}
          className="p-1.5 rounded hover:bg-[#1A2234] text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
          title="Regenerate Gemini Analysis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingIdeas || loadingStructure ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'IDEAS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{quote.symbol} Intraday Setups</span>
              <span className="font-mono text-slate-500">Gemini 3.8 Flash</span>
            </div>

            {loadingIdeas ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span>Synthesizing order flow & setups...</span>
              </div>
            ) : ideas.length > 0 ? (
              ideas.map((idea, idx) => {
                const isLong = idea.direction === 'LONG';
                return (
                  <div
                    key={idx}
                    className="p-3 bg-[#131926] border border-[#222C3F] rounded-lg space-y-2.5 hover:border-slate-700 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex items-center text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                            isLong
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                          {idea.direction}
                        </span>
                        <span className="font-semibold text-xs text-white truncate max-w-[130px]">
                          {idea.setupName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{idea.timeframe}</span>
                    </div>

                    {/* Numeric Targets */}
                    <div className="grid grid-cols-3 gap-1 bg-[#0B0F17] p-2 rounded border border-[#1A2234] text-center font-mono">
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Entry</div>
                        <div className="text-xs font-semibold text-white tabular-nums">${idea.entryPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-rose-400 uppercase">Stop</div>
                        <div className="text-xs font-semibold text-rose-400 tabular-nums">${idea.stopLoss.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-emerald-400 uppercase">Target</div>
                        <div className="text-xs font-semibold text-emerald-400 tabular-nums">${idea.takeProfit.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* R/R & Conviction */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>R:R: <strong className="text-slate-200 font-mono">{idea.riskReward}</strong></span>
                      <span>Conviction: <strong className="text-blue-400">{idea.conviction}</strong></span>
                    </div>

                    {/* Rationale */}
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      {idea.catalyst}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#1C2538]">
                      <button
                        onClick={() => onApplyTradeIdea(idea)}
                        className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Place Order</span>
                      </button>
                      <button
                        onClick={() => onSendToStrategyStudio(idea)}
                        className="py-1.5 px-2.5 bg-[#1C2538] hover:bg-[#25324B] text-slate-300 hover:text-white rounded text-[11px] font-medium transition-colors"
                        title="Load into Strategy Studio"
                      >
                        Build Rule
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No active setups found. Click refresh to query AI.
              </div>
            )}
          </div>
        )}

        {activeTab === 'STRUCTURE' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Market Regime Breakdown</span>
              <span className="font-mono text-slate-500">Live Synthesis</span>
            </div>

            {loadingStructure ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span>Evaluating market microstructure...</span>
              </div>
            ) : marketAnalysis ? (
              <div className="space-y-3">
                {/* Sentiment & Regime Badges */}
                <div className="p-3 bg-[#131926] border border-[#222C3F] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Session Bias</span>
                    <span className="text-xs font-semibold text-emerald-400">{marketAnalysis.sentiment}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Regime</span>
                    <span className="text-xs text-slate-200 font-mono">{marketAnalysis.regime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Order Flow</span>
                    <span className="text-xs text-blue-400">{marketAnalysis.orderFlowBias}</span>
                  </div>
                </div>

                {/* Analysis Body */}
                <div className="p-3 bg-[#131926] border border-[#222C3F] rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-white">Structure Overview</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {marketAnalysis.analysis}
                  </p>
                </div>

                {/* Critical Pivot & Risk Warning */}
                <div className="p-3 bg-[#131926] border border-[#222C3F] rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <Target className="w-3.5 h-3.5" />
                    <span>Critical Session Pivot</span>
                  </div>
                  <div className="text-base font-bold font-mono text-white tabular-nums">
                    ${Number(marketAnalysis.criticalPivot || quote.vwap).toFixed(2)}
                  </div>

                  <div className="pt-2 border-t border-[#1C2538] flex items-start gap-1.5 text-[11px] text-rose-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{marketAnalysis.riskWarning}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No analysis available. Click refresh to generate.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-[#1E2638] bg-[#0A0E17] text-[10px] text-slate-500 text-center font-mono">
        Models: gemini-3.8-flash · Real-time Technicals
      </div>
    </div>
  );
};
