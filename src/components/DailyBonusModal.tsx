import React from 'react';
import { X, Star, Landmark, Timer } from 'lucide-react';

interface Props {
  starsEarned: number;
  starsRequired: number;
  bonusesAvailable: number;
  maxStack: number;
  secondsToNextBonus: number;
  reward: { nutrients: number; oxygen: number };
  treasury: { nutrients: number; oxygen: number };
  treasuryCap: { nutrients: number; oxygen: number };
  onCollectTreasury: () => void;
  onClose: () => void;
}

const fmt = (n: number) => Math.round(n).toLocaleString();

function countdown(seconds: number): string {
  if (seconds <= 0) return 'ready now';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const DailyBonusModal: React.FC<Props> = ({
  starsEarned,
  starsRequired,
  bonusesAvailable,
  maxStack,
  secondsToNextBonus,
  reward,
  treasury,
  treasuryCap,
  onCollectTreasury,
  onClose,
}) => {
  const hasTreasury = treasury.nutrients > 0 || treasury.oxygen > 0;
  const active = bonusesAvailable > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-game text-slate-900 tracking-tight">Daily Bonus</h3>
              <p className="text-xs text-slate-500 font-game">
                {active ? 'Earn 5 stars to bank the bonus' : 'Come back when a new bonus unlocks'}
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

        <div className="p-4 sm:p-5 space-y-4">
          {/* Star progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-game text-slate-600">
                Stars {Math.min(starsEarned, starsRequired)} / {starsRequired}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {bonusesAvailable} / {maxStack} bonus{bonusesAvailable === 1 ? '' : 'es'} available
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: starsRequired }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-7 h-7 ${
                    i < starsEarned
                      ? 'text-amber-400 fill-amber-400'
                      : active
                        ? 'text-slate-300'
                        : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 font-game leading-relaxed">
              {active ? (
                <>
                  Stars come from real work: clearing a deposit, finishing an upgrade,
                  flushing waste, or winning a raid. Completing the set banks{' '}
                  <strong>{fmt(reward.nutrients)}</strong> nutrients and{' '}
                  <strong>{fmt(reward.oxygen)}</strong> oxygen.
                </>
              ) : (
                <>
                  No bonus is active, so stars earned right now are not counted — the
                  same rule Clash of Clans uses.
                </>
              )}
            </p>
          </div>

          {/* Next bonus timer */}
          {bonusesAvailable < maxStack && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <Timer className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-game text-slate-600">
                Next bonus in <strong>{countdown(secondsToNextBonus)}</strong>
              </span>
            </div>
          )}

          {/* Treasury */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="flex items-center space-x-2">
              <Landmark className="w-4 h-4 text-emerald-700" />
              <span className="font-game text-sm text-emerald-900">Treasury</span>
              <span className="text-[10px] font-mono text-emerald-700 ml-auto">
                only 3% raidable
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="text-emerald-800">
                {fmt(treasury.nutrients)} / {fmt(treasuryCap.nutrients)} N
              </div>
              <div className="text-emerald-800">
                {fmt(treasury.oxygen)} / {fmt(treasuryCap.oxygen)} O2
              </div>
            </div>
            <button
              onClick={onCollectTreasury}
              disabled={!hasTreasury}
              className={`w-full py-2 rounded-lg font-bold text-xs transition ${
                hasTreasury
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              {hasTreasury ? 'COLLECT TREASURY' : 'TREASURY EMPTY'}
            </button>
            <p className="text-[10px] text-emerald-700 font-game leading-relaxed">
              Banked loot is safe from raids. Collecting moves everything at once;
              anything that will not fit in storage stays banked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
