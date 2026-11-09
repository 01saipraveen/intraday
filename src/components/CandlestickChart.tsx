import React, { useState, useMemo, useRef } from 'react';
import { Candle, StockQuote } from '../types/trading';
import { Play, Pause, FastForward, SkipForward, Layers, Eye } from 'lucide-react';

interface CandlestickChartProps {
  quote: StockQuote;
  candles: Candle[];
  timeframe: '1m' | '5m' | '15m';
  setTimeframe: (tf: '1m' | '5m' | '15m') => void;
  isSimulating: boolean;
  toggleSimulation: () => void;
  speed: number;
  setSpeed: (speed: number) => void;
  onStepTick: () => void;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  quote,
  candles,
  timeframe,
  setTimeframe,
  isSimulating,
  toggleSimulation,
  speed,
  setSpeed,
  onStepTick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Indicator Visibility Toggles
  const [showVwap, setShowVwap] = useState(true);
  const [showEma9, setShowEma9] = useState(true);
  const [showEma21, setShowEma21] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [subPane, setSubPane] = useState<'RSI' | 'MACD' | 'VOLUME'>('RSI');

  // Interactive Crosshair State
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // SVG Dimensions & Margins
  const width = 920;
  const mainHeight = 360;
  const subHeight = 110;
  const totalHeight = mainHeight + subHeight + 30; // 30px for time axis
  const padding = { top: 20, right: 65, bottom: 25, left: 15 };

  const chartWidth = width - padding.left - padding.right;

  // Compute price bounds for visible candles (last 60 candles)
  const visibleCandles = useMemo(() => {
    return candles.slice(-60);
  }, [candles]);

  const activeCandle = hoverIndex !== null && visibleCandles[hoverIndex]
    ? visibleCandles[hoverIndex]
    : visibleCandles[visibleCandles.length - 1];

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 100, maxPrice: 110, priceRange: 10 };
    let min = Math.min(...visibleCandles.map((c) => Math.min(c.low, c.lowerBB || c.low)));
    let max = Math.max(...visibleCandles.map((c) => Math.max(c.high, c.upperBB || c.high)));

    // Add 5% headroom
    const buffer = (max - min) * 0.05 || 1;
    min -= buffer;
    max += buffer;
    return { minPrice: min, maxPrice: max, priceRange: max - min };
  }, [visibleCandles]);

  // Price Y Coordinate scale
  const getY = (price: number) => {
    if (priceRange === 0) return mainHeight / 2;
    return padding.top + (1 - (price - minPrice) / priceRange) * (mainHeight - padding.top - 10);
  };

  // Sub-pane Y scale
  const getSubY = (val: number, min: number, max: number) => {
    const range = max - min || 1;
    const top = mainHeight + 20;
    const height = subHeight - 25;
    return top + (1 - (val - min) / range) * height;
  };

  const candleCount = visibleCandles.length;
  const barWidth = Math.max(3, (chartWidth / Math.max(1, candleCount)) * 0.72);
  const getX = (idx: number) => padding.left + (idx + 0.5) * (chartWidth / Math.max(1, candleCount));

  // Handle Mouse Hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartMouseX = mouseX - padding.left;
    if (chartMouseX < 0 || chartMouseX > chartWidth) {
      setHoverIndex(null);
      return;
    }
    const idx = Math.floor((chartMouseX / chartWidth) * candleCount);
    if (idx >= 0 && idx < candleCount) {
      setHoverIndex(idx);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Generate SVG path for moving average lines
  const buildLinePath = (getValue: (c: Candle) => number) => {
    return visibleCandles
      .map((c, i) => {
        const x = getX(i);
        const y = getY(getValue(c));
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Gridline steps
  const priceGridlines = useMemo(() => {
    const lines = [];
    const step = priceRange / 5;
    for (let i = 0; i <= 5; i++) {
      const p = minPrice + step * i;
      lines.push({ price: p, y: getY(p) });
    }
    return lines;
  }, [minPrice, priceRange, mainHeight]);

  // Max volume for volume subpane
  const maxVolume = useMemo(() => {
    return Math.max(1, ...visibleCandles.map((c) => c.volume));
  }, [visibleCandles]);

  const lastCandle = visibleCandles[visibleCandles.length - 1];

  return (
    <div className="flex-1 flex flex-col bg-[#0A0D14] overflow-hidden select-none" ref={containerRef}>
      {/* Chart Top Bar with Asset Telemetry & Timeframe Toggles */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0D121D] border-b border-[#1A2234] text-xs">
        {/* Asset Header & Live Price */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-white font-mono">{quote.symbol}</span>
            <span className="text-slate-400 text-xs">{quote.name}</span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <span className="font-mono text-base font-bold tabular-nums text-white">${quote.price.toFixed(2)}</span>
            <span
              className={`font-mono text-xs font-semibold tabular-nums ${
                quote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {quote.change >= 0 ? '+' : ''}
              {quote.change.toFixed(2)} ({quote.changePercent >= 0 ? '+' : ''}
              {quote.changePercent.toFixed(2)}%)
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500 font-mono">
            <span>VWAP: <strong className="text-cyan-400 font-normal">${quote.vwap.toFixed(2)}</strong></span>
            <span>RSI: <strong className={quote.rsi < 35 ? 'text-emerald-400' : quote.rsi > 65 ? 'text-rose-400' : 'text-slate-300'}>{quote.rsi.toFixed(1)}</strong></span>
            <span>Vol: <strong className="text-slate-300 font-normal">{(quote.volume / 1000000).toFixed(1)}M</strong></span>
          </div>
        </div>

        {/* Timeframe & Indicators Toggles */}
        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#131926] p-0.5 rounded border border-[#20293D] text-[11px] font-mono">
            {(['1m', '5m', '15m'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator toggles */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono">
            <button
              onClick={() => setShowVwap(!showVwap)}
              className={`px-2 py-1 rounded border transition-colors ${
                showVwap
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-[#131926] border-[#20293D] text-slate-500'
              }`}
            >
              VWAP
            </button>
            <button
              onClick={() => setShowEma9(!showEma9)}
              className={`px-2 py-1 rounded border transition-colors ${
                showEma9
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#131926] border-[#20293D] text-slate-500'
              }`}
            >
              EMA 9
            </button>
            <button
              onClick={() => setShowEma21(!showEma21)}
              className={`px-2 py-1 rounded border transition-colors ${
                showEma21
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-[#131926] border-[#20293D] text-slate-500'
              }`}
            >
              EMA 21
            </button>
            <button
              onClick={() => setShowBollinger(!showBollinger)}
              className={`px-2 py-1 rounded border transition-colors ${
                showBollinger
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-[#131926] border-[#20293D] text-slate-500'
              }`}
            >
              BB (20,2)
            </button>
          </div>

          {/* Sub-pane Switcher */}
          <div className="flex items-center bg-[#131926] p-0.5 rounded border border-[#20293D] text-[10px] font-mono">
            {(['RSI', 'MACD', 'VOLUME'] as const).map((pane) => (
              <button
                key={pane}
                onClick={() => setSubPane(pane)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  subPane === pane
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {pane}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Crosshair OHLC Inspector Strip */}
      <div className="px-5 py-1.5 bg-[#090C12] border-b border-[#141A28] flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span className="text-slate-500">TIME: <strong className="text-white font-normal">{activeCandle?.timeStr || '--:--'}</strong></span>
          <span>O: <strong className="text-slate-200 font-normal">${activeCandle?.open.toFixed(2)}</strong></span>
          <span>H: <strong className="text-emerald-400 font-normal">${activeCandle?.high.toFixed(2)}</strong></span>
          <span>L: <strong className="text-rose-400 font-normal">${activeCandle?.low.toFixed(2)}</strong></span>
          <span>C: <strong className="text-white font-normal">${activeCandle?.close.toFixed(2)}</strong></span>
          <span>VOL: <strong className="text-slate-300 font-normal">{activeCandle?.volume.toLocaleString()}</strong></span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-slate-500">
          {showVwap && <span>VWAP: <span className="text-cyan-400">${activeCandle?.vwap.toFixed(2)}</span></span>}
          {showEma9 && <span>EMA9: <span className="text-amber-400">${activeCandle?.ema9.toFixed(2)}</span></span>}
          {showEma21 && <span>EMA21: <span className="text-blue-400">${activeCandle?.ema21.toFixed(2)}</span></span>}
          {subPane === 'RSI' && <span>RSI(14): <span className="text-purple-400">{activeCandle?.rsi.toFixed(1)}</span></span>}
        </div>
      </div>

      {/* Candlestick & Indicator Canvas Viewport */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2">
        <svg
          viewBox={`0 0 ${width} ${totalHeight}`}
          className="w-full h-full cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Horizontal Gridlines & Price Scale */}
          {priceGridlines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={width - padding.right}
                y2={line.y}
                stroke="#161E2E"
                strokeDasharray="2 3"
              />
              <text
                x={width - padding.right + 6}
                y={line.y + 3}
                fill="#64748B"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                className="tabular-nums"
              >
                ${line.price.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Bollinger Bands Fill */}
          {showBollinger && (
            <path
              d={`${buildLinePath((c) => c.upperBB)} ${visibleCandles
                .slice()
                .reverse()
                .map((c, i) => {
                  const revIdx = visibleCandles.length - 1 - i;
                  return `L ${getX(revIdx).toFixed(1)} ${getY(c.lowerBB).toFixed(1)}`;
                })
                .join(' ')} Z`}
              fill="#8B5CF6"
              fillOpacity="0.06"
            />
          )}

          {/* Bollinger Band Lines */}
          {showBollinger && (
            <>
              <path d={buildLinePath((c) => c.upperBB)} fill="none" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <path d={buildLinePath((c) => c.lowerBB)} fill="none" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            </>
          )}

          {/* VWAP Line */}
          {showVwap && (
            <path
              d={buildLinePath((c) => c.vwap)}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="1.5"
              strokeOpacity="0.85"
            />
          )}

          {/* EMA 9 Line */}
          {showEma9 && (
            <path
              d={buildLinePath((c) => c.ema9)}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />
          )}

          {/* EMA 21 Line */}
          {showEma21 && (
            <path
              d={buildLinePath((c) => c.ema21)}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />
          )}

          {/* Candlesticks Rendering */}
          {visibleCandles.map((c, idx) => {
            const x = getX(idx);
            const isBullish = c.close >= c.open;
            const candleColor = isBullish ? '#10B981' : '#EF4444';

            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const yOpen = getY(c.open);
            const yClose = getY(c.close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

            return (
              <g key={c.timestamp} className="transition-opacity">
                {/* Wick High to Low */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1"
                  strokeOpacity="0.85"
                />
                {/* Candle Body */}
                <rect
                  x={x - barWidth / 2}
                  y={bodyTop}
                  width={barWidth}
                  height={bodyHeight}
                  fill={isBullish ? '#10B981' : '#EF4444'}
                  fillOpacity={isBullish ? '0.9' : '0.95'}
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* Live Price Horizontal Marker Line */}
          {lastCandle && (
            <g>
              <line
                x1={padding.left}
                y1={getY(lastCandle.close)}
                x2={width - padding.right}
                y2={getY(lastCandle.close)}
                stroke="#3B82F6"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              {/* Price Tag Pill on Right Axis */}
              <rect
                x={width - padding.right}
                y={getY(lastCandle.close) - 9}
                width={56}
                height={18}
                fill="#2563EB"
                rx="2"
              />
              <text
                x={width - padding.right + 4}
                y={getY(lastCandle.close) + 3}
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
                className="tabular-nums"
              >
                ${lastCandle.close.toFixed(2)}
              </text>
            </g>
          )}

          {/* Divider between Main and Sub-pane */}
          <line
            x1={padding.left}
            y1={mainHeight + 10}
            x2={width - padding.right}
            y2={mainHeight + 10}
            stroke="#1E2638"
            strokeWidth="1"
          />

          {/* Sub-pane: RSI (14) */}
          {subPane === 'RSI' && (
            <g>
              {/* RSI 70 / 30 reference lines */}
              <line
                x1={padding.left}
                y1={getSubY(70, 0, 100)}
                x2={width - padding.right}
                y2={getSubY(70, 0, 100)}
                stroke="#DC2626"
                strokeDasharray="2 3"
                strokeOpacity="0.4"
              />
              <text x={width - padding.right + 4} y={getSubY(70, 0, 100) + 3} fill="#EF4444" fontSize="9" fontFamily="JetBrains Mono, monospace">
                70
              </text>

              <line
                x1={padding.left}
                y1={getSubY(30, 0, 100)}
                x2={width - padding.right}
                y2={getSubY(30, 0, 100)}
                stroke="#10B981"
                strokeDasharray="2 3"
                strokeOpacity="0.4"
              />
              <text x={width - padding.right + 4} y={getSubY(30, 0, 100) + 3} fill="#10B981" fontSize="9" fontFamily="JetBrains Mono, monospace">
                30
              </text>

              {/* RSI Center 50 */}
              <line
                x1={padding.left}
                y1={getSubY(50, 0, 100)}
                x2={width - padding.right}
                y2={getSubY(50, 0, 100)}
                stroke="#1E293B"
                strokeDasharray="2 4"
              />

              {/* RSI Wave Line */}
              <path
                d={visibleCandles
                  .map((c, i) => {
                    const x = getX(i);
                    const y = getSubY(c.rsi, 0, 100);
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#A855F7"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Sub-pane: MACD */}
          {subPane === 'MACD' && (
            <g>
              {/* Zero line */}
              <line
                x1={padding.left}
                y1={getSubY(0, -2, 2)}
                x2={width - padding.right}
                y2={getSubY(0, -2, 2)}
                stroke="#334155"
              />
              {/* Histogram bars */}
              {visibleCandles.map((c, i) => {
                const x = getX(i);
                const zeroY = getSubY(0, -2, 2);
                const histY = getSubY(c.macdHist, -2, 2);
                const height = Math.abs(histY - zeroY);
                const top = Math.min(zeroY, histY);
                const isPositive = c.macdHist >= 0;

                return (
                  <rect
                    key={i}
                    x={x - barWidth / 3}
                    y={top}
                    width={barWidth * 0.66}
                    height={Math.max(1, height)}
                    fill={isPositive ? '#10B981' : '#EF4444'}
                    fillOpacity="0.6"
                  />
                );
              })}
              {/* MACD Line */}
              <path
                d={visibleCandles
                  .map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getSubY(c.macd, -2, 2).toFixed(1)}`)
                  .join(' ')}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.2"
              />
              {/* Signal Line */}
              <path
                d={visibleCandles
                  .map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getSubY(c.macdSignal, -2, 2).toFixed(1)}`)
                  .join(' ')}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="1.2"
              />
            </g>
          )}

          {/* Sub-pane: Volume */}
          {subPane === 'VOLUME' && (
            <g>
              {visibleCandles.map((c, i) => {
                const x = getX(i);
                const bottom = totalHeight - padding.bottom;
                const volHeight = (c.volume / maxVolume) * (subHeight - 20);
                const isBullish = c.close >= c.open;

                return (
                  <rect
                    key={i}
                    x={x - barWidth / 2}
                    y={bottom - volHeight}
                    width={barWidth}
                    height={volHeight}
                    fill={isBullish ? '#10B981' : '#EF4444'}
                    fillOpacity="0.5"
                  />
                );
              })}
            </g>
          )}

          {/* Time scale tick labels along bottom */}
          {visibleCandles.map((c, i) => {
            if (i % 8 !== 0) return null;
            const x = getX(i);
            return (
              <text
                key={c.timestamp}
                x={x}
                y={totalHeight - 6}
                fill="#64748B"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {c.timeStr}
              </text>
            );
          })}

          {/* Active Hover Crosshair Line */}
          {hoverIndex !== null && hoverIndex < candleCount && (
            <g pointerEvents="none">
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={totalHeight - padding.bottom}
                stroke="#94A3B8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <line
                x1={padding.left}
                y1={getY(visibleCandles[hoverIndex].close)}
                x2={width - padding.right}
                y2={getY(visibleCandles[hoverIndex].close)}
                stroke="#94A3B8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Replay & Simulation Transport Bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0D121D] border-t border-[#1A2234] text-xs">
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
              isSimulating
                ? 'bg-amber-600/30 border border-amber-500/40 text-amber-300 hover:bg-amber-600/40'
                : 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/40'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Pause Replay' : 'Play Live Stream'}</span>
          </button>

          {/* Step 1 Tick */}
          <button
            onClick={onStepTick}
            disabled={isSimulating}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#151D2C] border border-[#232F46] text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
            title="Advance 1 tick"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">Step</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-[#131926] p-0.5 rounded border border-[#20293D] text-[11px] font-mono">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  speed === s
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Status info */}
        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <span>Tick Rate: <strong className="text-white font-normal">{speed * 2} ticks/sec</strong></span>
          <span>Bars: <strong className="text-white font-normal">{candles.length}</strong></span>
          <span className="text-emerald-400">Low-Latency Feed</span>
        </div>
      </div>
    </div>
  );
};
