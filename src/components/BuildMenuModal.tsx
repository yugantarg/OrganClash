import React, { useState } from 'react';
import { OrganType, Currencies } from '../types';
import { ORGAN_DEFINITIONS, ALL_BODY_SYSTEMS } from '../data/organData';
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
  onClose: () => void;
  onSelectOrganToBuild: (type: OrganType) => void;
}

export const BuildMenuModal: React.FC<BuildMenuModalProps> = ({
  brainLevel,
  currencies,
  currentOrganCounts,
  onClose,
  onSelectOrganToBuild,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All 11 Systems' },
    { id: 'COMMAND', label: '🧠 Nervous' },
    { id: 'CARDIO', label: '❤️ Circulatory' },
    { id: 'METABOLIC', label: '🍎 Digestive & Resp.' },
    { id: 'EXCRETORY', label: '🚽 Excretory & Waste' },
    { id: 'BARRIER', label: '🦴 Skeletal & Skin' },
    { id: 'IMMUNE', label: '🛡️ Immune & Lymph' },
    { id: 'ENDOCRINE', label: '⚡ Endocrine Glands' },
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
              Select an organ to place onto your body base and connect with blood vessels.
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

            const canAfford =
              currencies.nutrients >= def.baseCost.nutrients &&
              currencies.oxygen >= def.baseCost.oxygen &&
              (!def.baseCost.water || currencies.water >= def.baseCost.water);

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

                  {/* Biological Yield Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {def.outputs.nutrientsPerSec && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-game text-amber-700">
                        +{def.outputs.nutrientsPerSec}/s Nutrients 🍏
                      </span>
                    )}
                    {def.outputs.oxygenPerSec && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-[10px] font-game text-cyan-700">
                        +{def.outputs.oxygenPerSec}/s Oxygen 💨
                      </span>
                    )}
                    {def.outputs.filtrationPerSec && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-game text-blue-700">
                        Filters Waste / Urine 🚽
                      </span>
                    )}
                    {def.outputs.waterPerSec && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-game text-blue-700">
                        +{def.outputs.waterPerSec}/s Hydration 💧
                      </span>
                    )}
                    {def.outputs.defenseArmor && (
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-[10px] font-game text-orange-700">
                        +{def.outputs.defenseArmor} Armor 🛡️
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Cost & Action */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[11px] font-game">
                    <span className={currencies.nutrients >= def.baseCost.nutrients ? 'text-amber-600 font-bold' : 'text-rose-500 font-bold'}>
                      {def.baseCost.nutrients} 🍏
                    </span>
                    <span>•</span>
                    <span className={currencies.oxygen >= def.baseCost.oxygen ? 'text-cyan-600 font-bold' : 'text-rose-500 font-bold'}>
                      {def.baseCost.oxygen} 💨
                    </span>
                    {def.baseCost.water && (
                      <>
                        <span>•</span>
                        <span className={currencies.water >= def.baseCost.water ? 'text-blue-600 font-bold' : 'text-rose-500 font-bold'}>
                          {def.baseCost.water} 💧
                        </span>
                      </>
                    )}
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
