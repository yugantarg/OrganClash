import React from 'react';
import { Currencies } from '../types';
import { X, Gem, Zap, Hammer } from 'lucide-react';

interface HormoneShopModalProps {
  currencies: Currencies;
  /** Collectors that can be boosted right now, and what boosting them all costs. */
  boostQuote: { cost: number; count: number };
  /** Collectors whose boost is currently running. */
  boostedCount: number;
  onBoostAll: () => void;
  nextBuilderCost: number | null;
  onBuyBuilder: () => void;
  onClose: () => void;
}

export const HormoneShopModal: React.FC<HormoneShopModalProps> = ({
  currencies,
  boostQuote,
  boostedCount,
  onBoostAll,
  nextBuilderCost,
  onBuyBuilder,
  onClose,
}) => {
  const canBoost = boostQuote.count > 0 && currencies.hormones >= boostQuote.cost;
  const canBuyBuilder = nextBuilderCost !== null && currencies.hormones >= nextBuilderCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-600">
              <Gem className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-game text-slate-900 tracking-tight">Hormone Shop</h3>
              <p className="text-xs text-slate-500 font-game">
                {currencies.hormones.toLocaleString()} hormones available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {/* Collector boost */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="font-game text-sm text-slate-900">Production boost</span>
              {boostedCount > 0 && (
                <span className="ml-auto text-[10px] font-mono text-amber-700">
                  {boostedCount} running
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 font-game leading-relaxed">
              Doubles a producer's output for 24 hours. Only producers at level 5 or
              higher can be boosted, and a stronger producer costs more (4 to 10
              hormones each). More output also means more waste.
            </p>
            <button
              onClick={onBoostAll}
              disabled={!canBoost}
              className={`w-full py-2 rounded-lg font-bold text-xs transition ${
                canBoost
                  ? 'bg-amber-500 hover:bg-amber-400 text-white cursor-pointer shadow-xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              {boostQuote.count === 0
                ? boostedCount > 0
                  ? 'ALL ELIGIBLE PRODUCERS ARE BOOSTED'
                  : 'NO PRODUCER AT LEVEL 5 YET'
                : `BOOST ${boostQuote.count} PRODUCER${boostQuote.count > 1 ? 'S' : ''} — ${boostQuote.cost} HORMONES`}
            </button>
          </div>

          {/* Builder */}
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 space-y-2">
            <div className="flex items-center space-x-2">
              <Hammer className="w-4 h-4 text-sky-600" />
              <span className="font-game text-sm text-slate-900">Extra builder</span>
            </div>
            <p className="text-xs text-slate-600 font-game leading-relaxed">
              Each builder runs one build or upgrade at a time. A permanent extra
              builder is the most valuable thing hormones can buy.
            </p>
            <button
              onClick={onBuyBuilder}
              disabled={!canBuyBuilder}
              className={`w-full py-2 rounded-lg font-bold text-xs transition ${
                canBuyBuilder
                  ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              {nextBuilderCost === null
                ? 'ALL BUILDERS OWNED'
                : `HIRE A BUILDER — ${nextBuilderCost.toLocaleString()} HORMONES`}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 font-game leading-relaxed">
            Hormones come from clearing deposits, the hormone crystal, achievements
            and your glands. They can also finish any build instantly from the
            organ's own panel.
          </p>
        </div>
      </div>
    </div>
  );
};
