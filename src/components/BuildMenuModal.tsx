import React, { useState } from 'react';
import { OrganType, Currencies } from '../types';
import { ORGAN_DEFINITIONS, ORGAN_ECONOMY } from '../data/organData';
import { PlacementInfo } from '../services/simulationEngine';
import { AnatomicalOrganView } from './AnatomicalOrganView';
import {
  X,
  Plus,
  Lock,
} from 'lucide-react';

interface BuildMenuModalProps {
  brainLevel: number;
  currencies: Currencies;
  currentOrganCounts: Record<OrganType, number>;
  getPlacement: (type: OrganType) => PlacementInfo;
  onClose: () => void;
  onSelectOrganToBuild: (type: OrganType) => void;
}

/** 45 → "45s", 3600 → "1h", 90000 → "1d 1h". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''}`;
  if (s < 86400) return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60) ? ` ${Math.floor((s % 3600) / 60)}m` : ''}`;
  return `${Math.floor(s / 86400)}d${Math.floor((s % 86400) / 3600) ? ` ${Math.floor((s % 86400) / 3600)}h` : ''}`;
}

export const BuildMenuModal: React.FC<BuildMenuModalProps> = ({
  brainLevel,
  currencies,
  currentOrganCounts,
  getPlacement,
  onClose,
  onSelectOrganToBuild,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All organs' },
    { id: 'BREATHING', label: '🫁 Breathing (oxygen)' },
    { id: 'DIGESTIVE', label: '🍎 Digestive (nutrients)' },
    { id: 'EXCRETORY', label: '🚽 Excretory (waste)' },
    { id: 'COMMAND', label: '🧠 Nervous' },
    { id: 'CARDIO', label: '❤️ Heart' },
    { id: 'SUPPORT', label: '🦴 Bones, muscles & skin' },
    { id: 'ENDOCRINE', label: '⚡ Glands' },
    { id: 'DEFENCE', label: '🛡️ Defence' },
  ];

  const organList = Object.values(ORGAN_DEFINITIONS).filter((def) => {
    if (def.type === 'BRAIN_CNS') return false; // Brain is the singleton Town Center already built at start
    if (selectedCategory === 'ALL') return true;
    return def.category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg sm:text-xl font-game text-slate-900 tracking-tight">Organ Build Tray</h3>
            <p className="text-xs text-slate-500 font-game">
              Every organ uses oxygen (O₂). Build and upgrade breathing to make room, then place organs and connect them to the heart.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-4 sm:px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center space-x-1.5 overflow-x-auto custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-game whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Organ Cards Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto custom-scrollbar">
          {organList.map((def) => {
            const currentCount = currentOrganCounts[def.type] || 0;
            const isMaxBuilt = currentCount >= def.maxPerBase;
            const isLocked = brainLevel < def.unlockedAtBrainLevel;

            const placement = getPlacement(def.type);
            const canAfford = placement.blocked === null;
            const blockLabel =
              placement.blocked && placement.blocked !== 'LOCKED' && placement.blocked !== 'MAX'
                ? placement.reason
                : null;
            const econ = ORGAN_ECONOMY[def.type];

            return (
              <div
                key={def.type}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isLocked
                    ? 'bg-slate-50/50 border-slate-200 opacity-60'
                    : isMaxBuilt
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-1 rounded-xl bg-slate-50 border border-slate-200 shadow-xs flex items-center justify-center">
                        <AnatomicalOrganView type={def.type} size={48} />
                      </div>
                      <div>
                        <div className="text-sm font-game text-slate-900">{def.name}</div>
                        <div className="text-[10px] text-slate-500 font-game">{def.systemName}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-game px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                        {currentCount}/{def.maxPerBase} Built
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-game">{def.description}</p>

                  {/* What it does in the game */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-game text-slate-700">
                      {econ.jobs}
                    </span>
                    {placement.oxygenAdded > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-[10px] font-game text-cyan-700">
                        +{placement.oxygenAdded.toLocaleString()} O₂ supply
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[10px] font-game text-sky-700">
                        Uses {placement.oxygenNeeded.toLocaleString()} O₂
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Cost & Action */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col text-[11px] font-game">
                    <div className="flex items-center space-x-2">
                      <span className={currencies.nutrients >= placement.cost ? 'text-amber-600 font-bold' : 'text-rose-500 font-bold'}>
                        {placement.cost.toLocaleString()} 🍏
                      </span>
                      <span className="text-slate-400">· {formatDuration(placement.seconds)}</span>
                    </div>
                    {blockLabel && <span className="text-[10px] text-rose-500">{blockLabel}</span>}
                  </div>

                  {isLocked ? (
                    <span className="text-[11px] font-game text-purple-700 flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Requires Brain Lvl {def.unlockedAtBrainLevel}</span>
                    </span>
                  ) : isMaxBuilt ? (
                    <span className="text-[11px] font-game text-slate-400">Max Reached</span>
                  ) : (
                    <button
                      onClick={() => onSelectOrganToBuild(def.type)}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 rounded-xl text-xs font-game flex items-center space-x-1 transition ${
                        canAfford
                          ? 'game-btn-primary cursor-pointer shadow-xs'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Place Organ</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
