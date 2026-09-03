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
} from '../types';
import {
  ORGAN_DEFINITIONS,
  ALL_BODY_SYSTEMS,
  IMMUNE_TROOPS_CATALOG,
  BRAIN_UPGRADE_CURVE,
  STORAGE_PER_BRAIN_LEVEL,
  BASE_BUILDER_COUNT,
  MAX_BUILDER_COUNT,
  BUILDER_GEM_COSTS,
  HEALTHY_WATER_RESERVE,
  TAP_COOLDOWN_MS,
  MAX_TELEMETRY_LOGS,
} from '../data/organData';
import { soundEffects } from './soundEffects';

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
    maxLevel: 8,
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
    maxNutrients: 600,
    oxygen: 200,
    maxOxygen: 500,
    water: 200,
    maxWater: 600,
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

  // 2. Identify Active Organ Capacities & Storage
  let totalFiltrationRate = 0;
  let totalMetabolicToxicity = 0;
  let totalDefenseArmor = 0;

  // The HQ level sets the storage ceiling; support organs add on top of it.
  const hqLevel = newState.organs.find((o) => o.type === 'BRAIN_CNS')?.level ?? 1;
  let maxNutrientStorage = STORAGE_PER_BRAIN_LEVEL(hqLevel, 600);
  let maxOxygenStorage = STORAGE_PER_BRAIN_LEVEL(hqLevel, 500);
  let maxWaterStorage = STORAGE_PER_BRAIN_LEVEL(hqLevel, 600);

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

    const levelMult = 1 + (organ.level - 1) * 0.35;
    const efficiencyMult = organ.bloodFlowEfficiency * (organ.hp / organ.maxHp);

    // Initialize collector fields if undefined
    organ.uncollectedNutrients = organ.uncollectedNutrients || 0;
    organ.uncollectedOxygen = organ.uncollectedOxygen || 0;
    organ.uncollectedWater = organ.uncollectedWater || 0;
    organ.uncollectedHormones = organ.uncollectedHormones || 0;
    organ.uncollectedUrine = organ.uncollectedUrine || 0;
    organ.uncollectedExcretion = organ.uncollectedExcretion || 0;
    organ.tapCount = organ.tapCount || 0;

    // Production into local uncollected collector bubble (max 200 per organ)
    const organCollectorCap = 150 * organ.level;

    if (def.outputs.nutrientsPerSec) {
      const nutGen = def.outputs.nutrientsPerSec * levelMult * efficiencyMult * speedMultiplier * toxicityFactor;
      organ.uncollectedNutrients = Math.min(organCollectorCap, organ.uncollectedNutrients + nutGen);
    }
    if (def.outputs.oxygenPerSec) {
      const oxGen = def.outputs.oxygenPerSec * levelMult * efficiencyMult * speedMultiplier * toxicityFactor;
      organ.uncollectedOxygen = Math.min(organCollectorCap, organ.uncollectedOxygen + oxGen);
    }
    if (def.outputs.waterPerSec) {
      const watGen = def.outputs.waterPerSec * levelMult * efficiencyMult * toxicityFactor;
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

    // Storage expansions (CoC "Storage" buildings). Storage scales with the
    // organ's LEVEL, so leveling a store is a real alternative to leveling a
    // producer — the storage cap is the binding constraint in CoC.
    //   Nutrient (Gold) stores: Liver, Muscle, Stomach, Intestine.
    //   Oxygen (Elixir) stores: Liver, Lungs.
    // Skeleton is no longer a store — it is purely defensive now.
    if (organ.type === 'LIVER_METABOLIC') {
      maxNutrientStorage += 400 * organ.level;
      maxOxygenStorage += 300 * organ.level;
      maxWaterStorage += 400 * organ.level;
    }
    if (organ.type === 'MUSCLE_TISSUE') {
      // Glycogen/protein store.
      maxNutrientStorage += 350 * organ.level;
    }
    if (organ.type === 'STOMACH_DIGEST' || organ.type === 'INTESTINE_DIGEST') {
      // Digestive holding capacity grows with the organ.
      maxNutrientStorage += 250 * organ.level;
    }
    if (organ.type === 'LUNGS_RESP') {
      // Alveolar reserve holds oxygen.
      maxOxygenStorage += 300 * organ.level;
    }

    // Endocrine tissue yields hormone gems. Read from the definition so any
    // gland that declares hormoneChance contributes (adrenal, thymus, brain).
    if (def.outputs.hormoneChance && Math.random() < def.outputs.hormoneChance) {
      organ.uncollectedHormones = Math.min(10, organ.uncollectedHormones + 1);
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
    maxLevel: 8,
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
  const def = ORGAN_DEFINITIONS[type];

  // Brain = Town Hall: special dual-resource curve (the HQ is the one building
  // that binds both tracks at once).
  if (type === 'BRAIN_CNS') {
    const step = BRAIN_UPGRADE_CURVE.find((s) => s.toLevel === currentLevel + 1);
    if (step) {
      return { nutrients: step.nutrients, oxygen: step.oxygen, seconds: step.seconds };
    }
    // Past the table: extrapolate from the last defined step.
    const last = BRAIN_UPGRADE_CURVE[BRAIN_UPGRADE_CURVE.length - 1];
    const over = currentLevel + 1 - last.toLevel;
    return {
      nutrients: Math.round(last.nutrients * Math.pow(2.2, over)),
      oxygen: Math.round(last.oxygen * Math.pow(2.2, over)),
      seconds: Math.round(last.seconds * Math.pow(2.5, over)),
    };
  }

  // Every other organ: full cost in a SINGLE resource (cross-resource coupling).
  const n = Math.max(0, currentLevel - 1);
  const base = def.baseCost.nutrients + def.baseCost.oxygen;
  const amount = Math.round(base * Math.pow(1.45, n + 1));
  const seconds = Math.round(def.baseUpgradeSeconds * Math.pow(1.55, n));

  return upgradeCostResource(type) === 'oxygen'
    ? { nutrients: 0, oxygen: amount, seconds }
    : { nutrients: amount, oxygen: 0, seconds };
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
  if (organ.type !== 'BRAIN_CNS' && organ.level >= brainLvl + 1) {
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

  if (newState.currencies.hormones < 1) return state;

  newState.currencies.hormones -= 1;
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

    const levelMult = 1 + (organ.level - 1) * 0.35;
    const eff = (organ.bloodFlowEfficiency || 0.6) * (organ.hp / organ.maxHp);
    const cap = 150 * organ.level;

    if (def.outputs.nutrientsPerSec) {
      const before = organ.uncollectedNutrients || 0;
      organ.uncollectedNutrients = Math.min(cap, before + def.outputs.nutrientsPerSec * levelMult * eff * seconds);
      gainedNut += organ.uncollectedNutrients - before;
    }
    if (def.outputs.oxygenPerSec) {
      const before = organ.uncollectedOxygen || 0;
      organ.uncollectedOxygen = Math.min(cap, before + def.outputs.oxygenPerSec * levelMult * eff * seconds);
      gainedOx += organ.uncollectedOxygen - before;
    }
    if (def.outputs.waterPerSec) {
      const before = organ.uncollectedWater || 0;
      organ.uncollectedWater = Math.min(cap, before + def.outputs.waterPerSec * levelMult * eff * seconds);
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
