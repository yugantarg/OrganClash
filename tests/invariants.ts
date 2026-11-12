/**
 * Economy invariants. Run with `npm test`.
 *
 * The calibration section compares an on-pace body (every organ at the level
 * CoC would have its building at for that Town Hall) against CoC's own totals at
 * every Brain level, and prints the worst deviation. Tolerances are stated next
 * to each check.
 */
import {
  createInitialGameState, createOnPaceState, runSimulationTick, placeNewOrgan, getPlacementInfo,
  getUpgradeCheck, getUpgradeCost, startOrganUpgrade, collectOrganResources, connectVesselRoad,
  computeCirculation, vesselEfficiency, connectVesselCost, vesselUpgradeCost, upgradeVessel,
  flushWaste, excretoryCapacity, wasteThrottleFactor, applyOfflineProgress, simulateRaidIncome,
  RAID_COOLDOWN_SECONDS, collectTreasury, grantStar, clearObstacle, hormoneCostToFinish,
  requiredBrainLevelFor, boostOrgan, organBoostCost, GameState, economyRates, oxygenBudget,
  nutrientCapacity, instantCompleteUpgradeWithHormone, migrateGameState, ECONOMY_VERSION,
  paceFactors, makeOrganNode, brainLevelOf, starBonusReward,
} from '../src/services/simulationEngine';
import {
  COC_COLLECTOR, COC_DEFENSE, COC_TOWN_HALL, COC_OBSTACLE_GEM_CYCLE, cocCollectorCount,
  cocTownHallStorage, cocBoostCost,
} from '../src/data/cocTables';
import {
  CALIBRATION, cocIncomePerHour, cocStorageTotal, cocCollectorFillHours, cocEconomySpend,
  bodyEconomySpend, levelTable, onPaceLevel, onPaceBody, oxygenDemandAt, stepCost, MAX_BRAIN_LEVEL,
} from '../src/data/bodyEconomy';
import { ORGAN_DEFINITIONS, ORGAN_ECONOMY } from '../src/data/organData';
import type { OrganType } from '../src/types';

let clock = Date.now();
(Date as any).now = () => clock;
const advance = (s: number) => { clock += s * 1000; };

let pass = 0; let fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
function section(t: string) { console.log(`\n${t}`); }
const organ = (s: GameState, t: OrganType) => s.organs.find((o) => o.type === t)!;
const ALL_TYPES = Object.keys(ORGAN_DEFINITIONS) as OrganType[];
function run(s: GameState, seconds: number): GameState {
  for (let i = 0; i < seconds; i++) { advance(1); s = runSimulationTick(s); }
  return s;
}
/** Finish every build/upgrade in progress right now. */
function finishAll(s: GameState): GameState {
  for (const o of s.organs) if (o.status === 'UNDER_UPGRADE') o.upgradeEndTime = clock;
  return runSimulationTick(s);
}
const rel = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 1) : Math.abs(a / b - 1));

// ---------------------------------------------------------------------------
section('Real organs only');
{
  const two: OrganType[] = ['LUNGS_RESP', 'KIDNEY_EXCRET', 'URETER_EXCRET', 'ADRENAL_ENDOCRINE'];
  for (const t of ALL_TYPES) {
    check(`${t} real count`, ORGAN_DEFINITIONS[t].maxPerBase === (two.includes(t) ? 2 : 1));
  }
  check('no adipose tissue', !ALL_TYPES.some((t) => /ADIPOSE|FAT/.test(t)));
  for (const t of ['MOUTH_DIGEST', 'OESOPHAGUS_DIGEST', 'GALLBLADDER_DIGEST', 'RECTUM_DIGEST', 'NOSE_RESP',
    'DIAPHRAGM_RESP', 'URETER_EXCRET', 'URETHRA_EXCRET', 'SKULL_BONE', 'BACKBONE_BONE', 'PITUITARY_ENDOCRINE'] as OrganType[]) {
    check(`${t} exists`, !!ORGAN_DEFINITIONS[t]);
  }
  check('liver and gall bladder are separate organs', ORGAN_ECONOMY.LIVER_METABOLIC.role === 'FOOD_STORE' && ORGAN_ECONOMY.GALLBLADDER_DIGEST.role === 'FOOD_HELPER');
  check('large intestine makes nutrients and clears waste', ORGAN_ECONOMY.COLON_DIGEST.role === 'FOOD_MAKER' && !!ORGAN_ECONOMY.COLON_DIGEST.clearsWaste);
  check('rectum only holds waste', ORGAN_ECONOMY.RECTUM_DIGEST.role === 'WASTE_STORE');
  check('breathing organs demand no oxygen', ALL_TYPES.filter((t) => ORGAN_ECONOMY[t].role === 'BREATHING').every((t) => oxygenDemandAt(t, 5) === 0));
  check('no oxygen store exists', !ALL_TYPES.some((t) => ORGAN_ECONOMY[t].role === 'BREATHING' && ORGAN_ECONOMY[t].table === 'FOOD_STORE'));
  // Food makers + helpers carry CoC's collector count exactly.
  for (let T = 1; T <= MAX_BRAIN_LEVEL; T++) {
    const chain = ALL_TYPES.filter((t) => ['FOOD_MAKER', 'FOOD_HELPER'].includes(ORGAN_ECONOMY[t].role) && ORGAN_DEFINITIONS[t].unlockedAtBrainLevel <= T).length;
    check(`Brain ${T}: food organs = CoC collectors`, chain === cocCollectorCount(T), `${chain} vs ${cocCollectorCount(T)}`);
  }
  let s = createOnPaceState(4);
  s.currencies.nutrients = 1e9;
  check('placing a second stomach is blocked', getPlacementInfo(s, 'STOMACH_DIGEST').blocked === 'MAX');
  check('placing a third lung is blocked', getPlacementInfo(s, 'LUNGS_RESP').blocked === 'MAX');
}

// ---------------------------------------------------------------------------
section('One currency; CoC tables verbatim where the counts match');
{
  for (let L = 1; L <= 11; L++) {
    const c = getUpgradeCost('STOMACH_DIGEST', L);
    check(`food maker L${L} = CoC collector`, c.nutrients === COC_COLLECTOR.cost[L] && c.seconds === COC_COLLECTOR.seconds[L]);
    const d = getUpgradeCost('HEART_CARDIO', L);
    check(`heart L${L} = Cannon`, d.nutrients === COC_DEFENSE.cost[L] && d.seconds === COC_DEFENSE.seconds[L]);
    const b = getUpgradeCost('BRAIN_CNS', L);
    check(`brain L${L} = Town Hall`, b.nutrients === COC_TOWN_HALL.cost[L] && b.seconds === COC_TOWN_HALL.seconds[L]);
  }
  check('costs carry no oxygen', !('oxygen' in getUpgradeCost('LUNGS_RESP', 1)));
  const s = createInitialGameState();
  check('currencies have no oxygen or water', !('oxygen' in s.currencies) && !('water' in s.currencies));
  check('placement cost is a single number', typeof getPlacementInfo(s, 'STOMACH_DIGEST').cost === 'number');
  check('vessel costs are single numbers', typeof connectVesselCost(200) === 'number' && typeof vesselUpgradeCost(200, 1) === 'number');
  for (const t of ['LUNGS_RESP', 'LIVER_METABOLIC', 'KIDNEY_EXCRET'] as OrganType[]) {
    const tb = levelTable(t);
    check(`${t} derived table: positive costs`, tb.cost.every((c) => c > 0) && tb.seconds.every((x) => x > 0));
    check(`${t} derived table: one level per Brain step`, tb.brainRequired.every((b, i) => i === 0 || b > tb.brainRequired[i - 1]));
  }
  check('gem skip knots', hormoneCostToFinish(60) === 1 && hormoneCostToFinish(3600) === 20 && hormoneCostToFinish(86400) === 260 && hormoneCostToFinish(604800) === 1000);
  check('collector L9 legal at brain 5', requiredBrainLevelFor('STOMACH_DIGEST', 9) === 5);
}

// ---------------------------------------------------------------------------
section('Calibration against CoC at every Brain level');
{
  const worst = { income: 0, storage: 0, spend: 0, time: 0, fill: 0, oxygen: 0 };
  console.log('  Brain | income | storage | spend  | builder-h | waste fill | O2 (supply vs demand, Brain upgrading)');
  for (let T = 1; T <= MAX_BRAIN_LEVEL; T++) {
    const s = createOnPaceState(T);
    const r = economyRates(s);
    const income = rel(r.incomePerHour, cocIncomePerHour(T));
    const storage = rel(nutrientCapacity(s) - cocTownHallStorage(T), cocStorageTotal(T));
    const ours = bodyEconomySpend(T);
    const coc = cocEconomySpend(T);
    const spend = rel(ours.nutrients, coc.nutrients);
    const time = rel(ours.seconds, coc.seconds);
    const fill = rel(r.wasteCapacity / r.wasteMadePerHour, cocCollectorFillHours(T));
    // Maxed body with the Brain reserving its next level: demand == supply.
    const brain = organ(s, 'BRAIN_CNS');
    if (T < MAX_BRAIN_LEVEL) { brain.status = 'UNDER_UPGRADE'; brain.upgradeEndTime = clock + 1e9; }
    const ox = oxygenBudget(s);
    const oxygen = rel(ox.demand, ox.supply);
    check(`Brain ${T}: income = CoC Gold+Elixir collectors (±0.5%)`, income <= 0.005, `${(income * 100).toFixed(2)}%`);
    check(`Brain ${T}: food storage = CoC Gold Storages (±0.5%)`, storage <= 0.005, `${(storage * 100).toFixed(2)}%`);
    check(`Brain ${T}: spend = CoC collectors + storages (±5%)`, spend <= 0.05, `${(spend * 100).toFixed(2)}%`);
    check(`Brain ${T}: builder time = CoC collectors + storages (±5%)`, time <= 0.05, `${(time * 100).toFixed(2)}%`);
    check(`Brain ${T}: bladder fills in CoC collector fill time (±1%)`, fill <= 0.01, `${(fill * 100).toFixed(2)}%`);
    check(`Brain ${T}: maxed breathing == maxed demand (±0.5%)`, oxygen <= 0.005 && ox.demand <= ox.supply, `${ox.demand}/${ox.supply}`);
    check(`Brain ${T}: on pace runs at 100% (pace, no hypoxia)`, r.pace === 1 && r.hypoxia === 1);
    check(`Brain ${T}: on pace clears 1.5x the waste made`, Math.abs(r.clearPerHour / r.wasteMadePerHour - CALIBRATION.CLEAR_MARGIN) < 0.01);
    for (const k of Object.keys(worst) as (keyof typeof worst)[]) {
      worst[k] = Math.max(worst[k], { income, storage, spend, time, fill, oxygen }[k]);
    }
    const pct = (x: number) => `${(x * 100).toFixed(2)}%`.padStart(7);
    console.log(`  ${String(T).padStart(5)} | ${pct(income)} | ${pct(storage)} | ${pct(spend)} | ${pct(time)}   | ${pct(fill)}    | ${ox.demand}/${ox.supply}`);
  }
  console.log(`  worst deviation: income ${(worst.income * 100).toFixed(2)}%, storage ${(worst.storage * 100).toFixed(2)}%, spend ${(worst.spend * 100).toFixed(2)}%, builder time ${(worst.time * 100).toFixed(2)}%, waste fill ${(worst.fill * 100).toFixed(2)}%, oxygen ${(worst.oxygen * 100).toFixed(2)}%`);
}

// ---------------------------------------------------------------------------
section('Oxygen: a budget that gates builds, never a dead end');
{
  let s = createInitialGameState();
  const stomach = getPlacementInfo(s, 'STOMACH_DIGEST');
  check('a lone Brain has no oxygen room for a stomach', stomach.blocked === 'OXYGEN');
  check('the reason names breathing', /^Needs \d[\d,]* more oxygen — upgrade breathing$/.test(stomach.reason || ''), stomach.reason || '');
  check('a lung never needs oxygen', getPlacementInfo(s, 'LUNGS_RESP').oxygenNeeded === 0 && getPlacementInfo(s, 'LUNGS_RESP').blocked === null);
  s = placeNewOrgan(s, 'LUNGS_RESP', 300, 300);
  s = placeNewOrgan(s, 'LUNGS_RESP', 340, 300);
  check('a lung under construction adds no supply yet', getPlacementInfo(s, 'STOMACH_DIGEST').blocked !== null);
  s = finishAll(s);
  check('two built lungs make room for a stomach', getPlacementInfo(s, 'STOMACH_DIGEST').blocked === null);

  // Walk Brain 1 -> 12 on pace with real engine calls: breathing first, then
  // every other organ, then the Brain. Nothing may ever be blocked by oxygen.
  s = createInitialGameState();
  s.builderCount = 5;
  let blockedBy: string | null = null;
  const fund = () => { s.currencies.nutrients = 1e12; s.currencies.maxNutrients = 1e12; };
  const doUntilPace = (types: OrganType[], T: number) => {
    for (const t of types) {
      while (s.organs.filter((o) => o.type === t).length < ORGAN_DEFINITIONS[t].maxPerBase && ORGAN_DEFINITIONS[t].unlockedAtBrainLevel <= T) {
        fund(); const info = getPlacementInfo(s, t);
        if (info.blocked) { blockedBy = `place ${t} at Brain ${T}: ${info.reason}`; return; }
        s = finishAll(placeNewOrgan(s, t, 300 + Math.random() * 200, 300 + Math.random() * 200));
      }
      for (const o of s.organs.filter((x) => x.type === t)) {
        while (o.level < onPaceLevel(t, T)) {
          fund(); const c = getUpgradeCheck(s, o.id)!;
          if (c.blocked) { blockedBy = `upgrade ${t} L${o.level} at Brain ${T}: ${c.reason}`; return; }
          s = finishAll(startOrganUpgrade(s, o.id));
          Object.assign(o, s.organs.find((x) => x.id === o.id));
        }
      }
    }
  };
  const breathing = ALL_TYPES.filter((t) => ORGAN_ECONOMY[t].role === 'BREATHING');
  const rest = ALL_TYPES.filter((t) => ORGAN_ECONOMY[t].role !== 'BREATHING' && t !== 'BRAIN_CNS');
  for (let T = 1; T <= MAX_BRAIN_LEVEL && !blockedBy; T++) {
    doUntilPace(breathing, T);
    if (!blockedBy) doUntilPace(rest, T);
    if (!blockedBy && T < MAX_BRAIN_LEVEL) {
      fund(); const c = getUpgradeCheck(s, organ(s, 'BRAIN_CNS').id)!;
      if (c.blocked) blockedBy = `Brain ${T}->${T + 1}: ${c.reason}`;
      else s = finishAll(startOrganUpgrade(s, organ(s, 'BRAIN_CNS').id));
    }
  }
  check('Brain 1 -> 12 on pace is never blocked', blockedBy === null, blockedBy || '');
  check('...and ends at Brain 12', brainLevelOf(s) === 12);

  // After a Brain upgrade, other upgrades wait for breathing (the unlock rule).
  let t = createOnPaceState(4);
  t.currencies.nutrients = 1e9; t.currencies.maxNutrients = 1e9;
  t = finishAll(startOrganUpgrade(t, organ(t, 'BRAIN_CNS').id));
  const st = getUpgradeCheck(t, organ(t, 'STOMACH_DIGEST').id)!;
  check('after Brain 5, the stomach waits for breathing', st.blocked === 'OXYGEN' && /upgrade breathing/.test(st.reason || ''), st.reason || '');
  for (const o of t.organs.filter((x) => ORGAN_ECONOMY[x.type].role === 'BREATHING')) t = finishAll(startOrganUpgrade(t, o.id));
  check('...and is allowed once breathing is upgraded', getUpgradeCheck(t, organ(t, 'STOMACH_DIGEST').id)!.blocked === null);

  // Hypoxia (only reachable from an old save): output slows to a floor, never zero.
  let h = createOnPaceState(5);
  h.organs = h.organs.filter((o) => ORGAN_ECONOMY[o.type].role !== 'BREATHING');
  const rh = economyRates(h);
  check('demand above supply slows output to a floor, never zero', rh.hypoxia >= CALIBRATION.HYPOXIA_FLOOR && rh.hypoxia < 1);
  const before = organ(h, 'STOMACH_DIGEST').uncollectedNutrients;
  h = run(h, 60);
  check('...and organs still produce', organ(h, 'STOMACH_DIGEST').uncollectedNutrients > before);
  const fixed = createOnPaceState(5);
  check('...and restoring breathing restores full output', economyRates(fixed).hypoxia === 1);
}

// ---------------------------------------------------------------------------
section('Placement follows CoC: first-build cost, time and a builder');
{
  let s = createInitialGameState();
  s = finishAll(placeNewOrgan(placeNewOrgan(s, 'LUNGS_RESP', 300, 300), 'LUNGS_RESP', 340, 300));
  const before = s.currencies.nutrients;
  s = placeNewOrgan(s, 'STOMACH_DIGEST', 300, 400);
  const st = organ(s, 'STOMACH_DIGEST');
  check('first build costs CoC\'s collector build price', s.currencies.nutrients === before - COC_COLLECTOR.cost[0]);
  check('it takes CoC\'s build time and a builder', st.status === 'UNDER_UPGRADE' && st.constructing === true && st.upgradeEndTime === clock + COC_COLLECTOR.seconds[0] * 1000);
  check('it reserves its oxygen while being built', oxygenBudget(s).demand >= oxygenDemandAt('STOMACH_DIGEST', 1));
  s = finishAll(s);
  check('finishing a build does not add a level', organ(s, 'STOMACH_DIGEST').level === 1);
  check('locked organs say when they unlock', getPlacementInfo(s, 'GALLBLADDER_DIGEST').reason === 'Unlocks at Brain level 9');
}

// ---------------------------------------------------------------------------
section('A brand-new body bootstraps with no dead end');
{
  let s = createInitialGameState();
  check('starting stock fits the Brain\'s storage', s.currencies.nutrients === CALIBRATION.STARTING_NUTRIENTS && s.currencies.nutrients <= cocTownHallStorage(1));
  for (const t of ['LUNGS_RESP', 'LUNGS_RESP', 'HEART_CARDIO', 'STOMACH_DIGEST'] as OrganType[]) {
    const info = getPlacementInfo(s, t);
    check(`starting stock places ${t}`, info.blocked === null, info.reason || '');
    s = finishAll(placeNewOrgan(s, t, 300 + s.organs.length * 30, 300));
  }
  check('...with nutrients left over', s.currencies.nutrients >= 0);
  s = connectVesselRoad(s, organ(s, 'HEART_CARDIO').id, organ(s, 'STOMACH_DIGEST').id, 'ARTERY');
  s = run(s, 600);
  check('the stomach produces', organ(s, 'STOMACH_DIGEST').uncollectedNutrients > 0);
  // Saving for Brain 2 (1,000) happens on the stomach alone.
  let hours = 0;
  while (s.currencies.nutrients < COC_TOWN_HALL.cost[1] && hours < 48) { s = collectOrganResources(run(s, 3600), undefined); hours++; }
  check('Brain 2 is affordable within a day on one stomach', s.currencies.nutrients >= COC_TOWN_HALL.cost[1], `${hours}h`);
  console.log(`  (Brain 2 saved for in ~${hours} h with one stomach)`);
}

// ---------------------------------------------------------------------------
section('Food: helpers add to their maker; makers stop while upgrading');
{
  const s = createOnPaceState(5);
  const r = economyRates(s);
  const stomach = r.makers.get(organ(s, 'STOMACH_DIGEST').id)!;
  check('stomach output includes mouth and food pipe', Math.abs(stomach.perHour - 3 * 2 * COC_COLLECTOR.perHour[9]) < 1e-6);
  const noStomach = { ...s, organs: s.organs.filter((o) => o.type !== 'STOMACH_DIGEST') };
  check('a helper with no maker adds nothing', !economyRates(noStomach).contribution.has(organ(s, 'MOUTH_DIGEST').id));
  const up = JSON.parse(JSON.stringify(s)) as GameState;
  organ(up, 'STOMACH_DIGEST').status = 'UNDER_UPGRADE';
  check('a maker under upgrade makes nothing (helpers included)', !economyRates(up).makers.has(organ(up, 'STOMACH_DIGEST').id));
  const tap = collectOrganResources(run(createOnPaceState(3), 30), undefined);
  check('tapping only collects what was made', tap.currencies.nutrients > 0 && tap.currencies.nutrients <= economyRates(createOnPaceState(3)).incomePerHour * 31 / 3600 + 1);
}

// ---------------------------------------------------------------------------
section('Waste: food in reverse, gradual throttle, free flush, nothing destroyed');
{
  let s = createOnPaceState(3);
  const r = economyRates(s);
  const hours = r.wasteCapacity / r.wasteMadePerHour;
  s = run(s, Math.round(hours * 3600 * 0.5));
  check('half the fill time: bladder about half full, blood clean', Math.abs(s.wasteLoad / r.wasteCapacity - 0.5) < 0.05 && s.bodyWaste < 1);
  check('throttle is 1 while the blood is within tolerance', wasteThrottleFactor(r.bloodTolerance * 0.99, r.bloodTolerance) === 1);
  check('throttle falls gradually', wasteThrottleFactor(r.bloodTolerance * 1.5, r.bloodTolerance) > 0.5 && wasteThrottleFactor(r.bloodTolerance * 1.5, r.bloodTolerance) < 0.6);
  check('throttle floors at 10%, never zero', wasteThrottleFactor(1e12, 1) === CALIBRATION.MIN_OUTPUT_FACTOR);
  s.wasteLoad = excretoryCapacity(s);
  s.bodyWaste = 2 * r.bloodTolerance;
  s = run(s, 5);
  check('full bladder + backed-up blood: output at the floor', s.vitals.wasteStallActive === true);
  const made = organ(s, 'STOMACH_DIGEST').uncollectedNutrients;
  s = run(s, 60);
  check('...but still producing', organ(s, 'STOMACH_DIGEST').uncollectedNutrients > made);
  check('...and no organ is damaged', s.organs.every((o) => o.hp === o.maxHp && o.status !== 'DAMAGED_DESTROYED'));
  s = flushWaste(s);
  check('flush empties the stores', s.wasteLoad === 0);
  const bw = s.bodyWaste;
  s = run(s, 3600);
  check('after a flush, the kidneys drain the blood', s.bodyWaste < bw * 0.6);
  const e = createOnPaceState(3);
  check('flush below 10% is refused', flushWaste(e) === e);
  // No kidneys: waste stays in the blood and output floors — but never stops.
  let nk = createOnPaceState(2);
  nk.organs = nk.organs.filter((o) => ORGAN_ECONOMY[o.type].table !== 'WASTE_SYSTEM');
  nk = run(nk, 24 * 3600);
  check('no kidneys or bladder: output floors at 10%', nk.vitals.wasteStallActive === true);
  check('...and organs still produce', economyRates(nk).incomePerHour > 0);
  const withLiver = economyRates(createOnPaceState(3)).wasteMadePerHour;
  const noLiver = createOnPaceState(3); noLiver.organs = noLiver.organs.filter((o) => o.type !== 'LIVER_METABOLIC');
  check('the liver makes 20% less waste reach the blood', Math.abs(economyRates(noLiver).wasteMadePerHour * 0.8 - withLiver) < 1e-6);
  const unveined = createOnPaceState(3); unveined.vessels = unveined.vessels.filter((v) => v.type !== 'VEIN');
  check('kidneys with no vein clear only 30%', Math.abs(economyRates(unveined).clearPerHour / economyRates(createOnPaceState(3)).clearPerHour - CALIBRATION.UNVEINED_CLEAR_FACTOR) < 1e-6);
}

// ---------------------------------------------------------------------------
section('Pace: heart and spinal cord, capped at 100%');
{
  const s = createOnPaceState(5);
  check('on pace = 100%', paceFactors(s).total === 1);
  organ(s, 'HEART_CARDIO').level -= 1;
  check('heart one level behind = 90%', Math.abs(paceFactors(s).total - 0.9) < 1e-9);
  organ(s, 'SPINAL_CORD').level = 1;
  check('lagging far behind floors at 60% each', paceFactors(s).nerve === CALIBRATION.PACE_FLOOR);
  organ(s, 'HEART_CARDIO').level = 12;
  check('never above 100%', paceFactors(s).heart === 1);
}

// ---------------------------------------------------------------------------
section('No walls: every upgrade fits in the storage reachable at its Brain level');
{
  for (let T = 1; T <= MAX_BRAIN_LEVEL; T++) {
    // Start from the previous Brain level's body, then step the food stores up
    // one level at a time, cheapest step first, as a player would. Every step,
    // and then every other cost allowed at T, must fit the storage at the time.
    const s = createOnPaceState(Math.max(1, T - 1));
    organ(s, 'BRAIN_CNS').level = T;
    const target = (t: OrganType) => onPaceLevel(t, T);
    for (const t of ALL_TYPES.filter((x) => ORGAN_ECONOMY[x].role === 'FOOD_STORE' && target(x) > 0)) {
      if (!s.organs.some((o) => o.type === t)) s.organs.push({ ...makeOrganNode(t, 0, 0, 1), level: 0 });
    }
    let ok = true; let worst = '';
    for (;;) {
      const steps = s.organs
        .filter((o) => ORGAN_ECONOMY[o.type].role === 'FOOD_STORE' && o.level < target(o.type))
        .map((o) => ({ o, c: stepCost(o.type, o.level).nutrients }))
        .sort((a, b) => a.c - b.c);
      if (!steps.length) break;
      const capNow = nutrientCapacity(s);
      if (steps[0].c > capNow) { ok = false; worst = `${steps[0].o.type} L${steps[0].o.level + 1} ${steps[0].c} > ${capNow}`; break; }
      steps[0].o.level += 1;
    }
    const capNow = nutrientCapacity(s);
    for (const t of ALL_TYPES) {
      for (let l = 1; l <= target(t); l++) {
        const c = stepCost(t, l - 1).nutrients;
        if (c > capNow) { ok = false; worst = `${t} L${l} ${c} > ${capNow}`; }
      }
    }
    if (T < MAX_BRAIN_LEVEL && COC_TOWN_HALL.cost[T] > capNow) { ok = false; worst = `Brain ${T + 1}`; }
    check(`Brain ${T}: no cost above reachable storage`, ok, worst);
  }
}

// ---------------------------------------------------------------------------
section('Offline: the same economy step, no cap on the absence');
{
  let s = createOnPaceState(4);
  s.lastTickTimestamp = clock;
  advance(12 * 3600);
  const { state: off, report } = applyOfflineProgress(s, clock);
  check('offline report produced', !!report && report.nutrients > 0);
  const r = economyRates(createOnPaceState(4));
  check('offline output is bounded by the makers\' bubbles', report!.nutrients <= [...r.makers.values()].reduce((a, m) => a + m.capacity, 0) + 1);
  check('offline waste fills the bladder', off.wasteLoad > 0);
  let u = createOnPaceState(4); u.currencies.nutrients = 1e9; u.currencies.maxNutrients = 1e9;
  organ(u, 'LIVER_METABOLIC').level = 4 - 1;
  u = startOrganUpgrade(u, organ(u, 'LIVER_METABOLIC').id);
  u.lastTickTimestamp = clock;
  advance(7 * 86400);
  const back = applyOfflineProgress(u, clock);
  check('upgrades finish while away', organ(back.state, 'LIVER_METABOLIC').level === 4 && back.report!.upgradesCompleted >= 1);
}

// ---------------------------------------------------------------------------
section('Circulation and vessels');
{
  check('short vessel is lossless', vesselEfficiency(100, 1) === 1);
  check('long vessel loses supply', vesselEfficiency(500, 1) < 1);
  check('thicker vessel carries further', vesselEfficiency(500, 3) > vesselEfficiency(500, 1));
  let s = createOnPaceState(3);
  s.currencies.nutrients = 1e6; s.currencies.maxNutrients = 1e6;
  const v = s.vessels[0];
  const before = s.currencies.nutrients;
  s = upgradeVessel(s, v.id);
  check('vessel upgrade costs nutrients only', s.currencies.nutrients < before && s.vessels[0].level === 2);
  const c = computeCirculation(s.organs, s.vessels);
  check('on-pace body is fully supplied', s.organs.every((o) => o.type === 'BRAIN_CNS' || (c.arterialSupply.get(o.id) ?? 0) === 1));
}

// ---------------------------------------------------------------------------
section('Raids, Star Bonus, Treasury (one currency)');
{
  let s = createOnPaceState(5);
  s.currencies.nutrients = 0;
  s = simulateRaidIncome(s);
  check('raid pays nutrients', s.currencies.nutrients > 0);
  const n = s.currencies.nutrients;
  s = simulateRaidIncome(s);
  check('raid cooldown holds', s.currencies.nutrients === n);
  advance(RAID_COOLDOWN_SECONDS);
  s = simulateRaidIncome(s);
  check('raid works after the cooldown', s.currencies.nutrients > n);
  let b = createOnPaceState(5);
  for (let i = 0; i < 5; i++) grantStar(b, 'test');
  check('five stars bank the bonus', b.treasuryNutrients === starBonusReward(b));
  b.currencies.nutrients = 0;
  b = collectTreasury(b);
  check('treasury collects into nutrients', b.currencies.nutrients > 0 && b.treasuryNutrients === 0);
}

// ---------------------------------------------------------------------------
section('Hormones: faucet and sinks');
{
  let s = createOnPaceState(3);
  s.currencies.nutrients = 1e6; s.currencies.maxNutrients = 1e6;
  s.obstacles = [{ id: 'o1', kind: 'TOXIN_DEPOSIT', name: 'x', x: 0, y: 0, clearCost: 200 }];
  const h = s.currencies.hormones;
  s = clearObstacle(s, 'o1');
  check('obstacle pays CoC\'s fixed cycle', s.currencies.hormones === h + COC_OBSTACLE_GEM_CYCLE[0]);
  const st = organ(s, 'STOMACH_DIGEST');
  check('boost needs the thyroid', organBoostCost({ ...s, organs: s.organs.filter((o) => o.type !== 'THYROID_ENDOCRINE') }, st) === null);
  check('boost costs CoC\'s price twice (Gold + Elixir)', organBoostCost(s, st) === 2 * (cocBoostCost(st.level) ?? 0));
  s.currencies.hormones = 100;
  const r0 = economyRates(s).incomePerHour;
  s = boostOrgan(s, st.id);
  check('boost doubles that organ\'s own output', Math.abs(economyRates(s).incomePerHour - r0 - 2 * COC_COLLECTOR.perHour[st.level - 1]) < 1e-6);
  check('boosted output makes no extra waste', Math.abs(economyRates(s).wasteMadePerHour - economyRates(createOnPaceState(3)).wasteMadePerHour) < 1e-6);
  const g = createOnPaceState(5);
  const gr = economyRates(g);
  const pit = [...gr.gemsPerHour.values()][0] * 24;
  check('pituitary trickle never exceeds CoC\'s Gem Mine', pit > 0 && pit <= 5.04 + 1e-9);
  let u = createOnPaceState(3); u.currencies.nutrients = 1e9; u.currencies.maxNutrients = 1e9; u.currencies.hormones = 1e6;
  organ(u, 'LIVER_METABOLIC').level = 2;
  u = startOrganUpgrade(u, organ(u, 'LIVER_METABOLIC').id);
  u = instantCompleteUpgradeWithHormone(u, organ(u, 'LIVER_METABOLIC').id);
  check('gems finish an upgrade', organ(u, 'LIVER_METABOLIC').level === 3);
}

// ---------------------------------------------------------------------------
section('Save migration from the old roster');
{
  const old: any = createInitialGameState();
  delete old.economyVersion;
  old.currencies = { nutrients: 700, maxNutrients: 1000, oxygen: 500, maxOxygen: 1000, water: 300, maxWater: 1000, hormones: 42 };
  old.treasuryOxygen = 100;
  const mk = (type: string, level: number, i: number) => ({ ...makeOrganNode(type as OrganType, 100 + i * 10, 100, level, `${type}_${i}`), repairCost: { nutrients: 1, oxygen: 1 }, uncollectedOxygen: 50 });
  old.organs.push(mk('STOMACH_DIGEST', 3, 1), mk('STOMACH_DIGEST', 2, 2), mk('STOMACH_DIGEST', 1, 3),
    mk('LIVER_METABOLIC', 12, 1), mk('SKIN_INTEGUMENT', 2, 1), mk('SKIN_INTEGUMENT', 2, 2), mk('LUNGS_RESP', 4, 1));
  old.vessels.push({ id: 'vx', fromNodeId: 'STOMACH_DIGEST_3', toNodeId: 'brain_1', type: 'ARTERY', level: 1, capacity: 60, flowSpeed: 1 });
  const m = migrateGameState(old);
  check('economy version set', m.economyVersion === ECONOMY_VERSION);
  check('banked nutrients kept', m.currencies.nutrients === Math.min(700, nutrientCapacity(m)));
  check('hormones kept', m.currencies.hormones === 42);
  const refund = 500 + 100 + 2 * 0 + (getUpgradeCost('STOMACH_DIGEST', 0).nutrients + getUpgradeCost('STOMACH_DIGEST', 1).nutrients) + getUpgradeCost('STOMACH_DIGEST', 0).nutrients + 2 * 0;
  check('one stomach kept (the highest level)', m.organs.filter((o) => o.type === 'STOMACH_DIGEST').length === 1 && organ(m, 'STOMACH_DIGEST').level === 3);
  check('extra skin removed', m.organs.filter((o) => o.type === 'SKIN_INTEGUMENT').length === 1);
  check('old oxygen + removed organs refunded to the Treasury', m.treasuryNutrients >= refund, `${m.treasuryNutrients} vs ${refund}`);
  check('levels clamped to the new tables', organ(m, 'LIVER_METABOLIC').level === levelTable('LIVER_METABOLIC').maxLevel);
  check('vessels to removed organs dropped', !m.vessels.some((v) => v.id === 'vx'));
  check('old oxygen bubbles become nutrients', organ(m, 'STOMACH_DIGEST').uncollectedNutrients >= 50);
  check('no oxygen anywhere in currencies', !('oxygen' in m.currencies));
  const oldTypes = ['BRAIN_CNS', 'SPINAL_CORD', 'HEART_CARDIO', 'LUNGS_RESP', 'TRACHEA_RESP', 'STOMACH_DIGEST', 'INTESTINE_DIGEST',
    'COLON_DIGEST', 'LIVER_METABOLIC', 'PANCREAS_DIGEST', 'KIDNEY_EXCRET', 'BLADDER_EXCRET', 'SKELETON_RIBCAGE', 'MUSCLE_TISSUE',
    'BONE_MARROW_IMMUNE', 'THYMUS_IMMUNE', 'LYMPH_NODE_IMMUNE', 'SPLEEN_IMMUNE', 'ADRENAL_ENDOCRINE', 'THYROID_ENDOCRINE', 'SKIN_INTEGUMENT'];
  check('every old organ type still exists', oldTypes.every((t) => !!ORGAN_DEFINITIONS[t as OrganType]));
  const ticked = run(m, 3);
  check('a migrated save runs', ticked.organs.length === m.organs.length);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
