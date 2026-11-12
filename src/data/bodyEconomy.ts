/**
 * BODY ECONOMY — how CoC's verbatim tables become a body of real organs.
 *
 * CoC's numbers stay untouched in cocTables.ts. This file maps them onto the
 * body, and every number in it that is NOT CoC's lives in CALIBRATION below,
 * each with the reason it exists.
 *
 * THE MODEL
 *   Nutrients  one currency, carrying what CoC splits into Gold and Elixir: a
 *              food maker earns a Gold Mine's AND an Elixir Collector's output,
 *              and every cost is CoC's price in whichever resource CoC charged.
 *   Oxygen     not a currency. Breathing organs SUPPLY it; every other organ
 *              DEMANDS it, more at higher levels. A build or upgrade is allowed
 *              only if demand afterwards still fits within supply.
 *   Waste      food in reverse: made with every nutrient, cleared out of the
 *              blood by the kidneys (and large intestine) into the bladder and
 *              rectum, emptied by a free flush. Left in the blood, it slows the
 *              body down to a 10% floor — never to zero.
 *
 * WHICH CoC BUDGET EACH GROUP OF ORGANS CARRIES
 *   Food makers + helpers  CoC Gold Mines        (7 organs = CoC's 7, same unlock
 *                                                 schedule: CoC's table verbatim)
 *   Breathing              CoC Elixir Collectors (5 organs for CoC's 7)
 *   Food stores            CoC Gold Storages     (2 organs for CoC's 4)
 *   Waste system           CoC Elixir Storages   (7 organs for CoC's 4)
 *   Brain                  CoC Town Hall (verbatim)
 *   Heart, spinal cord, walls, glands, defence: CoC's Cannon table (verbatim);
 *   like CoC's defences they sit outside the collector/storage budget.
 *
 * WHERE THE BODY HAS A DIFFERENT NUMBER OF ORGANS THAN CoC HAS BUILDINGS, the
 * group's CoC total at each Town Hall level is split across the real organs:
 *   level L of such an organ is the L-th Town Hall step at which that CoC budget
 *   grows; its cost, build time and stat are CoC's growth at that step divided
 *   by the number of organs in the group. On pace, the group's totals (spend,
 *   builder time, capacity, output) therefore equal CoC's at every Brain level.
 */
import { OrganType } from '../types';
import { ORGAN_DEFINITIONS, ORGAN_ECONOMY, EconomyTable, OrganRole } from './organData';
import {
  COC_COLLECTOR,
  COC_STORAGE,
  COC_DEFENSE,
  COC_TOWN_HALL,
  COC_TH_REQUIRED,
  cocCollectorCount,
  cocStorageCount,
  cocMaxLevelForTownHall,
} from './cocTables';

export const MAX_BRAIN_LEVEL = 12;

// ===========================================================================
// CALIBRATION — every constant here is ours, not CoC's.
// ===========================================================================
export const CALIBRATION = {
  /** Oxygen demand per unit of oxygenWeight at each body stage (stage = the
   *  Brain level a building level belongs to). Grows ~1.5x per stage so later
   *  levels weigh more; the absolute scale only sets how big the numbers look. */
  OXYGEN_STAGE: [10, 15, 23, 34, 51, 76, 114, 171, 256, 384, 577, 865] as const,
  /** CoC's collectors stop growing at TH9, but oxygen demand keeps growing to
   *  Brain 11 (the Brain and storages level on), so breathing must too. Breathing
   *  levels 10 and 11 each cost this share of the TH9 Elixir-Collector budget
   *  (+10% per level, +20% in total). Nothing grows after Brain 11, so neither
   *  does breathing. */
  BREATHING_TAIL_PER_LEVEL: 0.1,
  /** On pace, the waste-clearing organs clear 1.5x the waste made, so blood
   *  waste that built up while the bladder was full drains after a flush. */
  CLEAR_MARGIN: 1.5,
  /** A working liver makes 20% less waste reach the blood (ammonia -> urea). */
  LIVER_RELIEF: 0.2,
  /** The blood tolerates this many hours of current waste output before the
   *  body slows; at twice that it is at the floor. */
  BLOOD_TOLERANCE_HOURS: 2,
  /** ...but never less than this much waste (so a new body is not jumpy). */
  BLOOD_TOLERANCE_MIN: 2400,
  /** Waste can build up to this multiple of the tolerance (the floor is there). */
  BLOOD_OVERFLOW: 2,
  /** Output never falls below this share of normal — no death loop. */
  MIN_OUTPUT_FACTOR: 0.1,
  /** A flush needs the stores at least this full (no star for an empty flush). */
  MIN_FLUSH_FILL: 0.1,
  /** A waste organ with no vein clears only this share. */
  UNVEINED_CLEAR_FACTOR: 0.3,
  /** Each level the heart or spinal cord lags its on-pace level costs this
   *  share of everyone's output... */
  PACE_PENALTY_PER_LEVEL: 0.1,
  /** ...down to this floor. */
  PACE_FLOOR: 0.6,
  /** If demand ever exceeds supply (old saves), output scales with supply/demand
   *  down to this floor. Normal play cannot get there: builds are gated. */
  HYPOXIA_FLOOR: 0.1,
  /** Starting stock: CoC's new village opens its storages near full; one
   *  currency is capped by the Brain's level-1 storage (1,000). */
  STARTING_NUTRIENTS: 1000,
  /** The pituitary (our Gem Mine) runs at this share of CoC's max-level Gem Mine
   *  rate at level 1, rising linearly to the full rate at level 12. */
  GEM_GLAND_L1_SHARE: 0.4,
} as const;

// ===========================================================================
// Level tables
// ===========================================================================

export interface LevelTable {
  maxLevel: number;
  /** cost[i] = nutrients to REACH level i+1 (cost[0] = the first build). */
  cost: number[];
  /** seconds[i] = build/upgrade time to reach level i+1. */
  seconds: number[];
  /** brainRequired[i] = Brain level needed to reach level i+1. Also the
   *  level's "stage" for oxygen demand. */
  brainRequired: number[];
}

const prefix = (arr: readonly number[], n: number) =>
  arr.slice(0, Math.max(0, n)).reduce((a, b) => a + b, 0);

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Organ types following a table, with their real count and unlock. */
function members(table: EconomyTable, roles?: OrganRole[]): { type: OrganType; count: number; unlock: number }[] {
  return (Object.keys(ORGAN_ECONOMY) as OrganType[])
    .filter((t) => ORGAN_ECONOMY[t].table === table && (!roles || roles.includes(ORGAN_ECONOMY[t].role)))
    .map((t) => ({ type: t, count: ORGAN_DEFINITIONS[t].maxPerBase, unlock: ORGAN_DEFINITIONS[t].unlockedAtBrainLevel }));
}
function countAt(table: EconomyTable, brain: number, roles?: OrganRole[]): number {
  return members(table, roles).filter((m) => m.unlock <= brain).reduce((a, m) => a + m.count, 0);
}

/** CoC's cumulative on-pace spend on ONE resource's collectors at a Town Hall level. */
export function cocCollectorBudget(field: 'cost' | 'seconds', th: number): number {
  return cocCollectorCount(th) * prefix(COC_COLLECTOR[field], cocMaxLevelForTownHall('COLLECTOR', th));
}
/** CoC's cumulative on-pace spend on ONE resource's storages at a Town Hall level. */
export function cocStorageBudget(field: 'cost' | 'seconds', th: number): number {
  return cocStorageCount(th) * prefix(COC_STORAGE[field], cocMaxLevelForTownHall('STORAGE', th));
}
/** CoC's total storage capacity for ONE resource (storages only, no Town Hall). */
export function cocStorageTotal(th: number): number {
  return cocStorageCount(th) * COC_STORAGE.capacity[cocMaxLevelForTownHall('STORAGE', th) - 1];
}
/** CoC's on-pace collector output, Gold + Elixir together, per hour. */
export function cocIncomePerHour(th: number): number {
  return 2 * cocCollectorCount(th) * COC_COLLECTOR.perHour[cocMaxLevelForTownHall('COLLECTOR', th) - 1];
}
/** Hours a CoC collector takes to fill at the on-pace level for this Town Hall. */
export function cocCollectorFillHours(th: number): number {
  const L = cocMaxLevelForTownHall('COLLECTOR', th);
  return COC_COLLECTOR.capacity[L - 1] / COC_COLLECTOR.perHour[L - 1];
}

function breathingBudget(field: 'cost' | 'seconds', th: number): number {
  if (th <= 9) return cocCollectorBudget(field, th);
  return cocCollectorBudget(field, 9) * (1 + CALIBRATION.BREATHING_TAIL_PER_LEVEL * (Math.min(th, 11) - 9));
}

/** Brain levels at which a budget grows — one organ level per growth step. */
function growthSteps(budget: (th: number) => number): number[] {
  return range(1, MAX_BRAIN_LEVEL).filter((th) => budget(th) > (th > 1 ? budget(th - 1) : 0));
}

/**
 * A derived table: the group's CoC budget at each growth step, per organ.
 * cost(L) = K(step L) - K(step L-1), K(th) = budget(th) / organs in the group,
 * so n organs on pace spend exactly the CoC budget.
 */
function deriveTable(table: EconomyTable, budget: (f: 'cost' | 'seconds', th: number) => number): LevelTable {
  const steps = growthSteps((th) => budget('cost', th));
  const K = (f: 'cost' | 'seconds', th: number) => budget(f, th) / countAt(table, th);
  const diffs = (f: 'cost' | 'seconds') =>
    steps.map((th, i) => {
      const d = Math.round(K(f, th)) - (i === 0 ? 0 : Math.round(K(f, steps[i - 1])));
      if (d <= 0) throw new Error(`bodyEconomy: ${table} ${f} not increasing at Brain ${th}`);
      return d;
    });
  return { maxLevel: steps.length, cost: diffs('cost'), seconds: diffs('seconds'), brainRequired: steps };
}

const TABLES: Record<EconomyTable, LevelTable> = {
  TOWN_HALL: {
    maxLevel: 12,
    cost: [...COC_TOWN_HALL.cost],
    seconds: [...COC_TOWN_HALL.seconds],
    brainRequired: range(1, 12).map((l) => Math.max(1, l - 1)),
  },
  COLLECTOR: {
    maxLevel: 12,
    cost: [...COC_COLLECTOR.cost],
    seconds: [...COC_COLLECTOR.seconds],
    brainRequired: [...COC_TH_REQUIRED.COLLECTOR],
  },
  DEFENSE: {
    maxLevel: 12,
    cost: [...COC_DEFENSE.cost],
    seconds: [...COC_DEFENSE.seconds],
    brainRequired: [...COC_TH_REQUIRED.DEFENSE],
  },
  BREATHING: deriveTable('BREATHING', breathingBudget),
  FOOD_STORE: deriveTable('FOOD_STORE', cocStorageBudget),
  WASTE_SYSTEM: deriveTable('WASTE_SYSTEM', cocStorageBudget),
};

export function levelTable(type: OrganType): LevelTable {
  return TABLES[ORGAN_ECONOMY[type].table];
}

/** Brain level needed before an organ may reach `level`. */
export function brainRequiredFor(type: OrganType, level: number): number {
  const t = levelTable(type);
  return t.brainRequired[Math.max(0, Math.min(t.maxLevel - 1, level - 1))];
}

/** The body stage a level belongs to (the Brain level at which it unlocks). */
export function levelStage(type: OrganType, level: number): number {
  if (level <= 0) return 0;
  if (type === 'BRAIN_CNS') return Math.min(MAX_BRAIN_LEVEL, level);
  return brainRequiredFor(type, level);
}

/** Highest level an organ may reach at this Brain level (0 if still locked). */
export function onPaceLevel(type: OrganType, brain: number): number {
  if (type === 'BRAIN_CNS') return brain;
  if (ORGAN_DEFINITIONS[type].unlockedAtBrainLevel > brain) return 0;
  const t = levelTable(type);
  let lvl = 0;
  for (let l = 1; l <= t.maxLevel; l++) if (t.brainRequired[l - 1] <= brain) lvl = l;
  return lvl;
}

/** Nutrients and seconds to take an organ from `level` to `level + 1` (level 0 = build). */
export function stepCost(type: OrganType, level: number): { nutrients: number; seconds: number } {
  const t = levelTable(type);
  const i = Math.max(0, Math.min(t.maxLevel - 1, level));
  return { nutrients: t.cost[i], seconds: t.seconds[i] };
}

/** Everything spent to bring one organ to `level`. */
export function cumulativeCost(type: OrganType, level: number): { nutrients: number; seconds: number } {
  const t = levelTable(type);
  const n = Math.min(t.maxLevel, Math.max(0, level));
  return { nutrients: prefix(t.cost, n), seconds: prefix(t.seconds, n) };
}

// ===========================================================================
// Oxygen: demand and supply
// ===========================================================================

/** Oxygen an organ demands at a level (breathing organs demand none). */
export function oxygenDemandAt(type: OrganType, level: number): number {
  const econ = ORGAN_ECONOMY[type];
  if (econ.role === 'BREATHING' || level <= 0) return 0;
  return econ.oxygenWeight * CALIBRATION.OXYGEN_STAGE[levelStage(type, level) - 1];
}

/** What the lone Brain breathes on its own, so a new body is not short of air. */
export const BASE_OXYGEN_SUPPLY = oxygenDemandAt('BRAIN_CNS', 1);

/** Every non-breathing organ unlocked at this Brain level, at its on-pace level,
 *  plus the Brain reserving its NEXT level (an upgrade reserves its target). */
export function onPaceOxygenDemand(brain: number): number {
  let d = 0;
  for (const t of Object.keys(ORGAN_ECONOMY) as OrganType[]) {
    if (t === 'BRAIN_CNS' || ORGAN_ECONOMY[t].role === 'BREATHING') continue;
    d += ORGAN_DEFINITIONS[t].maxPerBase * oxygenDemandAt(t, onPaceLevel(t, brain));
  }
  return d + oxygenDemandAt('BRAIN_CNS', Math.min(MAX_BRAIN_LEVEL, brain + 1));
}

/** Supply of ONE breathing organ at each level: maxed breathing at Brain L
 *  supplies exactly the on-pace demand at Brain L (rounded up). */
const BREATHING_SUPPLY: number[] = TABLES.BREATHING.brainRequired.map((th) =>
  Math.ceil((onPaceOxygenDemand(th) - BASE_OXYGEN_SUPPLY) / countAt('BREATHING', th))
);
for (let i = 1; i < BREATHING_SUPPLY.length; i++) {
  if (BREATHING_SUPPLY[i] <= BREATHING_SUPPLY[i - 1]) throw new Error('bodyEconomy: breathing supply not increasing');
}

export function oxygenSupplyAt(type: OrganType, level: number): number {
  if (ORGAN_ECONOMY[type].role !== 'BREATHING' || level <= 0) return 0;
  return BREATHING_SUPPLY[Math.min(BREATHING_SUPPLY.length, level) - 1];
}

// ===========================================================================
// Food
// ===========================================================================

const clampL = (level: number) => Math.max(1, Math.min(12, level));

/** A food maker's (or helper's) output per hour: a Gold Mine plus an Elixir
 *  Collector of the same level. */
export function foodRatePerHour(level: number): number {
  return level <= 0 ? 0 : 2 * COC_COLLECTOR.perHour[clampL(level) - 1];
}
/** What it holds before collection: both CoC collectors' capacity. */
export function foodBufferCapacity(level: number): number {
  return level <= 0 ? 0 : 2 * COC_COLLECTOR.capacity[clampL(level) - 1];
}

/** Food store capacity: CoC's Gold-Storage total at the level's step, split
 *  across the food stores unlocked by then. */
const FOOD_STORE_CAPACITY: number[] = TABLES.FOOD_STORE.brainRequired.map((th) =>
  Math.round(cocStorageTotal(th) / countAt('FOOD_STORE', th))
);
export function foodStoreCapacity(level: number): number {
  return level <= 0 ? 0 : FOOD_STORE_CAPACITY[Math.min(FOOD_STORE_CAPACITY.length, level) - 1];
}

// ===========================================================================
// Waste
// ===========================================================================

/** Waste reaching the blood per hour on pace (a working liver is part of it). */
export function onPaceWastePerHour(brain: number): number {
  return cocIncomePerHour(brain) * (1 - CALIBRATION.LIVER_RELIEF);
}

/** The large intestine clears 1.5x the waste of one food maker's output. */
export function largeIntestineClearPerHour(level: number): number {
  return CALIBRATION.CLEAR_MARGIN * (1 - CALIBRATION.LIVER_RELIEF) * foodRatePerHour(level);
}

/** Each kidney / ureter / urethra: together, on pace, they clear the rest of
 *  1.5x the on-pace waste. */
const KIDNEY_PATH_CLEAR: number[] = TABLES.WASTE_SYSTEM.brainRequired.map((th) => {
  const total = CALIBRATION.CLEAR_MARGIN * onPaceWastePerHour(th);
  const li = largeIntestineClearPerHour(onPaceLevel('COLON_DIGEST', th));
  return (total - li) / countAt('WASTE_SYSTEM', th, ['WASTE_CLEARER', 'WASTE_HELPER']);
});
export function kidneyPathClearPerHour(level: number): number {
  return level <= 0 ? 0 : KIDNEY_PATH_CLEAR[Math.min(KIDNEY_PATH_CLEAR.length, level) - 1];
}

/** Bladder / rectum capacity: on pace they fill in exactly the hours a CoC
 *  collector of the on-pace level takes to fill. */
const WASTE_STORE_CAPACITY: number[] = TABLES.WASTE_SYSTEM.brainRequired.map((th) =>
  Math.round(
    (onPaceWastePerHour(th) * cocCollectorFillHours(th)) / countAt('WASTE_SYSTEM', th, ['WASTE_STORE'])
  )
);
export function wasteStoreCapacity(level: number): number {
  return level <= 0 ? 0 : WASTE_STORE_CAPACITY[Math.min(WASTE_STORE_CAPACITY.length, level) - 1];
}

// ===========================================================================
// On-pace body (used by tests, demos and calibration reports)
// ===========================================================================

/** Every organ unlocked at this Brain level, at its on-pace level. */
export function onPaceBody(brain: number): { type: OrganType; count: number; level: number }[] {
  return (Object.keys(ORGAN_ECONOMY) as OrganType[])
    .map((type) => ({ type, count: ORGAN_DEFINITIONS[type].maxPerBase, level: onPaceLevel(type, brain) }))
    .filter((o) => o.level > 0);
}

/** CoC's on-pace collector + storage spend (both resources) at a Town Hall level. */
export function cocEconomySpend(th: number): { nutrients: number; seconds: number } {
  return {
    nutrients: 2 * cocCollectorBudget('cost', th) + 2 * cocStorageBudget('cost', th),
    seconds: 2 * cocCollectorBudget('seconds', th) + 2 * cocStorageBudget('seconds', th),
  };
}

/** Our on-pace spend on the organs that carry that budget. */
export function bodyEconomySpend(brain: number): { nutrients: number; seconds: number } {
  let nutrients = 0;
  let seconds = 0;
  for (const o of onPaceBody(brain)) {
    const table = ORGAN_ECONOMY[o.type].table;
    if (table === 'TOWN_HALL' || table === 'DEFENSE') continue;
    const c = cumulativeCost(o.type, o.level);
    nutrients += o.count * c.nutrients;
    seconds += o.count * c.seconds;
  }
  return { nutrients, seconds };
}
