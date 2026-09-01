import React, { useState } from 'react';
import { ImmuneCellType, ImmuneTroop, Currencies } from '../types';
import { Swords, Skull, Trophy, Shield, X, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { RaidCombatModal } from './RaidCombatModal';
import { PvPContagionModal } from './PvPContagionModal';

interface BattleHubModalProps {
  troops: Record<ImmuneCellType, ImmuneTroop>;
  completedRaidIds: string[];
  currencies: Currencies;
  playerRating: number;
  onClose: () => void;
  onVictoryRaid: (pathogen: any) => void;
  onDefeatRaid: () => void;
  onWinPvP: (ratingGain: number, lootNutrients: number, lootHormones: number) => void;
}

export const BattleHubModal: React.FC<BattleHubModalProps> = ({
  troops,
  completedRaidIds,
  currencies,
  playerRating,
  onClose,
  onVictoryRaid,
  onDefeatRaid,
  onWinPvP,
}) => {
  const [activeTab, setActiveTab] = useState<'CAMPAIGN' | 'MULTIPLAYER'>('CAMPAIGN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900 border-4 border-slate-700 rounded-3xl shadow-[0_10px_0_#0f172a,0_20px_40px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        {/* Wooden Top Banner Header */}
        <div className="coc-wood-header py-3 px-6 flex items-center justify-between border-b-2 border-amber-950/60 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-700 border-2 border-yellow-200 flex items-center justify-center shadow-lg">
              <Swords className="w-6 h-6 text-white drop-shadow" />
            </div>
            <div>
              <h2 className="font-game text-2xl text-yellow-300 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                BATTLE THEATER
              </h2>
              <p className="text-xs font-game text-amber-100/90 tracking-wide">
                Deploy Immune WBC Legions against Pathogenic Threats
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-rose-600 hover:bg-rose-500 border-2 border-yellow-300 text-white flex items-center justify-center font-bold text-lg cursor-pointer shadow-lg transition active:translate-y-0.5"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950 px-6 pt-3 space-x-3 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('CAMPAIGN')}
            className={`px-6 py-2.5 rounded-t-2xl font-game text-sm flex items-center space-x-2 transition cursor-pointer border-t-2 border-x-2 ${
              activeTab === 'CAMPAIGN'
                ? 'bg-slate-900 text-amber-300 border-amber-500 shadow-md'
                : 'bg-slate-950/60 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Skull className="w-4 h-4 text-rose-400" />
            <span>HISTORICAL INVASIONS (PvE)</span>
          </button>

          <button
            onClick={() => setActiveTab('MULTIPLAYER')}
            className={`px-6 py-2.5 rounded-t-2xl font-game text-sm flex items-center space-x-2 transition cursor-pointer border-t-2 border-x-2 ${
              activeTab === 'MULTIPLAYER'
                ? 'bg-slate-900 text-amber-300 border-amber-500 shadow-md'
                : 'bg-slate-950/60 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>CONTAGION ARENA (PvP)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'CAMPAIGN' ? (
            <RaidCombatModal
              troops={troops}
              completedRaidIds={completedRaidIds}
              currencies={currencies}
              onClose={onClose}
              onVictory={(pathogen) => onVictoryRaid(pathogen)}
              onDefeat={onDefeatRaid}
            />
          ) : (
            <PvPContagionModal
              playerRating={playerRating}
              currencies={currencies}
              troops={troops}
              onClose={onClose}
              onWinPvP={onWinPvP}
            />
          )}
        </div>
      </div>
    </div>
  );
};
