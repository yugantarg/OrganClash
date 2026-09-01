import React from 'react';
import { PlayerVitals, Currencies, ActiveBoost } from '../types';
import {
  Zap,
  Wind,
  Sparkles,
  Volume2,
  VolumeX,
  GraduationCap,
  Shield,
  Layers,
  Sparkle,
  Droplets,
  Hammer,
} from 'lucide-react';

interface VitalsHUDProps {
  vitals: PlayerVitals;
  currencies: Currencies;
  activeBoosts: ActiveBoost[];
  brainLevel: number;
  activeUpgradesCount: number;
  totalBuilderCapacity: number;
  pvpScore: number;
  playerName: string;
  isMuted: boolean;
  bodyCompletionPercent: number;
  completedSystemsCount: number;
  totalSystemsCount: number;
  hasUncollectedResources: boolean;
  onToggleMute: () => void;
  onOpenTeacherLms: () => void;
  onOpenBodySystems: () => void;
  onOpenHormones: () => void;
  onOpenTutorial: () => void;
  onCollectAll: () => void;
  onUrinateAll: () => void;
  onExcreteAll: () => void;
}

export const VitalsHUD: React.FC<VitalsHUDProps> = ({
  vitals,
  currencies,
  activeBoosts,
  brainLevel,
  activeUpgradesCount,
  totalBuilderCapacity,
  isMuted,
  bodyCompletionPercent,
  completedSystemsCount,
  totalSystemsCount,
  hasUncollectedResources,
  onToggleMute,
  onOpenTeacherLms,
  onOpenBodySystems,
  onOpenHormones,
  onCollectAll,
}) => {
  const isBunDanger = vitals.toxicityBun > 50;

  const nutrientPct = Math.min(100, Math.round((currencies.nutrients / currencies.maxNutrients) * 100));
  const oxygenPct = Math.min(100, Math.round((currencies.oxygen / currencies.maxOxygen) * 100));

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-3 py-2 sm:px-4 sm:py-2.5 pointer-events-none select-none">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* LEFT: Town Center HQ, Level Star & Systems Progress */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Level Shield */}
          <button
            onClick={onOpenBodySystems}
            className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition cursor-pointer"
            title="Brain HQ Level - Click to view 11 Body Systems Progress"
          >
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-mono text-slate-400 -mb-0.5">HQ</span>
              <span className="font-game text-slate-900 text-sm sm:text-base leading-tight group-hover:scale-105 transition">
                {brainLevel}
              </span>
            </div>
          </button>

          {/* System & Homeostasis Badges */}
          <div className="flex flex-col space-y-0.5">
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <button
                onClick={onOpenBodySystems}
                className="bg-white hover:bg-slate-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-1.5 cursor-pointer transition text-slate-700"
                title="View All 11 Organ Systems Checklist"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-game text-xs hidden xs:inline">Systems</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[10px] font-mono font-bold">
                  {completedSystemsCount}/{totalSystemsCount} ({bodyCompletionPercent}%)
                </span>
              </button>

              <button
                onClick={onToggleMute}
                className="p-1 sm:p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition shadow-xs cursor-pointer"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <button
                onClick={onOpenTeacherLms}
                className="p-1 sm:p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-amber-600 hover:text-amber-700 transition shadow-xs cursor-pointer"
                title="Teacher LMS & Learning Assessment"
              >
                <GraduationCap className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Physiological Equilibrium Pill */}
            <div className="flex items-center space-x-2 text-[10px] sm:text-[11px] font-mono text-slate-500">
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span className="text-slate-800 font-bold">{vitals.homeostasisScore}%</span>
                <span>Vitality</span>
              </div>
              <span>•</span>
              <div className={`flex items-center space-x-1 ${isBunDanger ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                <Droplets className="w-3 h-3" />
                <span>Waste {vitals.toxicityBun}%</span>
                {isBunDanger && <span className="text-[9px] px-1 rounded bg-rose-50 border border-rose-200 text-rose-700 font-bold">HIGH</span>}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: Mitosis Builders & Quick Action */}
        <div className="hidden md:flex items-center space-x-2 pointer-events-auto">
          <div className="bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-2">
            <Hammer className="w-3.5 h-3.5 text-slate-700" />
            <span className="font-game text-xs text-slate-700">
              {activeUpgradesCount}/{totalBuilderCapacity} Builders
            </span>
          </div>

          {hasUncollectedResources && (
            <button
              onClick={onCollectAll}
              className="px-3 py-1 rounded-xl game-btn-primary font-game text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Collect all organ products in one tap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Collect Harvest</span>
            </button>
          )}
        </div>

        {/* RIGHT: Clean Resource Banks (Nutrients, Oxygen, Hormones) */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 pointer-events-auto">
          {/* Nutrients Bar */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-xs space-x-1.5 sm:space-x-2">
            <div className="w-5 h-5 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Zap className="w-3.5 h-3.5 fill-amber-500/30" />
            </div>
            <div className="flex flex-col">
              <div className="font-mono text-xs font-bold text-slate-800 leading-tight">
                {currencies.nutrients}
                <span className="text-[10px] text-slate-400 font-normal">/{currencies.maxNutrients}</span>
              </div>
              <div className="w-12 sm:w-16 h-1 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${nutrientPct}%` }} />
              </div>
            </div>
          </div>

          {/* Oxygen Bar */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-xs space-x-1.5 sm:space-x-2">
            <div className="w-5 h-5 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
              <Wind className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <div className="font-mono text-xs font-bold text-slate-800 leading-tight">
                {currencies.oxygen}
                <span className="text-[10px] text-slate-400 font-normal">/{currencies.maxOxygen}</span>
              </div>
              <div className="w-12 sm:w-16 h-1 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${oxygenPct}%` }} />
              </div>
            </div>
          </div>

          {/* Hormones (Gems) */}
          <button
            onClick={onOpenHormones}
            className="flex items-center bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl px-2.5 py-1.5 shadow-xs space-x-1.5 cursor-pointer transition text-purple-700"
            title="Endocrine Gland Vault (Hormone Gems)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
            <span className="font-mono text-xs font-bold text-purple-800">{currencies.hormones}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
