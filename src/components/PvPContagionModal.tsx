import React, { useState } from 'react';
import { StudentProfile, Currencies, ImmuneTroop, ImmuneCellType } from '../types';
import { CLASSMATE_PEERS } from '../data/pathogenData';
import {
  X,
  Radio,
  Swords,
  Shield,
  Zap,
  Trophy,
  Users,
  Flame,
  Award,
  CheckCircle,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import confetti from 'canvas-confetti';

interface PvPContagionModalProps {
  playerRating: number;
  currencies: Currencies;
  troops: Record<ImmuneCellType, ImmuneTroop>;
  onClose: () => void;
  onWinPvP: (ratingGain: number, lootNutrients: number, lootHormones: number) => void;
}

export const PvPContagionModal: React.FC<PvPContagionModalProps> = ({
  playerRating,
  currencies,
  troops,
  onClose,
  onWinPvP,
}) => {
  const [selectedPeer, setSelectedPeer] = useState<StudentProfile>(CLASSMATE_PEERS[0]);
  const [attackVector, setAttackVector] = useState<'VIRAL' | 'BACTERIAL' | 'SANITIZATION'>('SANITIZATION');
  const [raidResult, setRaidResult] = useState<{
    status: 'IDLE' | 'RAIDING' | 'VICTORY' | 'DEFEAT';
    message: string;
    loot: { nutrients: number; hormones: number; rating: number };
  }>({
    status: 'IDLE',
    message: '',
    loot: { nutrients: 0, hormones: 0, rating: 0 },
  });

  const handleLaunchRaid = () => {
    setRaidResult({
      status: 'RAIDING',
      message: `Infiltrating ${selectedPeer.name}'s physiological perimeter... Deploying ${attackVector} payload...`,
      loot: { nutrients: 0, hormones: 0, rating: 0 },
    });
    soundEffects.playAlarmPulse();

    setTimeout(() => {
      // Calculate outcome based on player's army strength vs peer base rating
      const playerArmyScore =
        troops.NEUTROPHIL.count * 10 +
        troops.MACROPHAGE.count * 25 +
        troops.CD8_T_CELL.count * 40 +
        troops.B_CELL_PLASMA.count * 35 +
        troops.NATURAL_KILLER.count * 50;

      const defenseThreshold = selectedPeer.pvpRating * 0.25;

      if (playerArmyScore >= defenseThreshold || Math.random() < 0.75) {
        const ratingGain = 32;
        const lootNutrients = Math.round(selectedPeer.homeostasisRating * 3.5);
        const lootHormones = selectedPeer.brainLevel >= 4 ? 2 : 1;

        setRaidResult({
          status: 'VICTORY',
          message: `Raid Successful! Breached ${selectedPeer.name}'s vascular defenses. Sanitized pathogens and harvested biochemical loot!`,
          loot: { nutrients: lootNutrients, hormones: lootHormones, rating: ratingGain },
        });

        soundEffects.playUpgradeComplete();
        confetti({ particleCount: 80, spread: 60 });
        onWinPvP(ratingGain, lootNutrients, lootHormones);
      } else {
        setRaidResult({
          status: 'DEFEAT',
          message: `${selectedPeer.name}'s Lymph Node sentries and Macrophages repelled your forces! Fortify your army before attacking again.`,
          loot: { nutrients: 0, hormones: 0, rating: -15 },
        });
        soundEffects.playPhagocytosis();
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold font-heading text-white">Classroom PvP Contagion Arena</h3>
                <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono text-xs">
                  Rating: {playerRating}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Launch pathogen bio-challenges or immune sanitization raids against classmates' bases.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-y-auto custom-scrollbar">
          {/* Classmates Roster */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold font-mono text-slate-400 uppercase flex items-center justify-between">
              <span>Peer Organisms</span>
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-2">
              {CLASSMATE_PEERS.map((peer) => {
                const isSelected = selectedPeer.id === peer.id;
                return (
                  <button
                    key={peer.id}
                    onClick={() => {
                      setSelectedPeer(peer);
                      setRaidResult({ status: 'IDLE', message: '', loot: { nutrients: 0, hormones: 0, rating: 0 } });
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-500 shadow-md ring-1 ring-indigo-400/50'
                        : 'bg-slate-850/60 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{peer.avatar}</span>
                        <div>
                          <div className="text-xs font-bold font-heading text-white">{peer.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Brain Lvl {peer.brainLevel} • {peer.totalOrgans} Organs
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-amber-400">{peer.pvpRating}</span>
                        <div className="text-[9px] text-slate-500 font-mono">{peer.lastActive}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Base Diagnostics & Raid Mission Configuration */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-700/70 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{selectedPeer.avatar}</span>
                  <div>
                    <h4 className="text-lg font-bold font-heading text-white">{selectedPeer.name}</h4>
                    <p className="text-xs font-mono text-slate-400">Classroom Physiological Network</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-xs font-mono text-indigo-300 font-bold">
                    Homeostasis {selectedPeer.homeostasisRating}%
                  </span>
                </div>
              </div>

              {/* Vector Selection */}
              <div className="space-y-1.5">
                <div className="text-xs font-mono text-slate-300">Choose Raid Strategy:</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setAttackVector('SANITIZATION')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                      attackVector === 'SANITIZATION'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold font-heading flex items-center space-x-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Immune Sanitization</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Deploy WBC expedition to cleanse foreign base.</div>
                  </button>

                  <button
                    onClick={() => setAttackVector('VIRAL')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                      attackVector === 'VIRAL'
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold font-heading flex items-center space-x-1">
                      <Zap className="w-3.5 h-3.5 text-rose-400" />
                      <span>Viral Challenge</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Test classmate's mucosal and CD8+ defenses.</div>
                  </button>

                  <button
                    onClick={() => setAttackVector('BACTERIAL')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                      attackVector === 'BACTERIAL'
                        ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold font-heading flex items-center space-x-1">
                      <Flame className="w-3.5 h-3.5 text-purple-400" />
                      <span>Bacterial Toxin</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Pressure classmate's renal filtration loop.</div>
                  </button>
                </div>
              </div>

              {/* Status Outcome Banner */}
              {raidResult.status !== 'IDLE' && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                    raidResult.status === 'VICTORY'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                      : raidResult.status === 'DEFEAT'
                      ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                      : 'bg-slate-900 border-indigo-500 text-indigo-200 animate-pulse'
                  }`}
                >
                  <div className="font-bold">{raidResult.message}</div>
                  {raidResult.status === 'VICTORY' && (
                    <div className="flex items-center space-x-3 text-emerald-300 pt-1">
                      <span>+{raidResult.loot.nutrients} Nutrients</span>
                      <span>+{raidResult.loot.hormones} Hormones</span>
                      <span>+{raidResult.loot.rating} Arena Rating</span>
                    </div>
                  )}
                </div>
              )}

              {/* Launch Button */}
              <button
                onClick={handleLaunchRaid}
                disabled={raidResult.status === 'RAIDING'}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-950/60 border border-indigo-400/40 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>LAUNCH CONTAGION EXPEDITION</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
