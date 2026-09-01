import React from 'react';
import { ImmuneCellType, ImmuneTroop, Currencies } from '../types';
import { IMMUNE_TROOPS_CATALOG } from '../data/organData';
import {
  X,
  Shield,
  Zap,
  Wind,
  Plus,
  Minus,
  Sparkles,
  Info,
  Swords,
  Crosshair,
  Skull,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface BoneMarrowBarracksModalProps {
  troops: Record<ImmuneCellType, ImmuneTroop>;
  currencies: Currencies;
  totalCapacity: number;
  onClose: () => void;
  onTrainTroop: (type: ImmuneCellType, amount: number) => void;
}

export const BoneMarrowBarracksModal: React.FC<BoneMarrowBarracksModalProps> = ({
  troops,
  currencies,
  totalCapacity,
  onClose,
  onTrainTroop,
}) => {
  const currentTotalCount: number = (Object.values(troops) as ImmuneTroop[]).reduce(
    (sum: number, t: ImmuneTroop) => sum + t.count,
    0
  );

  const getTroopIcon = (type: ImmuneCellType) => {
    switch (type) {
      case 'NEUTROPHIL':
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'MACROPHAGE':
        return <Shield className="w-4 h-4 text-emerald-600" />;
      case 'CD8_T_CELL':
        return <Crosshair className="w-4 h-4 text-rose-600" />;
      case 'B_CELL_PLASMA':
        return <Sparkles className="w-4 h-4 text-cyan-600" />;
      case 'NATURAL_KILLER':
        return <Skull className="w-4 h-4 text-purple-600" />;
      default:
        return <Shield className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-game text-slate-900 tracking-tight">Immune Defense Barracks</h3>
              <p className="text-xs text-slate-500 font-game">
                Synthesize and mature white blood cells for systemic defense against pathogens.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-game">
              <span className="text-slate-500">Army: </span>
              <span className={currentTotalCount >= totalCapacity ? 'text-rose-600 font-bold' : 'text-slate-800 font-bold'}>
                {currentTotalCount} / {totalCapacity}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Troops Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto custom-scrollbar font-game">
          {(Object.keys(IMMUNE_TROOPS_CATALOG) as ImmuneCellType[]).map((type) => {
            const troop = troops[type];
            const def = IMMUNE_TROOPS_CATALOG[type];
            const canAfford =
              currencies.nutrients >= def.cost.nutrients && currencies.oxygen >= def.cost.oxygen;
            const hasSpace = currentTotalCount < totalCapacity;

            return (
              <div
                key={type}
                className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                        {getTroopIcon(type)}
                      </div>
                      <div>
                        <div className="text-sm font-bold font-game text-slate-900">{def.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ATK: {def.attackPower} | HP: {def.hpPerUnit}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-xs">
                        {troop.count} Ready
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-game">{def.description}</p>

                  <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200 text-[11px] text-amber-900 font-game">
                    ⚡ {def.specialAbility}
                  </div>
                </div>

                {/* Training Actions & Cost */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className={currencies.nutrients >= def.cost.nutrients ? 'text-amber-800 font-bold' : 'text-rose-600'}>
                      {def.cost.nutrients} N
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={currencies.oxygen >= def.cost.oxygen ? 'text-cyan-800 font-bold' : 'text-rose-600'}>
                      {def.cost.oxygen} O2
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        onTrainTroop(type, 1);
                        soundEffects.playResourceChime();
                      }}
                      disabled={!canAfford || !hasSpace}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-game flex items-center space-x-1 transition ${
                        canAfford && hasSpace
                          ? 'game-btn-primary cursor-pointer shadow-xs'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Train +1</span>
                    </button>

                    <button
                      onClick={() => {
                        onTrainTroop(type, 5);
                        soundEffects.playResourceChime();
                      }}
                      disabled={currencies.nutrients < def.cost.nutrients * 5 || currencies.oxygen < def.cost.oxygen * 5 || currentTotalCount + 5 > totalCapacity}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-game flex items-center space-x-1 transition ${
                        currencies.nutrients >= def.cost.nutrients * 5 &&
                        currencies.oxygen >= def.cost.oxygen * 5 &&
                        currentTotalCount + 5 <= totalCapacity
                          ? 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs cursor-pointer'
                          : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                      }`}
                    >
                      <span>+5</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
