import React, { useState, useEffect, useRef } from 'react';
import { PathogenSpec, ImmuneCellType, ImmuneTroop, Currencies } from '../types';
import { HISTORICAL_PATHOGENS } from '../data/pathogenData';
import {
  X,
  Swords,
  Shield,
  Zap,
  Sparkles,
  AlertTriangle,
  Play,
  CheckCircle,
  Skull,
  Award,
  BookOpen,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import confetti from 'canvas-confetti';

interface RaidCombatModalProps {
  troops: Record<ImmuneCellType, ImmuneTroop>;
  completedRaidIds: string[];
  currencies: Currencies;
  onClose: () => void;
  onVictory: (pathogen: PathogenSpec, survivingTroops: Record<ImmuneCellType, ImmuneTroop>) => void;
  onDefeat: (pathogen: PathogenSpec) => void;
}

interface CombatEntity {
  id: string;
  type: 'PATHOGEN' | 'WBC';
  subType: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attackPower: number;
  speed: number;
  targetId: string | null;
  size: number;
  color: string;
}

export const RaidCombatModal: React.FC<RaidCombatModalProps> = ({
  troops,
  completedRaidIds,
  currencies,
  onClose,
  onVictory,
  onDefeat,
}) => {
  const [selectedPathogen, setSelectedPathogen] = useState<PathogenSpec>(HISTORICAL_PATHOGENS[0]);
  const [battleState, setBattleState] = useState<'PREPARE' | 'ACTIVE' | 'VICTORY' | 'DEFEAT'>('PREPARE');
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const [barrierHp, setBarrierHp] = useState<number>(1000);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entitiesRef = useRef<CombatEntity[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Start Raid Battle
  const handleStartBattle = () => {
    setBattleState('ACTIVE');
    setBarrierHp(1000);
    setBattleLogs([
      `[T=0.0s] BREACH DETECTED: ${selectedPathogen.name} (${selectedPathogen.scientificName}) has penetrated epidermal mucosa!`,
      `[T=0.5s] Systemic alert broadcasted via cytokines. Deploying ${(Object.values(troops) as ImmuneTroop[]).reduce((s, t) => s + t.count, 0)} White Blood Cells...`,
    ]);

    soundEffects.playAlarmPulse();

    // Spawn Pathogens on left, WBCs on right
    const entities: CombatEntity[] = [];

    // Pathogens
    for (let i = 0; i < selectedPathogen.count; i++) {
      entities.push({
        id: `pathogen_${i}`,
        type: 'PATHOGEN',
        subType: selectedPathogen.type,
        x: 40 + Math.random() * 80,
        y: 60 + (i * 280) / selectedPathogen.count,
        hp: Math.round(selectedPathogen.hp / selectedPathogen.count),
        maxHp: Math.round(selectedPathogen.hp / selectedPathogen.count),
        attackPower: selectedPathogen.attackPower,
        speed: selectedPathogen.speed * 0.7,
        targetId: null,
        size: selectedPathogen.category === 'VIRUS' ? 7 : 11,
        color: selectedPathogen.category === 'VIRUS' ? '#f43f5e' : '#a855f7',
      });
    }

    // WBC Troops
    let wbcIndex = 0;
    (Object.keys(troops) as ImmuneCellType[]).forEach((tType) => {
      const troopData = troops[tType];
      for (let i = 0; i < troopData.count; i++) {
        entities.push({
          id: `wbc_${wbcIndex++}`,
          type: 'WBC',
          subType: tType,
          x: 520 + Math.random() * 80,
          y: 60 + Math.random() * 280,
          hp: troopData.hpPerUnit,
          maxHp: troopData.hpPerUnit,
          attackPower: troopData.attackPower,
          speed: troopData.speed * 0.7,
          targetId: null,
          size: tType === 'MACROPHAGE' ? 14 : tType === 'NATURAL_KILLER' ? 10 : 8,
          color:
            tType === 'NEUTROPHIL'
              ? '#fbbf24'
              : tType === 'MACROPHAGE'
              ? '#10b981'
              : tType === 'CD8_T_CELL'
              ? '#f43f5e'
              : tType === 'B_CELL_PLASMA'
              ? '#38bdf8'
              : '#c084fc',
        });
      }
    });

    entitiesRef.current = entities;
  };

  // Main Combat Simulation Loop
  useEffect(() => {
    if (battleState !== 'ACTIVE') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastLogTime = Date.now();

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Background Lymph Tissue Grid
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Midline Barrier
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(320, 0);
      ctx.lineTo(320, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      const entities = entitiesRef.current;
      const pathogens = entities.filter((e) => e.type === 'PATHOGEN');
      const wbcs = entities.filter((e) => e.type === 'WBC');

      // Check Victory or Defeat
      if (pathogens.length === 0) {
        setBattleState('VICTORY');
        soundEffects.playUpgradeComplete();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        onVictory(selectedPathogen, troops);
        return;
      }

      if (wbcs.length === 0) {
        setBattleState('DEFEAT');
        soundEffects.playAlarmPulse();
        onDefeat(selectedPathogen);
        return;
      }

      // Update & Render Entities
      entities.forEach((entity) => {
        // Target selection
        if (entity.type === 'PATHOGEN') {
          // Move towards closest WBC or march right
          let nearestWbc: CombatEntity | null = null;
          let minDist = 9999;
          wbcs.forEach((w) => {
            const dist = Math.hypot(w.x - entity.x, w.y - entity.y);
            if (dist < minDist) {
              minDist = dist;
              nearestWbc = w;
            }
          });

          if (nearestWbc) {
            const target: CombatEntity = nearestWbc;
            const angle = Math.atan2(target.y - entity.y, target.x - entity.x);
            entity.x += Math.cos(angle) * entity.speed;
            entity.y += Math.sin(angle) * entity.speed;

            // Attack if close
            if (minDist < 25) {
              target.hp -= entity.attackPower * 0.05;
              if (Math.random() < 0.05) soundEffects.playPhagocytosis();
            }
          } else {
            entity.x += entity.speed;
          }
        } else {
          // WBC moves toward nearest Pathogen
          let nearestPathogen: CombatEntity | null = null;
          let minDist = 9999;
          pathogens.forEach((p) => {
            const dist = Math.hypot(p.x - entity.x, p.y - entity.y);
            if (dist < minDist) {
              minDist = dist;
              nearestPathogen = p;
            }
          });

          if (nearestPathogen) {
            const target: CombatEntity = nearestPathogen;
            const angle = Math.atan2(target.y - entity.y, target.x - entity.x);
            entity.x += Math.cos(angle) * entity.speed;
            entity.y += Math.sin(angle) * entity.speed;

            // Attack
            if (minDist < 30) {
              target.hp -= entity.attackPower * 0.06;
              if (Math.random() < 0.08) soundEffects.playAntibodyShot();
            }

            // Draw laser or antibody tether
            if (entity.subType === 'B_CELL_PLASMA' && minDist < 120) {
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(entity.x, entity.y);
              ctx.lineTo(target.x, target.y);
              ctx.stroke();
            }
          }
        }

        // Draw Entity Body
        ctx.beginPath();
        ctx.arc(entity.x, entity.y, entity.size, 0, Math.PI * 2);
        ctx.fillStyle = entity.color;
        ctx.shadowColor = entity.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Health bar
        const hpPct = Math.max(0, entity.hp / entity.maxHp);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(entity.x - 12, entity.y - entity.size - 6, 24, 3);
        ctx.fillStyle = entity.type === 'WBC' ? '#10b981' : '#f43f5e';
        ctx.fillRect(entity.x - 12, entity.y - entity.size - 6, 24 * hpPct, 3);
      });

      // Filter dead entities
      entitiesRef.current = entities.filter((e) => e.hp > 0);

      // Periodic Combat Telemetry Log
      if (Date.now() - lastLogTime > 2200) {
        lastLogTime = Date.now();
        const randPath = pathogens[0]?.subType || 'Pathogen';
        const randWbc = wbcs[0]?.subType || 'WBC';
        setBattleLogs((prev) => [
          `[Combat Pulse] ${randWbc} engaged ${randPath} with targeted cytotoxicity. Remaining Pathogens: ${pathogens.length} | Active WBCs: ${wbcs.length}`,
          ...prev.slice(0, 8),
        ]);
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [battleState, selectedPathogen, troops, onVictory, onDefeat]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading text-white">Historical Pathogen Raids (PvE Campaign)</h3>
              <p className="text-xs text-slate-400 font-mono">
                Defend physiological homeostasis against real-world epidemic agents.
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

        {/* Modal Main Body */}
        {battleState === 'PREPARE' ? (
          <div className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-y-auto custom-scrollbar">
            {/* Pathogen Selection List */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold font-mono text-slate-400 uppercase">Select Target Threat</div>
              <div className="space-y-2">
                {HISTORICAL_PATHOGENS.map((p) => {
                  const isCompleted = completedRaidIds.includes(p.id);
                  const isSelected = selectedPathogen.id === p.id;

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPathogen(p)}
                      className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-rose-950/70 border-rose-500 shadow-md ring-1 ring-rose-400/50'
                          : 'bg-slate-850/60 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-heading text-white">{p.name}</span>
                        {isCompleted ? (
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Mastered</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-amber-400">Lvl {p.level}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{p.scientificName}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Pathogen Clinical Dossier */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-lg font-bold font-heading text-rose-400">{selectedPathogen.name}</h4>
                    <p className="text-xs font-mono text-slate-400">{selectedPathogen.scientificName}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-xs font-mono text-rose-300 font-bold">
                      {selectedPathogen.category} • Tier {selectedPathogen.level}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{selectedPathogen.description}</p>

                {/* Symptoms & History */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-rose-400 font-mono font-bold uppercase">Physiological Symptoms</div>
                    <ul className="text-xs text-slate-300 space-y-0.5 list-disc list-inside">
                      {selectedPathogen.symptoms.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-amber-400 font-mono font-bold uppercase">Historical Telemetry</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedPathogen.historicalFact}</p>
                  </div>
                </div>

                {/* Rewards */}
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-300">Sanitization Bounty:</span>
                  <div className="flex items-center space-x-3 text-xs font-mono font-bold">
                    <span className="text-amber-400">+{selectedPathogen.rewardNutrients} Nutrients</span>
                    <span className="text-purple-400">+{selectedPathogen.rewardHormones} Hormones</span>
                  </div>
                </div>
              </div>

              {/* Ready to Deploy Button */}
              <button
                onClick={handleStartBattle}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-rose-950/60 border border-rose-400/40 flex items-center justify-center space-x-2 transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>ENGAGE IMMUNE SYSTEM INVASION</span>
              </button>
            </div>
          </div>
        ) : (
          /* Real-time Battlefield View */
          <div className="flex-1 flex flex-col p-4 space-y-3">
            <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-slate-700 shadow-inner">
              <canvas ref={canvasRef} width={640} height={320} className="w-full h-full" />

              {/* In-battle State Overlays */}
              {battleState === 'VICTORY' && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 p-4 animate-in fade-in zoom-in-95">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
                    <Award className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-bold font-heading text-emerald-400">PATHOGEN NEUTRALIZED!</h4>
                  <p className="text-xs text-slate-300 font-mono text-center max-w-md">
                    Homeostasis defended! Acquired {selectedPathogen.rewardNutrients} Nutrients and {selectedPathogen.rewardHormones} Hormones.
                  </p>
                  <button
                    onClick={() => setBattleState('PREPARE')}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg"
                  >
                    CONTINUE TO BASE
                  </button>
                </div>
              )}

              {battleState === 'DEFEAT' && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 p-4 animate-in fade-in zoom-in-95">
                  <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400">
                    <Skull className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-bold font-heading text-rose-400">IMMUNE SYSTEM OVERRUN</h4>
                  <p className="text-xs text-slate-300 font-mono text-center max-w-md">
                    White Blood Cells were depleted. Synthesize more troops in Bone Marrow and fortify Lymph Nodes before re-engaging!
                  </p>
                  <button
                    onClick={() => setBattleState('PREPARE')}
                    className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer border border-slate-700"
                  >
                    RETREAT & REGROUP
                  </button>
                </div>
              )}
            </div>

            {/* Combat Log Box */}
            <div className="h-28 rounded-xl bg-slate-950 border border-slate-800 p-2.5 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-1">
              {battleLogs.map((log, idx) => (
                <div key={idx} className="text-slate-300">
                  <span className="text-rose-400 font-semibold">{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
