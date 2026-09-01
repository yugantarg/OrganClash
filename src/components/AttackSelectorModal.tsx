import React from 'react';
import { Skull, Trophy, Swords, X, Shield, ArrowRight, Sparkles } from 'lucide-react';

interface AttackSelectorModalProps {
  onClose: () => void;
  onOpenRaids: () => void;
  onOpenPvP: () => void;
  pvpScore: number;
  completedRaidsCount: number;
}

export const AttackSelectorModal: React.FC<AttackSelectorModalProps> = ({
  onClose,
  onOpenRaids,
  onOpenPvP,
  pvpScore,
  completedRaidsCount,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border-4 border-slate-700 rounded-3xl shadow-[0_12px_0_#0f172a,0_20px_40px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        {/* Wooden Top Banner Header */}
        <div className="coc-wood-header py-3 px-6 flex items-center justify-between border-b-2 border-amber-950/60 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-700 border-2 border-yellow-200 flex items-center justify-center shadow-lg">
              <Swords className="w-6 h-6 text-white drop-shadow" />
            </div>
            <div>
              <h2 className="font-game text-2xl text-yellow-300 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                ATTACK MAP
              </h2>
              <p className="text-xs font-game text-amber-100/90 tracking-wide">
                Choose an Attack Strategy
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

        {/* 2 Big Clash of Clans Attack Option Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950">
          {/* Card 1: Historical Pathogens Campaign (Single Player) */}
          <div
            onClick={() => {
              onClose();
              onOpenRaids();
            }}
            className="relative group bg-gradient-to-b from-rose-950/90 to-slate-900 border-3 border-rose-600/80 hover:border-rose-400 p-6 rounded-3xl shadow-[0_8px_0_#4c0519,0_12px_24px_rgba(0,0,0,0.8)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-700 border-2 border-rose-300 flex items-center justify-center shadow-lg">
                  <Skull className="w-8 h-8 text-white drop-shadow" />
                </div>
                <div className="bg-rose-900/80 border border-rose-500 text-rose-200 px-3 py-1 rounded-full text-xs font-game">
                  CAMPAIGN ({completedRaidsCount}/4)
                </div>
              </div>

              <h3 className="font-game text-xl text-yellow-300 tracking-wide drop-shadow mb-1">
                HISTORICAL INVASIONS
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
                Deploy Macrophages, Neutrophils, and T-Cells on a real-time blood barrier to eradicate Black Death, 1918 Flu, and Cholera.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-rose-800/60">
              <span className="text-xs font-game text-amber-400">Earn Nutrients & Gems</span>
              <div className="coc-btn-yellow px-4 py-2 rounded-xl text-xs font-game flex items-center space-x-1">
                <span>FIGHT</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2: Classroom Contagion (Multiplayer PvP) */}
          <div
            onClick={() => {
              onClose();
              onOpenPvP();
            }}
            className="relative group bg-gradient-to-b from-indigo-950/90 to-slate-900 border-3 border-indigo-600/80 hover:border-indigo-400 p-6 rounded-3xl shadow-[0_8px_0_#1e1b4b,0_12px_24px_rgba(0,0,0,0.8)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-700 border-2 border-indigo-300 flex items-center justify-center shadow-lg">
                  <Trophy className="w-8 h-8 text-yellow-300 drop-shadow" />
                </div>
                <div className="bg-indigo-900/80 border border-indigo-500 text-indigo-200 px-3 py-1 rounded-full text-xs font-game flex items-center space-x-1">
                  <Trophy className="w-3 h-3 text-yellow-300" />
                  <span>{pvpScore} TROPHIES</span>
                </div>
              </div>

              <h3 className="font-game text-xl text-yellow-300 tracking-wide drop-shadow mb-1">
                CONTAGION ARENA
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
                Raid peer students' anatomical networks, loot metabolic nutrient reserves, and climb the School Physiology Leaderboard!
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-indigo-800/60">
              <span className="text-xs font-game text-indigo-300">Find a Match</span>
              <div className="coc-btn-purple px-4 py-2 rounded-xl text-xs font-game flex items-center space-x-1">
                <span>FIND MATCH</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
