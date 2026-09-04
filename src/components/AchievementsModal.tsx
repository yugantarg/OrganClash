import React from 'react';
import { X, Trophy, Gem } from 'lucide-react';
import { AchievementProgress } from '../services/simulationEngine';

interface Props {
  achievements: AchievementProgress[];
  onClaim: (id: string) => void;
  onClose: () => void;
}

const fmt = (n: number) => n.toLocaleString();

export const AchievementsModal: React.FC<Props> = ({ achievements, onClaim, onClose }) => {
  const totalClaimable = achievements.reduce((s, a) => s + a.claimableGems, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-game text-slate-900 tracking-tight">Achievements</h3>
              <p className="text-xs text-slate-500 font-game">
                {totalClaimable > 0
                  ? `${totalClaimable} hormones ready to collect`
                  : 'One-time hormone rewards'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-2.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {achievements.map((a) => {
            const done = a.nextThreshold === null;
            const pct = done
              ? 100
              : Math.min(100, Math.round((a.current / a.nextThreshold!) * 100));
            return (
              <div
                key={a.id}
                className={`p-3 rounded-xl border ${
                  a.claimableGems > 0
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0">
                    <div className="font-game text-sm text-slate-900 truncate">{a.name}</div>
                    <div className="text-[11px] text-slate-500 font-game truncate">{a.label}</div>
                  </div>
                  {a.claimableGems > 0 ? (
                    <button
                      onClick={() => onClaim(a.id)}
                      className="shrink-0 ml-3 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs transition"
                    >
                      <Gem className="w-3.5 h-3.5" />
                      <span>COLLECT {a.claimableGems}</span>
                    </button>
                  ) : (
                    <span className="shrink-0 ml-3 text-[11px] font-mono text-slate-500">
                      {done ? 'ALL DONE' : `${a.tiersClaimed}/${a.totalTiers}`}
                    </span>
                  )}
                </div>

                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-sky-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-mono text-slate-500">
                  {done
                    ? `${fmt(a.current)} — every tier complete`
                    : `${fmt(a.current)} / ${fmt(a.nextThreshold!)} → +${a.nextGems} hormones`}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-[11px] text-slate-500 font-game leading-relaxed">
          Clash of Clans pays out 24,372 gems across 58 achievements — but most are
          combat and clan-war rewards. Only these six have an equivalent while combat
          is parked.
        </div>
      </div>
    </div>
  );
};
