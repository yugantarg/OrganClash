import React from 'react';
import { OrganNode, Currencies } from '../types';
import { ORGAN_DEFINITIONS } from '../data/organData';
import { getUpgradeCost, hormoneCostToFinish } from '../services/simulationEngine';
import { AnatomicalOrganView } from './AnatomicalOrganView';
import {
  X,
  ChevronUp,
  Wrench,
  AlertTriangle,
  BookOpen,
  FastForward,
} from 'lucide-react';

interface OrganInspectorModalProps {
  organ: OrganNode | null;
  brainLevel: number;
  currencies: Currencies;
  onClose: () => void;
  onUpgrade: (id: string) => void;
  onInstantUpgrade: (id: string) => void;
  onRepair: (id: string) => void;
  onDelete: (id: string) => void;
}

export const OrganInspectorModal: React.FC<OrganInspectorModalProps> = ({
  organ,
  brainLevel,
  currencies,
  onClose,
  onUpgrade,
  onInstantUpgrade,
  onRepair,
  onDelete,
}) => {
  if (!organ) return null;

  const def = ORGAN_DEFINITIONS[organ.type];
  const isMaxLevel = organ.level >= organ.maxLevel;
  const isUpgrading = organ.status === 'UNDER_UPGRADE';
  const isDestroyed = organ.status === 'DAMAGED_DESTROYED';
  const isNecrotic = organ.status === 'TOXIC_NECROSIS';

  // Upgrade costs — single source of truth (cross-resource coupling lives here).
  const { nutrients: nextCostNutrients, oxygen: nextCostOxygen } = getUpgradeCost(
    organ.type,
    organ.level
  );
  const canAffordUpgrade =
    currencies.nutrients >= nextCostNutrients && currencies.oxygen >= nextCostOxygen;

  const canAffordRepair =
    currencies.nutrients >= organ.repairCost.nutrients && currencies.oxygen >= organ.repairCost.oxygen;

  const isBrainCapped = organ.type !== 'BRAIN_CNS' && organ.level >= brainLevel + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3.5">
            <div className="p-1 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center">
              <AnatomicalOrganView
                type={organ.type}
                level={organ.level}
                isDestroyed={isDestroyed}
                isNecrotic={isNecrotic}
                isUpgrading={organ.status === 'UNDER_UPGRADE'}
                size={54}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-game text-slate-900 tracking-tight">{organ.name}</h3>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-100 border border-slate-200 text-slate-700">
                  Lvl {organ.level}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-game">{def.systemName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Critical Warnings */}
          {isDestroyed && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>ORGAN DESTROYED — OUTPUT OFFLINE</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed font-game">
                This organ was destroyed and has stopped functioning. Repair it to bring output back online.
              </p>
              <button
                onClick={() => onRepair(organ.id)}
                disabled={!canAffordRepair}
                className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition ${
                  canAffordRepair
                    ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>
                  REPAIR FOR {organ.repairCost.nutrients} NUTRIENTS + {organ.repairCost.oxygen} OXYGEN
                </span>
              </button>
            </div>
          )}

          {/* Waste-stall warning (reversible — flush, don't repair) */}
          {isNecrotic && !isDestroyed && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>PRODUCTION THROTTLED — BLOOD WASTE TOO HIGH</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed font-game">
                Nothing is damaged. Blood urea has exceeded your kidneys' + bladder's capacity, so
                output is throttled (down to 10%). Flush urine and excretion — or build/level
                excretory organs — and this organ recovers on its own with zero lost progress.
              </p>
            </div>
          )}

          {/* Vitals & Capacity Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-game">Organ Health</div>
              <div className="text-sm font-bold font-mono text-slate-800">
                {organ.hp} / {organ.maxHp}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-game">Blood Flow</div>
              <div className="text-sm font-bold font-mono text-emerald-600">
                {Math.round(organ.bloodFlowEfficiency * 100)}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-game">Oxygen Level</div>
              <div className="text-sm font-bold font-mono text-sky-600">
                {Math.round(organ.oxygenSaturation * 100)}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-game">Waste Output</div>
              <div className="text-sm font-bold font-mono text-purple-600">
                +{def.metabolicWastePerSec.toFixed(1)}/s
              </div>
            </div>
          </div>

          {/* Educational Function Breakdown */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-700 uppercase font-game">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Function & Learning Points</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-game">{def.description}</p>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 font-game">
              💡 {def.biologicalFunction}
            </div>
          </div>

          {/* Upgrade Section */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-game text-slate-800 uppercase">Organ Upgrade</span>
              <span className="text-xs text-slate-500 font-mono">
                {isMaxLevel ? 'MAX LEVEL' : `Next: Level ${organ.level + 1}`}
              </span>
            </div>

            {isUpgrading ? (
              (() => {
                const remainingSec = organ.upgradeEndTime
                  ? Math.max(0, Math.ceil((organ.upgradeEndTime - Date.now()) / 1000))
                  : 0;
                const finishHormones = hormoneCostToFinish(remainingSec);
                const canAffordFinish = currencies.hormones >= finishHormones;
                return (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-game text-purple-900">
                      <span>Growth in progress...</span>
                      <span className="font-mono">{remainingSec}s left</span>
                    </div>
                    <button
                      onClick={() => onInstantUpgrade(organ.id)}
                      disabled={!canAffordFinish}
                      className={`w-full py-2 rounded-lg text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xs ${
                        canAffordFinish
                          ? 'bg-purple-600 hover:bg-purple-500 cursor-pointer'
                          : 'bg-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <FastForward className="w-4 h-4" />
                      <span>
                        INSTANT FINISH ({finishHormones} HORMONE{finishHormones > 1 ? 'S' : ''})
                      </span>
                    </button>
                  </div>
                );
              })()
            ) : isMaxLevel ? (
              <div className="text-center py-2 text-xs text-emerald-600 font-game font-bold">
                Organ is at maximum development level.
              </div>
            ) : isBrainCapped ? (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-game text-center">
                Upgrade Brain (Command HQ) to Level {organ.level} to unlock this upgrade!
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-game text-slate-600">
                  <span>Upgrade Cost:</span>
                  <div className="flex items-center space-x-3">
                    {nextCostNutrients > 0 && (
                      <span className={currencies.nutrients >= nextCostNutrients ? 'text-emerald-700 font-bold' : 'text-rose-600'}>
                        {nextCostNutrients} Nutrients
                      </span>
                    )}
                    {nextCostOxygen > 0 && (
                      <span className={currencies.oxygen >= nextCostOxygen ? 'text-sky-700 font-bold' : 'text-rose-600'}>
                        {nextCostOxygen} Oxygen
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onUpgrade(organ.id)}
                  disabled={!canAffordUpgrade}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
                    canAffordUpgrade
                      ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  }`}
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>UPGRADE ORGAN</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          {organ.type !== 'BRAIN_CNS' && organ.type !== 'HEART_CARDIO' ? (
            <button
              onClick={() => onDelete(organ.id)}
              className="text-xs text-rose-600 hover:text-rose-700 font-game cursor-pointer transition"
            >
              Remove Organ
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-game">Core vital organ cannot be removed.</span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
