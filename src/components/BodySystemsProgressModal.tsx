import React from 'react';
import { GameState } from '../services/simulationEngine';
import { calculateBodySystemsProgress } from '../services/simulationEngine';
import { ORGAN_DEFINITIONS } from '../data/organData';
import { X, CheckCircle, Lock, Gem, Droplets, Heart, Brain, Zap, Wind, Shield, Activity, Flame, Layers } from 'lucide-react';

interface BodySystemsProgressModalProps {
  gameState: GameState;
  onClose: () => void;
  onSelectOrganToBuild?: (type: any) => void;
}

export const BodySystemsProgressModal: React.FC<BodySystemsProgressModalProps> = ({
  gameState,
  onClose,
  onSelectOrganToBuild,
}) => {
  const { systems, completedCount, totalSystems, overallPercent, totalOrgansBuilt } =
    calculateBodySystemsProgress(gameState);

  const brain = gameState.organs.find((o) => o.type === 'BRAIN_CNS');
  const brainLevel = brain ? brain.level : 1;

  const getSystemIcon = (key: string) => {
    switch (key) {
      case 'NERVOUS':
        return <Brain className="w-5 h-5 text-purple-400" />;
      case 'CIRCULATORY':
        return <Heart className="w-5 h-5 text-rose-400 fill-rose-400/40" />;
      case 'RESPIRATORY':
        return <Wind className="w-5 h-5 text-cyan-400" />;
      case 'DIGESTIVE':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'EXCRETORY':
        return <Droplets className="w-5 h-5 text-blue-400" />;
      case 'SKELETAL':
        return <Shield className="w-5 h-5 text-slate-300" />;
      case 'MUSCULAR':
        return <Flame className="w-5 h-5 text-red-400" />;
      case 'IMMUNE':
        return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'LYMPHATIC':
        return <Activity className="w-5 h-5 text-teal-400" />;
      case 'ENDOCRINE':
        return <Gem className="w-5 h-5 text-yellow-400" />;
      case 'INTEGUMENTARY':
        return <Layers className="w-5 h-5 text-orange-400" />;
      default:
        return <Heart className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-game text-slate-900 tracking-tight">Human Body Systems</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-game text-xs">
                  {completedCount}/{totalSystems} Systems Built
                </span>
              </div>
              <p className="text-xs text-slate-500 font-game">
                Construct organs from all 11 systems to assemble a fully functioning human body!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Overall Completion Progress Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2 font-game text-xs">
            <span className="text-slate-600">Total Body Assembly Progress</span>
            <span className="text-blue-700 font-bold text-sm">{overallPercent}% Complete ({totalOrgansBuilt} Organs Placed)</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-200 p-0.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${Math.max(5, overallPercent)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-game">
            💡 Upgrade your <strong className="text-slate-800">Brain HQ</strong> to unlock organs from higher-tier systems!
          </p>
        </div>

        {/* 11 Systems Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto custom-scrollbar">
          {systems.map((sys) => {
            const hasAny = sys.builtCount > 0;
            const isFull = sys.isComplete;

            return (
              <div
                key={sys.key}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isFull
                    ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                    : hasAny
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-50/50 border-slate-200 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        {getSystemIcon(sys.key)}
                      </div>
                      <div>
                        <h4 className="font-game text-sm text-slate-900 flex items-center space-x-1.5">
                          <span>{sys.name}</span>
                          <span className="text-xs">{sys.emoji}</span>
                        </h4>
                        <span className="text-[10px] font-game text-slate-500">
                          {sys.builtCount}/{sys.totalAvailable} Organs Online
                        </span>
                      </div>
                    </div>

                    {isFull ? (
                      <div className="flex items-center space-x-1 text-emerald-700 font-game text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>COMPLETE</span>
                      </div>
                    ) : hasAny ? (
                      <span className="text-blue-700 font-game text-xs bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-slate-400 font-game text-xs flex items-center space-x-1">
                        <Lock className="w-3 h-3" />
                        <span>LOCKED</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-game mt-2">
                    {sys.description}
                  </p>
                </div>

                {/* Organ Badges in this system */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {sys.organTypes.map((type) => {
                    const def = ORGAN_DEFINITIONS[type];
                    const isBuilt = gameState.organs.some((o) => o.type === type);
                    const isLocked = brainLevel < def.unlockedAtBrainLevel;

                    return (
                      <div
                        key={type}
                        className={`px-2 py-1 rounded-lg text-[10px] font-game border flex items-center space-x-1 ${
                          isBuilt
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                            : isLocked
                            ? 'bg-slate-100 border-slate-200 text-slate-400'
                            : 'bg-amber-50 border-amber-300 text-amber-800'
                        }`}
                      >
                        {isBuilt ? (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        ) : isLocked ? (
                          <Lock className="w-3 h-3 text-slate-400" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                        <span>{def.name.split(' (')[0]}</span>
                        {isLocked && <span className="text-[9px] text-purple-600 font-normal">(Brain L{def.unlockedAtBrainLevel})</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
