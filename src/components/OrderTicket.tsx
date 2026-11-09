import React, { useState, useEffect } from 'react';
import { OrderBook, PaperAccount, StockQuote } from '../types/trading';
import { X, ArrowUpRight, ArrowDownRight, DollarSign, Layers } from 'lucide-react';

interface OrderTicketProps {
  quote: StockQuote;
  orderBook: OrderBook;
  account: PaperAccount;
  onClose?: () => void;
  onSubmitOrder: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    shares: number;
    price: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
  }) => void;
  initialParams?: {
    side?: 'BUY' | 'SELL';
    shares?: number;
    price?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
  };
}

export const OrderTicket: React.FC<OrderTicketProps> = ({
  quote,
  orderBook,
  account,
  onClose,
  onSubmitOrder,
  initialParams,
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>(initialParams?.side || 'BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [shares, setShares] = useState<number>(initialParams?.shares || 25);
  const [limitPrice, setLimitPrice] = useState<number>(initialParams?.price || quote.price);
  const [stopLossPrice, setStopLossPrice] = useState<string>(
    initialParams?.stopLossPrice ? initialParams.stopLossPrice.toFixed(2) : (quote.price * (side === 'BUY' ? 0.99 : 1.01)).toFixed(2)
  );
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>(
    initialParams?.takeProfitPrice ? initialParams.takeProfitPrice.toFixed(2) : (quote.price * (side === 'BUY' ? 1.02 : 0.98)).toFixed(2)
  );

  // Sync initial parameters when passed
  useEffect(() => {
    if (initialParams) {
      if (initialParams.side) setSide(initialParams.side);
      if (initialParams.shares) setShares(initialParams.shares);
      if (initialParams.price) setLimitPrice(initialParams.price);
      if (initialParams.stopLossPrice) setStopLossPrice(initialParams.stopLossPrice.toFixed(2));
      if (initialParams.takeProfitPrice) setTakeProfitPrice(initialParams.takeProfitPrice.toFixed(2));
    }
  }, [initialParams]);

  const execPrice = orderType === 'MARKET' ? quote.price : limitPrice;
  const totalCost = shares * execPrice;
  const maxAffordable = Math.max(1, Math.floor(account.buyingPower / Math.max(0.01, execPrice)));

  const handleQuickPercent = (pct: number) => {
    const qty = Math.max(1, Math.floor((account.buyingPower * (pct / 100)) / execPrice));
    setShares(qty);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shares <= 0) return;
    if (side === 'BUY' && totalCost > account.buyingPower) {
      alert('Insufficient buying power for this paper trade.');
      return;
    }

    onSubmitOrder({
      symbol: quote.symbol,
      side,
      type: orderType,
      shares,
      price: execPrice,
      stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
      takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
    });

    if (onClose) onClose();
  };

  return (
    <div className="bg-[#101522] border border-[#20293D] rounded-xl shadow-2xl p-5 w-full max-w-md text-xs select-none">
      {/* Modal Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E2638]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-white font-mono">{quote.symbol}</span>
          <span className="text-slate-400">Order Ticket</span>
          <span className="font-mono text-emerald-400 font-semibold tabular-nums ml-1">
            ${quote.price.toFixed(2)}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Buy / Sell Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#0A0D15] rounded-lg border border-[#1A2234]">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>BUY / LONG</span>
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>SELL / SHORT</span>
          </button>
        </div>

        {/* Order Type & Limit Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Order Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as 'MARKET' | 'LIMIT')}
              className="w-full bg-[#151D2C] border border-[#232F46] rounded p-2 text-white font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="MARKET">Market Execution</option>
              <option value="LIMIT">Limit Order</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Execution Price</label>
            <input
              type="number"
              step="0.01"
              disabled={orderType === 'MARKET'}
              value={orderType === 'MARKET' ? quote.price : limitPrice}
              onChange={(e) => setLimitPrice(parseFloat(e.target.value) || quote.price)}
              className="w-full bg-[#151D2C] border border-[#232F46] rounded p-2 text-white font-mono disabled:opacity-50 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Quantity (Shares) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-slate-400">Quantity (Shares)</label>
            <span className="text-[10px] text-slate-500 font-mono">
              Max: {maxAffordable} shares
            </span>
          </div>
          <input
            type="number"
            min="1"
            value={shares}
            onChange={(e) => setShares(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full bg-[#151D2C] border border-[#232F46] rounded p-2 text-white font-mono text-sm font-semibold focus:outline-none focus:border-blue-500"
          />

          {/* Quick percent allocations */}
          <div className="flex items-center gap-1.5 mt-2">
            {[10, 25, 50, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickPercent(pct)}
                className="flex-1 py-1 rounded bg-[#131926] hover:bg-[#1C2538] text-slate-400 hover:text-white border border-[#20293D] font-mono text-[10px] transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Risk Management: Stop Loss & Take Profit */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1E2638]">
          <div>
            <label className="text-[11px] text-rose-400 block mb-1">Stop Loss ($)</label>
            <input
              type="number"
              step="0.01"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
              className="w-full bg-[#151D2C] border border-rose-900/40 rounded p-1.5 text-rose-300 font-mono text-xs focus:outline-none focus:border-rose-500"
              placeholder="e.g. 136.50"
            />
          </div>

          <div>
            <label className="text-[11px] text-emerald-400 block mb-1">Take Profit ($)</label>
            <input
              type="number"
              step="0.01"
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(e.target.value)}
              className="w-full bg-[#151D2C] border border-emerald-900/40 rounded p-1.5 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
              placeholder="e.g. 141.00"
            />
          </div>
        </div>

        {/* Estimated Value & Summary */}
        <div className="bg-[#0B0E16] p-3 rounded-lg border border-[#182133] space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between text-slate-400">
            <span>Estimated Total:</span>
            <span className="font-semibold text-white tabular-nums">${totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Available Buying Power:</span>
            <span className="text-slate-300 tabular-nums">${account.buyingPower.toFixed(2)}</span>
          </div>
        </div>

        {/* Level 2 Order Book Depth Preview */}
        <div className="bg-[#0A0D15] p-2.5 rounded border border-[#1A2234] space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-400" />
              <span>Level 2 Depth (Spread: ${orderBook.spread.toFixed(2)})</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            {/* Bids */}
            <div className="space-y-0.5">
              <div className="text-emerald-400/80 flex justify-between border-b border-emerald-900/30 pb-0.5">
                <span>Bid</span>
                <span>Size</span>
              </div>
              {orderBook.bids.slice(0, 3).map((b, i) => (
                <div key={i} className="flex justify-between text-slate-300">
                  <span className="text-emerald-400">${b.price.toFixed(2)}</span>
                  <span className="text-slate-400">{b.size}</span>
                </div>
              ))}
            </div>

            {/* Asks */}
            <div className="space-y-0.5">
              <div className="text-rose-400/80 flex justify-between border-b border-rose-900/30 pb-0.5">
                <span>Ask</span>
                <span>Size</span>
              </div>
              {orderBook.asks.slice(0, 3).map((a, i) => (
                <div key={i} className="flex justify-between text-slate-300">
                  <span className="text-rose-400">${a.price.toFixed(2)}</span>
                  <span className="text-slate-400">{a.size}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-2.5 rounded font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
            side === 'BUY'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>
            Submit Paper {side} Order ({shares} {shares === 1 ? 'Share' : 'Shares'})
          </span>
        </button>
      </form>
    </div>
  );
};
