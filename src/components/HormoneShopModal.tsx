import React from 'react';
import { Currencies, ActiveBoost } from '../types';
import {
  X,
  Flame,
  Zap,
  FastForward,
  Wind,
  Shield,
  Sparkles,
  Info,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface HormoneShopModalProps {
  currencies: Currencies;
  activeBoosts: ActiveBoost[];
  onClose: () => void;
  onActivateBoost: (type: 'ADRENALINE' | 'EPO_OXYGEN' | 'CORTISOL_SHIELD', cost: number, duration: number, mult: number) => void;
  onGrantBonusHormones: (amount: number) => void;
}

export const HormoneShopModal: React.FC<HormoneShopModalProps> = ({
  currencies,
  activeBoosts,
  onClose,
  onActivateBoost,
  onGrantBonusHormones,
}) => {
  const isAdrenalineActive = activeBoosts.some((b) => b.type === 'ADRENALINE');
  const isEpoActive = activeBoosts.some((b) => b.type === 'EPO_OXYGEN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-game text-slate-900 tracking-tight">Hormones & Catalysts</h3>
                <span className="px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 font-mono text-xs font-bold">
                  {currencies.hormones} Gems Available
                </span>
              </div>
              <p className="text-xs text-slate-500 font-game">
                Catalysts that bypass build timers, accelerate blood flow, and enhance organ efficiency.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar">
          {/* Active Hormonal Boosts Catalog */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Epinephrine / Adrenaline */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-game text-slate-900">Adrenaline Boost</h4>
                    <p className="text-[10px] font-mono text-slate-500">Adrenal Gland Surge</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-game">
                  Provides 3x Blood Flow speed, 3x Resource Harvesting, and accelerated immune response for 30 seconds.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono text-purple-700 font-bold">Cost: 1 Hormone</span>
                <button
                  onClick={() => onActivateBoost('ADRENALINE', 1, 30, 3.0)}
                  disabled={currencies.hormones < 1 || isAdrenalineActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-game transition cursor-pointer ${
                    isAdrenalineActive
                      ? 'bg-amber-500 text-white font-bold'
                      : currencies.hormones >= 1
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isAdrenalineActive ? 'ACTIVE' : 'SURGE (30s)'}
                </button>
              </div>
            </div>

            {/* Growth Hormone (GH) */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
                    <FastForward className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-game text-slate-900">Growth Hormone</h4>
                    <p className="text-[10px] font-mono text-slate-500">Instant Mitosis Mitogen</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-game">
                  Stimulates immediate tissue synthesis, instantly completing any ongoing organ upgrade timer.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono text-purple-700 font-bold">1 Hormone / Organ</span>
                <span className="text-[11px] font-game text-slate-400">Use on Organ Node</span>
              </div>
            </div>

            {/* Erythropoietin (EPO) */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-200">
                    <Wind className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-game text-slate-900">EPO Oxygen Surge</h4>
                    <p className="text-[10px] font-mono text-slate-500">Renal RBC Accelerator</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-game">
                  Boosts red blood cell delivery, maximizing oxygen output by +50% for 60 seconds.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono text-purple-700 font-bold">Cost: 1 Hormone</span>
                <button
                  onClick={() => onActivateBoost('EPO_OXYGEN', 1, 60, 1.5)}
                  disabled={currencies.hormones < 1 || isEpoActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-game transition cursor-pointer ${
                    isEpoActive
                      ? 'bg-cyan-600 text-white'
                      : currencies.hormones >= 1
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isEpoActive ? 'ACTIVE' : 'INFUSE (60s)'}
                </button>
              </div>
            </div>

            {/* Bonus Hormone Claim */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-game text-slate-900">Complimentary Grant</h4>
                    <p className="text-[10px] font-mono text-slate-500">Free Supply</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-game">
                  Claim complimentary hormone catalysts to experiment freely with biological upgrades!
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-600 font-bold">+5 Hormones</span>
                <button
                  onClick={() => {
                    onGrantBonusHormones(5);
                    soundEffects.playHormoneRush();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer transition font-game"
                >
                  CLAIM
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
