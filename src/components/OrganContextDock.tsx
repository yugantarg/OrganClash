import React, { useState } from 'react';
import { OrganNode, VesselType, Currencies } from '../types';
import { ORGAN_DEFINITIONS } from '../data/organData';
import { getUpgradeCost, hormoneCostToFinish } from '../services/simulationEngine';
import {
  Info,
  ChevronUp,
  Gem,
  Wrench,
  Activity,
  Droplets,
  Shield,
  Trash2,
  X,
} from 'lucide-react';

interface OrganContextDockProps {
  organ: OrganNode;
  brainLevel: number;
  currencies: Currencies;
  onClose: () => void;
  onOpenInspector: () => void;
  onUpgrade: (id: string) => void;
  onInstantUpgrade: (id: string) => void;
  onRepair: (id: string) => void;
  onDelete: (id: string) => void;
  onStartVesselConnect: (organId: string, type: VesselType) => void;
}

export const OrganContextDock: React.FC<OrganContextDockProps> = ({
  organ,
  brainLevel,
  currencies,
  onClose,
  onOpenInspector,
  onUpgrade,
  onInstantUpgrade,
  onRepair,
  onDelete,
  onStartVesselConnect,
}) => {
  const [showVesselMenu, setShowVesselMenu] = useState(false);
  const def = ORGAN_DEFINITIONS[organ.type];

  const isUpgrading = organ.status === 'UNDER_UPGRADE';
  // TOXIC_NECROSIS is now a reversible "stalled by waste" state (no HP loss),
  // not destruction — the fix is to flush waste, not to repair.
  const isDestroyed = organ.status === 'DAMAGED_DESTROYED';
  const isDamaged = organ.hp < organ.maxHp;

  // Upgrade calculations — single source of truth (cross-resource coupling).
  const nextLevel = organ.level + 1;
  const { nutrients: costNutrients, oxygen: costOxygen } = getUpgradeCost(organ.type, organ.level);
  const reqBrainLvl = Math.ceil(nextLevel / 2);
  const canAffordUpgrade =
    currencies.nutrients >= costNutrients && currencies.oxygen >= costOxygen;
  // Show only the resource(s) actually charged (cross-resource = one side is 0).
  const costLabel = [
    costNutrients > 0 ? `${costNutrients} N` : null,
    costOxygen > 0 ? `${costOxygen} O2` : null,
  ]
    .filter(Boolean)
    .join(' + ');
  const meetsBrainReq = organ.type === 'BRAIN_CNS' || brainLevel >= reqBrainLvl;
  const isMaxLevel = organ.level >= organ.maxLevel;

  // Countdown seconds left if upgrading
  const secondsRemaining =
    isUpgrading && organ.upgradeEndTime
      ? Math.max(0, Math.ceil((organ.upgradeEndTime - Date.now()) / 1000))
      : 0;
  // Instant-finish price scales with the remaining time (CoC gem model).
  const finishHormones = hormoneCostToFinish(secondsRemaining);
  const canAffordFinish = currencies.hormones >= finishHormones;

  return (
    <div className="absolute bottom-16 sm:bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-auto select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Vessel Submenu if opened */}
      {showVesselMenu && (
        <div className="mb-2 bg-white border border-slate-200 p-2 rounded-2xl shadow-xl flex items-center space-x-2 animate-in fade-in zoom-in-95">
          <span className="text-xs font-game text-slate-700 px-2">Vessel Highway:</span>
          <button
            onClick={() => {
              onStartVesselConnect(organ.id, 'ARTERY');
              setShowVesselMenu(false);
            }}
            className="game-btn-rose px-3 py-1.5 rounded-xl text-xs font-game flex items-center space-x-1 cursor-pointer"
            title="Arterial Blood Line (Nutrients + O2 Delivery)"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>+ Artery</span>
          </button>
          <button
            onClick={() => {
              onStartVesselConnect(organ.id, 'VEIN');
              setShowVesselMenu(false);
            }}
            className="game-btn-cyan px-3 py-1.5 rounded-xl text-xs font-game flex items-center space-x-1 cursor-pointer"
            title="Venous Return Line (CO2 + Waste Removal)"
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>+ Vein</span>
          </button>
          <button
            onClick={() => {
              onStartVesselConnect(organ.id, 'LYMPHATIC');
              setShowVesselMenu(false);
            }}
            className="game-btn-emerald px-3 py-1.5 rounded-xl text-xs font-game flex items-center space-x-1 cursor-pointer"
            title="Lymphatic Conduit (Immune Patrol)"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>+ Lymph</span>
          </button>
          <button
            onClick={() => setShowVesselMenu(false)}
            className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Context Dock Bar */}
      <div className="bg-white border border-slate-200 shadow-xl px-3 sm:px-4 py-2 rounded-2xl flex items-center space-x-3">
        {/* Organ Badge & Info */}
        <div className="flex items-center space-x-2.5 pr-3 border-r border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center">
            <span className="font-game text-slate-800 text-base">{organ.level}</span>
          </div>
          <div>
            <div className="font-game text-sm text-slate-900 tracking-tight truncate max-w-[130px]">
              {organ.name}
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1">
              <span>HP {organ.hp}/{organ.maxHp}</span>
              <span className="text-emerald-600 font-bold">({Math.round(organ.bloodFlowEfficiency * 100)}% flow)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* INFO Button */}
          <button
            onClick={onOpenInspector}
            className="flex flex-col items-center justify-center px-3 py-1.5 game-btn-cyan rounded-xl cursor-pointer"
            title="View Organ Physiological Specs & Deep Insights"
          >
            <Info className="w-4 h-4" />
            <span className="text-[10px] font-game mt-0.5">INFO</span>
          </button>

          {/* UPGRADE / SPEED UP Button */}
          {isUpgrading ? (
            <button
              onClick={() => onInstantUpgrade(organ.id)}
              disabled={!canAffordFinish}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl ${
                canAffordFinish ? 'game-btn-purple cursor-pointer' : 'game-btn-slate opacity-50 cursor-not-allowed'
              }`}
              title={`Finish Mitosis Instantly (${finishHormones} Hormone${finishHormones > 1 ? 's' : ''}, ${secondsRemaining}s left)`}
            >
              <Gem className="w-4 h-4 text-yellow-200" />
              <span className="text-[10px] font-game leading-tight">FINISH · {finishHormones}◆</span>
            </button>
          ) : isMaxLevel ? (
            <div className="flex flex-col items-center justify-center px-3 py-1.5 game-btn-slate opacity-75 rounded-xl">
              <ChevronUp className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-game text-slate-600">MAX</span>
            </div>
          ) : (
            <button
              onClick={() => {
                if (canAffordUpgrade && meetsBrainReq) {
                  onUpgrade(organ.id);
                }
              }}
              disabled={!canAffordUpgrade || !meetsBrainReq}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl cursor-pointer transition ${
                canAffordUpgrade && meetsBrainReq
                  ? 'game-btn-primary'
                  : 'game-btn-slate opacity-50 cursor-not-allowed'
              }`}
              title={
                !meetsBrainReq
                  ? `Requires Brain HQ Level ${reqBrainLvl}`
                  : `Upgrade to Lvl ${nextLevel} (${costLabel})`
              }
            >
              <ChevronUp className="w-4 h-4" />
              <span className="text-[10px] font-game leading-none">EVOLVE</span>
              <span className="text-[9px] font-mono opacity-90 mt-0.5">{costLabel}</span>
            </button>
          )}

          {/* REPAIR Button if Damaged or Necrotic */}
          {(isDamaged || isDestroyed) && (
            <button
              onClick={() => onRepair(organ.id)}
              className="flex flex-col items-center justify-center px-3 py-1.5 game-btn-rose rounded-xl cursor-pointer"
              title="Enzymatic Rebuilding Protocol"
            >
              <Wrench className="w-4 h-4" />
              <span className="text-[10px] font-game">REPAIR</span>
            </button>
          )}

          {/* CONNECT VESSEL Button */}
          <button
            onClick={() => setShowVesselMenu(!showVesselMenu)}
            className="flex flex-col items-center justify-center px-3 py-1.5 game-btn-emerald rounded-xl cursor-pointer"
            title="Connect Arteries, Veins, or Lymphatic Conduits"
          >
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-game mt-0.5">VESSEL</span>
          </button>

          {/* DISMANTLE Button */}
          {organ.type !== 'HEART_CARDIO' && organ.type !== 'BRAIN_CNS' && (
            <button
              onClick={() => onDelete(organ.id)}
              className="flex flex-col items-center justify-center px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl cursor-pointer text-rose-700 transition"
              title="Dismantle organ and reclaim nutrients"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-game mt-0.5">SELL</span>
            </button>
          )}

          {/* DESELECT Close Button */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer"
            title="Deselect Organ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
