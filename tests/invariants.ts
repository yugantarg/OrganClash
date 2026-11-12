/**
 * Economy invariants. Run with `npm test`.
 *
 * Every rule here was once verified by a throwaway script and then lost; a
 * misplaced line later broke one of them without anyone noticing. Keep this
 * file in step with the engine.
 */
import {
  createInitialGameState, runSimulationTick, placeNewOrgan, getPlacementInfo, getUpgradeCost,
  startOrganUpgrade, collectOrganResources, tapOrganForBoost, connectVesselRoad, computeCirculation,
  vesselEfficiency, connectVesselCost, vesselUpgradeCost, upgradeVessel, MAX_VESSEL_LEVEL,
  flushWaste, excretoryCapacity, wasteThrottleFactor, WASTE_MIN_FACTOR, WASTE_OVERFLOW_LIMIT,
  applyOfflineProgress, simulateRaidIncome, RAID_COOLDOWN_SECONDS, collectTreasury, grantStar,
  refreshStarBonusAvailability, clearObstacle, hormoneCostToFinish, requiredBrainLevelFor,
  boostOrgan, organBoostCost, ARTERY_UNSUPPLIED_FLOOR, GameState, producedResource, storageNoteFor,
} from '../src/services/simulationEngine';
import {
  COC_COLLECTOR, COC_DEFENSE, COC_TOWN_HALL, COC_OBSTACLE_GEM_CYCLE, COC_GEM_BOX_VALUE,
  cocStorageCount, cocCollectorCount, cocTownHallStorage, cocStorageCapacity,
} from '../src/data/cocTables';
import { ORGAN_DEFINITIONS, ORGAN_ARCHETYPE } from '../src/data/organData';
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

/** A funded base at a given brain level with the listed organs built and finished. */
function base(brainLevel: number, types: OrganType[]): GameState {
  let s = createInitialGameState();
  organ(s, 'BRAIN_CNS').level = brainLevel;
  s.builderCount = 5;
  for (const t of types) {
    s.currencies.nutrients = 1e9; s.currencies.oxygen = 1e9;
    s.currencies.maxNutrients = 1e9; s.currencies.maxOxygen = 1e9;
    s = placeNewOrgan(s, t, 300, 300);
    for (const o of s.organs) if (o.constructing) { o.constructing = false; o.status = 'OPTIMAL'; o.upgradeEndTime = undefined; }
  }
  s.currencies.nutrients = 0; s.currencies.oxygen = 0;
  return s;
}
function run(s: GameState, seconds: number): GameState {
  for (let i = 0; i < seconds; i++) { advance(1); s = runSimulationTick(s); }
  return s;
}

// ---------------------------------------------------------------------------
section('CoC tables drive costs and times');
for (let L = 1; L <= 11; L++) {
  const c = getUpgradeCost('STOMACH_DIGEST', L);
  check(`collector L${L} cost`, c.oxygen === COC_COLLECTOR.cost[L] && c.nutrients === 0);
  check(`collector L${L} time`, c.seconds === COC_COLLECTOR.seconds[L]);
  const l = getUpgradeCost('LUNGS_RESP', L);
  check(`oxygen producer L${L} pays nutrients`, l.nutrients === COC_COLLECTOR.cost[L] && l.oxygen === 0);
  const d = getUpgradeCost('SKELETON_RIBCAGE', L);
  check(`defence L${L} = Cannon`, d.nutrients === COC_DEFENSE.cost[L] && d.seconds === COC_DEFENSE.seconds[L]);
  const b = getUpgradeCost('BRAIN_CNS', L);
  check(`brain L${L} = Town Hall`, b.nutrients === COC_TOWN_HALL.cost[L] && b.oxygen === 0 && b.seconds === COC_TOWN_HALL.seconds[L]);
}
check('gem skip knots', hormoneCostToFinish(60) === 1 && hormoneCostToFinish(3600) === 20 && hormoneCostToFinish(86400) === 260 && hormoneCostToFinish(604800) === 1000);
check('storage L9 legal at brain 5', requiredBrainLevelFor('STOMACH_DIGEST', 9) === 5);
check('storage counts', cocStorageCount(1) === 1 && cocStorageCount(3) === 2 && cocStorageCount(8) === 3 && cocStorageCount(9) === 4);

// ---------------------------------------------------------------------------
section('Placing an organ follows CoC');
{
  let s = createInitialGameState();
  const info = getPlacementInfo(s, 'STOMACH_DIGEST');
  check('first build costs the CoC price in the cross resource', info.cost.oxygen === COC_COLLECTOR.cost[0] && info.cost.nutrients === 0);
  const before = s.currencies.oxygen;
  s = placeNewOrgan(s, 'STOMACH_DIGEST', 300, 300);
  const st = organ(s, 'STOMACH_DIGEST');
  check('placement charges', s.currencies.oxygen === before - COC_COLLECTOR.cost[0]);
  check('placement occupies a builder and takes time', st.status === 'UNDER_UPGRADE' && st.constructing === true);
  check('producer cap at brain 1 is CoC count', getPlacementInfo(s, 'INTESTINE_DIGEST').blocked !== null && cocCollectorCount(1) === 1);
  s = run(s, COC_COLLECTOR.seconds[0] + 1);
  check('construction finishes at level 1, not 2', organ(s, 'STOMACH_DIGEST').level === 1 && organ(s, 'STOMACH_DIGEST').status !== 'UNDER_UPGRADE');
  // builders are a hard limit
  let t = base(3, []);
  t.builderCount = 1; t.currencies.nutrients = 1e6; t.currencies.oxygen = 1e6;
  t = placeNewOrgan(t, 'HEART_CARDIO', 300, 300);
  check('no second build with one builder', getPlacementInfo(t, 'LUNGS_RESP').blocked === 'NO_BUILDER');
}

// ---------------------------------------------------------------------------
section('No free resources');
{
  let s = base(3, ['STOMACH_DIGEST']);
  s = collectOrganResources(s);
  const st = organ(s, 'STOMACH_DIGEST');
  const harvestedBefore = s.nutrientsHarvested || 0;
  for (let i = 0; i < 60; i++) { advance(1); s = tapOrganForBoost(s, st.id); }
  check('tapping creates nothing', (s.nutrientsHarvested || 0) - harvestedBefore < 1, `${s.nutrientsHarvested}`);
  let u = base(3, ['STOMACH_DIGEST']);
  const lvl = organ(u, 'STOMACH_DIGEST');
  lvl.status = 'UNDER_UPGRADE'; lvl.upgradeEndTime = clock + 1e9; lvl.uncollectedNutrients = 0;
  u = run(u, 30);
  check('an upgrading producer makes nothing', organ(u, 'STOMACH_DIGEST').uncollectedNutrients === 0);
}

// ---------------------------------------------------------------------------
section('Waste: slow stock, gradual throttle, free flush, nothing destroyed');
{
  check('no throttle up to capacity', wasteThrottleFactor(100, 100) === 1);
  check('throttle is gradual', wasteThrottleFactor(125, 100) < 1 && wasteThrottleFactor(125, 100) > WASTE_MIN_FACTOR);
  check('throttle floors at 10%', Math.abs(wasteThrottleFactor(1e9, 100) - WASTE_MIN_FACTOR) < 1e-9);

  const types: OrganType[] = ['HEART_CARDIO', 'STOMACH_DIGEST', 'LUNGS_RESP', 'KIDNEY_EXCRET'];
  let s = base(3, types);
  s = connectFunded(s, organ(s, 'STOMACH_DIGEST').id, organ(s, 'KIDNEY_EXCRET').id, 'VEIN');
  const cap = excretoryCapacity(s, computeCirculation(s.organs, s.vessels));
  // an hour of play, collecting every minute
  for (let m = 0; m < 60; m++) { s = run(s, 60); s = collectOrganResources(s); }
  const fillAfterHour = s.wasteLoad / cap;
  check('an hour of play does not fill the system', fillAfterHour < 0.5, `fill ${fillAfterHour.toFixed(2)}`);
  check('waste tracks production', s.wasteLoad > 0);
  // force overflow
  s.wasteLoad = cap * 10;
  const hp = s.organs.map((o) => o.hp);
  s = run(s, 30);
  check('overflow is clamped', s.wasteLoad <= cap * WASTE_OVERFLOW_LIMIT + 1e-6);
  check('no organ loses HP or is destroyed', s.organs.every((o, i) => o.hp >= hp[i] && o.status !== 'DAMAGED_DESTROYED'));
  const stBefore = organ(s, 'STOMACH_DIGEST').uncollectedNutrients;
  s = run(s, 600);
  check('still produces at the floor', organ(s, 'STOMACH_DIGEST').uncollectedNutrients > stBefore);
  const starsBefore = s.starsEarned;
  const f = flushWaste(s);
  check('flush empties the system', f.wasteLoad === 0);
  check('flush pays no resources', f.currencies.nutrients === s.currencies.nutrients && f.currencies.oxygen === s.currencies.oxygen);
  check('flush earns a star', f.starsEarned === starsBefore + 1 || f.starBonusesClaimed > s.starBonusesClaimed);
  check('flushing an empty system does nothing', flushWaste(f) === f);
  // veins
  const veined = excretoryCapacity(s, computeCirculation(s.organs, s.vessels));
  const bare = { ...s, vessels: [] } as GameState;
  check('an unveined kidney holds less', excretoryCapacity(bare, computeCirculation(bare.organs, [])) < veined);
}
function connectFunded(s: GameState, a: string, b: string, t: any): GameState {
  s.currencies.nutrients += 1e5; s.currencies.oxygen += 1e5;
  const r = connectVesselRoad(s, a, b, t);
  r.currencies.nutrients = 0; r.currencies.oxygen = 0;
  return r;
}

// ---------------------------------------------------------------------------
section('Offline: collectors and waste limit the absence, nothing else');
{
  let s = base(3, ['HEART_CARDIO', 'STOMACH_DIGEST', 'LUNGS_RESP']);
  s.lastTickTimestamp = clock;
  advance(3 * 86400);
  const r = applyOfflineProgress(s, clock);
  const st = organ(r.state, 'STOMACH_DIGEST');
  check('a collector banks at most its own capacity', st.uncollectedNutrients <= COC_COLLECTOR.capacity[0] + 1e-6);
  check('nothing destroyed while away', r.state.organs.every((o) => o.status !== 'DAMAGED_DESTROYED'));
  check('away for days still yields something', (r.report?.nutrients ?? 0) > 0);
}

// ---------------------------------------------------------------------------
section('Circulation');
{
  check('short vessels are lossless', vesselEfficiency(100, 1) === 1);
  check('longer is worse', vesselEfficiency(500, 1) < vesselEfficiency(250, 1));
  check('one vessel always beats none', vesselEfficiency(5000, 1) > ARTERY_UNSUPPLIED_FLOOR);
  check('wider carries further', vesselEfficiency(600, 5) > vesselEfficiency(600, 1));
  check('longer costs more to lay and to widen', connectVesselCost(900).nutrients > connectVesselCost(100).nutrients && vesselUpgradeCost(600, 1).nutrients > vesselUpgradeCost(130, 1).nutrients);
  let s = base(3, ['HEART_CARDIO', 'STOMACH_DIGEST']);
  check('new organs are not auto-connected', s.vessels.length === 0);
  organ(s, 'HEART_CARDIO').x = 300; organ(s, 'STOMACH_DIGEST').x = 900;
  s = connectFunded(s, organ(s, 'HEART_CARDIO').id, organ(s, 'STOMACH_DIGEST').id, 'ARTERY');
  const id = s.vessels[0].id;
  for (let i = 0; i < 10; i++) { s.currencies.nutrients = 1e6; s.currencies.oxygen = 1e6; s = upgradeVessel(s, id); }
  check('vessel level is capped', s.vessels[0].level === MAX_VESSEL_LEVEL);
}

// ---------------------------------------------------------------------------
section('Raids, Star Bonus, Treasury');
{
  let s = createInitialGameState();
  const a = simulateRaidIncome(s);
  check('a raid pays', a.currencies.nutrients > s.currencies.nutrients || a.currencies.oxygen > s.currencies.oxygen || a.currencies.nutrients === a.currencies.maxNutrients);
  check('a second raid must wait', simulateRaidIncome(a) === a);
  advance(RAID_COOLDOWN_SECONDS + 1);
  check('the wait ends', simulateRaidIncome(a) !== a);
  // five raids complete a bonus
  let r = createInitialGameState();
  for (let i = 0; i < 5; i++) { r = simulateRaidIncome(r); advance(RAID_COOLDOWN_SECONDS + 1); }
  check('five raids bank a Star Bonus', r.starBonusesClaimed === 1 && r.treasuryNutrients > 0);
  const stars = r.starsEarned;
  r.currencies.nutrients = 0;
  const c = collectTreasury(r);
  check('collecting the Treasury moves loot', c.currencies.nutrients > 0 && c.treasuryNutrients === 0);
  check('collecting the Treasury earns no star', c.starsEarned === stars);
  const noBonus = { ...c, bonusesAvailable: 0, starsEarned: 0 } as GameState;
  grantStar(noBonus, 'x');
  check('stars are wasted with no bonus available', noBonus.starsEarned === 0);
  const q = { ...c, bonusesAvailable: 0, nextBonusAt: clock - 1 } as GameState;
  for (let i = 0; i < 5; i++) { q.nextBonusAt = clock - 1; refreshStarBonusAvailability(q, clock); }
  check('bonuses stack to two at most', q.bonusesAvailable === 2);
}

// ---------------------------------------------------------------------------
section('Hormone faucet and sinks');
{
  let s = createInitialGameState();
  s.currencies.nutrients = 1e6; s.currencies.maxNutrients = 1e6;
  s.lastObstacleSpawnAt = clock - 10 * 86400 * 1000;
  s.nextGemBoxAt = clock - 1;
  s = runSimulationTick(s);
  const got: number[] = [];
  for (let i = 0; i < 10; i++) {
    const o = s.obstacles.find((x) => x.kind !== 'GEM_BOX')!;
    const b = s.currencies.hormones; s.currencies.nutrients = 1e6; s = clearObstacle(s, o.id); got.push(s.currencies.hormones - b);
  }
  check('obstacle gems follow the fixed cycle', JSON.stringify(got) === JSON.stringify(COC_OBSTACLE_GEM_CYCLE.slice(0, 10)));
  const box = s.obstacles.find((x) => x.kind === 'GEM_BOX')!;
  const b = s.currencies.hormones; s = clearObstacle(s, box.id);
  check('gem box pays 25', s.currencies.hormones - b === COC_GEM_BOX_VALUE);
  // boost
  let t = base(6, ['STOMACH_DIGEST']);
  const st = organ(t, 'STOMACH_DIGEST');
  check('low-level producers cannot be boosted', organBoostCost(st) === null);
  st.level = 5; t.currencies.hormones = 100;
  check('level 5 boost costs 4', organBoostCost(st) === 4);
  const boosted = boostOrgan(t, st.id);
  check('boost charges and cannot be stacked', boosted.currencies.hormones === 96 && boostOrgan(boosted, st.id) === boosted);
  let plain = t; let fast = boosted;
  plain = run(plain, 60);
  clock -= 60000; fast = run(fast, 60);
  check('boost doubles output', Math.abs(organ(fast, 'STOMACH_DIGEST').uncollectedNutrients / organ(plain, 'STOMACH_DIGEST').uncollectedNutrients - 2) < 0.01);
}

// ---------------------------------------------------------------------------
section('No walls: every Brain level is reachable');
{
  for (let bl = 1; bl <= 11; bl++) {
    let s = createInitialGameState();
    organ(s, 'BRAIN_CNS').level = bl;
    s.builderCount = 5;
    for (const t of Object.keys(ORGAN_DEFINITIONS) as OrganType[]) {
      if (t === 'BRAIN_CNS') continue;
      for (let n = 0; n < ORGAN_DEFINITIONS[t].maxPerBase; n++) {
        s.currencies.nutrients = 1e9; s.currencies.oxygen = 1e9; s.currencies.maxNutrients = 1e9; s.currencies.maxOxygen = 1e9;
        const before = s.organs.length;
        s = placeNewOrgan(s, t, 300, 300);
        for (const o of s.organs) if (o.constructing) { o.constructing = false; o.status = 'OPTIMAL'; o.upgradeEndTime = undefined; }
        if (s.organs.length === before) break;
        const o = s.organs[s.organs.length - 1];
        let L = 1; while (L < 12 && bl >= requiredBrainLevelFor(t, L + 1)) L++;
        o.level = L;
      }
    }
    advance(1); s = runSimulationTick(s);
    const need = getUpgradeCost('BRAIN_CNS', bl).nutrients;
    check(`brain L${bl}->L${bl + 1} fits in storage`, need <= s.currencies.maxNutrients, `${need} > ${s.currencies.maxNutrients}`);
  }
}

// ---------------------------------------------------------------------------
section('Producers: nutrients and oxygen are symmetric, as Gold Mines and Elixir Collectors');
{
  const all = Object.keys(ORGAN_DEFINITIONS) as OrganType[];
  for (const t of all) {
    const out = ORGAN_DEFINITIONS[t].outputs;
    const makes = (out.nutrientsPerSec ? 1 : 0) + (out.oxygenPerSec ? 1 : 0);
    if (ORGAN_ARCHETYPE[t] === 'COLLECTOR') check(`${t} makes exactly one resource`, makes === 1);
    else check(`${t} (not a collector) makes neither resource`, makes === 0);
  }
  for (const r of ['nutrients', 'oxygen'] as const) {
    const firstAt1 = all.some((t) => ORGAN_ARCHETYPE[t] === 'COLLECTOR' && producedResource(t) === r && ORGAN_DEFINITIONS[t].unlockedAtBrainLevel === 1);
    check(`a ${r} producer is available at Brain 1`, firstAt1);
  }
  for (let bl = 1; bl <= 12; bl++) {
    for (const r of ['nutrients', 'oxygen'] as const) {
      const available = all
        .filter((t) => ORGAN_ARCHETYPE[t] === 'COLLECTOR' && producedResource(t) === r && ORGAN_DEFINITIONS[t].unlockedAtBrainLevel <= bl)
        .reduce((n, t) => n + ORGAN_DEFINITIONS[t].maxPerBase, 0);
      check(`brain ${bl}: ${r} producers available >= cap`, available >= cocCollectorCount(bl), `${available} < ${cocCollectorCount(bl)}`);
      // Place every producer of this resource the menu allows; exactly the cap fit.
      let s = base(bl, []);
      for (const t of all) {
        if (ORGAN_ARCHETYPE[t] !== 'COLLECTOR' || producedResource(t) !== r) continue;
        for (let n = 0; n < ORGAN_DEFINITIONS[t].maxPerBase; n++) {
          s.currencies.nutrients = 1e9; s.currencies.oxygen = 1e9;
          s = placeNewOrgan(s, t, 300, 300);
          for (const o of s.organs) if (o.constructing) { o.constructing = false; o.status = 'OPTIMAL'; o.upgradeEndTime = undefined; }
        }
      }
      const built = s.organs.filter((o) => ORGAN_ARCHETYPE[o.type] === 'COLLECTOR' && producedResource(o.type) === r).length;
      check(`brain ${bl}: exactly ${cocCollectorCount(bl)} ${r} producers can be built`, built === cocCollectorCount(bl), `${built}`);
    }
  }
  // An organ that changed role keeps what an old save had banked on it.
  let old = base(4, ['BONE_MARROW_IMMUNE']);
  organ(old, 'BONE_MARROW_IMMUNE').uncollectedNutrients = 123;
  old = run(old, 5);
  check('old-save marrow keeps its banked nutrients', organ(old, 'BONE_MARROW_IMMUNE').uncollectedNutrients === 123);
  const c = collectOrganResources(old);
  check('and they can still be collected', c.currencies.nutrients >= 123);
}

// ---------------------------------------------------------------------------
section('The Brain stores but produces nothing (CoC Town Hall)');
{
  let s = createInitialGameState();
  const b = organ(s, 'BRAIN_CNS');
  b.uncollectedNutrients = 0; b.uncollectedOxygen = 0;
  s = run(s, 600);
  check('live: brain makes no nutrients', organ(s, 'BRAIN_CNS').uncollectedNutrients === 0);
  check('live: brain makes no oxygen', organ(s, 'BRAIN_CNS').uncollectedOxygen === 0);
  check('brain still sets storage (Town Hall L1)', s.currencies.maxNutrients === cocTownHallStorage(1) && s.currencies.maxOxygen === cocTownHallStorage(1));
  s.lastTickTimestamp = clock;
  advance(3 * 86400);
  const r = applyOfflineProgress(s, clock);
  check('offline: brain makes nothing', (r.report?.nutrients ?? -1) === 0 && (r.report?.oxygen ?? -1) === 0 && organ(r.state, 'BRAIN_CNS').uncollectedNutrients === 0);
}

// ---------------------------------------------------------------------------
section('A brand-new base can bootstrap with no dead end');
{
  let s = createInitialGameState();
  const st = getPlacementInfo(s, 'STOMACH_DIGEST');
  const lu = getPlacementInfo(s, 'LUNGS_RESP');
  check('first nutrient producer is affordable', st.blocked === null, `${st.blocked}`);
  check('first oxygen producer is affordable', lu.blocked === null, `${lu.blocked}`);
  s = placeNewOrgan(s, 'STOMACH_DIGEST', 300, 300);
  s = placeNewOrgan(s, 'LUNGS_RESP', 500, 300);
  check('both placed at once (two builders)', s.organs.length === 3);
  s = run(s, COC_COLLECTOR.seconds[0] + 1);
  s = run(s, 60);
  check('both produce', organ(s, 'STOMACH_DIGEST').uncollectedNutrients > 0 && organ(s, 'LUNGS_RESP').uncollectedOxygen > 0);
  // Collect for a while and reach the Brain L2 price from production alone.
  const need = getUpgradeCost('BRAIN_CNS', 1).nutrients;
  let hours = 0;
  while (s.currencies.nutrients < need && hours < 24) {
    s.lastTickTimestamp = clock; advance(3600); hours++;
    s = applyOfflineProgress(s, clock).state; s = collectOrganResources(s); s = flushWaste(s);
    advance(1); s = runSimulationTick(s);
  }
  check('brain L2 is reachable from production alone', s.currencies.nutrients >= need, `after ${hours}h: ${s.currencies.nutrients}`);
  console.log(`  (bootstrap: brain L2 price ${need} reached after ${hours}h of collecting)`);
  // Worst case: everything spent, no producer. A raid always funds both producers.
  let broke = createInitialGameState();
  broke.currencies.nutrients = 0; broke.currencies.oxygen = 0;
  broke = simulateRaidIncome(broke);
  check('a broke base can raid for both first producers', getPlacementInfo(broke, 'STOMACH_DIGEST').blocked === null && broke.currencies.nutrients >= getPlacementInfo(broke, 'LUNGS_RESP').cost.nutrients);
  advance(RAID_COOLDOWN_SECONDS + 1);
}

// ---------------------------------------------------------------------------
section('Storage slots are capped per resource and never silent');
{
  // Brain 1: one slot per resource, so a stomach and lungs both count.
  let s = base(1, ['STOMACH_DIGEST', 'LUNGS_RESP']);
  s = run(s, 1);
  check('one nutrient and one oxygen storage both count at brain 1',
    s.currencies.maxNutrients === cocTownHallStorage(1) + cocStorageCapacity(1) && s.currencies.maxOxygen === cocTownHallStorage(1) + cocStorageCapacity(1));
  // Brain 2: second nutrient storage organ is a producer too, so it may be placed,
  // but the menu says its storage will not count until Brain 3.
  let t = base(2, ['STOMACH_DIGEST']);
  t.currencies.oxygen = 1e6;
  const p = getPlacementInfo(t, 'STOMACH_DIGEST');
  check('producer-storage over the slot cap is placeable', p.blocked === null, `${p.blocked}`);
  check('...with a storage warning naming Brain 3', p.storageFullFor.includes('nutrients') && p.storageNextBrainLevel === 3);
  check('oxygen slots are separate', getPlacementInfo(t, 'LUNGS_RESP').storageFullFor.length === 0);
  t = base(2, ['STOMACH_DIGEST', 'STOMACH_DIGEST']);
  t = run(t, 1);
  check('the excess stomach adds no capacity', t.currencies.maxNutrients === cocTownHallStorage(2) + cocStorageCapacity(1));
  const second = t.organs.filter((o) => o.type === 'STOMACH_DIGEST')[1];
  const note = storageNoteFor(t, second.id);
  check('the excess organ panel says when it will count', !!note && note.includes('level 3'), `${note}`);
  check('the counted organ has no note', storageNoteFor(t, t.organs.filter((o) => o.type === 'STOMACH_DIGEST')[0].id) === null);
  organ(t, 'BRAIN_CNS').level = 3;
  t = run(t, 1);
  check('at brain 3 both count', storageNoteFor(t, second.id) === null && t.currencies.maxNutrients === cocTownHallStorage(3) + 2 * cocStorageCapacity(1));
  // A pure storage organ (no production) beyond the cap is blocked with a reason.
  // No such organ exists in today's roster, so the rule is exercised by turning
  // Muscle into one for this check only.
  const savedArch = ORGAN_ARCHETYPE.MUSCLE_TISSUE;
  const savedOut = ORGAN_DEFINITIONS.MUSCLE_TISSUE.outputs;
  (ORGAN_ARCHETYPE as any).MUSCLE_TISSUE = 'STORAGE';
  ORGAN_DEFINITIONS.MUSCLE_TISSUE.outputs = {};
  try {
    const u = base(4, ['STOMACH_DIGEST', 'STOMACH_DIGEST']);
    u.currencies.nutrients = 1e6;
    const q = getPlacementInfo(u, 'MUSCLE_TISSUE');
    check('pure storage at the slot cap is blocked', q.blocked === 'STORAGE_CAP' && q.storageNextBrainLevel === 8, `${q.blocked} ${q.storageNextBrainLevel}`);
    const v = base(4, ['STOMACH_DIGEST']);
    v.currencies.nutrients = 1e6;
    check('pure storage below the cap is placeable', getPlacementInfo(v, 'MUSCLE_TISSUE').blocked === null);
  } finally {
    (ORGAN_ARCHETYPE as any).MUSCLE_TISSUE = savedArch;
    ORGAN_DEFINITIONS.MUSCLE_TISSUE.outputs = savedOut;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
