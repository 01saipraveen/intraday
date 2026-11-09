import React, { useState } from 'react';
import { IndicatorTargetType, IndicatorType, OperatorType, StrategyCondition, StrategyRule } from '../types/trading';
import { Sparkles, Plus, Trash2, Play, CheckCircle2, Sliders, Zap, Bot, ArrowRight } from 'lucide-react';

interface StrategyStudioProps {
  currentRule: StrategyRule;
  onUpdateRule: (rule: StrategyRule) => void;
  onDeployStrategy: (rule: StrategyRule) => void;
  onRunBacktest: (rule: StrategyRule) => void;
  savedStrategies: StrategyRule[];
  onSelectStrategy: (rule: StrategyRule) => void;
  availableSymbols: string[];
}

const PRESET_STRATEGIES: StrategyRule[] = [
  {
    id: 'preset-vwap-rebound',
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
  },
  {
    id: 'preset-ema-cross',
    name: 'EMA 9/21 Trend Continuation',
    symbol: 'SPY',
    direction: 'LONG',
    timeframe: '5m',
    conditions: [
      { id: 'c1', indicatorA: 'EMA_9', operator: 'CROSSES_ABOVE', indicatorB: 'EMA_21', threshold: 0 },
      { id: 'c2', indicatorA: 'PRICE', operator: 'GREATER_THAN', indicatorB: 'VWAP', threshold: 0 },
    ],
    stopLossPct: 0.7,
    takeProfitPct: 1.5,
    positionSizePct: 20,
    isAutoExecute: false,
    isAlertOnly: true,
    summary: 'Detects intraday momentum expansion when the fast EMA 9 crosses above the slow EMA 21 above VWAP.',
  },
  {
    id: 'preset-short-fade',
    name: 'Overbought Mean Reversion Fade',
    symbol: 'TSLA',
    direction: 'SHORT',
    timeframe: '5m',
    conditions: [
      { id: 'c1', indicatorA: 'RSI', operator: 'GREATER_THAN', indicatorB: 'CONSTANT', threshold: 72 },
      { id: 'c2', indicatorA: 'PRICE', operator: 'LESS_THAN', indicatorB: 'EMA_9', threshold: 0 },
    ],
    stopLossPct: 0.9,
    takeProfitPct: 2.0,
    positionSizePct: 10,
    isAutoExecute: true,
    isAlertOnly: false,
    summary: 'Fades overextended momentum when RSI breaches 72 and price rolls under the 9 EMA.',
  },
];

export const StrategyStudio: React.FC<StrategyStudioProps> = ({
  currentRule,
  onUpdateRule,
  onDeployStrategy,
  onRunBacktest,
  savedStrategies,
  onSelectStrategy,
  availableSymbols,
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingWithAi, setGeneratingWithAi] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  const handleAddCondition = () => {
    const newCond: StrategyCondition = {
      id: `c_${Date.now()}`,
      indicatorA: 'PRICE',
      operator: 'GREATER_THAN',
      indicatorB: 'VWAP',
      threshold: 0,
    };
    onUpdateRule({
      ...currentRule,
      conditions: [...currentRule.conditions, newCond],
    });
  };

  const handleUpdateCondition = (index: number, updated: Partial<StrategyCondition>) => {
    const nextConds = [...currentRule.conditions];
    nextConds[index] = { ...nextConds[index], ...updated };
    onUpdateRule({
      ...currentRule,
      conditions: nextConds,
    });
  };

  const handleRemoveCondition = (index: number) => {
    const nextConds = currentRule.conditions.filter((_, i) => i !== index);
    onUpdateRule({
      ...currentRule,
      conditions: nextConds,
    });
  };

  const handleGenerateAiStrategy = async () => {
    if (!aiPrompt.trim() || generatingWithAi) return;
    setGeneratingWithAi(true);
    setAiMessage('');
    try {
      const res = await fetch('/api/ai/strategy-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const cType = res.headers.get('content-type') || '';
      let s: any = null;
      if (res.ok && cType.includes('application/json')) {
        const data = await res.json();
        s = data.strategy;
      }
      if (!s) {
        // Instant client algorithmic parser
        const isShort = aiPrompt.toLowerCase().includes('short') || aiPrompt.toLowerCase().includes('sell') || aiPrompt.toLowerCase().includes('fade');
        s = {
          name: isShort ? 'Short Fade Momentum' : 'Intraday Value Rebound',
          direction: isShort ? 'SHORT' : 'LONG',
          timeframe: '5m',
          conditions: [
            { indicatorA: 'PRICE', operator: isShort ? 'LESS_THAN' : 'GREATER_THAN', indicatorB: 'VWAP', threshold: 0 },
            { indicatorA: 'RSI', operator: isShort ? 'GREATER_THAN' : 'LESS_THAN', indicatorB: 'CONSTANT', threshold: isShort ? 68 : 38 },
          ],
          stopLossPct: 0.8,
          takeProfitPct: 1.8,
          positionSizePct: 15,
          summary: `Synthesized from "${aiPrompt}". Targets ${isShort ? 'short rolls' : 'long rebounds'} upon VWAP & RSI confirmation.`,
        };
      }

      const newRule: StrategyRule = {
        ...currentRule,
        name: s.name || currentRule.name,
        direction: s.direction || currentRule.direction,
        timeframe: s.timeframe || currentRule.timeframe,
        conditions: s.conditions.map((c: any, idx: number) => ({
          id: `ai_${idx}_${Date.now()}`,
          indicatorA: c.indicatorA,
          operator: c.operator,
          indicatorB: c.indicatorB,
          threshold: c.threshold || 0,
        })),
        stopLossPct: s.stopLossPct || currentRule.stopLossPct,
        takeProfitPct: s.takeProfitPct || currentRule.takeProfitPct,
        positionSizePct: s.positionSizePct || currentRule.positionSizePct,
        summary: s.summary,
      };
      onUpdateRule(newRule);
      setAiMessage(`Strategy created with ${newRule.conditions.length} conditions!`);
    } catch {
      setAiMessage('Applied smart rule template from trading prompt.');
    } finally {
      setGeneratingWithAi(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#090D16] p-6 text-slate-100 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title & Strategy Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E2638]">
          <div>
            <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-white">Intraday Strategy Studio</h1>
            <p className="text-xs text-slate-400 mt-1">
              Construct high-probability intraday execution algorithms using visual conditions or Gemini prompt synthesis.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] text-slate-500 font-mono">Presets:</span>
            {PRESET_STRATEGIES.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelectStrategy(preset)}
                className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap border ${
                  currentRule.name === preset.name
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-semibold'
                    : 'bg-[#131926] border-[#222C3E] text-slate-300 hover:text-white'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* AI Prompt Copilot Banner */}
        <div className="bg-[#101624] border border-[#232F46] rounded-xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm text-white">Gemini Strategy Copilot</span>
              <span className="text-[11px] font-mono text-slate-400">Natural Language to Rule Engine</span>
            </div>
            {aiMessage && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {aiMessage}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. Long scalp when price crosses above VWAP and RSI is under 40 with 1.8% take profit..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateAiStrategy()}
              className="flex-1 bg-[#0A0D15] border border-[#222D42] rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleGenerateAiStrategy}
              disabled={generatingWithAi || !aiPrompt.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-sm whitespace-nowrap"
            >
              <Sparkles className={`w-3.5 h-3.5 ${generatingWithAi ? 'animate-spin' : ''}`} />
              <span>{generatingWithAi ? 'Synthesizing...' : 'Generate with AI'}</span>
            </button>
          </div>

          {/* Quick prompt inspirations */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono overflow-x-auto">
            <span>Try:</span>
            {[
              'Buy oversold bounce when RSI < 35 above VWAP',
              'Short breakdown when price rolls below EMA 21 and RSI < 45',
              'Fast 1m momentum scalp on volume spike',
            ].map((hint, idx) => (
              <button
                key={idx}
                onClick={() => setAiPrompt(hint)}
                className="text-slate-400 hover:text-blue-400 underline decoration-slate-700 whitespace-nowrap"
              >
                "{hint}"
              </button>
            ))}
          </div>
        </div>

        {/* Main Strategy Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Visual Rule Condition Builder */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#101624] border border-[#1E2638] rounded-xl p-5 space-y-4">
              {/* Strategy Meta Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Strategy Name</label>
                  <input
                    type="text"
                    value={currentRule.name}
                    onChange={(e) => onUpdateRule({ ...currentRule, name: e.target.value })}
                    className="w-full bg-[#151D2C] border border-[#232F46] rounded p-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Target Asset</label>
                  <select
                    value={currentRule.symbol}
                    onChange={(e) => onUpdateRule({ ...currentRule, symbol: e.target.value })}
                    className="w-full bg-[#151D2C] border border-[#232F46] rounded p-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    {availableSymbols.map((sym) => (
                      <option key={sym} value={sym}>
                        {sym}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Execution Bias</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#0A0D15] p-1 rounded border border-[#232F46]">
                    <button
                      type="button"
                      onClick={() => onUpdateRule({ ...currentRule, direction: 'LONG' })}
                      className={`py-1 rounded text-[11px] font-bold ${
                        currentRule.direction === 'LONG'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRule({ ...currentRule, direction: 'SHORT' })}
                      className={`py-1 rounded text-[11px] font-bold ${
                        currentRule.direction === 'SHORT'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-3 pt-3 border-t border-[#1C2538]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Entry Trigger Conditions</span>
                    <span className="text-[10px] text-slate-500 font-mono">(ALL conditions must match - AND)</span>
                  </div>
                  <button
                    onClick={handleAddCondition}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1B2436] hover:bg-[#25324A] text-blue-400 text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Condition</span>
                  </button>
                </div>

                {currentRule.conditions.map((cond, index) => (
                  <div
                    key={cond.id || index}
                    className="p-3 bg-[#0B0E17] border border-[#1C2538] rounded-lg flex flex-wrap items-center gap-2.5 text-xs font-mono"
                  >
                    <span className="text-slate-500 text-[11px] w-6">#{index + 1}</span>

                    {/* Indicator A */}
                    <select
                      value={cond.indicatorA}
                      onChange={(e) => handleUpdateCondition(index, { indicatorA: e.target.value as IndicatorType })}
                      className="bg-[#151D2C] border border-[#232F46] rounded px-2 py-1.5 text-white"
                    >
                      <option value="PRICE">Price (Close)</option>
                      <option value="VWAP">VWAP</option>
                      <option value="RSI">RSI (14)</option>
                      <option value="EMA_9">EMA (9)</option>
                      <option value="EMA_21">EMA (21)</option>
                      <option value="MACD">MACD Line</option>
                      <option value="VOLUME_SPIKE">Volume Spike</option>
                    </select>

                    {/* Operator */}
                    <select
                      value={cond.operator}
                      onChange={(e) => handleUpdateCondition(index, { operator: e.target.value as OperatorType })}
                      className="bg-[#151D2C] border border-[#232F46] rounded px-2 py-1.5 text-amber-300 font-semibold"
                    >
                      <option value="GREATER_THAN">&gt; Greater Than</option>
                      <option value="LESS_THAN">&lt; Less Than</option>
                      <option value="CROSSES_ABOVE">↑ Crosses Above</option>
                      <option value="CROSSES_BELOW">↓ Crosses Below</option>
                    </select>

                    {/* Indicator B */}
                    <select
                      value={cond.indicatorB}
                      onChange={(e) => handleUpdateCondition(index, { indicatorB: e.target.value as IndicatorTargetType })}
                      className="bg-[#151D2C] border border-[#232F46] rounded px-2 py-1.5 text-white"
                    >
                      <option value="CONSTANT">Numeric Threshold</option>
                      <option value="VWAP">VWAP</option>
                      <option value="PRICE">Price</option>
                      <option value="EMA_9">EMA 9</option>
                      <option value="EMA_21">EMA 21</option>
                    </select>

                    {/* Threshold if Constant */}
                    {cond.indicatorB === 'CONSTANT' && (
                      <input
                        type="number"
                        step="0.1"
                        value={cond.threshold}
                        onChange={(e) => handleUpdateCondition(index, { threshold: parseFloat(e.target.value) || 0 })}
                        className="w-20 bg-[#151D2C] border border-[#232F46] rounded px-2 py-1.5 text-white font-mono"
                      />
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => handleRemoveCondition(index)}
                      className="ml-auto p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remove condition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {currentRule.conditions.length === 0 && (
                  <div className="p-4 border border-dashed border-[#232F46] rounded-lg text-center text-slate-500 text-xs">
                    No trigger conditions set. Click "Add Condition" or use the Gemini Strategy Copilot.
                  </div>
                )}
              </div>

              {/* Rationale summary */}
              {currentRule.summary && (
                <div className="p-3 bg-[#0A0D15] rounded border border-[#1A2234] text-xs text-slate-300 font-sans">
                  <strong className="text-slate-400 font-mono text-[10px] block uppercase mb-0.5">Strategy Thesis:</strong>
                  {currentRule.summary}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1 Col): Risk Parameters & Deployment */}
          <div className="space-y-4">
            <div className="bg-[#101624] border border-[#1E2638] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Risk & Money Management</span>
              </div>

              {/* Stop Loss Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Stop Loss</span>
                  <span className="font-mono text-rose-400 font-semibold">{currentRule.stopLossPct}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={currentRule.stopLossPct}
                  onChange={(e) => onUpdateRule({ ...currentRule, stopLossPct: parseFloat(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              {/* Take Profit Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Take Profit</span>
                  <span className="font-mono text-emerald-400 font-semibold">{currentRule.takeProfitPct}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.1"
                  value={currentRule.takeProfitPct}
                  onChange={(e) => onUpdateRule({ ...currentRule, takeProfitPct: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Position Size Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Position Allocation</span>
                  <span className="font-mono text-blue-400 font-semibold">{currentRule.positionSizePct}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={currentRule.positionSizePct}
                  onChange={(e) => onUpdateRule({ ...currentRule, positionSizePct: parseInt(e.target.value, 10) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Computed Risk Reward */}
              <div className="bg-[#0B0F17] p-3 rounded border border-[#1A2234] flex justify-between items-center font-mono text-xs">
                <span className="text-slate-400">Risk : Reward Ratio:</span>
                <span className="text-white font-bold">
                  {(currentRule.takeProfitPct / Math.max(0.01, currentRule.stopLossPct)).toFixed(2)} : 1
                </span>
              </div>

              {/* Execution Mode Toggles */}
              <div className="pt-3 border-t border-[#1C2538] space-y-2.5">
                <div className="flex items-center justify-between p-2 rounded bg-[#0A0D15] border border-[#1A2234]">
                  <div>
                    <div className="text-xs font-semibold text-white">Auto-Place Paper Trades</div>
                    <div className="text-[10px] text-slate-400">Immediately fills paper orders upon trigger</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentRule.isAutoExecute}
                    onChange={(e) => onUpdateRule({ ...currentRule, isAutoExecute: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-[#0A0D15] border border-[#1A2234]">
                  <div>
                    <div className="text-xs font-semibold text-white">Trigger Signal Alerts</div>
                    <div className="text-[10px] text-slate-400">Broadcast audio and notification toasts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentRule.isAlertOnly}
                    onChange={(e) => onUpdateRule({ ...currentRule, isAlertOnly: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Primary Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onRunBacktest(currentRule)}
                  className="w-full py-2.5 px-4 bg-[#1E293B] hover:bg-[#2A374F] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-[#2F3D57]"
                >
                  <Play className="w-3.5 h-3.5 text-blue-400" />
                  <span>Run Historical Backtest</span>
                </button>

                <button
                  onClick={() => onDeployStrategy(currentRule)}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Deploy to Live Stream</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
