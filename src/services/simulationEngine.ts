import {
  OrganNode,
  VesselConnection,
  PlayerVitals,
  Currencies,
  ActiveBoost,
  TelemetryLog,
  ImmuneTroop,
  ImmuneCellType,
  OrganType,
  VesselType,
  BodySystemInfo,
  BodySystemKey,
  Obstacle,
} from '../types';
import {
  ORGAN_DEFINITIONS,
  ALL_BODY_SYSTEMS,
  IMMUNE_TROOPS_CATALOG,
  ORGAN_ARCHETYPE,
  STORAGE_ORGANS,
  BASE_BUILDER_COUNT,
  MAX_BUILDER_COUNT,
  BUILDER_GEM_COSTS,
  HEALTHY_WATER_RESERVE,
  TAP_COOLDOWN_MS,
  MAX_TELEMETRY_LOGS,
} from '../data/organData';
import {
  cocUpgradeCost,
  cocUpgradeSeconds,
  cocProductionPerSecond,
  cocCollectorCapacity,
  cocStorageCapacity,
  cocTownHallStorage,
  cocTownHallRequired,
  cocStorageCount,
  cocCollectorCount,
  cocObstacleGems,
  COC_GEM_MINE_PER_DAY,
  COC_ACHIEVEMENTS,
  COC_GEM_BOX_VALUE,
  COC_OBSTACLE_SPAWN_SECONDS,
  COC_MAX_OBSTACLES,
  COC_GEM_BOX_RESPAWN_MIN_SECONDS,
  COC_GEM_BOX_RESPAWN_MAX_SECONDS,
  COC_OBSTACLE_CLEAR_COST,
  COC_GEM_BOX_CLEAR_COST,
} from '../data/cocTables';
import { soundEffects } from './soundEffects';

/**
 * Production multiplier relative to a level-1 collector, straight off CoC's
 * output table (200/hr at L1 → 2200/hr at L9). Used for the non-resource stats
 * (filtration, armour, urine) that still need to scale with organ level.
 */
export function productionLevelMultiplier(level: number): number {
  return cocProductionPerSecond(level) / cocProductionPerSecond(1);
}

/**
 * Brain (Town Hall) level required before an organ may reach `targetLevel`.
 * Straight from CoC's per-building Town-Hall-required column: building level runs
 * AHEAD of Town Hall level (a level-9 storage is legal at TH5), so the old
 * "level <= brain + 1" rule throttled storage roughly tenfold and made the HQ
 * upgrades unreachable. This is the single source of truth for the gate.
 */
export function requiredBrainLevelFor(type: OrganType, targetLevel: number): number {
  if (type === 'BRAIN_CNS') return 1;
  return cocTownHallRequired(ORGAN_ARCHETYPE[type], targetLevel);
}

export interface GameState {
  playerName: string;
  organs: OrganNode[];
  vessels: VesselConnection[];
  vitals: PlayerVitals;
  currencies: Currencies;
  activeBoosts: ActiveBoost[];
  troops: Record<ImmuneCellType, ImmuneTroop>;
  selectedOrganId: string | null;
  telemetryLogs: TelemetryLog[];
  completedPveRaidIds: string[];
  pvpScore: number;
  /** Concurrent upgrade slots. Extra builders are the primary gem sink. */
  builderCount: number;
  lastTickTimestamp: number;
  totalNecrosisEvents: number;
  totalWasteClearedCount: number;
  totalResourcesHarvested: number;
  /** Gem faucet state (CoC: obstacles, Gem Box, achievements). */
  obstacles: Obstacle[];
  /** Advances once per obstacle cleared; indexes CoC's fixed gem cycle. */
  obstacleClearIndex: number;
  obstaclesCleared: number;
  lastObstacleSpawnAt: number;
  nextGemBoxAt: number;
  nutrientsHarvested: number;
  oxygenHarvested: number;
  /** achievement id -> number of tiers already claimed. */
  achievementTiersClaimed: Record<string, number>;
}

/**
 * Starter base: Starts with EXACTLY ONE organ (Brain as Command HQ / Town Center).
 * The user begins their journey by earning from the Brain and building outward!
 */
export function createInitialGameState(): GameState {
  const initialBrain: OrganNode = {
    id: 'brain_1',
    type: 'BRAIN_CNS',
    name: 'Brain (Command HQ)',
    level: 1,
    maxLevel: 12, // CoC tables run to L12
    x: 420,
    y: 160,
    width: 140,
    height: 110,
    hp: 2000,
    maxHp: 2000,
    status: 'OPTIMAL',
    lastProductionTime: Date.now(),
    bloodFlowEfficiency: 1.0,
    oxygenSaturation: 0.98,
    toxicityLevel: 10,
    repairCost: { nutrients: 60, oxygen: 40 },
    uncollectedNutrients: 40,
    uncollectedOxygen: 30,
    uncollectedWater: 20,
    uncollectedHormones: 1,
    uncollectedUrine: 0,
    uncollectedExcretion: 0,
    tapCount: 0,
  };

  const vitals: PlayerVitals = {
    heartRateBpm: 72,
    bloodPressureSys: 120,
    bloodPressureDia: 80,
    spO2: 98,
    toxicityBun: 12, // Healthy baseline (normal is 7-20 mg/dL)
    hydrationPct: 95,
    coreTempC: 37.0,
    homeostasisScore: 98,
  };

  const currencies: Currencies = {
    nutrients: 240,
    maxNutrients: 1000, // CoC Town Hall L1 storage
    oxygen: 200,
    maxOxygen: 1000, // CoC Town Hall L1 storage
    water: 200,
    maxWater: 1000, // CoC Town Hall L1 storage
    hormones: 10,
  };

  const initialTroops = JSON.parse(JSON.stringify(IMMUNE_TROOPS_CATALOG));

  const initialTelemetry: TelemetryLog[] = [
    {
      id: 'log_init',
      timestamp: Date.now(),
      studentId: 'student_user',
      studentName: 'Cadet Biologist',
      eventType: 'ORGAN_UPGRADE',
      details: 'Welcome to Body Base! Your Brain (Town Center) is online. Collect neural energy and open the Build Menu to add your Heart, Lungs, and Stomach!',
      scoreImpact: 10,
      metabolicEfficiency: 95,
      renalFiltrationEfficiency: 95,
      immuneReadinessScore: 90,
    },
  ];

  return {
    playerName: 'Cadet Biologist',
    organs: [initialBrain],
    vessels: [],
    vitals,
    currencies,
    activeBoosts: [],
    troops: initialTroops,
    selectedOrganId: 'brain_1',
    telemetryLogs: initialTelemetry,
    completedPveRaidIds: [],
    pvpScore: 1000,
    builderCount: BASE_BUILDER_COUNT,
    lastTickTimestamp: Date.now(),
    totalNecrosisEvents: 0,
    totalWasteClearedCount: 0,
    totalResourcesHarvested: 0,
    obstacles: [],
    obstacleClearIndex: 0,
    obstaclesCleared: 0,
    lastObstacleSpawnAt: Date.now(),
    nextGemBoxAt: Date.now() + COC_GEM_BOX_RESPAWN_MIN_SECONDS * 1000,
    nutrientsHarvested: 0,
    oxygenHarvested: 0,
    achievementTiersClaimed: {},
  };
}

/**
 * Executes a 1-second physiological simulation tick.
 * Accumulates uncollected resources on organs (Clash of Clans style) and tracks waste (Urination / Excretion).
 */
export function runSimulationTick(state: GameState): GameState {
  const now = Date.now();
  const newState: GameState = JSON.parse(JSON.stringify(state));

  // 1. Calculate Boost Multipliers
  let speedMultiplier = 1.0;
  let oxygenMultiplier = 1.0;
  let adrenalineActive = false;

  const remainingBoosts: ActiveBoost[] = [];
  for (const boost of newState.activeBoosts) {
    if (boost.remainingSeconds > 1) {
      boost.remainingSeconds -= 1;
      remainingBoosts.push(boost);
      if (boost.type === 'ADRENALINE') {
        speedMultiplier *= boost.multiplier;
        adrenalineActive = true;
      } else if (boost.type === 'EPO_OXYGEN') {
        oxygenMultiplier *= boost.multiplier;
      }
    }
  }
  newState.activeBoosts = remainingBoosts;

  // Deposits accumulate on the map over time (CoC: one obstacle per 8 hours).
  spawnObstaclesForElapsed(newState, now);

  // 2. Identify Active Organ Capacities & Storage
  let totalFiltrationRate = 0;
  let totalMetabolicToxicity = 0;
  let totalDefenseArmor = 0;

  // The HQ level sets the storage ceiling; support organs add on top of it.
  const hqLevel = newState.organs.find((o) => o.type === 'BRAIN_CNS')?.level ?? 1;
  // The HQ holds resources itself. CoC's Town Hall has its OWN storage table,
  // distinct from the Gold/Elixir Storage building — storage organs add on top.
  let maxNutrientStorage = cocTownHallStorage(hqLevel);
  let maxOxygenStorage = cocTownHallStorage(hqLevel);
  let maxWaterStorage = cocTownHallStorage(hqLevel);
  // Storage organs are gathered here and capped by CoC's storages-per-Town-Hall
  // count after the loop (CoC allows 1 storage @TH1, 2 @TH3, 3 @TH8, 4 @TH9 —
  // per resource, since Gold and Elixir storages are counted separately).
  const nutrientStoreCaps: number[] = [];
  const oxygenStoreCaps: number[] = [];
  const waterStoreCaps: number[] = [];

  const heart = newState.organs.find((o) => o.type === 'HEART_CARDIO' && o.status !== 'DAMAGED_DESTROYED');
  const brain = newState.organs.find((o) => o.type === 'BRAIN_CNS' && o.status !== 'DAMAGED_DESTROYED');

  const heartFunctional = !!heart && heart.hp > 0;
  const brainFunctional = !!brain && brain.hp > 0;

  let hasNecrosisWarning = false;

  // Metabolic waste (BUN) THROTTLES production — it never damages organs (the
  // CoC "no death loop" law). The tolerance is the "storage capacity" of the
  // excretory system: kidneys and bladder hold/clear blood urea, so leveling
  // them raises how much waste the body shrugs off. Once BUN climbs past that
  // capacity, every organ's nutrient/oxygen output is throttled GRADUALLY, down
  // to a floor of WASTE_MIN_FACTOR — production never fully stops, so even a
  // neglected base keeps creeping forward until the player flushes.
  const WASTE_BASE_CAPACITY = 40; // BUN tolerated with no excretory organs
  const WASTE_CAP_PER_KIDNEY_LVL = 18; // each kidney level raises tolerance
  const WASTE_CAP_PER_BLADDER_LVL = 12; // each bladder level raises tolerance
  const WASTE_THROTTLE_BAND = 40; // BUN units from throttle onset to the floor
  const WASTE_MIN_FACTOR = 0.1; // production floors at 10% of normal, never 0

  let wasteCapacity = WASTE_BASE_CAPACITY;
  for (const organ of newState.organs) {
    if (organ.status === 'DAMAGED_DESTROYED') continue;
    if (organ.type === 'KIDNEY_EXCRET') wasteCapacity += WASTE_CAP_PER_KIDNEY_LVL * organ.level;
    else if (organ.type === 'BLADDER_EXCRET') wasteCapacity += WASTE_CAP_PER_BLADDER_LVL * organ.level;
  }

  const wasteOver = Math.max(0, newState.vitals.toxicityBun - wasteCapacity);
  const wasteThrottleT = Math.min(1, wasteOver / WASTE_THROTTLE_BAND); // 0 (fine) → 1 (floor)
  const toxicityFactor = 1 - wasteThrottleT * (1 - WASTE_MIN_FACTOR); // 1.0 → 0.10

  // 3. Process Each Organ Node
  for (const organ of newState.organs) {
    const def = ORGAN_DEFINITIONS[organ.type];
    if (!def) continue;

    // Check upgrade timers
    if (organ.status === 'UNDER_UPGRADE' && organ.upgradeEndTime) {
      if (now >= organ.upgradeEndTime) {
        organ.level += 1;
        organ.maxHp = Math.round(def.baseHp * (1 + (organ.level - 1) * 0.4));
        organ.hp = organ.maxHp;
        organ.status = 'OPTIMAL';
        organ.upgradeEndTime = undefined;
        organ.upgradeDurationSeconds = undefined;
        soundEffects.playUpgradeComplete();

        newState.telemetryLogs.unshift({
          id: `upgrade_${Date.now()}`,
          timestamp: Date.now(),
          studentId: 'student_user',
          studentName: newState.playerName,
          eventType: 'ORGAN_UPGRADE',
          details: `🎉 Upgraded ${organ.name} to Level ${organ.level}! Max HP is now ${organ.maxHp}.`,
          scoreImpact: 20,
          metabolicEfficiency: Math.min(100, newState.vitals.homeostasisScore + 5),
          renalFiltrationEfficiency: 95,
          immuneReadinessScore: 90,
        });
      }
    }

    if (organ.status === 'DAMAGED_DESTROYED') {
      continue;
    }

    // Check vessel connectivity to heart
    let connectedToHeart = organ.type === 'HEART_CARDIO' || newState.organs.length === 1; // If only brain, 100%
    if (!connectedToHeart && heart) {
      const directVessel = newState.vessels.some(
        (v) => (v.fromNodeId === heart.id && v.toNodeId === organ.id) || (v.toNodeId === heart.id && v.fromNodeId === organ.id)
      );
      connectedToHeart = directVessel;
    }

    organ.bloodFlowEfficiency = heartFunctional ? (connectedToHeart ? 1.0 : 0.55) : 0.25;
    organ.oxygenSaturation = Math.min(1.0, (newState.vitals.spO2 / 100) * organ.bloodFlowEfficiency * oxygenMultiplier);

    const levelMult = productionLevelMultiplier(organ.level);
    const efficiencyMult = organ.bloodFlowEfficiency * (organ.hp / organ.maxHp);

    // Initialize collector fields if undefined
    organ.uncollectedNutrients = organ.uncollectedNutrients || 0;
    organ.uncollectedOxygen = organ.uncollectedOxygen || 0;
    organ.uncollectedWater = organ.uncollectedWater || 0;
    organ.uncollectedHormones = organ.uncollectedHormones || 0;
    organ.uncollectedUrine = organ.uncollectedUrine || 0;
    organ.uncollectedExcretion = organ.uncollectedExcretion || 0;
    organ.tapCount = organ.tapCount || 0;

    // Production into the organ's own collector bubble. Rate AND capacity are
    // CoC's Gold Mine / Elixir Collector numbers for this level — every producer
    // is a collector, exactly as CoC's mines are interchangeable.
    const organCollectorCap = cocCollectorCapacity(organ.level);
    const cocRate = cocProductionPerSecond(organ.level);

    if (def.outputs.nutrientsPerSec) {
      const nutGen = cocRate * efficiencyMult * speedMultiplier * toxicityFactor;
      organ.uncollectedNutrients = Math.min(organCollectorCap, organ.uncollectedNutrients + nutGen);
    }
    if (def.outputs.oxygenPerSec) {
      const oxGen = cocRate * efficiencyMult * speedMultiplier * toxicityFactor;
      organ.uncollectedOxygen = Math.min(organCollectorCap, organ.uncollectedOxygen + oxGen);
    }
    if (def.outputs.waterPerSec) {
      const watGen = cocRate * efficiencyMult * toxicityFactor;
      organ.uncollectedWater = Math.min(organCollectorCap, organ.uncollectedWater + watGen);
    }

    // Any organ that declares filtration contributes to clearing blood urea.
    // (Previously only kidneys and bladder were read, so liver, spleen and
    // lymph-node filtration silently did nothing.)
    if (def.outputs.filtrationPerSec) {
      totalFiltrationRate += def.outputs.filtrationPerSec * levelMult * efficiencyMult;
    }

    // Only the urinary organs actually fill with urine.
    if (organ.type === 'KIDNEY_EXCRET' || organ.type === 'BLADDER_EXCRET') {
      organ.uncollectedUrine = Math.min(100, organ.uncollectedUrine + 1.2 * levelMult);
    }

    // Barrier tissue blunts systemic toxic damage.
    if (def.outputs.defenseArmor) {
      totalDefenseArmor += def.outputs.defenseArmor * levelMult;
    }

    // Excretion generation:
    if (organ.type === 'COLON_DIGEST' || organ.type === 'STOMACH_DIGEST') {
      if (organ.type === 'COLON_DIGEST') {
        organ.uncollectedExcretion = Math.min(100, organ.uncollectedExcretion + 1.5 * levelMult);
      }
    }

    // Storage organs are CoC Storage buildings: capacity read straight off CoC's
    // Gold/Elixir Storage table for this level (1,500 at L1 → 450,000 at L9).
    // An organ that stores a resource holds the one it deals in; Liver holds both.
    if (STORAGE_ORGANS.has(organ.type)) {
      const cap = cocStorageCapacity(organ.level);
      if (organ.type === 'LUNGS_RESP') {
        oxygenStoreCaps.push(cap);
      } else if (organ.type === 'LIVER_METABOLIC') {
        nutrientStoreCaps.push(cap);
        oxygenStoreCaps.push(cap);
        waterStoreCaps.push(cap);
      } else {
        nutrientStoreCaps.push(cap);
      }
    }

    // Endocrine tissue is our Gem Mine — the ONLY passive hard-currency income,
    // and in CoC that trickle is tiny (~5 gems/day at max level). The definition's
    // hormoneChance is a relative weight: the strongest gland (0.15, adrenal) runs
    // at exactly CoC's Gem Mine rate, weaker glands at a proportional share.
    // Everything else (achievements, obstacle clearing, daily rewards) is one-off
    // or player-driven, never a passive drip.
    if (def.outputs.hormoneChance) {
      const perSecond = (COC_GEM_MINE_PER_DAY / 86400) * (def.outputs.hormoneChance / 0.15);
      if (Math.random() < perSecond) {
        organ.uncollectedHormones = Math.min(10, organ.uncollectedHormones + 1);
      }
    }

    // Metabolic waste generation
    const waste = (def.metabolicWastePerSec || 0.4) * levelMult * (organ.status === 'UNDER_UPGRADE' ? 1.5 : 1.0);
    totalMetabolicToxicity += waste;
  }

  // 4. Update Excretory Filtration & Toxicity (BUN - Blood Urea Nitrogen)
  // If kidneys/bladder are not present or not flushed, BUN rises
  const kidneyPresent = newState.organs.some((o) => o.type === 'KIDNEY_EXCRET' && o.hp > 0);
  const filtrationEffect = kidneyPresent ? totalFiltrationRate : 0.2;
  const netToxicityChange = totalMetabolicToxicity - filtrationEffect;

  let newBun = Math.max(5, Math.min(120, newState.vitals.toxicityBun + netToxicityChange * 0.35));
  newState.vitals.toxicityBun = parseFloat(newBun.toFixed(1));

  // 5. Toxicity warning & production throttle (NO death loop)
  //
  // High blood urea never damages or destroys an organ. It only THROTTLES
  // production (applied above via toxicityFactor, floored at WASTE_MIN_FACTOR).
  // When output is heavily throttled the organs are marked "sick"
  // (TOXIC_NECROSIS = backed-up) purely as a visual + telemetry warning; the
  // moment the player flushes (urinate/excrete) and BUN falls back under the
  // excretory capacity, every organ recovers on its own with zero lost progress.
  const wasteThrottled = wasteOver > 0; // over excretory capacity at all
  const wasteHeavilyThrottled = wasteThrottleT >= 0.5; // output at/under ~55%
  const wasteAtFloor = wasteThrottleT >= 1; // production pinned to the 10% floor
  hasNecrosisWarning = wasteThrottled;

  for (const organ of newState.organs) {
    if (organ.status === 'DAMAGED_DESTROYED' || organ.status === 'UNDER_UPGRADE') continue;

    if (wasteHeavilyThrottled) {
      if (organ.status !== 'TOXIC_NECROSIS') organ.status = 'TOXIC_NECROSIS';
    } else if (organ.status === 'TOXIC_NECROSIS') {
      // Flushed enough to resume: recover with no HP penalty.
      organ.status = organ.bloodFlowEfficiency < 0.5 ? 'HYPOXIC' : 'OPTIMAL';
    }
  }

  // One telemetry note when the base first bottoms out at the 10% floor, so the
  // player knows the fix is to flush — not that anything is being damaged.
  if (wasteAtFloor && !newState.vitals.wasteStallActive) {
    const pct = Math.round(WASTE_MIN_FACTOR * 100);
    newState.telemetryLogs.unshift({
      id: `stall_${Date.now()}`,
      timestamp: Date.now(),
      studentId: 'student_user',
      studentName: newState.playerName,
      eventType: 'NECROSIS_EVENT',
      details: `🛑 WASTE BACKUP: Blood urea (${newState.vitals.toxicityBun} mg/dL) exceeded your kidneys' + bladder's capacity — output throttled to ${pct}%. Flush urine/excretion (or build/level excretory organs) to restore it. Nothing is lost.`,
      scoreImpact: 0,
      metabolicEfficiency: 40,
      renalFiltrationEfficiency: 30,
      immuneReadinessScore: 60,
    });
  }
  newState.vitals.wasteStallActive = wasteAtFloor;

  // Only the strongest N storage organs count, where N is CoC's storages-per-TH.
  // Extra stores beyond CoC's allowance are flavour, not capacity — this keeps our
  // total storage matched to CoC's instead of several times larger.
  const storeAllowance = cocStorageCount(hqLevel);
  const topN = (caps: number[]) =>
    caps.sort((a, b) => b - a).slice(0, storeAllowance).reduce((sum, c) => sum + c, 0);
  maxNutrientStorage += topN(nutrientStoreCaps);
  maxOxygenStorage += topN(oxygenStoreCaps);
  maxWaterStorage += topN(waterStoreCaps);

  // 6. Update Storage Max Caps
  newState.currencies.maxNutrients = maxNutrientStorage;
  newState.currencies.maxOxygen = maxOxygenStorage;
  newState.currencies.maxWater = maxWaterStorage;

  // Water is consumed by the tissue you actually have, not at a flat rate.
  const livingOrganCount = newState.organs.filter((o) => o.status !== 'DAMAGED_DESTROYED').length;
  newState.currencies.water = Math.max(0, newState.currencies.water - 0.04 * livingOrganCount);

  // 7. Update Systemic Vitals
  let targetBpm = 72;
  if (adrenalineActive) targetBpm += 50;
  if (newState.vitals.toxicityBun > 50) targetBpm += 20;
  newState.vitals.heartRateBpm = Math.round(targetBpm + (Math.random() * 4 - 2));

  let targetSys = 120;
  let targetDia = 80;
  if (adrenalineActive) {
    targetSys += 20;
    targetDia += 10;
  }
  if (newState.vitals.toxicityBun > 60) targetSys += 15;
  newState.vitals.bloodPressureSys = Math.round(targetSys);
  newState.vitals.bloodPressureDia = Math.round(targetDia);

  const lungCount = newState.organs.filter((o) => o.type === 'LUNGS_RESP' && o.hp > 0).length;
  let baseSpO2 = lungCount > 0 ? 98 : (newState.organs.length === 1 ? 96 : 84);
  if (newState.vitals.toxicityBun > 80) baseSpO2 -= 8;
  newState.vitals.spO2 = Math.max(70, Math.min(100, Math.round(baseSpO2)));

  // Measured against a fixed healthy reserve. Dividing by maxWater made every
  // storage upgrade look like sudden dehydration.
  const hydrationPct = Math.round((newState.currencies.water / HEALTHY_WATER_RESERVE) * 100);
  newState.vitals.hydrationPct = Math.max(0, Math.min(100, hydrationPct));

  let score = 100;
  if (newState.vitals.toxicityBun > 25) score -= (newState.vitals.toxicityBun - 25) * 1.2;
  if (newState.vitals.spO2 < 95) score -= (95 - newState.vitals.spO2) * 2;
  if (newState.vitals.hydrationPct < 50) score -= (50 - newState.vitals.hydrationPct) * 1.0;
  if (!brainFunctional) score -= 40;
  if (newState.organs.length > 1 && !heartFunctional) score -= 30;
  newState.vitals.homeostasisScore = Math.max(0, Math.min(100, Math.round(score)));

  // Sound effects
  if (Math.random() < 0.2) {
    soundEffects.playHeartbeat(newState.vitals.heartRateBpm);
  }
  if (hasNecrosisWarning && Math.random() < 0.25) {
    soundEffects.playAlarmPulse();
  }

  // Bound the log: the whole state is serialised to storage on every change.
  if (newState.telemetryLogs.length > MAX_TELEMETRY_LOGS) {
    newState.telemetryLogs.length = MAX_TELEMETRY_LOGS;
  }

  newState.lastTickTimestamp = now;
  return newState;
}

/**
 * Collects floating resources from an organ or all organs (Clash of Clans resource bubble click).
 */
export function collectOrganResources(state: GameState, organId?: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  let totalNut = 0;
  let totalOx = 0;
  let totalWat = 0;
  let totalHor = 0;

  for (const organ of newState.organs) {
    if (!organId || organ.id === organId) {
      const nut = Math.floor(organ.uncollectedNutrients || 0);
      const ox = Math.floor(organ.uncollectedOxygen || 0);
      const wat = Math.floor(organ.uncollectedWater || 0);
      const hor = Math.floor(organ.uncollectedHormones || 0);

      totalNut += nut;
      totalOx += ox;
      totalWat += wat;
      totalHor += hor;

      organ.uncollectedNutrients = 0;
      organ.uncollectedOxygen = 0;
      organ.uncollectedWater = 0;
      organ.uncollectedHormones = 0;
    }
  }

  if (totalNut > 0 || totalOx > 0 || totalWat > 0 || totalHor > 0) {
    newState.currencies.nutrients = Math.min(newState.currencies.maxNutrients, newState.currencies.nutrients + totalNut);
    newState.currencies.oxygen = Math.min(newState.currencies.maxOxygen, newState.currencies.oxygen + totalOx);
    newState.currencies.water = Math.min(newState.currencies.maxWater, newState.currencies.water + totalWat);
    newState.currencies.hormones += totalHor;

    newState.totalResourcesHarvested += totalNut + totalOx + totalWat;
    newState.nutrientsHarvested = (newState.nutrientsHarvested || 0) + totalNut;
    newState.oxygenHarvested = (newState.oxygenHarvested || 0) + totalOx;
    soundEffects.playPopResource();
  }

  return newState;
}

/**
 * Activates temporary Adrenaline Rush (3x blood velocity, faster mitosis and production).
 */
export function activateAdrenalineRush(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  soundEffects.playHormoneRush();
  newState.activeBoosts = [
    ...newState.activeBoosts.filter((b) => b.type !== 'ADRENALINE'),
    {
      type: 'ADRENALINE',
      name: 'Adrenaline Surge',
      remainingSeconds: 20,
      multiplier: 3.0,
      description: '3x Blood velocity and accelerated metabolic synthesis',
    },
  ];
  return newState;
}

/**
 * Collects floating resources from ALL organs in one tap.
 */
export function collectAllOrganResources(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  let totalNut = 0;
  let totalOx = 0;
  let totalWat = 0;
  let totalHor = 0;

  for (const organ of newState.organs) {
    totalNut += Math.floor(organ.uncollectedNutrients || 0);
    totalOx += Math.floor(organ.uncollectedOxygen || 0);
    totalWat += Math.floor(organ.uncollectedWater || 0);
    totalHor += Math.floor(organ.uncollectedHormones || 0);

    organ.uncollectedNutrients = 0;
    organ.uncollectedOxygen = 0;
    organ.uncollectedWater = 0;
    organ.uncollectedHormones = 0;
  }

  if (totalNut > 0 || totalOx > 0 || totalWat > 0 || totalHor > 0) {
    newState.currencies.nutrients = Math.min(newState.currencies.maxNutrients, newState.currencies.nutrients + totalNut);
    newState.currencies.oxygen = Math.min(newState.currencies.maxOxygen, newState.currencies.oxygen + totalOx);
    newState.currencies.water = Math.min(newState.currencies.maxWater, newState.currencies.water + totalWat);
    newState.currencies.hormones += totalHor;

    newState.totalResourcesHarvested += totalNut + totalOx + totalWat;
    newState.nutrientsHarvested = (newState.nutrientsHarvested || 0) + totalNut;
    newState.oxygenHarvested = (newState.oxygenHarvested || 0) + totalOx;
    soundEffects.playPopResource();
  }

  return newState;
}

/**
 * Urination & Liquid Waste Clearing (Kidneys / Bladder).
 * Flushes accumulated urine, lowers BUN blood toxicity, and rewards +XP and hydration!
 */
export function urinateAndClearWaste(state: GameState, organId?: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  let clearedCount = 0;
  for (const organ of newState.organs) {
    if (organ.type === 'KIDNEY_EXCRET' || organ.type === 'BLADDER_EXCRET') {
      if (!organId || organ.id === organId) {
        if (organ.uncollectedUrine > 5) {
          clearedCount += organ.uncollectedUrine;
          organ.uncollectedUrine = 0;
        }
      }
    }
  }

  // No urine cleared means no reward. Without this the button paid out on empty.
  if (clearedCount <= 0) return state;

  const bunReduction = Math.max(10, Math.min(45, clearedCount / 2 + 12));
  newState.vitals.toxicityBun = Math.max(8, parseFloat((newState.vitals.toxicityBun - bunReduction).toFixed(1)));
  newState.totalWasteClearedCount += 1;

  // Reward player with small nutrient/hydration bonus and XP
  newState.currencies.nutrients = Math.min(newState.currencies.maxNutrients, newState.currencies.nutrients + 25);
  newState.currencies.water = Math.min(newState.currencies.maxWater, newState.currencies.water + 30);
  newState.pvpScore += 15;

  soundEffects.playFlushWaste();

  newState.telemetryLogs.unshift({
    id: `urinate_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'TREATMENT_APPLIED',
    details: `🚽 URINATION COMPLETE: Flushed toxic urea waste! Blood BUN lowered by -${bunReduction} mg/dL to a healthy ${newState.vitals.toxicityBun} mg/dL.`,
    scoreImpact: 15,
    metabolicEfficiency: 95,
    renalFiltrationEfficiency: 98,
    immuneReadinessScore: 90,
  });

  return newState;
}

/**
 * Excretion & Solid Waste Clearing (Colon / Large Intestine).
 * Flushes solid digestive residue, cleans gut toxicity, and gives energy bonus!
 */
export function excreteAndClearWaste(state: GameState, organId?: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  let cleared = 0;
  for (const organ of newState.organs) {
    if (organ.type === 'COLON_DIGEST') {
      if (!organId || organ.id === organId) {
        if (organ.uncollectedExcretion > 5) {
          cleared += organ.uncollectedExcretion;
          organ.uncollectedExcretion = 0;
        }
      }
    }
  }

  // Same guard as urination: an empty colon pays nothing.
  if (cleared <= 0) return state;

  newState.vitals.toxicityBun = Math.max(7, parseFloat((newState.vitals.toxicityBun - 10).toFixed(1)));
  newState.currencies.nutrients = Math.min(newState.currencies.maxNutrients, newState.currencies.nutrients + 50);
  newState.pvpScore += 20;
  newState.totalWasteClearedCount += 1;

  soundEffects.playFlushWaste();

  newState.telemetryLogs.unshift({
    id: `excrete_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'TREATMENT_APPLIED',
    details: `🧻 EXCRETION COMPLETE: Cleared solid digestive waste from the colon! +50 Nutrients recycled into fuel.`,
    scoreImpact: 20,
    metabolicEfficiency: 95,
    renalFiltrationEfficiency: 95,
    immuneReadinessScore: 90,
  });

  return newState;
}

/**
 * Tapping an organ directly gives an instant small production boost (Click to Generate!).
 */
export function tapOrganForBoost(state: GameState, organId: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const organ = newState.organs.find((o) => o.id === organId);
  if (!organ) return state;

  // Rate-limit taps. Uncapped, tap-then-flush was infinite nutrients.
  const now = Date.now();
  if (organ.lastTapTime && now - organ.lastTapTime < TAP_COOLDOWN_MS) return state;
  organ.lastTapTime = now;

  organ.tapCount = (organ.tapCount || 0) + 1;

  if (organ.type === 'BRAIN_CNS') {
    organ.uncollectedNutrients = Math.min(100, (organ.uncollectedNutrients || 0) + 3);
    organ.uncollectedOxygen = Math.min(100, (organ.uncollectedOxygen || 0) + 2);
  } else if (organ.type === 'STOMACH_DIGEST' || organ.type === 'INTESTINE_DIGEST') {
    organ.uncollectedNutrients = Math.min(150, (organ.uncollectedNutrients || 0) + 4);
  } else if (organ.type === 'LUNGS_RESP' || organ.type === 'TRACHEA_RESP') {
    organ.uncollectedOxygen = Math.min(150, (organ.uncollectedOxygen || 0) + 4);
  } else if (organ.type === 'HEART_CARDIO') {
    organ.uncollectedWater = Math.min(100, (organ.uncollectedWater || 0) + 3);
    soundEffects.playHeartbeat(85);
  } else if (organ.type === 'KIDNEY_EXCRET' || organ.type === 'BLADDER_EXCRET') {
    organ.uncollectedUrine = Math.min(100, (organ.uncollectedUrine || 0) + 4);
  } else if (organ.type === 'COLON_DIGEST') {
    organ.uncollectedExcretion = Math.min(100, (organ.uncollectedExcretion || 0) + 4);
  }

  soundEffects.playPopResource();
  return newState;
}

/**
 * Builds and places a new organ onto the SimCity base grid.
 * Enforces Brain (Town Hall) level requirement and max count per base!
 */
export function placeNewOrgan(state: GameState, type: OrganType, x: number, y: number): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const def = ORGAN_DEFINITIONS[type];
  if (!def) return state;

  const brain = newState.organs.find((o) => o.type === 'BRAIN_CNS');
  const brainLvl = brain ? brain.level : 1;

  // Check brain level requirement
  if (def.unlockedAtBrainLevel > brainLvl) {
    return state; // Locked by Brain Level
  }

  // Check max per base
  const currentCount = newState.organs.filter((o) => o.type === type).length;
  if (currentCount >= def.maxPerBase) {
    return state; // Max reached
  }

  // Check cost
  const nutCost = def.baseCost.nutrients;
  const oxCost = def.baseCost.oxygen;
  const watCost = def.baseCost.water || 0;

  if (
    newState.currencies.nutrients < nutCost ||
    newState.currencies.oxygen < oxCost ||
    newState.currencies.water < watCost
  ) {
    return state; // Insufficient funds
  }

  newState.currencies.nutrients -= nutCost;
  newState.currencies.oxygen -= oxCost;
  newState.currencies.water -= watCost;

  const newId = `${type.toLowerCase()}_${Date.now()}`;
  const newOrgan: OrganNode = {
    id: newId,
    type,
    name: def.name,
    level: 1,
    maxLevel: 12, // CoC tables run to L12
    x,
    y,
    width: 130,
    height: 100,
    hp: def.baseHp,
    maxHp: def.baseHp,
    status: 'OPTIMAL',
    lastProductionTime: Date.now(),
    bloodFlowEfficiency: 0.6,
    oxygenSaturation: 0.95,
    toxicityLevel: 10,
    repairCost: {
      nutrients: Math.round(nutCost * 0.5),
      oxygen: Math.round(oxCost * 0.5),
    },
    uncollectedNutrients: 10,
    uncollectedOxygen: 10,
    uncollectedWater: 10,
    uncollectedHormones: 0,
    uncollectedUrine: 0,
    uncollectedExcretion: 0,
    tapCount: 0,
  };

  newState.organs.push(newOrgan);
  newState.selectedOrganId = newId;

  // Auto-connect to nearest Heart if exists
  const heart = newState.organs.find((o) => o.type === 'HEART_CARDIO');
  if (heart && heart.id !== newId) {
    newState.vessels.push({
      id: `v_${heart.id}_${newId}`,
      fromNodeId: heart.id,
      toNodeId: newId,
      type: 'ARTERY',
      level: 1,
      capacity: 50,
      flowSpeed: 1.4,
    });
    newOrgan.bloodFlowEfficiency = 1.0;
  }

  soundEffects.playUpgradeComplete();

  newState.telemetryLogs.unshift({
    id: `build_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'ORGAN_UPGRADE',
    details: `🏗️ Built new ${def.name} on your base! System: ${def.systemName}.`,
    scoreImpact: 30,
    metabolicEfficiency: 95,
    renalFiltrationEfficiency: 95,
    immuneReadinessScore: 90,
  });

  return newState;
}

/**
 * Connects two organs with a vessel road (Artery, Vein, Nerve, Lymphatic).
 */
export function connectVesselRoad(
  state: GameState,
  fromNodeId: string,
  toNodeId: string,
  vesselType: VesselType = 'ARTERY'
): GameState {
  if (fromNodeId === toNodeId) return state;
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const fromNode = newState.organs.find((o) => o.id === fromNodeId);
  const toNode = newState.organs.find((o) => o.id === toNodeId);
  if (!fromNode || !toNode) return state;

  const exists = newState.vessels.some(
    (v) =>
      (v.fromNodeId === fromNodeId && v.toNodeId === toNodeId) ||
      (v.fromNodeId === toNodeId && v.toNodeId === fromNodeId)
  );
  if (exists) return state;

  const cost = { nutrients: 25, oxygen: 20 };
  if (newState.currencies.nutrients < cost.nutrients || newState.currencies.oxygen < cost.oxygen) {
    return state;
  }

  newState.currencies.nutrients -= cost.nutrients;
  newState.currencies.oxygen -= cost.oxygen;

  newState.vessels.push({
    id: `v_${fromNodeId}_${toNodeId}_${Date.now()}`,
    fromNodeId,
    toNodeId,
    type: vesselType,
    level: 1,
    capacity: 60,
    flowSpeed: 1.5,
  });

  // Boost blood flow efficiency
  if (fromNode.type === 'HEART_CARDIO' || toNode.type === 'HEART_CARDIO') {
    fromNode.bloodFlowEfficiency = 1.0;
    toNode.bloodFlowEfficiency = 1.0;
  }

  soundEffects.playRoadConnect();
  return newState;
}

/**
 * Cost and duration to take an organ from `currentLevel` to the next level.
 *
 * The Brain reads an explicit table (BRAIN_UPGRADE_CURVE) because it gates all
 * progression and needs hand-tuned pacing. Other organs use an exponential
 * curve where time (1.55x) outgrows cost (1.45x) per level, so the wait becomes
 * the binding constraint at high levels rather than the resources.
 */
/**
 * Which resource an organ primarily PRODUCES (nutrients=Gold, oxygen=Elixir).
 * Non-producers default to 'nutrients'.
 */
export function producedResource(type: OrganType): 'nutrients' | 'oxygen' {
  const o = ORGAN_DEFINITIONS[type].outputs;
  const nut = o.nutrientsPerSec || 0;
  const oxy = o.oxygenPerSec || 0;
  return oxy > nut ? 'oxygen' : 'nutrients';
}

/**
 * Which resource an organ's UPGRADE is paid in — the CoC cross-resource rule:
 * you pay for a producer with the OTHER resource (a Gold Mine costs Elixir and
 * vice-versa), which forces a balanced base. Non-producers (defense, filtration,
 * endocrine) are "Gold sinks" and cost nutrients, like CoC defenses and walls.
 */
export function upgradeCostResource(type: OrganType): 'nutrients' | 'oxygen' {
  const o = ORGAN_DEFINITIONS[type].outputs;
  const nut = o.nutrientsPerSec || 0;
  const oxy = o.oxygenPerSec || 0;
  if (oxy > nut && oxy > 0) return 'nutrients'; // oxygen producer → pay nutrients
  if (nut > 0) return 'oxygen'; // nutrient producer → pay oxygen
  return 'nutrients'; // non-producer → pay nutrients (Gold sink)
}

export function getUpgradeCost(
  type: OrganType,
  currentLevel: number
): { nutrients: number; oxygen: number; seconds: number } {
  const archetype = ORGAN_ARCHETYPE[type];
  const amount = cocUpgradeCost(archetype, currentLevel);
  const seconds = cocUpgradeSeconds(archetype, currentLevel);

  // Brain = Town Hall, and CoC's Town Hall is paid in Gold ALONE — so ours costs
  // nutrients alone. (Splitting it across both tracks would wall on oxygen, which
  // has fewer storage organs behind it.)
  if (type === 'BRAIN_CNS') {
    return { nutrients: amount, oxygen: 0, seconds };
  }

  // Every other organ: the full CoC cost in a SINGLE resource — the other one —
  // which is CoC's own cross-resource rule (a Gold Mine is paid for in Elixir).
  return upgradeCostResource(type) === 'oxygen'
    ? { nutrients: 0, oxygen: amount, seconds }
    : { nutrients: amount, oxygen: 0, seconds };
}

/**
 * Hormone (hard-currency) price to instantly finish an upgrade — a function of
 * the REMAINING TIME only, never the resource cost, exactly like CoC's gem skip.
 * This is CoC's documented continuous piecewise-linear curve with knots at
 * 1 min → 1, 1 h → 20, 1 day → 260, 1 week → 1000 gems, rounded up in-game.
 */
export function hormoneCostToFinish(remainingSeconds: number): number {
  const x = Math.max(0, remainingSeconds);
  let y: number;
  if (x <= 60) y = 1;
  else if (x <= 3600) y = 1 + (19 / 3540) * (x - 60);
  else if (x <= 86400) y = 20 + (240 / 82800) * (x - 3600);
  else y = 260 + (740 / 518400) * (x - 86400);
  return Math.max(1, Math.ceil(y));
}

/**
 * Starts upgrading an organ.
 */
export function startOrganUpgrade(state: GameState, organId: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const organ = newState.organs.find((o) => o.id === organId);
  if (!organ || organ.status === 'UNDER_UPGRADE' || organ.level >= organ.maxLevel) return state;

  // Mitotic builders gate concurrency. This is the scarcity the economy sells against.
  const buildersInUse = newState.organs.filter((o) => o.status === 'UNDER_UPGRADE').length;
  const builderCapacity = newState.builderCount || BASE_BUILDER_COUNT;
  if (buildersInUse >= builderCapacity) return state;

  const def = ORGAN_DEFINITIONS[organ.type];
  const { nutrients: costNutrients, oxygen: costOxygen, seconds: durationSec } = getUpgradeCost(
    organ.type,
    organ.level
  );

  if (newState.currencies.nutrients < costNutrients || newState.currencies.oxygen < costOxygen) {
    return state;
  }

  // Check brain level requirement for higher level organs
  const brain = newState.organs.find((o) => o.type === 'BRAIN_CNS');
  const brainLvl = brain ? brain.level : 1;
  if (organ.type !== 'BRAIN_CNS' && brainLvl < requiredBrainLevelFor(organ.type, organ.level + 1)) {
    return state; // Organ level capped by Brain Town Center level
  }

  newState.currencies.nutrients -= costNutrients;
  newState.currencies.oxygen -= costOxygen;
  organ.status = 'UNDER_UPGRADE';
  organ.upgradeDurationSeconds = durationSec;
  organ.upgradeEndTime = Date.now() + durationSec * 1000;

  soundEffects.playResourceChime();
  return newState;
}

/**
 * Instantly completes an upgrade using Hormones (Growth Hormone catalyst).
 */
export function instantCompleteUpgradeWithHormone(state: GameState, organId: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const organ = newState.organs.find((o) => o.id === organId);
  if (!organ || organ.status !== 'UNDER_UPGRADE') return state;

  // Price the skip on the REMAINING time only (CoC gem model).
  const remainingSec = organ.upgradeEndTime
    ? Math.max(0, (organ.upgradeEndTime - Date.now()) / 1000)
    : 0;
  const cost = hormoneCostToFinish(remainingSec);
  if (newState.currencies.hormones < cost) return state;

  newState.currencies.hormones -= cost;
  organ.level += 1;
  const def = ORGAN_DEFINITIONS[organ.type];
  organ.maxHp = Math.round(def.baseHp * (1 + (organ.level - 1) * 0.4));
  organ.hp = organ.maxHp;
  organ.status = 'OPTIMAL';
  organ.upgradeEndTime = undefined;
  organ.upgradeDurationSeconds = undefined;

  soundEffects.playHormoneRush();
  soundEffects.playUpgradeComplete();

  return newState;
}

/**
 * Repairs a damaged organ.
 */
export function repairOrgan(state: GameState, organId: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const organ = newState.organs.find((o) => o.id === organId);
  if (!organ) return state;

  const cost = organ.repairCost;
  if (newState.currencies.nutrients < cost.nutrients || newState.currencies.oxygen < cost.oxygen) {
    return state;
  }

  newState.currencies.nutrients -= cost.nutrients;
  newState.currencies.oxygen -= cost.oxygen;
  organ.hp = organ.maxHp;
  organ.status = 'OPTIMAL';
  organ.toxicityLevel = 10;

  soundEffects.playUpgradeComplete();
  return newState;
}

/**
 * Calculates progress across all 11 human body systems.
 */
export function calculateBodySystemsProgress(state: GameState): {
  systems: BodySystemInfo[];
  completedCount: number;
  totalSystems: number;
  overallPercent: number;
  totalOrgansBuilt: number;
} {
  const builtOrganTypes = new Set(state.organs.map((o) => o.type));

  const systems: BodySystemInfo[] = ALL_BODY_SYSTEMS.map((sys) => {
    const builtCount = sys.organTypes.filter((t) => builtOrganTypes.has(t)).length;
    const totalAvailable = sys.organTypes.length;
    const isComplete = builtCount > 0 && builtCount >= totalAvailable;

    return {
      key: sys.key,
      name: sys.name,
      emoji: sys.emoji,
      description: sys.description,
      organTypes: sys.organTypes,
      isComplete,
      builtCount,
      totalAvailable,
    };
  });

  const completedCount = systems.filter((s) => s.builtCount > 0).length;
  const totalSystems = ALL_BODY_SYSTEMS.length;
  const overallPercent = Math.round((completedCount / totalSystems) * 100);

  return {
    systems,
    completedCount,
    totalSystems,
    overallPercent,
    totalOrgansBuilt: state.organs.length,
  };
}

/**
 * Offline progression.
 *
 * lastTickTimestamp was written every tick and never read, so nothing happened
 * while the game was backgrounded or closed - the reason to come back in a
 * builder. This accrues production into each organ's collector for the elapsed
 * time (you return to full bubbles to harvest, Clash-of-Clans style), completes
 * any upgrades that finished, and raises waste - but caps waste below the
 * necrosis threshold so you never return to a destroyed base. Client-side and
 * therefore exploitable by clock-rolling; the server-authoritative clock in the
 * plan replaces this, but the mechanic and its shape stay the same.
 */
export interface OfflineReport {
  seconds: number;
  nutrients: number;
  oxygen: number;
  water: number;
  upgradesCompleted: number;
  wasteRose: boolean;
}

const OFFLINE_MIN_SECONDS = 60; // ignore short gaps
const OFFLINE_CAP_SECONDS = 8 * 3600; // accrue at most 8h
const OFFLINE_BUN_CEILING = 70; // cap offline waste; on return production may be throttled (never below the 10% floor) until the player flushes

export function applyOfflineProgress(
  state: GameState,
  now: number = Date.now()
): { state: GameState; report: OfflineReport | null } {
  const elapsed = Math.floor((now - state.lastTickTimestamp) / 1000);
  if (!Number.isFinite(elapsed) || elapsed < OFFLINE_MIN_SECONDS) {
    return { state: { ...state, lastTickTimestamp: now }, report: null };
  }
  const seconds = Math.min(OFFLINE_CAP_SECONDS, elapsed);
  const newState: GameState = JSON.parse(JSON.stringify(state));

  let gainedNut = 0;
  let gainedOx = 0;
  let gainedWat = 0;
  let upgradesCompleted = 0;
  let totalWaste = 0;
  let totalFiltration = 0;

  for (const organ of newState.organs) {
    const def = ORGAN_DEFINITIONS[organ.type];
    if (!def) continue;

    // Complete an upgrade that finished while away.
    if (organ.status === 'UNDER_UPGRADE' && organ.upgradeEndTime && now >= organ.upgradeEndTime) {
      organ.level += 1;
      organ.maxHp = Math.round(def.baseHp * (1 + (organ.level - 1) * 0.4));
      organ.hp = organ.maxHp;
      organ.status = 'OPTIMAL';
      organ.upgradeEndTime = undefined;
      organ.upgradeDurationSeconds = undefined;
      upgradesCompleted += 1;
    }
    if (organ.status === 'DAMAGED_DESTROYED') continue;

    const levelMult = productionLevelMultiplier(organ.level);
    const eff = (organ.bloodFlowEfficiency || 0.6) * (organ.hp / organ.maxHp);
    // Same CoC collector rate and on-tile capacity as the live tick, so an organ
    // banks at most its own capacity while you are away (CoC's collectors do too).
    const cap = cocCollectorCapacity(organ.level);
    const cocRate = cocProductionPerSecond(organ.level);

    if (def.outputs.nutrientsPerSec) {
      const before = organ.uncollectedNutrients || 0;
      organ.uncollectedNutrients = Math.min(cap, before + cocRate * eff * seconds);
      gainedNut += organ.uncollectedNutrients - before;
    }
    if (def.outputs.oxygenPerSec) {
      const before = organ.uncollectedOxygen || 0;
      organ.uncollectedOxygen = Math.min(cap, before + cocRate * eff * seconds);
      gainedOx += organ.uncollectedOxygen - before;
    }
    if (def.outputs.waterPerSec) {
      const before = organ.uncollectedWater || 0;
      organ.uncollectedWater = Math.min(cap, before + cocRate * eff * seconds);
      gainedWat += organ.uncollectedWater - before;
    }
    if (organ.type === 'KIDNEY_EXCRET' || organ.type === 'BLADDER_EXCRET') {
      organ.uncollectedUrine = Math.min(100, (organ.uncollectedUrine || 0) + 1.2 * levelMult * seconds);
    }
    if (organ.type === 'COLON_DIGEST') {
      organ.uncollectedExcretion = Math.min(100, (organ.uncollectedExcretion || 0) + 1.5 * levelMult * seconds);
    }
    if (def.outputs.filtrationPerSec) totalFiltration += def.outputs.filtrationPerSec * levelMult * eff;
    totalWaste += (def.metabolicWastePerSec || 0.4) * levelMult;
  }

  // Waste rises over the window but is clamped below the necrosis line.
  const kidneyPresent = newState.organs.some((o) => o.type === 'KIDNEY_EXCRET' && o.hp > 0);
  const netPerSec = totalWaste - (kidneyPresent ? totalFiltration : 0.2);
  const projected = newState.vitals.toxicityBun + netPerSec * 0.35 * seconds;
  const wasteRose = projected > newState.vitals.toxicityBun + 1;
  newState.vitals.toxicityBun = parseFloat(
    Math.max(5, Math.min(OFFLINE_BUN_CEILING, projected)).toFixed(1)
  );

  // Deposits (and any due Gem Box) accumulate while away, exactly as in the tick.
  spawnObstaclesForElapsed(newState, now);

  newState.lastTickTimestamp = now;

  const report: OfflineReport = {
    seconds,
    nutrients: Math.floor(gainedNut),
    oxygen: Math.floor(gainedOx),
    water: Math.floor(gainedWat),
    upgradesCompleted,
    wasteRose,
  };

  const mins = Math.round(seconds / 60);
  const timeStr = mins >= 60 ? `${(mins / 60).toFixed(1)} h` : `${mins} min`;
  newState.telemetryLogs.unshift({
    id: `offline_${now}`,
    timestamp: now,
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'RESOURCE_COLLECTED',
    details: `🌙 While you were away (${timeStr}): organs produced +${report.nutrients} nutrients, +${report.oxygen} oxygen. Tap the bubbles to harvest!${report.wasteRose ? ' Waste built up — clear it.' : ''}`,
    scoreImpact: 5,
    metabolicEfficiency: 90,
    renalFiltrationEfficiency: 85,
    immuneReadinessScore: 90,
  });

  return { state: newState, report };
}

/**
 * Buy an extra Mitotic Builder with hormones (the primary hard-currency sink).
 * Prices come from BUILDER_GEM_COSTS for the 3rd, 4th and 5th builder.
 */
/**
 * TESTING OVERRIDE — grants one raid's worth of loot without a combat module.
 *
 * CoC's Town Hall costs assume raiding is the main income at higher levels;
 * collectors are only a trickle. Combat is parked, so this stands in for it so
 * the economy can be paced and balanced honestly. It is NOT a game feature and
 * must be removed (or replaced by real combat) before shipping.
 *
 * The payout follows CoC's actual loot rules rather than an arbitrary number, so
 * testing sees the same consequence real raiding would produce:
 *  - Available loot from a same-level opponent's storages is a TH-scaled share:
 *    20% up to TH6, falling ~2 points per level after, floored at 10%. We use the
 *    player's own storage cap as the proxy for a comparable opponent's holdings.
 *  - Plus a League Bonus: a fixed payout independent of what the defender holds,
 *    which is what guarantees every successful attack pays something.
 * Loot is clamped by storage capacity, exactly like a real collection.
 */
export function simulateRaidIncome(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const hqLevel = newState.organs.find((o) => o.type === 'BRAIN_CNS')?.level ?? 1;

  const lootPct = hqLevel <= 6 ? 0.2 : Math.max(0.1, 0.2 - 0.02 * (hqLevel - 6));
  const leagueBonus = Math.round(cocStorageCapacity(hqLevel) * 0.02);

  const nutrientLoot = Math.round(newState.currencies.maxNutrients * lootPct) + leagueBonus;
  const oxygenLoot = Math.round(newState.currencies.maxOxygen * lootPct) + leagueBonus;

  newState.currencies.nutrients = Math.min(
    newState.currencies.maxNutrients,
    newState.currencies.nutrients + nutrientLoot
  );
  newState.currencies.oxygen = Math.min(
    newState.currencies.maxOxygen,
    newState.currencies.oxygen + oxygenLoot
  );
  newState.totalResourcesHarvested += nutrientLoot + oxygenLoot;
  newState.nutrientsHarvested = (newState.nutrientsHarvested || 0) + nutrientLoot;
  newState.oxygenHarvested = (newState.oxygenHarvested || 0) + oxygenLoot;

  newState.telemetryLogs.unshift({
    id: `raid_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'RESOURCE_COLLECTED',
    details: `⚔️ [TEST] Raid returned +${nutrientLoot.toLocaleString()} nutrients, +${oxygenLoot.toLocaleString()} oxygen (${Math.round(lootPct * 100)}% loot + league bonus).`,
    scoreImpact: 5,
    metabolicEfficiency: 90,
    renalFiltrationEfficiency: 90,
    immuneReadinessScore: 90,
  });

  soundEffects.playResourceChime();
  return newState;
}


// ---------------------------------------------------------------------------
// GEM FAUCET — obstacles, Gem Box and achievements (CoC's free-player income)
// ---------------------------------------------------------------------------

const DEPOSIT_NAMES = [
  'Plaque Deposit', 'Calcium Spur', 'Fat Globule', 'Scar Tissue',
  'Cholesterol Plaque', 'Uric Crystal', 'Fibrous Clot', 'Mucus Buildup',
];

function randomObstaclePosition(): { x: number; y: number } {
  // Spread across the body map, biased outward so deposits ring the organs
  // (CoC spawns obstacles on empty tiles, favouring the edges).
  const angle = Math.random() * Math.PI * 2;
  const radius = 180 + Math.random() * 190;
  return {
    x: Math.round(360 + Math.cos(angle) * radius),
    y: Math.round(300 + Math.sin(angle) * radius * 0.85),
  };
}

/**
 * Spawns obstacles for the time elapsed since the last spawn, and the Gem Box
 * when its timer is due. Shared by the live tick and offline progression so a
 * returning player finds the deposits that accumulated while away.
 * CoC: one obstacle per 8 hours, at most 45 at a time; the Gem Box ignores that
 * cap, is unique, and reappears every 1-2 weeks.
 */
export function spawnObstaclesForElapsed(state: GameState, now: number): void {
  state.obstacles = state.obstacles || [];
  const last = state.lastObstacleSpawnAt || now;
  const due = Math.floor((now - last) / (COC_OBSTACLE_SPAWN_SECONDS * 1000));
  if (due > 0) {
    const regular = state.obstacles.filter((o) => o.kind !== 'GEM_BOX').length;
    const room = Math.max(0, COC_MAX_OBSTACLES - regular);
    const toAdd = Math.min(due, room);
    for (let i = 0; i < toAdd; i++) {
      const pos = randomObstaclePosition();
      state.obstacles.push({
        id: `obs_${now}_${i}_${Math.floor(Math.random() * 1e6)}`,
        kind: 'TOXIN_DEPOSIT',
        name: DEPOSIT_NAMES[Math.floor(Math.random() * DEPOSIT_NAMES.length)],
        x: pos.x,
        y: pos.y,
        clearCost: COC_OBSTACLE_CLEAR_COST,
      });
    }
    // Advance the clock even when the map was full, so spawns don't all burst
    // out at once the moment a slot frees up.
    state.lastObstacleSpawnAt = last + due * COC_OBSTACLE_SPAWN_SECONDS * 1000;
  }

  // Gem Box: unique, ignores the obstacle cap.
  const hasGemBox = state.obstacles.some((o) => o.kind === 'GEM_BOX');
  if (!hasGemBox && now >= (state.nextGemBoxAt || 0)) {
    const pos = randomObstaclePosition();
    state.obstacles.push({
      id: `gembox_${now}`,
      kind: 'GEM_BOX',
      name: 'Hormone Crystal',
      x: pos.x,
      y: pos.y,
      clearCost: COC_GEM_BOX_CLEAR_COST,
    });
  }
}

/**
 * Clears a deposit: pays the nutrient cost and pays out hormones. Regular
 * deposits follow CoC's fixed 20-value cycle (average exactly 2 gems); the Gem
 * Box always pays 25 and schedules the next one 1-2 weeks out.
 */
export function clearObstacle(state: GameState, obstacleId: string): GameState {
  const obstacle = (state.obstacles || []).find((o) => o.id === obstacleId);
  if (!obstacle) return state;
  if (state.currencies.nutrients < obstacle.clearCost) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.currencies.nutrients -= obstacle.clearCost;
  newState.obstacles = newState.obstacles.filter((o) => o.id !== obstacleId);
  newState.obstaclesCleared = (newState.obstaclesCleared || 0) + 1;

  let gems: number;
  if (obstacle.kind === 'GEM_BOX') {
    gems = COC_GEM_BOX_VALUE;
    const span = COC_GEM_BOX_RESPAWN_MAX_SECONDS - COC_GEM_BOX_RESPAWN_MIN_SECONDS;
    newState.nextGemBoxAt =
      Date.now() + (COC_GEM_BOX_RESPAWN_MIN_SECONDS + Math.random() * span) * 1000;
  } else {
    gems = cocObstacleGems(newState.obstacleClearIndex || 0);
    newState.obstacleClearIndex = (newState.obstacleClearIndex || 0) + 1;
  }
  newState.currencies.hormones += gems;

  newState.telemetryLogs.unshift({
    id: `obs_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'RESOURCE_COLLECTED',
    details:
      obstacle.kind === 'GEM_BOX'
        ? `💎 Cleared a ${obstacle.name} — +${gems} hormones!`
        : `🧹 Cleared ${obstacle.name} — ${gems > 0 ? `+${gems} hormones` : 'no hormones this time'}.`,
    scoreImpact: 2,
    metabolicEfficiency: 92,
    renalFiltrationEfficiency: 92,
    immuneReadinessScore: 92,
  });

  if (gems > 0) soundEffects.playHormoneRush();
  return newState;
}

export interface AchievementProgress {
  id: string;
  name: string;
  label: string;
  current: number;
  tiersClaimed: number;
  /** Next unclaimed tier, or null when every tier is claimed. */
  nextThreshold: number | null;
  nextGems: number;
  /** Tiers earned but not yet collected. */
  claimableTiers: number;
  claimableGems: number;
  totalTiers: number;
}

function achievementMetric(state: GameState, metric: string): number {
  switch (metric) {
    case 'brainLevel':
      return state.organs.find((o) => o.type === 'BRAIN_CNS')?.level ?? 1;
    case 'storageLevel':
      return state.organs
        .filter((o) => STORAGE_ORGANS.has(o.type))
        .reduce((max, o) => Math.max(max, o.level), 0);
    case 'nutrientsHarvested':
      return Math.floor(state.nutrientsHarvested || 0);
    case 'oxygenHarvested':
      return Math.floor(state.oxygenHarvested || 0);
    case 'obstaclesCleared':
      return state.obstaclesCleared || 0;
    case 'builderCount':
      return state.builderCount || BASE_BUILDER_COUNT;
    default:
      return 0;
  }
}

/** Progress across every gem-paying achievement. */
export function getAchievementProgress(state: GameState): AchievementProgress[] {
  return COC_ACHIEVEMENTS.map((a) => {
    const current = achievementMetric(state, a.metric);
    const claimed = state.achievementTiersClaimed?.[a.id] ?? 0;
    const earned = a.tiers.filter((t) => current >= t.threshold).length;
    const claimableTiers = Math.max(0, earned - claimed);
    const claimableGems = a.tiers
      .slice(claimed, earned)
      .reduce((sum, t) => sum + t.gems, 0);
    const next = a.tiers[claimed];
    return {
      id: a.id,
      name: a.name,
      label: a.label,
      current,
      tiersClaimed: claimed,
      nextThreshold: next ? next.threshold : null,
      nextGems: next ? next.gems : 0,
      claimableTiers,
      claimableGems,
      totalTiers: a.tiers.length,
    };
  });
}

/** Collects every earned-but-unclaimed tier of one achievement. */
export function claimAchievement(state: GameState, achievementId: string): GameState {
  const def = COC_ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!def) return state;
  const progress = getAchievementProgress(state).find((p) => p.id === achievementId);
  if (!progress || progress.claimableTiers <= 0) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.currencies.hormones += progress.claimableGems;
  newState.achievementTiersClaimed = {
    ...(newState.achievementTiersClaimed || {}),
    [achievementId]: progress.tiersClaimed + progress.claimableTiers,
  };
  newState.telemetryLogs.unshift({
    id: `ach_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'RESOURCE_COLLECTED',
    details: `🏆 Achievement "${def.name}" — collected +${progress.claimableGems} hormones.`,
    scoreImpact: 10,
    metabolicEfficiency: 95,
    renalFiltrationEfficiency: 95,
    immuneReadinessScore: 95,
  });
  soundEffects.playHormoneRush();
  return newState;
}

/** Total hormones waiting to be collected from achievements. */
export function totalClaimableAchievementGems(state: GameState): number {
  return getAchievementProgress(state).reduce((sum, p) => sum + p.claimableGems, 0);
}

export function purchaseBuilder(state: GameState): GameState {
  const current = state.builderCount || BASE_BUILDER_COUNT;
  if (current >= MAX_BUILDER_COUNT) return state;

  const cost = BUILDER_GEM_COSTS[current - BASE_BUILDER_COUNT];
  if (cost === undefined || state.currencies.hormones < cost) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.currencies.hormones -= cost;
  newState.builderCount = current + 1;
  soundEffects.playUpgradeComplete();

  newState.telemetryLogs.unshift({
    id: `builder_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'ORGAN_UPGRADE',
    details: `🧬 Cultured a new Mitotic Builder! You can now upgrade ${newState.builderCount} organs at once.`,
    scoreImpact: 15,
    metabolicEfficiency: 95,
    renalFiltrationEfficiency: 95,
    immuneReadinessScore: 95,
  });
  return newState;
}

/** Cost of the next builder, or null if maxed. For UI. */
export function nextBuilderCost(state: GameState): number | null {
  const current = state.builderCount || BASE_BUILDER_COUNT;
  if (current >= MAX_BUILDER_COUNT) return null;
  return BUILDER_GEM_COSTS[current - BASE_BUILDER_COUNT] ?? null;
}
