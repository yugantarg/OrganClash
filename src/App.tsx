/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  GameState,
  createInitialGameState,
  runSimulationTick,
  repairOrgan,
  startOrganUpgrade,
  instantCompleteUpgradeWithHormone,
  activateAdrenalineRush,
  collectOrganResources,
  urinateAndClearWaste,
  excreteAndClearWaste,
  tapOrganForBoost,
  placeNewOrgan,
  connectVesselRoad,
  calculateBodySystemsProgress,
} from './services/simulationEngine';
import { OrganType, VesselType } from './types';
import { ORGAN_DEFINITIONS } from './data/organData';
import { soundEffects } from './services/soundEffects';

import { VitalsHUD } from './components/VitalsHUD';
import { OrganismCanvas } from './components/OrganismCanvas';
import { OrganContextDock } from './components/OrganContextDock';
import { OrganInspectorModal } from './components/OrganInspectorModal';
import { BuildMenuModal } from './components/BuildMenuModal';
import { BodySystemsProgressModal } from './components/BodySystemsProgressModal';
import { TeacherLmsDashboardModal } from './components/TeacherLmsDashboardModal';
import { HormoneShopModal } from './components/HormoneShopModal';
import { TutorialModal } from './components/TutorialModal';

import {
  Hammer,
  HelpCircle,
  FileText,
  Sparkles,
  Layers,
  GraduationCap,
  Activity,
  Trash2,
} from 'lucide-react';

const STORAGE_KEY = 'anatoclash_game_state_v2';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return createInitialGameState();
  });

  // Audio is muted by default per user instruction ("mute audio, continue work")
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    soundEffects.setMuted(true);
    return true;
  });

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    'INSPECTOR' | 'BUILD' | 'BODY_SYSTEMS' | 'TEACHER_LMS' | 'HORMONES' | 'TUTORIAL' | null
  >(null);

  // Vessel connect routing state
  const [vesselConnectSource, setVesselConnectSource] = useState<{ organId: string; type: VesselType } | null>(null);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch {
      // Ignore storage quota
    }
  }, [gameState]);

  // Main 1-Second Physiological Simulation Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState((prev) => runSimulationTick(prev));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate 11 Body Systems Progress
  const systemsProgress = calculateBodySystemsProgress(gameState);

  // Organ counts
  const currentOrganCounts = gameState.organs.reduce((acc, org) => {
    acc[org.type] = (acc[org.type] || 0) + 1;
    return acc;
  }, {} as Record<OrganType, number>);

  const brainOrgan = gameState.organs.find((o) => o.type === 'BRAIN_CNS');
  const brainLevel = brainOrgan ? brainOrgan.level : 1;

  // Selected Organ
  const selectedOrgan = gameState.organs.find((o) => o.id === gameState.selectedOrganId) || null;

  // Active upgrades count
  const activeUpgradesCount = gameState.organs.filter((o) => o.status === 'UNDER_UPGRADE').length;
  const totalBuilderCapacity = 2; // 2 Mitotic Builders

  // Check if any organ has harvestable resources
  const hasUncollectedResources = gameState.organs.some(
    (o) =>
      (o.uncollectedNutrients || 0) >= 8 ||
      (o.uncollectedOxygen || 0) >= 8 ||
      (o.uncollectedWater || 0) >= 8 ||
      (o.uncollectedHormones || 0) >= 1
  );

  // Node selection & movement
  const handleSelectOrgan = useCallback((id: string) => {
    setGameState((prev) => ({ ...prev, selectedOrganId: id }));
  }, []);

  const handleMoveOrgan = useCallback((id: string, x: number, y: number) => {
    setGameState((prev) => ({
      ...prev,
      organs: prev.organs.map((o) => (o.id === id ? { ...o, x, y } : o)),
    }));
  }, []);

  // Connect Vessel Road
  const handleAddVessel = useCallback((fromId: string, toId: string, type: VesselType) => {
    setGameState((prev) => connectVesselRoad(prev, fromId, toId, type));
    setVesselConnectSource(null);
  }, []);

  const handleRemoveVessel = useCallback((id: string) => {
    setGameState((prev) => ({
      ...prev,
      vessels: prev.vessels.filter((v) => v.id !== id),
    }));
  }, []);

  // Place New Organ from Shop on SimCity grid
  const handleBuildOrgan = useCallback((type: OrganType) => {
    // Generate a clean grid spot near the base center
    const count = gameState.organs.length;
    const gridCols = 3;
    const col = count % gridCols;
    const row = Math.floor(count / gridCols);
    const targetX = 260 + col * 170 + (Math.random() * 20 - 10);
    const targetY = 240 + row * 150 + (Math.random() * 20 - 10);

    setGameState((prev) => placeNewOrgan(prev, type, targetX, targetY));
    setActiveModal(null);
  }, [gameState.organs.length]);

  const handleDeleteOrgan = useCallback((id: string) => {
    setGameState((prev) => ({
      ...prev,
      organs: prev.organs.filter((o) => o.id !== id),
      vessels: prev.vessels.filter((v) => v.fromNodeId !== id && v.toNodeId !== id),
      selectedOrganId: null,
    }));
    setActiveModal(null);
  }, []);

  // Resource Collection Handlers
  const handleCollectOrgan = useCallback((id: string) => {
    setGameState((prev) => collectOrganResources(prev, id));
  }, []);

  const handleCollectAll = useCallback(() => {
    setGameState((prev) => collectOrganResources(prev));
  }, []);

  const handleUrinate = useCallback((id: string) => {
    setGameState((prev) => urinateAndClearWaste(prev, id));
  }, []);

  const handleUrinateAll = useCallback(() => {
    setGameState((prev) => urinateAndClearWaste(prev));
  }, []);

  const handleExcrete = useCallback((id: string) => {
    setGameState((prev) => excreteAndClearWaste(prev, id));
  }, []);

  const handleExcreteAll = useCallback(() => {
    setGameState((prev) => excreteAndClearWaste(prev));
  }, []);

  const handleTapOrgan = useCallback((id: string) => {
    setGameState((prev) => tapOrganForBoost(prev, id));
  }, []);

  // Reset or preset scenarios
  const loadScenario = (scenario: 'STARTER' | 'COMPLETE_BODY' | 'WASTE_CRISIS') => {
    if (scenario === 'STARTER') {
      setGameState(createInitialGameState());
      soundEffects.playUpgradeComplete();
    } else if (scenario === 'COMPLETE_BODY') {
      const full = createInitialGameState();
      full.currencies.nutrients = 1200;
      full.currencies.oxygen = 1000;
      full.currencies.water = 1000;
      full.currencies.hormones = 25;

      const brain = full.organs[0];
      brain.level = 6;
      brain.hp = 3600;
      brain.maxHp = 3600;

      // Add all core systems organs
      const organsToAdd: { type: OrganType; x: number; y: number }[] = [
        { type: 'HEART_CARDIO', x: 420, y: 310 },
        { type: 'LUNGS_RESP', x: 250, y: 290 },
        { type: 'TRACHEA_RESP', x: 420, y: 220 },
        { type: 'STOMACH_DIGEST', x: 590, y: 310 },
        { type: 'INTESTINE_DIGEST', x: 590, y: 440 },
        { type: 'COLON_DIGEST', x: 590, y: 570 },
        { type: 'KIDNEY_EXCRET', x: 250, y: 440 },
        { type: 'BLADDER_EXCRET', x: 250, y: 570 },
        { type: 'SKELETON_RIBCAGE', x: 100, y: 300 },
        { type: 'SKIN_INTEGUMENT', x: 100, y: 440 },
        { type: 'LIVER_METABOLIC', x: 740, y: 310 },
        { type: 'PANCREAS_DIGEST', x: 740, y: 440 },
        { type: 'ADRENAL_ENDOCRINE', x: 420, y: 460 },
        { type: 'THYROID_ENDOCRINE', x: 420, y: 190 },
        { type: 'BONE_MARROW_IMMUNE', x: 100, y: 180 },
        { type: 'SPLEEN_IMMUNE', x: 740, y: 180 },
      ];

      for (const item of organsToAdd) {
        const def = ORGAN_DEFINITIONS[item.type];
        full.organs.push({
          id: `${item.type.toLowerCase()}_full`,
          type: item.type,
          name: def.name,
          level: 4,
          maxLevel: 8,
          x: item.x,
          y: item.y,
          width: 120,
          height: 100,
          hp: Math.round(def.baseHp * 2.2),
          maxHp: Math.round(def.baseHp * 2.2),
          status: 'OPTIMAL',
          lastProductionTime: Date.now(),
          bloodFlowEfficiency: 1.0,
          oxygenSaturation: 0.98,
          toxicityLevel: 10,
          repairCost: { nutrients: 50, oxygen: 50 },
          uncollectedNutrients: 30,
          uncollectedOxygen: 30,
          uncollectedWater: 30,
          uncollectedHormones: 1,
          uncollectedUrine: 0,
          uncollectedExcretion: 0,
          tapCount: 0,
        });
      }

      // Add vessel connections to heart
      const heartNode = full.organs.find((o) => o.type === 'HEART_CARDIO');
      if (heartNode) {
        full.organs.forEach((o) => {
          if (o.id !== heartNode.id) {
            full.vessels.push({
              id: `v_heart_${o.id}`,
              fromNodeId: heartNode.id,
              toNodeId: o.id,
              type: 'ARTERY',
              level: 1,
              capacity: 60,
              flowSpeed: 1.5,
            });
          }
        });
      }

      full.vitals.homeostasisScore = 99;
      full.vitals.toxicityBun = 12;
      setGameState(full);
      soundEffects.playUpgradeComplete();
    } else if (scenario === 'WASTE_CRISIS') {
      const crisis = createInitialGameState();
      crisis.vitals.toxicityBun = 94; // Severe Uremia!
      crisis.organs.forEach((o) => {
        o.uncollectedUrine = 90;
        o.uncollectedExcretion = 90;
      });
      setGameState(crisis);
      soundEffects.playAlarmPulse();
    }
  };

  const isAdrenalineActive = gameState.activeBoosts.some((b) => b.type === 'ADRENALINE');
  const [showDemosMenu, setShowDemosMenu] = useState(false);

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-50 text-slate-900 overflow-hidden select-none font-game relative">
      {/* Top Vitals & Homeostasis Header */}
      <VitalsHUD
        brainLevel={brainLevel}
        activeUpgradesCount={activeUpgradesCount}
        totalBuilderCapacity={totalBuilderCapacity}
        pvpScore={gameState.pvpScore}
        playerName={gameState.playerName}
        vitals={gameState.vitals}
        currencies={gameState.currencies}
        activeBoosts={gameState.activeBoosts}
        isMuted={isMuted}
        bodyCompletionPercent={systemsProgress.overallPercent}
        completedSystemsCount={systemsProgress.completedCount}
        totalSystemsCount={systemsProgress.totalSystems}
        hasUncollectedResources={hasUncollectedResources}
        onToggleMute={() => {
          const muted = soundEffects.toggleMute();
          setIsMuted(muted);
        }}
        onOpenTeacherLms={() => setActiveModal('TEACHER_LMS')}
        onOpenBodySystems={() => setActiveModal('BODY_SYSTEMS')}
        onOpenHormones={() => setActiveModal('HORMONES')}
        onOpenTutorial={() => setActiveModal('TUTORIAL')}
        onCollectAll={handleCollectAll}
        onUrinateAll={handleUrinateAll}
        onExcreteAll={handleExcreteAll}
      />

      {/* Main Base Canvas: Grid Placement & Vessel Highways */}
      <main className="relative flex-1 w-full h-full overflow-hidden flex">
        <OrganismCanvas
          organs={gameState.organs}
          vessels={gameState.vessels}
          selectedOrganId={gameState.selectedOrganId}
          onSelectOrgan={handleSelectOrgan}
          onMoveOrgan={handleMoveOrgan}
          onAddVessel={handleAddVessel}
          onRemoveVessel={handleRemoveVessel}
          onOpenBuildMenu={() => setActiveModal('BUILD')}
          onRepairOrgan={(id) => setGameState((prev) => repairOrgan(prev, id))}
          onUpgradeOrgan={(id) => setGameState((prev) => startOrganUpgrade(prev, id))}
          onInstantUpgrade={(id) => setGameState((prev) => instantCompleteUpgradeWithHormone(prev, id))}
          onCollectOrgan={handleCollectOrgan}
          onUrinate={handleUrinate}
          onExcrete={handleExcrete}
          onTapOrgan={handleTapOrgan}
          isAdrenalineActive={isAdrenalineActive}
          vesselConnectSource={vesselConnectSource}
          onCancelVesselConnect={() => setVesselConnectSource(null)}
        />

        {/* Unified Bottom Control Deck */}
        <div className="absolute bottom-3 sm:bottom-4 left-0 right-0 z-30 px-3 sm:px-4 pointer-events-none flex items-end justify-between">
          {/* Bottom-Left: Exploration & Curriculum Navigation */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 pointer-events-auto bg-white/95 border border-slate-200 p-1 rounded-2xl shadow-md">
            <button
              onClick={() => setActiveModal('BODY_SYSTEMS')}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-game text-xs transition cursor-pointer"
              title="11 Human Body Systems Tracker"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="hidden xs:inline">Systems</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                {systemsProgress.completedCount}/11
              </span>
            </button>

            <button
              onClick={() => setActiveModal('TEACHER_LMS')}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-game text-xs transition cursor-pointer"
              title="Curriculum Quests & Learning Logbook"
            >
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Quests</span>
            </button>

            <button
              onClick={() => setActiveModal('TUTORIAL')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Middle School Biology Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Demos Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowDemosMenu(!showDemosMenu)}
                className="px-2 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono text-[11px] cursor-pointer"
                title="Scenario Presets"
              >
                Demos
              </button>

              {showDemosMenu && (
                <div className="absolute bottom-10 left-0 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xl flex flex-col space-y-1 w-44 z-50">
                  <button
                    onClick={() => {
                      loadScenario('STARTER');
                      setShowDemosMenu(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-left text-xs font-game text-slate-700 cursor-pointer"
                  >
                    1. Starter (Brain HQ)
                  </button>
                  <button
                    onClick={() => {
                      loadScenario('COMPLETE_BODY');
                      setShowDemosMenu(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-left text-xs font-game text-emerald-700 cursor-pointer"
                  >
                    2. Full 11-System Body
                  </button>
                  <button
                    onClick={() => {
                      loadScenario('WASTE_CRISIS');
                      setShowDemosMenu(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-left text-xs font-game text-rose-700 border border-rose-200 cursor-pointer"
                  >
                    3. High Waste Crisis
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom-Right: Hormone Catalyst & Primary Build Action */}
          <div className="flex items-center space-x-2 pointer-events-auto">
            <button
              onClick={() => setActiveModal('HORMONES')}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-game text-xs shadow-sm transition cursor-pointer"
              title="Endocrine Glands & Hormone Gems"
            >
              <Sparkles className="w-4 h-4 text-purple-600 fill-purple-600" />
              <span className="hidden xs:inline">Gems</span>
            </button>

            <button
              onClick={() => setActiveModal('BUILD')}
              className="game-btn-primary px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl font-game text-xs sm:text-sm flex items-center space-x-1.5 sm:space-x-2 shadow-md cursor-pointer"
              title="Open Organ Build Tray"
            >
              <Hammer className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>BUILD SHOP</span>
            </button>
          </div>
        </div>

        {/* Center Bottom Contextual Organ Action Dock (Rendered when Organ is Selected) */}
        {selectedOrgan && (
          <OrganContextDock
            organ={selectedOrgan}
            brainLevel={brainLevel}
            currencies={gameState.currencies}
            onClose={() => setGameState((prev) => ({ ...prev, selectedOrganId: null }))}
            onOpenInspector={() => setActiveModal('INSPECTOR')}
            onUpgrade={(id) => setGameState((prev) => startOrganUpgrade(prev, id))}
            onInstantUpgrade={(id) => setGameState((prev) => instantCompleteUpgradeWithHormone(prev, id))}
            onRepair={(id) => setGameState((prev) => repairOrgan(prev, id))}
            onDelete={handleDeleteOrgan}
            onStartVesselConnect={(organId, type) => setVesselConnectSource({ organId, type })}
          />
        )}
      </main>

      {/* Modals & Dialog Overlays */}
      {activeModal === 'BODY_SYSTEMS' && (
        <BodySystemsProgressModal
          gameState={gameState}
          onClose={() => setActiveModal(null)}
          onSelectOrganToBuild={(type) => {
            handleBuildOrgan(type);
          }}
        />
      )}

      {activeModal === 'INSPECTOR' && (
        <OrganInspectorModal
          organ={selectedOrgan}
          brainLevel={brainLevel}
          currencies={gameState.currencies}
          onClose={() => setActiveModal(null)}
          onUpgrade={(id) => setGameState((prev) => startOrganUpgrade(prev, id))}
          onInstantUpgrade={(id) => setGameState((prev) => instantCompleteUpgradeWithHormone(prev, id))}
          onRepair={(id) => setGameState((prev) => repairOrgan(prev, id))}
          onDelete={handleDeleteOrgan}
        />
      )}

      {activeModal === 'BUILD' && (
        <BuildMenuModal
          brainLevel={brainLevel}
          currencies={gameState.currencies}
          currentOrganCounts={currentOrganCounts}
          onClose={() => setActiveModal(null)}
          onSelectOrganToBuild={handleBuildOrgan}
        />
      )}

      {activeModal === 'TEACHER_LMS' && (
        <TeacherLmsDashboardModal
          logs={gameState.telemetryLogs}
          vitals={gameState.vitals}
          currencies={gameState.currencies}
          studentName={gameState.playerName}
          totalNecrosisEvents={gameState.totalNecrosisEvents}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'HORMONES' && (
        <HormoneShopModal
          currencies={gameState.currencies}
          activeBoosts={gameState.activeBoosts}
          onClose={() => setActiveModal(null)}
          onActivateBoost={(type, cost, duration, mult) => {
            setGameState((prev) => {
              if (prev.currencies.hormones < cost) return prev;
              soundEffects.playHormoneRush();
              return {
                ...prev,
                currencies: { ...prev.currencies, hormones: prev.currencies.hormones - cost },
                activeBoosts: [
                  ...prev.activeBoosts.filter((b) => b.type !== type),
                  {
                    type,
                    name: type,
                    remainingSeconds: duration,
                    multiplier: mult,
                    description: `Active hormonal catalyst boost`,
                  },
                ],
              };
            });
          }}
          onGrantBonusHormones={(amount) => {
            setGameState((prev) => ({
              ...prev,
              currencies: { ...prev.currencies, hormones: prev.currencies.hormones + amount },
            }));
          }}
        />
      )}

      {activeModal === 'TUTORIAL' && <TutorialModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}
