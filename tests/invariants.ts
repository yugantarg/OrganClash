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
  boostOrgan, organBoostCost, ARTERY_UNSUPPLIED_FLOOR, GameState,
} from '../src/services/simulationEngine';
import {
  COC_COLLECTOR, COC_DEFENSE, COC_TOWN_HALL, COC_OBSTACLE_GEM_CYCLE, COC_GEM_BOX_VALUE,
  cocStorageCount, cocCollectorCount,
} from '../src/data/cocTables';
import { ORGAN_DEFINITIONS } from '../src/data/organData';
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
