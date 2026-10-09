import React from 'react';
import { VesselConnection, Currencies } from '../types';
import { X, ChevronUp, Trash2, Activity } from 'lucide-react';

interface Props {
  vessel: VesselConnection;
  length: number;
  efficiencyNow: number;
  efficiencyNext: number | null;
  upgradeCost: { nutrients: number; oxygen: number } | null;
  maxLevel: number;
  currencies: Currencies;
  onUpgrade: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  ARTERY: 'Artery — carries supply out from the heart',
  VEIN: 'Vein — carries waste back to the kidneys',
  LYMPHATIC: 'Lymphatic — drains interstitial load',
  NERVE: 'Nerve — signalling',
};

const TYPE_DOT: Record<string, string> = {
  ARTERY: 'bg-rose-500',
  VEIN: 'bg-blue-500',
  LYMPHATIC: 'bg-emerald-500',
  NERVE: 'bg-amber-500',
};

export const VesselDock: React.FC<Props> = ({
  vessel,
  length,
  efficiencyNow,
  efficiencyNext,
  upgradeCost,
  maxLevel,
  currencies,
  onUpgrade,
  onRemove,
  onClose,
}) => {
  const isMax = (vessel.level || 1) >= maxLevel;
  const canAfford =
    !!upgradeCost &&
    currencies.nutrients >= upgradeCost.nutrients &&
    currencies.oxygen >= upgradeCost.oxygen;

  return (
    <div className="absolute bottom-16 sm:bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-white border border-slate-200 shadow-xl px-3 sm:px-4 py-2 rounded-2xl flex items-center space-x-3">
        {/* Identity */}
        <div className="flex items-center space-x-2.5 pr-3 border-r border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center">
            <span className="font-game text-slate-800 text-base">{vessel.level || 1}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${TYPE_DOT[vessel.type] || 'bg-slate-400'}`} />
              <span className="font-game text-sm text-slate-900 tracking-tight">
                {vessel.type.charAt(0) + vessel.type.slice(1).toLowerCase()}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {Math.round(length)}px · throughput{' '}
              <span
                className={
                  efficiencyNow >= 0.85
                    ? 'text-emerald-600 font-bold'
                    : efficiencyNow >= 0.6
                      ? 'text-amber-600 font-bold'
                      : 'text-rose-600 font-bold'
                }
              >
                {Math.round(efficiencyNow * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Upgrade */}
        {isMax ? (
          <div className="flex flex-col items-center justify-center px-3 py-1.5 game-btn-slate opacity-75 rounded-xl">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-game text-slate-600">MAX</span>
          </div>
        ) : (
          <button
            onClick={() => canAfford && onUpgrade(vessel.id)}
            disabled={!canAfford}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition ${
              canAfford ? 'game-btn-primary cursor-pointer' : 'game-btn-slate opacity-50 cursor-not-allowed'
            }`}
            title={
              upgradeCost
                ? `Widen to level ${(vessel.level || 1) + 1} — throughput ${Math.round(
                    efficiencyNow * 100
                  )}% → ${Math.round((efficiencyNext ?? efficiencyNow) * 100)}% (${
                    upgradeCost.nutrients
                  } N + ${upgradeCost.oxygen} O2)`
                : ''
            }
          >
            <ChevronUp className="w-4 h-4" />
            <span className="text-[10px] font-game leading-none">WIDEN</span>
            <span className="text-[9px] font-mono opacity-90 mt-0.5">
              {upgradeCost?.nutrients}N + {upgradeCost?.oxygen}O
            </span>
          </button>
        )}

        {/* Gain preview */}
        {!isMax && efficiencyNext !== null && (
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[9px] font-game text-slate-500 uppercase">After</div>
            <div className="text-xs font-mono font-bold text-emerald-600">
              {Math.round(efficiencyNext * 100)}%
            </div>
          </div>
        )}

        {/* Remove */}
        <button
          onClick={() => onRemove(vessel.id)}
          className="flex flex-col items-center justify-center px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl cursor-pointer text-rose-700 transition"
          title="Remove this vessel"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="text-[9px] font-game mt-0.5">CUT</span>
        </button>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-1.5 text-center text-[10px] font-game text-slate-500 max-w-xs mx-auto leading-relaxed">
        {TYPE_LABEL[vessel.type]}. Shorter runs carry more; widening relieves the
        distance penalty on a long trunk line.
      </p>
    </div>
  );
};
