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
  cocBuildCost,
  cocBuildSeconds,
  cocBoostCost,
  COC_BOOST_MULTIPLIER,
  COC_BOOST_DURATION_SECONDS,
  COC_GEM_MINE_PER_DAY,
  COC_ACHIEVEMENTS,
  COC_GEM_BOX_VALUE,
  COC_OBSTACLE_SPAWN_SECONDS,
  COC_MAX_OBSTACLES,
  COC_GEM_BOX_RESPAWN_MIN_SECONDS,
  COC_GEM_BOX_RESPAWN_MAX_SECONDS,
  COC_OBSTACLE_CLEAR_COST,
  COC_GEM_BOX_CLEAR_COST,
  COC_STAR_BONUS_STARS_REQUIRED,
  COC_STAR_BONUS_RESET_SECONDS,
  COC_STAR_BONUS_MAX_STACK,
  STAR_BONUS_CAP_SHARE,
  TREASURY_CAPACITY_MULTIPLE,
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
  /** Star Bonus (CoC's daily-return loop) and the raid-protected Treasury. */
  starsEarned: number;
  bonusesAvailable: number;
  nextBonusAt: number;
  treasuryNutrients: number;
  treasuryOxygen: number;
  starBonusesClaimed: number;
  /** Waste held by the excretory system, in production units. */
  wasteLoad: number;
  /** Timestamp before which another raid cannot be sent. */
  nextRaidAt: number;
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
    nutrients: 750,
    maxNutrients: 1000, // CoC Town Hall L1 storage
    oxygen: 750,
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
    starsEarned: 0,
    bonusesAvailable: 1,
    nextBonusAt: Date.now() + COC_STAR_BONUS_RESET_SECONDS * 1000,
    treasuryNutrients: 0,
    treasuryOxygen: 0,
    starBonusesClaimed: 0,
    wasteLoad: 0,
    nextRaidAt: 0,
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
  // A new Star Bonus becomes available every 24h, stacking to at most two.
  refreshStarBonusAvailability(newState, now);

  // 2. Identify Active Organ Capacities & Storage

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

  // Walk the vessel network once: who the arteries actually reach, and which
  // organs have a venous path for their waste.
  const circulation = computeCirculation(newState.organs, newState.vessels);

  let hasNecrosisWarning = false;

  // Waste is a by-product of production. It collects in the excretory organs
  // over hours; once they are full it backs up and throttles every producer,
  // gradually, down to a 10% floor. One flush empties it. (See WASTE below.)
  const wasteCap = excretoryCapacity(newState, circulation);
  const toxicityFactor = wasteThrottleFactor(newState.wasteLoad || 0, wasteCap);
  let producedUnits = 0;

  // 3. Process Each Organ Node
  for (const organ of newState.organs) {
    const def = ORGAN_DEFINITIONS[organ.type];
    if (!def) continue;

    // Check upgrade timers
    if (organ.status === 'UNDER_UPGRADE' && organ.upgradeEndTime) {
      if (now >= organ.upgradeEndTime) {
        if (organ.constructing) organ.constructing = false;
        else organ.level += 1;
        organ.maxHp = Math.round(def.baseHp * (1 + (organ.level - 1) * 0.4));
        organ.hp = organ.maxHp;
        organ.status = 'OPTIMAL';
        organ.upgradeEndTime = undefined;
        organ.upgradeDurationSeconds = undefined;
        soundEffects.playUpgradeComplete();
        grantStar(newState, `${organ.name} upgraded`);

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
    // Arterial supply from the real network: full at the heart, decaying per hop,
    // and never below the diffusion floor so an unplumbed organ still works.
    if (newState.organs.length === 1) {
      organ.bloodFlowEfficiency = 1.0; // a lone HQ needs no plumbing
    } else if (!heartFunctional) {
      organ.bloodFlowEfficiency = NO_HEART_SUPPLY;
    } else {
      organ.bloodFlowEfficiency = Math.max(
        ARTERY_UNSUPPLIED_FLOOR,
        circulation.arterialSupply.get(organ.id) ?? 0
      );
    }
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

    // A building under construction or upgrade does no work in CoC.
    const working = organ.status !== 'UNDER_UPGRADE';
    const boost = organ.boostedUntil && now < organ.boostedUntil ? COC_BOOST_MULTIPLIER : 1;
    if (working && def.outputs.nutrientsPerSec) {
      const before = organ.uncollectedNutrients;
      const nutGen = cocRate * efficiencyMult * speedMultiplier * boost * toxicityFactor;
      organ.uncollectedNutrients = Math.min(organCollectorCap, before + nutGen);
      producedUnits += organ.uncollectedNutrients - before;
    }
    if (working && def.outputs.oxygenPerSec) {
      const before = organ.uncollectedOxygen;
      const oxGen = cocRate * efficiencyMult * speedMultiplier * boost * toxicityFactor;
      organ.uncollectedOxygen = Math.min(organCollectorCap, before + oxGen);
      producedUnits += organ.uncollectedOxygen - before;
    }
    if (working && def.outputs.waterPerSec) {
      const watGen = cocRate * efficiencyMult * toxicityFactor;
      organ.uncollectedWater = Math.min(organCollectorCap, organ.uncollectedWater + watGen);
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

  }

  // 4. Waste accrues with what was actually produced this tick.
  newState.wasteLoad = Math.min(
    wasteCap * WASTE_OVERFLOW_LIMIT,
    (newState.wasteLoad || 0) + producedUnits * wasteReliefFactor(newState, circulation)
  );
  const wasteFill = wasteCap > 0 ? newState.wasteLoad / wasteCap : 0;
  newState.vitals.wasteFillPct = Math.round(wasteFill * 100);
  // The blood-urea vital is now a readout of how backed-up the system is.
  newState.vitals.toxicityBun = Math.round(5 + Math.min(WASTE_OVERFLOW_LIMIT, wasteFill) * 75);
  // The excretory organs' bubbles show how full they are.
  for (const organ of newState.organs) {
    if (organ.type === 'KIDNEY_EXCRET' || organ.type === 'BLADDER_EXCRET') {
      organ.uncollectedUrine = Math.min(100, Math.round(wasteFill * 100));
    } else if (organ.type === 'COLON_DIGEST') {
      organ.uncollectedExcretion = Math.min(100, Math.round(wasteFill * 100));
    }
  }

  // 5. Throttle warning (no death loop): waste never damages an organ. Organs
  // are flagged "sick" only as a visual cue, and recover the moment it is flushed.
  const wasteThrottled = toxicityFactor < 1;
  const wasteHeavilyThrottled = toxicityFactor <= 0.55;
  const wasteAtFloor = toxicityFactor <= WASTE_MIN_FACTOR + 1e-6;
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
      details: `🛑 WASTE BACKUP: your kidneys and bladder are overflowing, so output is throttled to ${pct}%. Flush to restore it — nothing is lost.`,
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
 * Empties the excretory system. This is the whole remedy for a waste backup:
 * free, instant, and worth a Star Bonus star. It pays no resources — flushing
 * restores output, it is not an income source.
 */
export function flushWaste(state: GameState): GameState {
  const cap = excretoryCapacity(state, computeCirculation(state.organs, state.vessels));
  // Nothing worth flushing: do not hand out a star for an empty system.
  if ((state.wasteLoad || 0) < cap * WASTE_MIN_FLUSH_FILL) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const pct = Math.round(((newState.wasteLoad || 0) / cap) * 100);
  newState.wasteLoad = 0;
  newState.vitals.wasteFillPct = 0;
  newState.vitals.toxicityBun = 5;
  for (const organ of newState.organs) {
    organ.uncollectedUrine = 0;
    organ.uncollectedExcretion = 0;
  }
  newState.totalWasteClearedCount += 1;
  grantStar(newState, 'waste flushed');
  soundEffects.playFlushWaste();
  newState.telemetryLogs.unshift({
    id: `flush_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'TREATMENT_APPLIED',
    details: `🚽 Flushed the excretory system (was ${pct}% full). Output is back to normal.`,
    scoreImpact: 10,
    metabolicEfficiency: 95,
    renalFiltrationEfficiency: 98,
    immuneReadinessScore: 90,
  });
  return newState;
}

/** Both flush buttons empty the one shared system. */
export function urinateAndClearWaste(state: GameState, _organId?: string): GameState {
  return flushWaste(state);
}
export function excreteAndClearWaste(state: GameState, _organId?: string): GameState {
  return flushWaste(state);
}

/**
 * Tapping an organ directly gives an instant small production boost (Click to Generate!).
 */
export function tapOrganForBoost(state: GameState, organId: string): GameState {
  // Tapping an organ collects what it has produced, exactly as tapping a
  // collector does in CoC. It creates nothing: tap-generated resources used to
  // out-earn real production by more than 200x.
  return collectOrganResources(state, organId);
}

/** Why an organ cannot be placed right now, or null if it can. */
export type PlacementBlock = 'LOCKED' | 'MAX' | 'COLLECTOR_CAP' | 'NO_BUILDER' | 'COST' | null;

export interface PlacementInfo {
  cost: { nutrients: number; oxygen: number };
  seconds: number;
  blocked: PlacementBlock;
  /** For producers: how many of this resource's producers exist / are allowed. */
  collectorCount: number;
  collectorCap: number;
}

/**
 * Everything the build menu needs to know about placing an organ. Cost and build
 * time are CoC's first-build values for the organ's archetype, paid in the
 * cross resource; producers are also capped at CoC's collectors-per-Town-Hall
 * count, per resource (Gold Mines and Elixir Collectors are counted separately).
 */
export function getPlacementInfo(state: GameState, type: OrganType): PlacementInfo {
  const def = ORGAN_DEFINITIONS[type];
  const archetype = ORGAN_ARCHETYPE[type];
  const amount = cocBuildCost(archetype);
  const cost =
    upgradeCostResource(type) === 'oxygen'
      ? { nutrients: 0, oxygen: amount }
      : { nutrients: amount, oxygen: 0 };
  const brainLvl = state.organs.find((o) => o.type === 'BRAIN_CNS')?.level ?? 1;

  const isCollector = archetype === 'COLLECTOR';
  const track = producedResource(type);
  const collectorCount = isCollector
    ? state.organs.filter(
        (o) => ORGAN_ARCHETYPE[o.type] === 'COLLECTOR' && producedResource(o.type) === track
      ).length
    : 0;
  const collectorCap = isCollector ? cocCollectorCount(brainLvl) : 0;

  let blocked: PlacementBlock = null;
  const builders = state.builderCount || BASE_BUILDER_COUNT;
  const busy = state.organs.filter((o) => o.status === 'UNDER_UPGRADE').length;
  if (def.unlockedAtBrainLevel > brainLvl) blocked = 'LOCKED';
  else if (state.organs.filter((o) => o.type === type).length >= def.maxPerBase) blocked = 'MAX';
  else if (isCollector && collectorCount >= collectorCap) blocked = 'COLLECTOR_CAP';
  else if (busy >= builders) blocked = 'NO_BUILDER';
  else if (state.currencies.nutrients < cost.nutrients || state.currencies.oxygen < cost.oxygen)
    blocked = 'COST';

  return { cost, seconds: cocBuildSeconds(archetype), blocked, collectorCount, collectorCap };
}

/**
 * Places a new organ. As in CoC, a new building costs its first-build price,
 * takes its first-build time and occupies a builder until it is done.
 */
export function placeNewOrgan(state: GameState, type: OrganType, x: number, y: number): GameState {
  const def = ORGAN_DEFINITIONS[type];
  if (!def) return state;
  const info = getPlacementInfo(state, type);
  if (info.blocked) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.currencies.nutrients -= info.cost.nutrients;
  newState.currencies.oxygen -= info.cost.oxygen;

  const newId = `${type.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
  const repair = getUpgradeCost(type, 1);
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
    status: 'UNDER_UPGRADE',
    constructing: true,
    upgradeDurationSeconds: info.seconds,
    upgradeEndTime: Date.now() + info.seconds * 1000,
    lastProductionTime: Date.now(),
    bloodFlowEfficiency: ARTERY_UNSUPPLIED_FLOOR,
    oxygenSaturation: 0.95,
    toxicityLevel: 10,
    repairCost: {
      nutrients: Math.round(repair.nutrients * 0.5),
      oxygen: Math.round(repair.oxygen * 0.5),
    },
    uncollectedNutrients: 0,
    uncollectedOxygen: 0,
    uncollectedWater: 0,
    uncollectedHormones: 0,
    uncollectedUrine: 0,
    uncollectedExcretion: 0,
    tapCount: 0,
  };
  newState.organs.push(newOrgan);
  newState.selectedOrganId = newId;

  // New organs are deliberately NOT auto-connected to the heart: arterial
  // plumbing is the player's decision. Unconnected, an organ still runs at the
  // diffusion floor, so this is a throughput choice, never a dead building.

  soundEffects.playUpgradeComplete();
  newState.telemetryLogs.unshift({
    id: `build_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'ORGAN_UPGRADE',
    details: `🏗️ Started building ${def.name}. System: ${def.systemName}.`,
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

// ---------------------------------------------------------------------------
// WASTE — AnatoClash's own system (CoC has nothing like it).
//
// Waste is a by-product of production: every unit of nutrients or oxygen an
// organ makes adds a unit of waste. It is held by the excretory organs, sized in
// "hours of one same-level producer", so a base whose kidneys keep pace with its
// producers fills in roughly 5 to 12 hours, and a neglected one in 2 or 3 — the same rhythm as CoC's collectors
// filling up, and the same reason to come back.
//
// Past capacity it backs up: output falls gradually to a 10% floor (never zero,
// nothing is ever damaged) until the player flushes, which is free and instant.
// Veins matter: an excretory organ with no venous path holds only a fraction.
// ---------------------------------------------------------------------------

/** Waste the body tolerates with no excretory organs at all. */
export const WASTE_BODY_BUFFER = 2400;
/** Capacity of each excretory organ, in hours of one same-level producer. */
export const KIDNEY_CAPACITY_HOURS = 24;
export const BLADDER_CAPACITY_HOURS = 16;
export const COLON_CAPACITY_HOURS = 16;
export const LYMPH_CAPACITY_HOURS = 6;
/** Waste can back up to this multiple of capacity; the throttle bottoms out there. */
export const WASTE_OVERFLOW_LIMIT = 1.5;
/** Output never falls below this share of normal. */
export const WASTE_MIN_FACTOR = 0.1;
/** A flush does nothing (and earns nothing) below this fill. */
export const WASTE_MIN_FLUSH_FILL = 0.1;
/** A veined liver neutralises this share of waste per level, up to the cap. */
export const LIVER_RELIEF_PER_LEVEL = 0.05;
export const LIVER_RELIEF_CAP = 0.3;

/** How much waste the excretory system can hold before it backs up. */
export function excretoryCapacity(state: GameState, circulation: CirculationResult): number {
  let cap = WASTE_BODY_BUFFER;
  for (const organ of state.organs) {
    if (organ.status === 'DAMAGED_DESTROYED' || organ.constructing) continue;
    const perHour = cocProductionPerSecond(organ.level) * 3600;
    const venous = circulation.venousDrained.has(organ.id) ? 1 : VENOUS_UNCONNECTED_FACTOR;
    if (organ.type === 'KIDNEY_EXCRET') cap += KIDNEY_CAPACITY_HOURS * perHour * venous;
    else if (organ.type === 'BLADDER_EXCRET') cap += BLADDER_CAPACITY_HOURS * perHour * venous;
    else if (organ.type === 'COLON_DIGEST') cap += COLON_CAPACITY_HOURS * perHour * venous;
    else if (
      (organ.type === 'LYMPH_NODE_IMMUNE' || organ.type === 'SPLEEN_IMMUNE') &&
      circulation.lymphaticDrained.has(organ.id)
    ) {
      cap += LYMPH_CAPACITY_HOURS * perHour;
    }
  }
  return cap;
}

/** Production multiplier for a given waste load: 1 until full, then down to the floor. */
export function wasteThrottleFactor(load: number, capacity: number): number {
  if (capacity <= 0) return 1;
  const fill = load / capacity;
  if (fill <= 1) return 1;
  const t = Math.min(1, (fill - 1) / (WASTE_OVERFLOW_LIMIT - 1));
  return 1 - t * (1 - WASTE_MIN_FACTOR);
}

/** Share of produced waste that actually accumulates (a veined liver neutralises some). */
export function wasteReliefFactor(state: GameState, circulation: CirculationResult): number {
  let relief = 0;
  for (const organ of state.organs) {
    if (organ.type !== 'LIVER_METABOLIC' || organ.status === 'DAMAGED_DESTROYED') continue;
    if (!circulation.venousDrained.has(organ.id)) continue;
    relief = Math.max(relief, Math.min(LIVER_RELIEF_CAP, organ.level * LIVER_RELIEF_PER_LEVEL));
  }
  return 1 - relief;
}

// ---------------------------------------------------------------------------
// CIRCULATION — AnatoClash's own system, not a CoC mechanic.
//
// CoC has no analogue for this: its buildings work wherever you drop them. Here
// the base is a body, so plumbing is the point. Vessels form a real network and
// each type does a different job:
//
//   ARTERY    carries oxygenated blood OUT from the heart. An organ's output
//             scales with the arterial supply that actually reaches it, which
//             decays with every hop, so sprawl costs you throughput.
//   VEIN      carries metabolic waste BACK to the filtration organs. A kidney
//             with no venous path has nothing to filter — this is what makes
//             the waste system a plumbing problem rather than a stat check.
//   LYMPHATIC drains interstitial fluid, adding secondary waste tolerance.
//
// Nothing here can zero an organ out: unplumbed organs fall to a floor and keep
// working, preserving the no-death-loop law.
// ---------------------------------------------------------------------------

/**
 * Vessels lose pressure over DISTANCE, not per connection. A short artery is
 * nearly lossless; a long one bleeds supply, so keeping organs tight around the
 * heart is worth real throughput and sprawl has a price.
 *
 * A run shorter than the free length costs almost nothing; past that, efficiency
 * falls off with length. Thicker (higher-level) vessels carry further.
 */
export const VESSEL_FREE_LENGTH = 130;
export const VESSEL_LOSS_PER_100PX = 0.14;
/** Floor for one vessel, so a single hop always beats no connection at all. */
export const VESSEL_MIN_EFFICIENCY = 0.45;
/** Each vessel level cuts the distance penalty by this fraction. */
export const VESSEL_LEVEL_RELIEF = 0.25;

/** Efficiency retained across one vessel of a given pixel length and level. */
export function vesselEfficiency(length: number, level: number): number {
  const over = Math.max(0, length - VESSEL_FREE_LENGTH);
  const relief = 1 + (Math.max(1, level) - 1) * VESSEL_LEVEL_RELIEF;
  const loss = (over / 100) * (VESSEL_LOSS_PER_100PX / relief);
  return Math.max(VESSEL_MIN_EFFICIENCY, Math.min(1, 1 - loss));
}
/** Supply an organ still receives with no arterial path (diffusion). */
export const ARTERY_UNSUPPLIED_FLOOR = 0.35;
/** Supply when the heart itself is down. */
export const NO_HEART_SUPPLY = 0.25;
/** Filtration retained by an excretory organ with no venous path. */
export const VENOUS_UNCONNECTED_FACTOR = 0.3;

export interface CirculationResult {
  /** organId -> arterial supply, 0..1. */
  arterialSupply: Map<string, number>;
  /** Organs with a venous path to at least one waste producer. */
  venousDrained: Set<string>;
  /** Organs on a lymphatic line. */
  lymphaticDrained: Set<string>;
  /** Hops from the heart, for UI. */
  hopsFromHeart: Map<string, number>;
}

function adjacency(
  vessels: VesselConnection[],
  type: VesselType,
  positions?: Map<string, { x: number; y: number }>
): Map<string, { to: string; level: number; length: number }[]> {
  const adj = new Map<string, { to: string; level: number; length: number }[]>();
  const lengthOf = (a: string, b: string) => {
    const pa = positions?.get(a);
    const pb = positions?.get(b);
    if (!pa || !pb) return 0;
    return Math.hypot(pa.x - pb.x, pa.y - pb.y);
  };
  for (const v of vessels) {
    if (v.type !== type) continue;
    if (!adj.has(v.fromNodeId)) adj.set(v.fromNodeId, []);
    if (!adj.has(v.toNodeId)) adj.set(v.toNodeId, []);
    const len = lengthOf(v.fromNodeId, v.toNodeId);
    const level = v.level || 1;
    adj.get(v.fromNodeId)!.push({ to: v.toNodeId, level, length: len });
    adj.get(v.toNodeId)!.push({ to: v.fromNodeId, level, length: len });
  }
  return adj;
}

/**
 * Walks the vessel graph and works out what actually reaches each organ.
 * Arterial supply is a breadth-first spread from the heart; a higher-level
 * vessel loses less per hop, so upgrading a trunk line is worth something.
 */
export function computeCirculation(
  organs: OrganNode[],
  vessels: VesselConnection[]
): CirculationResult {
  const arterialSupply = new Map<string, number>();
  const hopsFromHeart = new Map<string, number>();
  const venousDrained = new Set<string>();
  const lymphaticDrained = new Set<string>();

  const alive = organs.filter((o) => o.status !== 'DAMAGED_DESTROYED');
  const heart = alive.find((o) => o.type === 'HEART_CARDIO');

  // --- Arterial spread from the heart ---
  if (heart) {
    const positions = new Map(alive.map((o) => [o.id, { x: o.x, y: o.y }] as const));
    const arteries = adjacency(vessels, 'ARTERY', positions);
    const queue: string[] = [heart.id];
    arterialSupply.set(heart.id, 1);
    hopsFromHeart.set(heart.id, 0);
    while (queue.length) {
      const id = queue.shift()!;
      const supply = arterialSupply.get(id)!;
      for (const edge of arteries.get(id) || []) {
        // Longer runs lose more pressure; thicker vessels carry further.
        const next = supply * vesselEfficiency(edge.length, edge.level);
        if (next > (arterialSupply.get(edge.to) ?? 0)) {
          arterialSupply.set(edge.to, next);
          hopsFromHeart.set(edge.to, (hopsFromHeart.get(id) ?? 0) + 1);
          queue.push(edge.to);
        }
      }
    }
  }

  // --- Venous drainage: any organ sharing a vein component with a producer ---
  const veins = adjacency(vessels, 'VEIN');
  const producesWaste = new Set(
    alive
      .filter((o) => {
        const out = ORGAN_DEFINITIONS[o.type]?.outputs;
        return !!out && ((out.nutrientsPerSec ?? 0) > 0 || (out.oxygenPerSec ?? 0) > 0);
      })
      .map((o) => o.id)
  );
  const seen = new Set<string>();
  for (const organ of alive) {
    if (seen.has(organ.id)) continue;
    // Flood the component this organ belongs to.
    const component: string[] = [];
    const q = [organ.id];
    seen.add(organ.id);
    while (q.length) {
      const id = q.shift()!;
      component.push(id);
      for (const edge of veins.get(id) || []) {
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          q.push(edge.to);
        }
      }
    }
    // The component drains only if it actually contains something to drain.
    if (component.length > 1 && component.some((id) => producesWaste.has(id))) {
      for (const id of component) venousDrained.add(id);
    }
  }

  // --- Lymphatic lines ---
  const lymph = adjacency(vessels, 'LYMPHATIC');
  for (const [id, edges] of lymph) if (edges.length > 0) lymphaticDrained.add(id);

  return { arterialSupply, venousDrained, lymphaticDrained, hopsFromHeart };
}


/**
 * Vessel economy. No CoC table to copy here — the closest analogue is Walls,
 * which cost resources, complete INSTANTLY and never occupy a builder. Vessels
 * follow that model, so laying pipework never competes with organ upgrades for
 * builder slots. These numbers are ours, not CoC's.
 *
 * Cost scales with LENGTH: a long run is both less efficient and more expensive,
 * so sprawl is a real trade-off rather than a strictly worse free option.
 */
export const MAX_VESSEL_LEVEL = 5;
const VESSEL_LAY_BASE = { nutrients: 25, oxygen: 20 };
const VESSEL_LAY_PER_100PX = { nutrients: 15, oxygen: 12 };
const VESSEL_UPGRADE_BASE = { nutrients: 40, oxygen: 30 };
const VESSEL_UPGRADE_PER_100PX = { nutrients: 25, oxygen: 18 };
/** Each level costs this much more than the last. */
const VESSEL_UPGRADE_GROWTH = 1.8;

/** Pixel length of a vessel, from its endpoints' positions. */
export function vesselLength(state: GameState, vessel: VesselConnection): number {
  const a = state.organs.find((o) => o.id === vessel.fromNodeId);
  const b = state.organs.find((o) => o.id === vessel.toNodeId);
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** What it costs to lay a vessel of a given length. */
export function connectVesselCost(length: number): { nutrients: number; oxygen: number } {
  const hundreds = length / 100;
  return {
    nutrients: Math.round(VESSEL_LAY_BASE.nutrients + hundreds * VESSEL_LAY_PER_100PX.nutrients),
    oxygen: Math.round(VESSEL_LAY_BASE.oxygen + hundreds * VESSEL_LAY_PER_100PX.oxygen),
  };
}

/** What it costs to take a vessel from `level` to `level + 1`. */
export function vesselUpgradeCost(
  length: number,
  level: number
): { nutrients: number; oxygen: number } {
  const hundreds = length / 100;
  const growth = Math.pow(VESSEL_UPGRADE_GROWTH, Math.max(0, level - 1));
  return {
    nutrients: Math.round(
      (VESSEL_UPGRADE_BASE.nutrients + hundreds * VESSEL_UPGRADE_PER_100PX.nutrients) * growth
    ),
    oxygen: Math.round(
      (VESSEL_UPGRADE_BASE.oxygen + hundreds * VESSEL_UPGRADE_PER_100PX.oxygen) * growth
    ),
  };
}

/**
 * Thickens a vessel one level, which relieves its distance penalty — the point
 * of upgrading is to make a LONG trunk line viable. Instant and builder-free,
 * like a CoC wall.
 */
export function upgradeVessel(state: GameState, vesselId: string): GameState {
  const vessel = state.vessels.find((v) => v.id === vesselId);
  if (!vessel) return state;
  if ((vessel.level || 1) >= MAX_VESSEL_LEVEL) return state;

  const length = vesselLength(state, vessel);
  const cost = vesselUpgradeCost(length, vessel.level || 1);
  if (
    state.currencies.nutrients < cost.nutrients ||
    state.currencies.oxygen < cost.oxygen
  ) {
    return state;
  }

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const target = newState.vessels.find((v) => v.id === vesselId)!;
  newState.currencies.nutrients -= cost.nutrients;
  newState.currencies.oxygen -= cost.oxygen;
  target.level = (target.level || 1) + 1;
  target.capacity = Math.round((target.capacity || 60) * 1.35);

  const before = vesselEfficiency(length, target.level - 1);
  const after = vesselEfficiency(length, target.level);
  newState.telemetryLogs.unshift({
    id: `vessel_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'ORGAN_UPGRADE',
    details: `🩸 Widened a ${target.type.toLowerCase()} to level ${target.level} (${Math.round(length)}px) — throughput ${Math.round(before * 100)}% → ${Math.round(after * 100)}%.`,
    scoreImpact: 5,
    metabolicEfficiency: 92,
    renalFiltrationEfficiency: 92,
    immuneReadinessScore: 92,
  });
  soundEffects.playRoadConnect();
  return newState;
}

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

  // One vessel of each TYPE per pair: an organ can have both an artery and a vein
  // to the same neighbour, as real organs do. (This used to reject any second
  // vessel, which made it impossible to both supply and drain along one route.)
  const exists = newState.vessels.some(
    (v) =>
      v.type === vesselType &&
      ((v.fromNodeId === fromNodeId && v.toNodeId === toNodeId) ||
        (v.fromNodeId === toNodeId && v.toNodeId === fromNodeId))
  );
  if (exists) return state;

  // Longer runs cost more to lay, so distance is priced as well as throttled.
  const length = Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y);
  const cost = connectVesselCost(length);
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

  // Efficiency is no longer poked here: computeCirculation() derives it from the
  // real network every tick, so setting it by hand would just be overwritten.

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
  if (organ.constructing) organ.constructing = false;
  else organ.level += 1;
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

export function applyOfflineProgress(
  state: GameState,
  now: number = Date.now()
): { state: GameState; report: OfflineReport | null } {
  const elapsed = Math.floor((now - state.lastTickTimestamp) / 1000);
  if (!Number.isFinite(elapsed) || elapsed < OFFLINE_MIN_SECONDS) {
    return { state: { ...state, lastTickTimestamp: now }, report: null };
  }
  // No artificial cap: as in CoC, what limits an absence is each collector's own
  // capacity — and here, the waste that production leaves behind.
  const seconds = elapsed;
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const startMs = state.lastTickTimestamp;

  let gainedNut = 0;
  let gainedOx = 0;
  let gainedWat = 0;
  let upgradesCompleted = 0;

  // Finish anything that completed while away, remembering WHEN it came back
  // online so it only produces for the part of the window after that.
  const onlineFrom = new Map<string, number>();
  for (const organ of newState.organs) {
    const def = ORGAN_DEFINITIONS[organ.type];
    if (!def || organ.status !== 'UNDER_UPGRADE') continue;
    if (organ.upgradeEndTime && now >= organ.upgradeEndTime) {
      onlineFrom.set(organ.id, organ.upgradeEndTime);
      if (organ.constructing) organ.constructing = false;
      else organ.level += 1;
      organ.maxHp = Math.round(def.baseHp * (1 + (organ.level - 1) * 0.4));
      organ.hp = organ.maxHp;
      organ.status = 'OPTIMAL';
      organ.upgradeEndTime = undefined;
      organ.upgradeDurationSeconds = undefined;
      upgradesCompleted += 1;
      grantStar(newState, `${organ.name} upgraded`);
    } else {
      onlineFrom.set(organ.id, Infinity); // still building: no output
    }
  }

  // Walk the absence in slices so the waste throttle bites when it should,
  // rather than assuming full output for the whole window.
  const circulation = computeCirculation(newState.organs, newState.vessels);
  const wasteCap = excretoryCapacity(newState, circulation);
  const relief = wasteReliefFactor(newState, circulation);
  const steps = Math.max(1, Math.min(480, Math.ceil(seconds / 60)));
  const dt = seconds / steps;
  for (let i = 0; i < steps; i++) {
    const t = startMs + (i + 0.5) * dt * 1000;
    const throttle = wasteThrottleFactor(newState.wasteLoad || 0, wasteCap);
    let produced = 0;
    for (const organ of newState.organs) {
      const def = ORGAN_DEFINITIONS[organ.type];
      if (!def || organ.status === 'DAMAGED_DESTROYED') continue;
      if (t < (onlineFrom.get(organ.id) ?? 0)) continue;
      const supply = Math.max(
        ARTERY_UNSUPPLIED_FLOOR,
        organ.type === 'BRAIN_CNS' && newState.organs.length === 1
          ? 1
          : circulation.arterialSupply.get(organ.id) ?? 0
      );
      const boost = organ.boostedUntil && t < organ.boostedUntil ? COC_BOOST_MULTIPLIER : 1;
      const cap = cocCollectorCapacity(organ.level);
      const amount = cocProductionPerSecond(organ.level) * supply * boost * throttle * dt;
      if (def.outputs.nutrientsPerSec) {
        const before = organ.uncollectedNutrients || 0;
        organ.uncollectedNutrients = Math.min(cap, before + amount);
        gainedNut += organ.uncollectedNutrients - before;
        produced += organ.uncollectedNutrients - before;
      }
      if (def.outputs.oxygenPerSec) {
        const before = organ.uncollectedOxygen || 0;
        organ.uncollectedOxygen = Math.min(cap, before + amount);
        gainedOx += organ.uncollectedOxygen - before;
        produced += organ.uncollectedOxygen - before;
      }
      if (def.outputs.waterPerSec) {
        const before = organ.uncollectedWater || 0;
        organ.uncollectedWater = Math.min(cap, before + amount);
        gainedWat += organ.uncollectedWater - before;
      }
    }
    newState.wasteLoad = Math.min(
      wasteCap * WASTE_OVERFLOW_LIMIT,
      (newState.wasteLoad || 0) + produced * relief
    );
  }
  const wasteRose = (newState.wasteLoad || 0) >= wasteCap;

  // Deposits (and any due Gem Box) accumulate while away, exactly as in the tick.
  spawnObstaclesForElapsed(newState, now);
  refreshStarBonusAvailability(newState, now);

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
 * RAID INCOME — the game's raiding economy, without a combat module.
 *
 * CoC's Town Hall costs assume raiding is the main income at higher levels;
 * collectors are only a trickle. Rather than build combat, raiding is resolved
 * as a single action that pays out what a raid is worth. This is the intended
 * mechanism, not a placeholder: it supplies the income the economy is balanced
 * around, and a full combat module can replace it later without the economy
 * changing.
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
/**
 * A raid ties the army up for the length of a battle. CoC's battle timer is
 * three minutes and (since training time was removed) nothing else limits how
 * often you can attack, so that is the only limiter here too.
 */
export const RAID_COOLDOWN_SECONDS = 180;

export function simulateRaidIncome(state: GameState): GameState {
  if (Date.now() < (state.nextRaidAt || 0)) return state;
  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.nextRaidAt = Date.now() + RAID_COOLDOWN_SECONDS * 1000;
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
    details: `⚔️ Raid returned +${nutrientLoot.toLocaleString()} nutrients, +${oxygenLoot.toLocaleString()} oxygen (${Math.round(lootPct * 100)}% loot + league bonus).`,
    scoreImpact: 5,
    metabolicEfficiency: 90,
    renalFiltrationEfficiency: 90,
    immuneReadinessScore: 90,
  });

  grantStar(newState, 'raid won');
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
  grantStar(newState, `cleared ${obstacle.name}`);
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


// ---------------------------------------------------------------------------
// STAR BONUS — CoC's daily-return loop, paid into the raid-protected Treasury
// ---------------------------------------------------------------------------

/** One Star Bonus payout, scaled to the player's storage cap. */
export function starBonusReward(state: GameState): { nutrients: number; oxygen: number } {
  return {
    nutrients: Math.round(state.currencies.maxNutrients * STAR_BONUS_CAP_SHARE),
    oxygen: Math.round(state.currencies.maxOxygen * STAR_BONUS_CAP_SHARE),
  };
}

/** Treasury capacity — a few bonuses' worth, so it can bank while you are away. */
export function treasuryCapacity(state: GameState): { nutrients: number; oxygen: number } {
  const one = starBonusReward(state);
  return {
    nutrients: one.nutrients * TREASURY_CAPACITY_MULTIPLE,
    oxygen: one.oxygen * TREASURY_CAPACITY_MULTIPLE,
  };
}

/**
 * Makes a new Star Bonus available once its 24h timer elapses, up to the stack
 * limit of two. Called every tick and on return from offline.
 */
export function refreshStarBonusAvailability(state: GameState, now: number): void {
  if ((state.bonusesAvailable ?? 0) >= COC_STAR_BONUS_MAX_STACK) return;
  while (
    now >= (state.nextBonusAt || 0) &&
    (state.bonusesAvailable ?? 0) < COC_STAR_BONUS_MAX_STACK
  ) {
    state.bonusesAvailable = (state.bonusesAvailable ?? 0) + 1;
    state.nextBonusAt = (state.nextBonusAt || now) + COC_STAR_BONUS_RESET_SECONDS * 1000;
  }
}

/**
 * Awards a star for a qualifying action, and pays the bonus into the Treasury on
 * the fifth. Mutates `state` — callers pass their already-cloned newState.
 *
 * NOTE ON THE TRIGGER: CoC earns stars by attacking. Combat is parked, so stars
 * come from the meaningful daily actions this game does have — clearing a
 * deposit, finishing an upgrade, flushing waste, or winning a raid. The reward
 * rules around it are CoC's; only what earns a star differs.
 */
export function grantStar(state: GameState, reason: string): void {
  // CoC: stars scored while no bonus is available are simply lost.
  if ((state.bonusesAvailable ?? 0) <= 0) return;

  state.starsEarned = (state.starsEarned ?? 0) + 1;
  if (state.starsEarned < COC_STAR_BONUS_STARS_REQUIRED) return;

  const reward = starBonusReward(state);
  const cap = treasuryCapacity(state);
  state.treasuryNutrients = Math.min(cap.nutrients, (state.treasuryNutrients || 0) + reward.nutrients);
  state.treasuryOxygen = Math.min(cap.oxygen, (state.treasuryOxygen || 0) + reward.oxygen);
  state.bonusesAvailable = (state.bonusesAvailable ?? 1) - 1;
  state.starBonusesClaimed = (state.starBonusesClaimed || 0) + 1;

  // Excess stars only carry over while a second bonus is still available.
  const excess = state.starsEarned - COC_STAR_BONUS_STARS_REQUIRED;
  state.starsEarned = (state.bonusesAvailable ?? 0) > 0 ? excess : 0;

  // The next bonus arrives 24h after this one was completed.
  state.nextBonusAt = Date.now() + COC_STAR_BONUS_RESET_SECONDS * 1000;

  state.telemetryLogs.unshift({
    id: `star_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: state.playerName,
    eventType: 'RESOURCE_COLLECTED',
    details: `⭐ Daily Bonus complete (${reason})! +${reward.nutrients.toLocaleString()} nutrients, +${reward.oxygen.toLocaleString()} oxygen banked in the Treasury — safe from raids.`,
    scoreImpact: 15,
    metabolicEfficiency: 95,
    renalFiltrationEfficiency: 95,
    immuneReadinessScore: 95,
  });
  soundEffects.playHormoneRush();
}

/**
 * Moves Treasury loot into the normal storages. As in CoC, everything is
 * collected at once and anything that will not fit stays in the Treasury.
 */
export function collectTreasury(state: GameState): GameState {
  const haveN = state.treasuryNutrients || 0;
  const haveO = state.treasuryOxygen || 0;
  if (haveN <= 0 && haveO <= 0) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const roomN = Math.max(0, newState.currencies.maxNutrients - newState.currencies.nutrients);
  const roomO = Math.max(0, newState.currencies.maxOxygen - newState.currencies.oxygen);
  const movedN = Math.min(haveN, roomN);
  const movedO = Math.min(haveO, roomO);

  newState.currencies.nutrients += movedN;
  newState.currencies.oxygen += movedO;
  newState.treasuryNutrients = haveN - movedN;
  newState.treasuryOxygen = haveO - movedO;
  newState.totalResourcesHarvested += movedN + movedO;
  newState.nutrientsHarvested = (newState.nutrientsHarvested || 0) + movedN;
  newState.oxygenHarvested = (newState.oxygenHarvested || 0) + movedO;

  const leftover = newState.treasuryNutrients + newState.treasuryOxygen > 0;
  newState.telemetryLogs.unshift({
    id: `treasury_${Date.now()}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: newState.playerName,
    eventType: 'RESOURCE_COLLECTED',
    details: `🏦 Collected from the Treasury: +${movedN.toLocaleString()} nutrients, +${movedO.toLocaleString()} oxygen.${leftover ? ' Storage was full — the rest stays banked.' : ''}`,
    scoreImpact: 5,
    metabolicEfficiency: 93,
    renalFiltrationEfficiency: 93,
    immuneReadinessScore: 93,
  });
  soundEffects.playResourceChime();
  return newState;
}


// ---------------------------------------------------------------------------
// COLLECTOR BOOST — CoC's recurring gem sink, verbatim: double one collector's
// output for a day, level 5 and up only, priced by level (4 to 10 gems).
// ---------------------------------------------------------------------------

/** Hormone cost to boost this organ now, or null if it cannot be boosted. */
export function organBoostCost(organ: OrganNode): number | null {
  if (ORGAN_ARCHETYPE[organ.type] !== 'COLLECTOR') return null;
  const out = ORGAN_DEFINITIONS[organ.type].outputs;
  if (!out.nutrientsPerSec && !out.oxygenPerSec) return null;
  if (organ.constructing) return null;
  if (organ.boostedUntil && Date.now() < organ.boostedUntil) return null;
  return cocBoostCost(organ.level);
}

export function boostOrgan(state: GameState, organId: string): GameState {
  const organ = state.organs.find((o) => o.id === organId);
  if (!organ) return state;
  const cost = organBoostCost(organ);
  if (cost === null || state.currencies.hormones < cost) return state;
  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.currencies.hormones -= cost;
  newState.organs.find((o) => o.id === organId)!.boostedUntil =
    Date.now() + COC_BOOST_DURATION_SECONDS * 1000;
  soundEffects.playHormoneRush();
  return newState;
}

/** Total cost and count of every collector that could be boosted right now. */
export function boostAllQuote(state: GameState): { cost: number; count: number } {
  let cost = 0;
  let count = 0;
  for (const organ of state.organs) {
    const c = organBoostCost(organ);
    if (c !== null) {
      cost += c;
      count += 1;
    }
  }
  return { cost, count };
}

export function boostAllCollectors(state: GameState): GameState {
  const quote = boostAllQuote(state);
  if (quote.count === 0 || state.currencies.hormones < quote.cost) return state;
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const until = Date.now() + COC_BOOST_DURATION_SECONDS * 1000;
  for (const organ of newState.organs) {
    if (organBoostCost(organ) !== null) organ.boostedUntil = until;
  }
  newState.currencies.hormones -= quote.cost;
  soundEffects.playHormoneRush();
  return newState;
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
