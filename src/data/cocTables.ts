/**
 * Clash of Clans Home Village economy — VERBATIM tables.
 *
 * These are CoC's actual published per-level numbers (2026 balance), copied as-is
 * from clashofclans.fandom.com. They are deliberately NOT re-derived, rescaled or
 * "tuned to feel right" — the whole point is to replicate CoC's proven economics
 * exactly, then make deliberate adjustments from a known-good baseline.
 *
 * Index convention: array[i] is the value for LEVEL i+1.
 *   cost[i]    = resources to REACH level i+1 (cost[0] = the initial build)
 *   seconds[i] = build/upgrade time to REACH level i+1
 *   perHour[i] / capacity[i] = the building's stat WHILE at level i+1
 *
 * Organ → building archetype mapping lives in organData.ts.
 */

/** Gold Mine / Elixir Collector (identical curves). The resource producer. */
export const COC_COLLECTOR = {
  cost: [150, 300, 700, 1400, 3000, 7000, 14000, 28000, 56000],
  seconds: [5, 15, 60, 120, 300, 900, 1800, 3600, 5400],
  perHour: [200, 400, 600, 800, 1000, 1300, 1600, 1900, 2200],
  capacity: [1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000, 75000],
};

/** Gold Storage / Elixir Storage (identical curves). The storage cap. */
export const COC_STORAGE = {
  cost: [300, 750, 1500, 3000, 6000, 12000, 25000, 50000, 100000],
  seconds: [10, 120, 300, 900, 1800, 3600, 7200, 10800, 14400],
  capacity: [1500, 3000, 6000, 12000, 25000, 45000, 100000, 225000, 450000],
};

/** Cannon — the reference defensive building. */
export const COC_DEFENSE = {
  cost: [250, 1000, 4000, 16000, 50000, 60000, 100000, 160000, 250000],
  seconds: [5, 30, 120, 1200, 1800, 3600, 7200, 10800, 12600],
};

/** Town Hall — the master progression gate. L1 is free (starting building). */
export const COC_TOWN_HALL = {
  cost: [0, 1000, 4000, 25000, 150000, 500000, 1000000, 2000000, 2500000],
  seconds: [0, 10, 1800, 10800, 21600, 43200, 64800, 86400, 172800],
};

/**
 * Gem drops from clearing an obstacle. NOT random — CoC cycles this fixed
 * 20-value sequence in order (average exactly 2.0 gems per obstacle).
 */
export const COC_OBSTACLE_GEM_CYCLE = [
  6, 0, 4, 5, 1, 3, 2, 0, 0, 5, 1, 0, 3, 4, 0, 0, 5, 0, 1, 0,
];

/** The rare Gem Box obstacle always yields exactly this, and respawns ~2-3 weeks. */
export const COC_GEM_BOX_VALUE = 25;

/** Gem Mine (Builder Base) trickle at max level — the only passive gem income. */
export const COC_GEM_MINE_PER_DAY = 5.04;

/** Gem cost of the 2nd, 3rd, 4th and 5th builder. */
export const COC_BUILDER_GEM_COSTS = [250, 500, 1000, 2000];

/** Collector boost: x2 production for 24h (requires collector level 5+). */
export const COC_BOOST_MULTIPLIER = 2;
export const COC_BOOST_DURATION_SECONDS = 24 * 3600;

/** Which CoC building an organ is economically modelled on. */
export type CocArchetype = 'COLLECTOR' | 'STORAGE' | 'DEFENSE' | 'TOWN_HALL';

const TABLES = {
  COLLECTOR: COC_COLLECTOR,
  STORAGE: COC_STORAGE,
  DEFENSE: COC_DEFENSE,
  TOWN_HALL: COC_TOWN_HALL,
} as const;

/** Clamp a level to the table's range and read a column. */
function at(values: readonly number[], level: number): number {
  const i = Math.max(0, Math.min(values.length - 1, level - 1));
  return values[i];
}

/** Cost to upgrade FROM `level` to `level + 1`, per CoC's table. */
export function cocUpgradeCost(archetype: CocArchetype, level: number): number {
  return at(TABLES[archetype].cost, level + 1);
}

/** Build time (seconds) to upgrade FROM `level` to `level + 1`, per CoC's table. */
export function cocUpgradeSeconds(archetype: CocArchetype, level: number): number {
  return at(TABLES[archetype].seconds, level + 1);
}

/** Producer output per second at a given level (CoC publishes it per hour). */
export function cocProductionPerSecond(level: number): number {
  return at(COC_COLLECTOR.perHour, level) / 3600;
}

/** A collector's own on-tile capacity — how much it holds before it stops. */
export function cocCollectorCapacity(level: number): number {
  return at(COC_COLLECTOR.capacity, level);
}

/** A storage building's capacity at a given level. */
export function cocStorageCapacity(level: number): number {
  return at(COC_STORAGE.capacity, level);
}

/** The highest level any of these tables defines. */
export const COC_MAX_TABLE_LEVEL = COC_COLLECTOR.cost.length;
