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
  Obstacle,
} from '../types';
import {
  ORGAN_DEFINITIONS,
  ORGAN_ECONOMY,
  ALL_BODY_SYSTEMS,
  IMMUNE_TROOPS_CATALOG,
  BASE_BUILDER_COUNT,
  MAX_BUILDER_COUNT,
  BUILDER_GEM_COSTS,
  MAX_TELEMETRY_LOGS,
} from '../data/organData';
import {
  cocTownHallStorage,
  cocStorageCapacity,
  cocObstacleGems,
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
import {
  CALIBRATION,
  MAX_BRAIN_LEVEL,
  levelTable,
  brainRequiredFor,
  stepCost,
  cumulativeCost,
  oxygenDemandAt,
  oxygenSupplyAt,
  BASE_OXYGEN_SUPPLY,
  foodRatePerHour,
  foodBufferCapacity,
  foodStoreCapacity,
  largeIntestineClearPerHour,
  kidneyPathClearPerHour,
  wasteStoreCapacity,
  onPaceLevel,
  onPaceBody,
} from '../data/bodyEconomy';
import { soundEffects } from './soundEffects';

/** Bumped when the save format or organ roster changes; see migrateGameState. */
export const ECONOMY_VERSION = 2;

/**
 * Brain (Town Hall) level required before an organ may reach `targetLevel`.
 * CoC's own Town-Hall-required column for organs on CoC's tables; for organs on
 * a derived table, level L belongs to the L-th Brain step (see bodyEconomy.ts).
 */
export function requiredBrainLevelFor(type: OrganType, targetLevel: number): number {
  if (type === 'BRAIN_CNS') return 1;
  return brainRequiredFor(type, targetLevel);
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
  /** achievement id -> number of tiers already claimed. */
  achievementTiersClaimed: Record<string, number>;
  /** Star Bonus (CoC's daily-return loop) and the raid-protected Treasury. */
  starsEarned: number;
  bonusesAvailable: number;
  nextBonusAt: number;
  treasuryNutrients: number;
  starBonusesClaimed: number;
  /** Waste held in the bladder and rectum, waiting to be flushed. */
  wasteLoad: number;
  /** Waste still in the blood (the kidneys have not cleared it yet). */
  bodyWaste: number;
  /** Timestamp before which another raid cannot be sent. */
  nextRaidAt: number;
  /** Save format; see migrateGameState. */
  economyVersion: number;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function brainLevelOf(state: GameState): number {
  return state.organs.find((o) => o.type === 'BRAIN_CNS')?.level ?? 1;
}
/** Finished (not under construction) and not destroyed. Stores and breathing
 *  keep working while they upgrade, as CoC's storages keep holding. */
export function isBuilt(o: OrganNode): boolean {
  return !o.constructing && o.status !== 'DAMAGED_DESTROYED';
}
/** Built and not upgrading: makers, helpers and clearers stop while they
 *  upgrade, exactly as a CoC collector does. */
export function isWorking(o: OrganNode): boolean {
  return isBuilt(o) && o.status !== 'UNDER_UPGRADE';
}
function maxHpFor(type: OrganType, level: number): number {
  return Math.round(ORGAN_DEFINITIONS[type].baseHp * (1 + (Math.max(1, level) - 1) * 0.4));
}
function log(state: GameState, eventType: TelemetryLog['eventType'], details: string, scoreImpact = 5): void {
  state.telemetryLogs.unshift({
    id: `${eventType.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
    timestamp: Date.now(),
    studentId: 'student_user',
    studentName: state.playerName,
    eventType,
    details,
    scoreImpact,
    metabolicEfficiency: 95,
    renalFiltrationEfficiency: 95,
    immuneReadinessScore: 90,
  });
}

/** A fresh organ node at a level (used for placement, demos and tests). */
export function makeOrganNode(type: OrganType, x: number, y: number, level = 1, id?: string): OrganNode {
  const def = ORGAN_DEFINITIONS[type];
  return {
    id: id ?? `${type.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    type,
    name: def.name,
    level,
    maxLevel: type === 'BRAIN_CNS' ? MAX_BRAIN_LEVEL : levelTable(type).maxLevel,
    x,
    y,
    width: type === 'BRAIN_CNS' ? 140 : 130,
    height: type === 'BRAIN_CNS' ? 110 : 100,
    hp: maxHpFor(type, level),
    maxHp: maxHpFor(type, level),
    status: 'OPTIMAL',
    lastProductionTime: Date.now(),
    bloodFlowEfficiency: 1,
    oxygenSaturation: 0.98,
    toxicityLevel: 10,
    repairCost: { nutrients: Math.round(stepCost(type, Math.max(0, level - 1)).nutrients * 0.5) },
    uncollectedNutrients: 0,
    uncollectedOxygen: 0,
    uncollectedWater: 0,
    uncollectedHormones: 0,
    uncollectedUrine: 0,
    uncollectedExcretion: 0,
    tapCount: 0,
  };
}

/**
 * Starter base: just the Brain (Town Hall), which stores but makes nothing.
 * Breathing comes first (every other organ needs oxygen room), then a stomach
 * and a heart.
 */
export function createInitialGameState(): GameState {
  const initialBrain = makeOrganNode('BRAIN_CNS', 420, 160, 1, 'brain_1');

  const vitals: PlayerVitals = {
    heartRateBpm: 72,
    bloodPressureSys: 120,
    bloodPressureDia: 80,
    spO2: 98,
    toxicityBun: 5,
    hydrationPct: 95,
    coreTempC: 37.0,
    homeostasisScore: 98,
    wasteFillPct: 0,
    bloodWastePct: 0,
    oxygenUsed: BASE_OXYGEN_SUPPLY,
    oxygenSupply: BASE_OXYGEN_SUPPLY,
  };

  const currencies: Currencies = {
    nutrients: CALIBRATION.STARTING_NUTRIENTS,
    maxNutrients: cocTownHallStorage(1),
    hormones: 10,
  };

  return {
    playerName: 'Cadet Biologist',
    organs: [initialBrain],
    vessels: [],
    vitals,
    currencies,
    activeBoosts: [],
    troops: JSON.parse(JSON.stringify(IMMUNE_TROOPS_CATALOG)),
    selectedOrganId: 'brain_1',
    telemetryLogs: [
      {
        id: 'log_init',
        timestamp: Date.now(),
        studentId: 'student_user',
        studentName: 'Cadet Biologist',
        eventType: 'ORGAN_UPGRADE',
        details:
          'Welcome! Your Brain is online. Every organ needs oxygen, so build your two Lungs first, then a Stomach (nutrients) and a Heart (blood supply).',
        scoreImpact: 10,
        metabolicEfficiency: 95,
        renalFiltrationEfficiency: 95,
        immuneReadinessScore: 90,
      },
    ],
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
    achievementTiersClaimed: {},
    starsEarned: 0,
    bonusesAvailable: 1,
    nextBonusAt: Date.now() + COC_STAR_BONUS_RESET_SECONDS * 1000,
    treasuryNutrients: 0,
    starBonusesClaimed: 0,
    wasteLoad: 0,
    bodyWaste: 0,
    nextRaidAt: 0,
    economyVersion: ECONOMY_VERSION,
  };
}

// ---------------------------------------------------------------------------
// OXYGEN — a supply-and-demand budget, never spent.
//
// Breathing organs supply it; every other organ demands it, more at higher
// levels. A build or upgrade reserves its target level's demand the moment it
// starts, and is allowed only if that still fits within supply. Breathing
// upgrades themselves never need oxygen, so there is always a way forward.
// ---------------------------------------------------------------------------

/** What an organ demands right now (a build or upgrade reserves its target). */
export function organOxygenDemand(o: OrganNode): number {
  if (o.status === 'DAMAGED_DESTROYED') return 0;
  if (o.constructing) return oxygenDemandAt(o.type, 1);
  if (o.status === 'UNDER_UPGRADE') return oxygenDemandAt(o.type, o.level + 1);
  return oxygenDemandAt(o.type, o.level);
}

export interface OxygenBudget {
  supply: number;
  demand: number;
  headroom: number;
}

export function oxygenBudget(state: GameState): OxygenBudget {
  let supply = BASE_OXYGEN_SUPPLY;
  let demand = 0;
  for (const o of state.organs) {
    if (isBuilt(o)) supply += oxygenSupplyAt(o.type, o.level);
    demand += organOxygenDemand(o);
  }
  return { supply, demand, headroom: supply - demand };
}

/** Extra oxygen demand of taking `type` from `fromLevel` to the next level. */
export function oxygenNeededFor(type: OrganType, fromLevel: number): number {
  return oxygenDemandAt(type, fromLevel + 1) - oxygenDemandAt(type, fromLevel);
}

/** Output share when demand exceeds supply (only reachable from old saves). */
export function hypoxiaFactor(budget: OxygenBudget): number {
  if (budget.demand <= budget.supply || budget.demand <= 0) return 1;
  return Math.max(CALIBRATION.HYPOXIA_FLOOR, budget.supply / budget.demand);
}

// ---------------------------------------------------------------------------
// PACE — the heart and spinal cord are body-wide multipliers. At the level CoC
// would have its defences at for this Brain level they cost nothing; each level
// behind costs everyone 10% of output, down to 60%. Never above 100%.
// ---------------------------------------------------------------------------

function paceOf(state: GameState, type: OrganType, brain: number): number {
  if (ORGAN_DEFINITIONS[type].unlockedAtBrainLevel > brain) return 1;
  const organ = state.organs.find((o) => o.type === type && o.status !== 'DAMAGED_DESTROYED');
  // No heart at all is already punished through the arteries (no blood flow).
  if (!organ && type === 'HEART_CARDIO') return 1;
  if (state.organs.length === 1) return 1;
  const level = organ && !organ.constructing ? organ.level : 0;
  const lag = Math.max(0, onPaceLevel(type, brain) - level);
  return Math.max(CALIBRATION.PACE_FLOOR, 1 - CALIBRATION.PACE_PENALTY_PER_LEVEL * lag);
}

export function paceFactors(state: GameState): { heart: number; nerve: number; total: number } {
  const brain = brainLevelOf(state);
  const heart = paceOf(state, 'HEART_CARDIO', brain);
  const nerve = paceOf(state, 'SPINAL_CORD', brain);
  return { heart, nerve, total: heart * nerve };
}

// ---------------------------------------------------------------------------
// ECONOMY RATES — one pure snapshot shared by the live tick, offline progress,
// the UI and the tests, so they can never disagree.
// ---------------------------------------------------------------------------

export interface MakerRate {
  /** Nutrients per hour flowing into this maker's bubble (boosts included). */
  perHour: number;
  /** The same without boosts — what makes waste. */
  unboostedPerHour: number;
  /** Bubble capacity (the maker's plus its built helpers'). */
  capacity: number;
}

export interface EconomyRates {
  makers: Map<string, MakerRate>;
  /** organ id -> what that organ contributes per hour (helpers included). */
  contribution: Map<string, number>;
  incomePerHour: number;
  wasteMadePerHour: number;
  clearPerHour: number;
  wasteCapacity: number;
  bloodTolerance: number;
  oxygen: OxygenBudget;
  hypoxia: number;
  pace: number;
  liverRelief: number;
  gemsPerHour: Map<string, number>;
}

/** Arterial supply reaching an organ (1 = full), from the real vessel network. */
function arterialSupplyOf(state: GameState, circulation: CirculationResult, organ: OrganNode): number {
  if (state.organs.length === 1) return 1; // a lone Brain needs no plumbing
  const heart = state.organs.find((o) => o.type === 'HEART_CARDIO' && o.status !== 'DAMAGED_DESTROYED' && o.hp > 0);
  if (!heart) return NO_HEART_SUPPLY;
  return Math.max(ARTERY_UNSUPPLIED_FLOOR, circulation.arterialSupply.get(organ.id) ?? 0);
}

export function economyRates(
  state: GameState,
  now: number = Date.now(),
  circulation: CirculationResult = computeCirculation(state.organs, state.vessels)
): EconomyRates {
  const pace = paceFactors(state).total;
  const oxygen = oxygenBudget(state);
  const hypoxia = hypoxiaFactor(oxygen);
  const eff = (o: OrganNode) =>
    arterialSupplyOf(state, circulation, o) * (o.maxHp > 0 ? o.hp / o.maxHp : 1) * pace;
  const boostOf = (o: OrganNode) => (o.boostedUntil && now < o.boostedUntil ? COC_BOOST_MULTIPLIER : 1);
  const veinFactor = (o: OrganNode) =>
    circulation.venousDrained.has(o.id) ? 1 : CALIBRATION.UNVEINED_CLEAR_FACTOR;

  const makers = new Map<string, MakerRate>();
  const contribution = new Map<string, number>();
  let income = 0;
  let unboosted = 0;
  for (const m of state.organs) {
    if (ORGAN_ECONOMY[m.type].role !== 'FOOD_MAKER' || !isWorking(m)) continue;
    const own = foodRatePerHour(m.level) * eff(m);
    let perHour = own * boostOf(m);
    let base = own;
    let capacity = foodBufferCapacity(m.level);
    contribution.set(m.id, own * boostOf(m));
    for (const h of state.organs) {
      if (ORGAN_ECONOMY[h.type].helps !== m.type || !isBuilt(h)) continue;
      capacity += foodBufferCapacity(h.level);
      if (!isWorking(h)) continue;
      const add = foodRatePerHour(h.level) * eff(h);
      perHour += add * boostOf(h);
      base += add;
      contribution.set(h.id, add * boostOf(h));
    }
    makers.set(m.id, { perHour, unboostedPerHour: base, capacity });
    income += perHour;
    unboosted += base;
  }

  const liver = state.organs.find((o) => o.type === 'LIVER_METABOLIC' && isBuilt(o));
  const liverRelief = liver ? CALIBRATION.LIVER_RELIEF : 0;
  const wasteMadePerHour = unboosted * (1 - liverRelief);

  let clearPerHour = 0;
  const kidneyWorking = state.organs.some((o) => o.type === 'KIDNEY_EXCRET' && isWorking(o));
  for (const o of state.organs) {
    if (!isWorking(o)) continue;
    const econ = ORGAN_ECONOMY[o.type];
    let rate = 0;
    if (econ.role === 'WASTE_CLEARER') rate = kidneyPathClearPerHour(o.level);
    else if (econ.role === 'WASTE_HELPER' && kidneyWorking) rate = kidneyPathClearPerHour(o.level);
    else if (econ.clearsWaste) rate = largeIntestineClearPerHour(o.level);
    if (rate > 0) {
      const r = rate * eff(o) * veinFactor(o);
      clearPerHour += r;
      contribution.set(o.id, r);
    }
  }

  let wasteCapacity = 0;
  for (const o of state.organs) {
    if (ORGAN_ECONOMY[o.type].role === 'WASTE_STORE' && isBuilt(o)) wasteCapacity += wasteStoreCapacity(o.level);
  }

  const gemsPerHour = new Map<string, number>();
  for (const o of state.organs) {
    if (ORGAN_ECONOMY[o.type].role !== 'GEM_GLAND' || !isWorking(o)) continue;
    const share =
      CALIBRATION.GEM_GLAND_L1_SHARE + ((1 - CALIBRATION.GEM_GLAND_L1_SHARE) * (Math.min(12, o.level) - 1)) / 11;
    gemsPerHour.set(o.id, (COC_GEM_MINE_PER_DAY / 24) * share);
  }

  return {
    makers,
    contribution,
    incomePerHour: income,
    wasteMadePerHour,
    clearPerHour,
    wasteCapacity,
    bloodTolerance: Math.max(
      CALIBRATION.BLOOD_TOLERANCE_MIN,
      CALIBRATION.BLOOD_TOLERANCE_HOURS * wasteMadePerHour
    ),
    oxygen,
    hypoxia,
    pace,
    liverRelief,
    gemsPerHour,
  };
}

/** Nutrient storage: the Brain's own (CoC Town Hall table) plus the food stores. */
export function nutrientCapacity(state: GameState): number {
  let cap = cocTownHallStorage(brainLevelOf(state));
  for (const o of state.organs) {
    if (ORGAN_ECONOMY[o.type].role === 'FOOD_STORE' && isBuilt(o)) cap += foodStoreCapacity(o.level);
  }
  return cap;
}

// ---------------------------------------------------------------------------
// WASTE — food in reverse (AnatoClash's own system).
//
// Every nutrient made puts waste into the blood (a working liver neutralises a
// fifth). The kidneys — helped by the ureters and urethra — and the large
// intestine clear it into the bladder and rectum, faster when the blood holds
// more (filtration follows concentration). When those are full, clearing
// stops and waste stays in the blood; past what the blood tolerates, output
// falls gradually to a 10% floor. A flush is free and instant and empties the
// stores, so the kidneys can drain the blood again. Nothing is ever destroyed.
// ---------------------------------------------------------------------------

/** Production multiplier for the waste left in the blood. */
export function wasteThrottleFactor(bodyWaste: number, tolerance: number): number {
  if (tolerance <= 0) return 1;
  const r = bodyWaste / tolerance;
  if (r <= 1) return 1;
  const t = Math.min(1, (r - 1) / (CALIBRATION.BLOOD_OVERFLOW - 1));
  return Math.max(CALIBRATION.MIN_OUTPUT_FACTOR, 1 - t * (1 - CALIBRATION.MIN_OUTPUT_FACTOR));
}

/** Total bladder + rectum capacity. */
export function excretoryCapacity(state: GameState): number {
  let cap = 0;
  for (const o of state.organs) {
    if (ORGAN_ECONOMY[o.type].role === 'WASTE_STORE' && isBuilt(o)) cap += wasteStoreCapacity(o.level);
  }
  return cap;
}

/**
 * Advances production, hormones and waste by `seconds`, at time `now`. Shared by
 * the live tick (1 s) and offline progress (slices), so both behave the same.
 */
function advanceEconomy(
  state: GameState,
  seconds: number,
  now: number,
  circulation: CirculationResult
): { made: number; throttle: number; rates: EconomyRates } {
  const rates = economyRates(state, now, circulation);
  const throttle = wasteThrottleFactor(state.bodyWaste || 0, rates.bloodTolerance);
  const factor = throttle * rates.hypoxia;

  let made = 0;
  let unboostedMade = 0;
  for (const [id, r] of rates.makers) {
    const organ = state.organs.find((o) => o.id === id)!;
    const before = organ.uncollectedNutrients || 0;
    const after = Math.min(r.capacity, before + (r.perHour / 3600) * seconds * factor);
    organ.uncollectedNutrients = Math.max(before, after);
    const actual = organ.uncollectedNutrients - before;
    made += actual;
    if (r.perHour > 0) unboostedMade += actual * (r.unboostedPerHour / r.perHour);
  }

  for (const [id, perHour] of rates.gemsPerHour) {
    const organ = state.organs.find((o) => o.id === id)!;
    organ.uncollectedHormones = Math.min(10, (organ.uncollectedHormones || 0) + (perHour / 3600) * seconds);
  }

  let body = (state.bodyWaste || 0) + unboostedMade * (1 - rates.liverRelief);
  const room = Math.max(0, rates.wasteCapacity - (state.wasteLoad || 0));
  // Kidneys filter in proportion to how much waste the blood carries, so a
  // backed-up body drains faster once there is room again.
  const concentration = Math.max(1, body / rates.bloodTolerance);
  const moved = Math.min(body, (rates.clearPerHour / 3600) * seconds * concentration, room);
  body -= moved;
  state.wasteLoad = (state.wasteLoad || 0) + moved;
  state.bodyWaste = Math.min(body, CALIBRATION.BLOOD_OVERFLOW * rates.bloodTolerance);

  return { made, throttle, rates };
}

/** Finishes every build/upgrade due by `now`. Returns the organs that finished. */
function completeFinishedUpgrades(state: GameState, now: number): OrganNode[] {
  const done: OrganNode[] = [];
  for (const organ of state.organs) {
    if (organ.status !== 'UNDER_UPGRADE' || !organ.upgradeEndTime || now < organ.upgradeEndTime) continue;
    finishUpgrade(organ);
    done.push(organ);
    grantStar(state, `${organ.name} upgraded`);
  }
  return done;
}

function finishUpgrade(organ: OrganNode): void {
  if (organ.constructing) organ.constructing = false;
  else organ.level += 1;
  organ.maxHp = maxHpFor(organ.type, organ.level);
  organ.hp = organ.maxHp;
  organ.status = 'OPTIMAL';
  organ.upgradeEndTime = undefined;
  organ.upgradeDurationSeconds = undefined;
  organ.repairCost = { nutrients: Math.round(stepCost(organ.type, organ.level - 1).nutrients * 0.5) };
}

/** Writes the readouts the HUD shows (oxygen, waste, vitals). */
function updateVitals(state: GameState, rates: EconomyRates, throttle: number): void {
  const v = state.vitals;
  const cap = rates.wasteCapacity;
  v.oxygenUsed = Math.round(rates.oxygen.demand);
  v.oxygenSupply = Math.round(rates.oxygen.supply);
  v.wasteFillPct = cap > 0 ? Math.round(((state.wasteLoad || 0) / cap) * 100) : 0;
  const blood = (state.bodyWaste || 0) / rates.bloodTolerance;
  v.bloodWastePct = Math.round(blood * 100);
  v.toxicityBun = Math.round(5 + Math.min(CALIBRATION.BLOOD_OVERFLOW, blood) * 40);
  v.spO2 =
    rates.oxygen.demand <= rates.oxygen.supply
      ? 98
      : Math.max(70, Math.round((98 * rates.oxygen.supply) / rates.oxygen.demand));
  v.hydrationPct = 95;
  v.heartRateBpm = Math.round(72 + (blood > 1 ? 20 : 0) + (Math.random() * 4 - 2));
  v.bloodPressureSys = v.toxicityBun > 60 ? 135 : 120;
  v.bloodPressureDia = 80;
  let score = 100;
  if (v.toxicityBun > 25) score -= (v.toxicityBun - 25) * 1.2;
  if (v.spO2 < 95) score -= (95 - v.spO2) * 2;
  score -= (1 - rates.pace) * 50;
  v.homeostasisScore = Math.max(0, Math.min(100, Math.round(score)));
  v.wasteStallActive = throttle <= CALIBRATION.MIN_OUTPUT_FACTOR + 1e-6;
}

/** Sets each organ's blood flow (and the HUD saturation) from the network. */
function updateBloodFlow(state: GameState, circulation: CirculationResult): void {
  for (const organ of state.organs) {
    if (organ.status === 'DAMAGED_DESTROYED') continue;
    organ.bloodFlowEfficiency = arterialSupplyOf(state, circulation, organ);
    organ.oxygenSaturation = Math.min(1, (state.vitals.spO2 / 100) * organ.bloodFlowEfficiency);
  }
}

/**
 * One second of the body. Finishes due upgrades, produces into each maker's
 * bubble, moves waste, and refreshes the readouts.
 */
export function runSimulationTick(state: GameState): GameState {
  const now = Date.now();
  const newState: GameState = JSON.parse(JSON.stringify(state));

  // Legacy timed boosts just count down; they no longer change output.
  newState.activeBoosts = newState.activeBoosts
    .map((b) => ({ ...b, remainingSeconds: b.remainingSeconds - 1 }))
    .filter((b) => b.remainingSeconds > 0);

  spawnObstaclesForElapsed(newState, now);
  refreshStarBonusAvailability(newState, now);

  for (const organ of completeFinishedUpgrades(newState, now)) {
    soundEffects.playUpgradeComplete();
    log(newState, 'ORGAN_UPGRADE', `🎉 ${organ.name} is now level ${organ.level}.`, 20);
  }

  const circulation = computeCirculation(newState.organs, newState.vessels);
  updateBloodFlow(newState, circulation);
  for (const organ of newState.organs) {
    organ.uncollectedNutrients = organ.uncollectedNutrients || 0;
    organ.uncollectedHormones = organ.uncollectedHormones || 0;
  }

  const { throttle, rates } = advanceEconomy(newState, 1, now, circulation);
  newState.currencies.maxNutrients = nutrientCapacity(newState);
  updateVitals(newState, rates, throttle);

  // The stores' bubbles show how full they are.
  const fill = Math.min(100, newState.vitals.wasteFillPct || 0);
  for (const organ of newState.organs) {
    if (organ.type === 'BLADDER_EXCRET' || organ.type === 'KIDNEY_EXCRET') organ.uncollectedUrine = fill;
    else if (organ.type === 'RECTUM_DIGEST' || organ.type === 'COLON_DIGEST') organ.uncollectedExcretion = fill;
  }

  // Visual cue only (no damage): organs look sick while waste slows them.
  const heavy = throttle <= 0.55;
  for (const organ of newState.organs) {
    if (organ.status === 'DAMAGED_DESTROYED' || organ.status === 'UNDER_UPGRADE') continue;
    if (heavy) organ.status = 'TOXIC_NECROSIS';
    else if (rates.hypoxia < 1) organ.status = 'HYPOXIC';
    else if (organ.status === 'TOXIC_NECROSIS' || organ.status === 'HYPOXIC') organ.status = 'OPTIMAL';
  }

  if (newState.vitals.wasteStallActive && !state.vitals.wasteStallActive) {
    log(
      newState,
      'NECROSIS_EVENT',
      `🛑 WASTE BACKUP: the bladder is full, so waste is staying in the blood and output is down to ${Math.round(
        CALIBRATION.MIN_OUTPUT_FACTOR * 100
      )}%. Flush to restore it — nothing is lost.`,
      0
    );
  }

  if (Math.random() < 0.2) soundEffects.playHeartbeat(newState.vitals.heartRateBpm);
  if (throttle < 1 && Math.random() < 0.25) soundEffects.playAlarmPulse();

  if (newState.telemetryLogs.length > MAX_TELEMETRY_LOGS) newState.telemetryLogs.length = MAX_TELEMETRY_LOGS;
  newState.lastTickTimestamp = now;
  return newState;
}

/**
 * Collects what organs have produced (one organ, or all). Hormones keep their
 * fractional part so a slow gland is never rounded away.
 */
export function collectOrganResources(state: GameState, organId?: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const cap = nutrientCapacity(newState);
  newState.currencies.maxNutrients = cap;
  let room = Math.max(0, cap - newState.currencies.nutrients);
  let totalNut = 0;
  let totalHor = 0;
  for (const organ of newState.organs) {
    if (organId && organ.id !== organId) continue;
    // What does not fit in storage stays in the organ, as in CoC.
    const take = Math.min(room, Math.floor(organ.uncollectedNutrients || 0));
    room -= take;
    totalNut += take;
    organ.uncollectedNutrients = (organ.uncollectedNutrients || 0) - take;
    const hor = Math.floor(organ.uncollectedHormones || 0);
    totalHor += hor;
    organ.uncollectedHormones = (organ.uncollectedHormones || 0) - hor;
  }
  if (totalNut > 0 || totalHor > 0) {
    newState.currencies.nutrients += totalNut;
    newState.currencies.hormones += totalHor;
    newState.totalResourcesHarvested += totalNut;
    newState.nutrientsHarvested = (newState.nutrientsHarvested || 0) + totalNut;
    soundEffects.playPopResource();
  }
  return newState;
}

export function collectAllOrganResources(state: GameState): GameState {
  return collectOrganResources(state);
}

/**
 * Empties the bladder and rectum: free, instant, and worth a Star Bonus star.
 * Waste still in the blood is then cleared by the kidneys.
 */
export function flushWaste(state: GameState): GameState {
  const cap = excretoryCapacity(state);
  if (cap <= 0 || (state.wasteLoad || 0) < cap * CALIBRATION.MIN_FLUSH_FILL) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const pct = Math.round(((newState.wasteLoad || 0) / cap) * 100);
  newState.wasteLoad = 0;
  newState.vitals.wasteFillPct = 0;
  for (const organ of newState.organs) {
    organ.uncollectedUrine = 0;
    organ.uncollectedExcretion = 0;
  }
  newState.totalWasteClearedCount += 1;
  grantStar(newState, 'waste flushed');
  soundEffects.playFlushWaste();
  log(newState, 'TREATMENT_APPLIED', `🚽 Flushed the bladder and rectum (they were ${pct}% full). The kidneys can clear the blood again.`, 10);
  return newState;
}

/** Both flush buttons empty the one shared system. */
export function urinateAndClearWaste(state: GameState, _organId?: string): GameState {
  return flushWaste(state);
}
export function excreteAndClearWaste(state: GameState, _organId?: string): GameState {
  return flushWaste(state);
}

/** Tapping an organ collects what it has produced, as tapping a CoC collector does. */
export function tapOrganForBoost(state: GameState, organId: string): GameState {
  return collectOrganResources(state, organId);
}

// ---------------------------------------------------------------------------
// PLACEMENT AND UPGRADES
// ---------------------------------------------------------------------------

export type PlacementBlock = 'LOCKED' | 'MAX' | 'OXYGEN' | 'NO_BUILDER' | 'COST' | null;

export interface PlacementInfo {
  cost: number;
  seconds: number;
  blocked: PlacementBlock;
  /** Why it is blocked, in words, or null. */
  reason: string | null;
  /** Oxygen this organ will demand once placed (0 for breathing organs). */
  oxygenNeeded: number;
  oxygenHeadroom: number;
  /** Oxygen supply it adds (breathing organs only). */
  oxygenAdded: number;
  count: number;
  maxCount: number;
}

function buildersBusy(state: GameState): number {
  return state.organs.filter((o) => o.status === 'UNDER_UPGRADE').length;
}

const oxygenReason = (short: number) => `Needs ${Math.ceil(short).toLocaleString()} more oxygen — upgrade breathing`;

/** Everything the build menu needs to know about placing an organ. */
export function getPlacementInfo(state: GameState, type: OrganType): PlacementInfo {
  const def = ORGAN_DEFINITIONS[type];
  const brain = brainLevelOf(state);
  const { nutrients: cost, seconds } = stepCost(type, 0);
  const count = state.organs.filter((o) => o.type === type).length;
  const budget = oxygenBudget(state);
  const oxygenNeeded = oxygenDemandAt(type, 1);

  let blocked: PlacementBlock = null;
  let reason: string | null = null;
  if (def.unlockedAtBrainLevel > brain) {
    blocked = 'LOCKED';
    reason = `Unlocks at Brain level ${def.unlockedAtBrainLevel}`;
  } else if (count >= def.maxPerBase) {
    blocked = 'MAX';
    reason = def.maxPerBase === 1 ? 'The body has only one' : `The body has only ${def.maxPerBase}`;
  } else if (oxygenNeeded > budget.headroom) {
    blocked = 'OXYGEN';
    reason = oxygenReason(oxygenNeeded - budget.headroom);
  } else if (buildersBusy(state) >= (state.builderCount || BASE_BUILDER_COUNT)) {
    blocked = 'NO_BUILDER';
    reason = 'All builders are busy';
  } else if (state.currencies.nutrients < cost) {
    blocked = 'COST';
    reason = `Needs ${(cost - state.currencies.nutrients).toLocaleString()} more nutrients`;
  }

  return {
    cost,
    seconds,
    blocked,
    reason,
    oxygenNeeded,
    oxygenHeadroom: budget.headroom,
    oxygenAdded: oxygenSupplyAt(type, 1),
    count,
    maxCount: def.maxPerBase,
  };
}

/** Places a new organ: CoC-style first build — it costs, takes time and a builder. */
export function placeNewOrgan(state: GameState, type: OrganType, x: number, y: number): GameState {
  const info = getPlacementInfo(state, type);
  if (info.blocked) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.currencies.nutrients -= info.cost;
  const organ = makeOrganNode(type, x, y, 1);
  organ.status = 'UNDER_UPGRADE';
  organ.constructing = true;
  organ.upgradeDurationSeconds = info.seconds;
  organ.upgradeEndTime = Date.now() + info.seconds * 1000;
  organ.bloodFlowEfficiency = ARTERY_UNSUPPLIED_FLOOR;
  newState.organs.push(organ);
  newState.selectedOrganId = organ.id;

  // Not auto-connected to the heart: plumbing is the player's decision.
  soundEffects.playUpgradeComplete();
  log(newState, 'ORGAN_UPGRADE', `🏗️ Started building the ${ORGAN_DEFINITIONS[type].name}.`, 30);
  return newState;
}

export type UpgradeBlock = 'MAX' | 'BUSY' | 'BRAIN' | 'OXYGEN' | 'NO_BUILDER' | 'COST' | null;

export interface UpgradeCheck {
  atMax: boolean;
  cost: number;
  seconds: number;
  brainRequired: number;
  oxygenNeeded: number;
  oxygenHeadroom: number;
  /** Supply the upgrade adds (breathing organs only). */
  oxygenAdded: number;
  blocked: UpgradeBlock;
  reason: string | null;
}

/** Whether an organ can be upgraded now, what it costs, and if not, why. */
export function getUpgradeCheck(state: GameState, organId: string): UpgradeCheck | null {
  const organ = state.organs.find((o) => o.id === organId);
  if (!organ) return null;
  const { nutrients: cost, seconds } = stepCost(organ.type, organ.level);
  const brainRequired = requiredBrainLevelFor(organ.type, organ.level + 1);
  const budget = oxygenBudget(state);
  const oxygenNeeded = oxygenNeededFor(organ.type, organ.level);
  const atMax = organ.level >= organ.maxLevel;

  let blocked: UpgradeBlock = null;
  let reason: string | null = null;
  if (atMax) {
    blocked = 'MAX';
    reason = 'Maximum level';
  } else if (organ.status === 'UNDER_UPGRADE') {
    blocked = 'BUSY';
    reason = 'Already upgrading';
  } else if (brainLevelOf(state) < brainRequired) {
    blocked = 'BRAIN';
    reason = `Needs Brain level ${brainRequired}`;
  } else if (oxygenNeeded > budget.headroom) {
    blocked = 'OXYGEN';
    reason = oxygenReason(oxygenNeeded - budget.headroom);
  } else if (buildersBusy(state) >= (state.builderCount || BASE_BUILDER_COUNT)) {
    blocked = 'NO_BUILDER';
    reason = 'All builders are busy';
  } else if (state.currencies.nutrients < cost) {
    blocked = 'COST';
    reason = `Needs ${(cost - state.currencies.nutrients).toLocaleString()} more nutrients`;
  }
  return {
    atMax,
    cost,
    seconds,
    brainRequired,
    oxygenNeeded,
    oxygenHeadroom: budget.headroom,
    oxygenAdded: oxygenSupplyAt(organ.type, organ.level + 1) - oxygenSupplyAt(organ.type, organ.level),
    blocked,
    reason,
  };
}

/** Cost and time to take an organ type from `currentLevel` to the next. */
export function getUpgradeCost(type: OrganType, currentLevel: number): { nutrients: number; seconds: number } {
  return stepCost(type, currentLevel);
}

/** Starts upgrading an organ, if getUpgradeCheck allows it. */
export function startOrganUpgrade(state: GameState, organId: string): GameState {
  const check = getUpgradeCheck(state, organId);
  if (!check || check.blocked) return state;
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const organ = newState.organs.find((o) => o.id === organId)!;
  newState.currencies.nutrients -= check.cost;
  organ.status = 'UNDER_UPGRADE';
  organ.upgradeDurationSeconds = check.seconds;
  organ.upgradeEndTime = Date.now() + check.seconds * 1000;
  soundEffects.playResourceChime();
  return newState;
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

/** Instantly completes an upgrade using Hormones. */
export function instantCompleteUpgradeWithHormone(state: GameState, organId: string): GameState {
  const organ = state.organs.find((o) => o.id === organId);
  if (!organ || organ.status !== 'UNDER_UPGRADE') return state;
  const remainingSec = organ.upgradeEndTime ? Math.max(0, (organ.upgradeEndTime - Date.now()) / 1000) : 0;
  const cost = hormoneCostToFinish(remainingSec);
  if (state.currencies.hormones < cost) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.currencies.hormones -= cost;
  finishUpgrade(newState.organs.find((o) => o.id === organId)!);
  soundEffects.playHormoneRush();
  soundEffects.playUpgradeComplete();
  return newState;
}

/** Repairs a damaged organ (combat is parked; kept for its UI). */
export function repairOrgan(state: GameState, organId: string): GameState {
  const organ = state.organs.find((o) => o.id === organId);
  if (!organ || state.currencies.nutrients < organ.repairCost.nutrients) return state;
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const target = newState.organs.find((o) => o.id === organId)!;
  newState.currencies.nutrients -= target.repairCost.nutrients;
  target.hp = target.maxHp;
  target.status = 'OPTIMAL';
  target.toxicityLevel = 10;
  soundEffects.playUpgradeComplete();
  return newState;
}

/** One line on what an organ is doing for the body right now, for its panel. */
export function organRoleSummary(state: GameState, organId: string): { summary: string; oxygen: string } {
  const o = state.organs.find((x) => x.id === organId);
  if (!o) return { summary: '', oxygen: '' };
  const econ = ORGAN_ECONOMY[o.type];
  const r = economyRates(state);
  const fmt = (n: number) => Math.round(n).toLocaleString();
  const oxygen =
    econ.role === 'BREATHING' ? `+${fmt(isBuilt(o) ? oxygenSupplyAt(o.type, o.level) : 0)} supply` : `${fmt(organOxygenDemand(o))} used`;
  const idle = !isWorking(o) ? ' (paused while it builds or upgrades)' : '';
  let summary: string;
  switch (econ.role) {
    case 'COMMAND':
      summary = `Stores ${fmt(cocTownHallStorage(o.level))} nutrients. Upgrading it unlocks new organs and levels.`;
      break;
    case 'FOOD_MAKER': {
      const m = r.makers.get(o.id);
      summary = m
        ? `Makes ${fmt(m.perHour)} nutrients/hour, its helpers included; holds up to ${fmt(m.capacity)} until collected.`
        : `Makes nutrients${idle}.`;
      if (econ.clearsWaste) summary += ` Also clears ${fmt(r.contribution.get(o.id) ?? 0)} waste/hour into the rectum.`;
      break;
    }
    case 'FOOD_HELPER': {
      const target = ORGAN_DEFINITIONS[econ.helps!].shortName.toLowerCase();
      const add = r.contribution.get(o.id);
      summary = add
        ? `Adds ${fmt(add)} nutrients/hour to the ${target}.`
        : `Adds to the ${target}'s output — ${state.organs.some((x) => x.type === econ.helps) ? 'not right now' : `build a ${target} first`}${idle}.`;
      break;
    }
    case 'FOOD_STORE':
      summary = `Stores ${fmt(isBuilt(o) ? foodStoreCapacity(o.level) : 0)} nutrients.${o.type === 'LIVER_METABOLIC' ? ' Makes 20% less waste reach the blood.' : ''}`;
      break;
    case 'BREATHING':
      summary = `Supplies oxygen. Upgrading it makes room for more organs and levels (Brain level ${requiredBrainLevelFor(o.type, o.level + 1)} for the next).`;
      break;
    case 'WASTE_CLEARER':
    case 'WASTE_HELPER': {
      const c = r.contribution.get(o.id);
      summary = c
        ? `Clears ${fmt(c)} waste/hour out of the blood into the bladder${circulationNote(state, o)}.`
        : econ.role === 'WASTE_HELPER'
          ? `Helps the kidneys clear waste — needs a working kidney${idle}.`
          : `Clears waste${idle}.`;
      break;
    }
    case 'WASTE_STORE':
      summary = `Holds ${fmt(isBuilt(o) ? wasteStoreCapacity(o.level) : 0)} waste until you flush. The body's stores are ${state.vitals.wasteFillPct ?? 0}% full.`;
      break;
    case 'PACE': {
      const brain = brainLevelOf(state);
      const target = onPaceLevel(o.type, brain);
      const p = paceFactors(state);
      const f = o.type === 'HEART_CARDIO' ? p.heart : p.nerve;
      summary =
        o.level >= target
          ? `Level with the Brain: every organ runs at full speed.`
          : `${target - o.level} level${target - o.level === 1 ? '' : 's'} behind the Brain: every organ runs at ${Math.round(f * 100)}%. Upgrade it to level ${target}.`;
      break;
    }
    case 'GEM_GLAND':
      summary = `Makes about ${(([...r.gemsPerHour.entries()].find(([id]) => id === o.id)?.[1] ?? 0) * 24).toFixed(1)} hormones a day.`;
      break;
    case 'BOOST_GLAND':
      summary = 'Unlocks the production boost in the Hormone Shop.';
      break;
    case 'WALL':
    default:
      summary = ORGAN_DEFINITIONS[o.type].description;
  }
  return { summary, oxygen };
}

function circulationNote(state: GameState, o: OrganNode): string {
  const c = computeCirculation(state.organs, state.vessels);
  return c.venousDrained.has(o.id) ? '' : ' — only 30% without a vein; connect one';
}

// ---------------------------------------------------------------------------
// ON-PACE BODY — every organ unlocked at a Brain level, at the level CoC would
// have that building at, plumbed with short arteries and veins. Used by the
// tests to check the calibration against CoC, and by the demo.
// ---------------------------------------------------------------------------

export function createOnPaceState(brain: number): GameState {
  const s = createInitialGameState();
  const brainNode = s.organs[0];
  brainNode.level = brain;
  brainNode.maxHp = brainNode.hp = maxHpFor('BRAIN_CNS', brain);
  const cx = 420;
  const cy = 330;
  const heart = makeOrganNode('HEART_CARDIO', cx, cy, onPaceLevel('HEART_CARDIO', brain), 'heart_pace');
  brainNode.x = cx;
  brainNode.y = cy - 110;
  s.organs.push(heart);
  const others = onPaceBody(brain).flatMap((o) =>
    o.type === 'BRAIN_CNS' || o.type === 'HEART_CARDIO'
      ? []
      : Array.from({ length: o.count }, (_, i) => ({ type: o.type, level: o.level, i }))
  );
  others.forEach((o, k) => {
    // A ring close enough to the heart that every artery is full strength.
    const a = (k / others.length) * Math.PI * 2;
    const node = makeOrganNode(o.type, Math.round(cx + Math.cos(a) * 115), Math.round(cy + Math.sin(a) * 115), o.level, `${o.type.toLowerCase()}_pace_${o.i}`);
    s.organs.push(node);
  });
  for (const o of s.organs) {
    if (o.id === heart.id) continue;
    s.vessels.push({ id: `a_${o.id}`, fromNodeId: heart.id, toNodeId: o.id, type: 'ARTERY', level: 1, capacity: 60, flowSpeed: 1.5 });
    s.vessels.push({ id: `v_${o.id}`, fromNodeId: o.id, toNodeId: heart.id, type: 'VEIN', level: 1, capacity: 60, flowSpeed: 1.5 });
  }
  s.builderCount = MAX_BUILDER_COUNT;
  s.currencies.maxNutrients = nutrientCapacity(s);
  s.currencies.nutrients = 0;
  s.selectedOrganId = null;
  return s;
}

// ---------------------------------------------------------------------------
// SAVE MIGRATION — saves from before this roster (economyVersion < 2) had
// oxygen as a currency, water, and duplicated organs (three stomachs...).
// ---------------------------------------------------------------------------

/**
 * Brings an older save up to date. Banked nutrients are kept; banked oxygen
 * was the other half of CoC's economy, so it is converted to nutrients. Organs
 * beyond the body's real count are removed and refunded in full (what they would
 * cost under the current tables). Refunds and anything over the storage cap go
 * to the Treasury, which is collected when there is room.
 */
export function migrateGameState(raw: any): GameState {
  const base = createInitialGameState();
  if (raw && raw.economyVersion === ECONOMY_VERSION) return { ...base, ...raw } as GameState;

  const s: GameState = { ...base, ...JSON.parse(JSON.stringify(raw || {})) };
  let refund = 0;
  const oldCur = (raw?.currencies || {}) as Record<string, number>;
  refund += Math.max(0, Math.floor(oldCur.oxygen || 0));
  refund += Math.max(0, Math.floor(raw?.treasuryOxygen || 0));
  s.currencies = {
    nutrients: Math.max(0, Math.floor(oldCur.nutrients || 0)),
    maxNutrients: oldCur.maxNutrients || cocTownHallStorage(1),
    hormones: Math.max(0, Math.floor(oldCur.hormones || 0)),
  };

  const known = (Array.isArray(raw?.organs) ? raw.organs : []).filter(
    (o: any) => o && ORGAN_DEFINITIONS[o.type as OrganType]
  ) as OrganNode[];
  if (!known.some((o) => o.type === 'BRAIN_CNS')) known.unshift(base.organs[0]);
  const kept: OrganNode[] = [];
  const byType = new Map<OrganType, OrganNode[]>();
  for (const o of known) byType.set(o.type, [...(byType.get(o.type) || []), o]);
  for (const [type, list] of byType) {
    const max = ORGAN_DEFINITIONS[type].maxPerBase;
    const table = type === 'BRAIN_CNS' ? null : levelTable(type);
    list.sort((a, b) => (b.level || 1) - (a.level || 1));
    list.forEach((o, i) => {
      const level = Math.max(1, Math.min(table ? table.maxLevel : MAX_BRAIN_LEVEL, o.level || 1));
      if (i >= max) {
        refund += cumulativeCost(type, level).nutrients;
        return;
      }
      const node = makeOrganNode(type, o.x ?? 300, o.y ?? 300, level, o.id);
      node.uncollectedNutrients = Math.floor((o.uncollectedNutrients || 0) + (o.uncollectedOxygen || 0));
      node.uncollectedHormones = o.uncollectedHormones || 0;
      node.boostedUntil = o.boostedUntil;
      if (o.status === 'UNDER_UPGRADE' && o.upgradeEndTime) {
        node.status = 'UNDER_UPGRADE';
        node.constructing = o.constructing;
        node.upgradeEndTime = o.upgradeEndTime;
        node.upgradeDurationSeconds = o.upgradeDurationSeconds;
      }
      kept.push(node);
    });
  }
  const ids = new Set(kept.map((o) => o.id));
  s.organs = kept;
  s.vessels = (Array.isArray(raw?.vessels) ? raw.vessels : []).filter(
    (v: VesselConnection) => ids.has(v.fromNodeId) && ids.has(v.toNodeId)
  );
  s.selectedOrganId = ids.has(raw?.selectedOrganId) ? raw.selectedOrganId : null;

  const cap = nutrientCapacity(s);
  s.currencies.maxNutrients = cap;
  if (s.currencies.nutrients > cap) {
    refund += s.currencies.nutrients - cap;
    s.currencies.nutrients = cap;
  }
  s.treasuryNutrients = Math.max(0, Math.floor(raw?.treasuryNutrients || 0)) + refund;
  s.wasteLoad = 0;
  s.bodyWaste = 0;
  s.economyVersion = ECONOMY_VERSION;
  delete (s as any).treasuryOxygen;
  delete (s as any).oxygenHarvested;
  if (refund > 0) {
    log(s, 'RESOURCE_COLLECTED', `🧬 The body was rebuilt with its real organs. ${refund.toLocaleString()} nutrients (old oxygen and removed duplicate organs) are waiting in the Treasury.`, 0);
  }
  return s;
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
        const role = ORGAN_ECONOMY[o.type]?.role;
        return role === 'FOOD_MAKER' || role === 'FOOD_HELPER';
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
/** Ours: the two old per-currency prices added together, now in nutrients. */
const VESSEL_LAY_BASE = 45;
const VESSEL_LAY_PER_100PX = 27;
const VESSEL_UPGRADE_BASE = 70;
const VESSEL_UPGRADE_PER_100PX = 43;
/** Each level costs this much more than the last. */
const VESSEL_UPGRADE_GROWTH = 1.8;

/** Pixel length of a vessel, from its endpoints' positions. */
export function vesselLength(state: GameState, vessel: VesselConnection): number {
  const a = state.organs.find((o) => o.id === vessel.fromNodeId);
  const b = state.organs.find((o) => o.id === vessel.toNodeId);
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Nutrients to lay a vessel of a given length. */
export function connectVesselCost(length: number): number {
  return Math.round(VESSEL_LAY_BASE + (length / 100) * VESSEL_LAY_PER_100PX);
}

/** Nutrients to take a vessel from `level` to `level + 1`. */
export function vesselUpgradeCost(length: number, level: number): number {
  const growth = Math.pow(VESSEL_UPGRADE_GROWTH, Math.max(0, level - 1));
  return Math.round((VESSEL_UPGRADE_BASE + (length / 100) * VESSEL_UPGRADE_PER_100PX) * growth);
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
  if (state.currencies.nutrients < cost) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const target = newState.vessels.find((v) => v.id === vesselId)!;
  newState.currencies.nutrients -= cost;
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
  if (newState.currencies.nutrients < cost) return state;

  newState.currencies.nutrients -= cost;

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
 * Offline progression: replays the absence in slices with the same economy
 * step as the live tick, so builds finish, waste fills and the throttle bites
 * when they would have. As in CoC there is no cap on the absence: each maker's
 * bubble and the bladder are what limit it. (Client clock; a server clock is
 * needed before monetisation.)
 */
export interface OfflineReport {
  seconds: number;
  nutrients: number;
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
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const startMs = state.lastTickTimestamp;
  const steps = Math.max(1, Math.min(480, Math.ceil(elapsed / 60)));
  const dt = elapsed / steps;
  let gained = 0;
  let upgradesCompleted = 0;
  let circulation = computeCirculation(newState.organs, newState.vessels);
  updateBloodFlow(newState, circulation);
  for (let i = 0; i < steps; i++) {
    const t = startMs + (i + 0.5) * dt * 1000;
    const done = completeFinishedUpgrades(newState, t);
    if (done.length) {
      upgradesCompleted += done.length;
      circulation = computeCirculation(newState.organs, newState.vessels);
      updateBloodFlow(newState, circulation);
    }
    gained += advanceEconomy(newState, dt, t, circulation).made;
  }
  upgradesCompleted += completeFinishedUpgrades(newState, now).length;
  newState.currencies.maxNutrients = nutrientCapacity(newState);
  const cap = excretoryCapacity(newState);
  const wasteRose = cap <= 0 ? (newState.bodyWaste || 0) > 0 : (newState.wasteLoad || 0) >= cap;

  spawnObstaclesForElapsed(newState, now);
  refreshStarBonusAvailability(newState, now);
  newState.lastTickTimestamp = now;

  const report: OfflineReport = { seconds: elapsed, nutrients: Math.floor(gained), upgradesCompleted, wasteRose };
  const mins = Math.round(elapsed / 60);
  const timeStr = mins >= 60 ? `${(mins / 60).toFixed(1)} h` : `${mins} min`;
  log(
    newState,
    'RESOURCE_COLLECTED',
    `🌙 While you were away (${timeStr}): organs made +${report.nutrients.toLocaleString()} nutrients. Tap the bubbles to collect!${
      wasteRose ? ' The bladder is full — flush it.' : ''
    }`
  );
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
  const hqLevel = brainLevelOf(newState);

  const lootPct = hqLevel <= 6 ? 0.2 : Math.max(0.1, 0.2 - 0.02 * (hqLevel - 6));
  const leagueBonus = Math.round(cocStorageCapacity(hqLevel) * 0.02);
  // A CoC raid loots Gold AND Elixir; nutrients carry both, so the haul is the
  // Gold-side loot twice (our storage cap stands in for the opponent's).
  const cap = nutrientCapacity(newState);
  newState.currencies.maxNutrients = cap;
  const loot = 2 * (Math.round(cap * lootPct) + leagueBonus);
  const taken = Math.min(loot, Math.max(0, cap - newState.currencies.nutrients));
  newState.currencies.nutrients += taken;
  newState.totalResourcesHarvested += taken;
  newState.nutrientsHarvested = (newState.nutrientsHarvested || 0) + taken;

  log(
    newState,
    'RESOURCE_COLLECTED',
    `⚔️ Raid returned +${taken.toLocaleString()} nutrients (${Math.round(lootPct * 100)}% loot + league bonus${
      taken < loot ? '; storage was full' : ''
    }).`
  );
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
        .filter((o) => ORGAN_ECONOMY[o.type].role === 'FOOD_STORE')
        .reduce((max, o) => Math.max(max, o.level), 0);
    // Nutrients carry CoC's Gold AND Elixir, so each of CoC's two harvest
    // achievements counts half of what was collected.
    case 'nutrientsHarvested':
    case 'oxygenHarvested':
      return Math.floor((state.nutrientsHarvested || 0) / 2);
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

/** One Star Bonus payout: a share of the storage cap, twice (Gold + Elixir). */
export function starBonusReward(state: GameState): number {
  return Math.round(nutrientCapacity(state) * STAR_BONUS_CAP_SHARE * 2);
}

/** Treasury capacity — a few bonuses' worth, so it can bank while you are away. */
export function treasuryCapacity(state: GameState): number {
  return starBonusReward(state) * TREASURY_CAPACITY_MULTIPLE;
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
  // Never trims what is already banked (migration refunds can exceed the cap).
  state.treasuryNutrients = Math.max(
    state.treasuryNutrients || 0,
    Math.min(treasuryCapacity(state), (state.treasuryNutrients || 0) + reward)
  );
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
    details: `⭐ Daily Bonus complete (${reason})! +${reward.toLocaleString()} nutrients banked in the Treasury — safe from raids.`,
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
  const have = state.treasuryNutrients || 0;
  if (have <= 0) return state;
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const cap = nutrientCapacity(newState);
  newState.currencies.maxNutrients = cap;
  const moved = Math.min(have, Math.max(0, cap - newState.currencies.nutrients));
  if (moved <= 0) return state;
  newState.currencies.nutrients += moved;
  newState.treasuryNutrients = have - moved;
  newState.totalResourcesHarvested += moved;
  newState.nutrientsHarvested = (newState.nutrientsHarvested || 0) + moved;
  log(
    newState,
    'RESOURCE_COLLECTED',
    `🏦 Collected ${moved.toLocaleString()} nutrients from the Treasury.${
      newState.treasuryNutrients > 0 ? ' Storage was full — the rest stays banked.' : ''
    }`
  );
  soundEffects.playResourceChime();
  return newState;
}


// ---------------------------------------------------------------------------
// COLLECTOR BOOST — CoC's recurring gem sink, verbatim: double one collector's
// output for a day, level 5 and up only, priced by level (4 to 10 gems).
// ---------------------------------------------------------------------------

/**
 * Hormone cost to boost this organ now, or null if it cannot be. Food makers and
 * helpers only (each is a Gold Mine + Elixir Collector, so it costs CoC's boost
 * price twice), level 5 and up, and only once the thyroid — the metabolism
 * gland — is built.
 */
export function organBoostCost(state: GameState, organ: OrganNode): number | null {
  const role = ORGAN_ECONOMY[organ.type].role;
  if (role !== 'FOOD_MAKER' && role !== 'FOOD_HELPER') return null;
  if (!isBuilt(organ)) return null;
  if (organ.boostedUntil && Date.now() < organ.boostedUntil) return null;
  if (!state.organs.some((o) => o.type === 'THYROID_ENDOCRINE' && isBuilt(o))) return null;
  const c = cocBoostCost(organ.level);
  return c === null ? null : 2 * c;
}

export function hasThyroid(state: GameState): boolean {
  return state.organs.some((o) => o.type === 'THYROID_ENDOCRINE' && isBuilt(o));
}

export function boostOrgan(state: GameState, organId: string): GameState {
  const organ = state.organs.find((o) => o.id === organId);
  if (!organ) return state;
  const cost = organBoostCost(state, organ);
  if (cost === null || state.currencies.hormones < cost) return state;
  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.currencies.hormones -= cost;
  newState.organs.find((o) => o.id === organId)!.boostedUntil = Date.now() + COC_BOOST_DURATION_SECONDS * 1000;
  soundEffects.playHormoneRush();
  return newState;
}

/** Total cost and count of every organ that could be boosted right now. */
export function boostAllQuote(state: GameState): { cost: number; count: number } {
  let cost = 0;
  let count = 0;
  for (const organ of state.organs) {
    const c = organBoostCost(state, organ);
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
    if (organBoostCost(newState, organ) !== null) organ.boostedUntil = until;
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
