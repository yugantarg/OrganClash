# AnatoClash — Development Logbook

A running summary of changes, newest first. One entry per working turn.
Each entry: date, a short title, what changed and why, how it was verified,
and the commit (if pushed).

---

## 2026-09-03 — Gem faucet: obstacles, Gem Box, achievements

**Why:** The only hormone income was the 5/day Gem Mine, so a 260-hormone daily
skip or a 500-hormone builder was unfundable. Built CoC's three real faucets.

**Changed:**
- `cocTables.ts`: obstacle spawn rules (1 per 8h, max 45, Gem Box every 1-2 weeks,
  clear costs), `cocObstacleGems()` for the fixed cycle, and `COC_ACHIEVEMENTS`
  with CoC's real names/thresholds/gem values.
- `types.ts`: `Obstacle` (TOXIN_DEPOSIT | GEM_BOX).
- `simulationEngine.ts`: `spawnObstaclesForElapsed()` (wired into BOTH the tick and
  offline progression, so deposits accumulate while away), `clearObstacle()`,
  `getAchievementProgress()`, `claimAchievement()`,
  `totalClaimableAchievementGems()`; per-resource harvest counters for the
  Gold Grab / Elixir Escapade metrics.
- Pixi renderer: a new obstacle layer under the organs — tappable deposits and a
  faceted Hormone Crystal, dimmed when unaffordable.
- New `AchievementsModal` + a header button with a claimable-count badge.

**Verified:** clearing pays out CoC's fixed cycle exactly (`[6,0,4,5,1,3,2,0,0,5]`
matched to the integer), Gem Box pays 25. Simulated week for a diligent free
player: 22 deposits + Gem Box = **71 hormones**, plus ~35 from the Gem Mine =
**~106/week** — against CoC's 50-100/week free-player benchmark.

**Honest scope note:** only 6 of CoC's 58 achievements are earnable (192 gems vs
CoC's 24,372 total), because the rest are combat, clan-war and Builder-Base
rewards with no analogue while combat is parked. The faucet therefore rests on
obstacles + Gem Box + Gem Mine, which is exactly where CoC's sustained (non
front-loaded) free income comes from anyway.

**Tooling fix — important:** discovered `@types/react` was NOT installed, so JSX
props were typed `any` and `tsc --noEmit` had **never** been checking component
props this whole session (engine `.ts` code was genuinely checked; `.tsx` prop
wiring was not). Installed `@types/react`/`@types/react-dom` and confirmed the
check now catches a deliberately removed required prop. Every "tsc clean" claim I
made about UI changes before this was weaker than I implied.

**Commit:** (this turn)

---

## 2026-09-03 — Full audit of every value in cocTables.ts

**Why:** After the Cannon substitution was caught, no number in the file could be
trusted without an independent fetch. Audited all of them.

**Method:** re-fetched every source page via the Fandom MediaWiki API and diffed
each array in `cocTables.ts` against a fresh parse — no reliance on prior agent
reports.

**Result — 14/14 building arrays PASS** (collector cost/seconds/perHour/capacity,
storage cost/seconds/capacity, defense cost/seconds, town hall cost/seconds, and
all three TH-required gating arrays). Gold Mine == Elixir Collector and Gold
Storage == Elixir Storage confirmed identical, as assumed.

**Gem constants verified:** obstacle cycle exact; Gem Box 25; Gem Mine **5.04/day**
(exact); builder costs 250/500/1000/2000 — the wiki's "3,500 total" is the sum of
the *purchased* 3rd/4th/5th, which reconciles.

**One real error found and fixed:** the Brain's own storage used
`cocStorageCapacity(hqLevel)` — I had assumed the HQ holds as much as a Gold
Storage. CoC publishes a SEPARATE "Storage Capacity of the Town Hall" table, and
the values differ hugely (TH6 = **300,000**, not 45,000 — 6.7x too low). Added
`COC_TOWN_HALL_STORAGE` + `cocTownHallStorage()` and wired the engine to it; also
corrected the starting caps from 1500 to the real TH1 value of 1,000.

**Two documentation fixes:** the obstacle cycle is specifically the SPAWNED-obstacle
cycle (CoC runs a separate one for initial obstacles, now noted); and
`COC_BOOST_MULTIPLIER` / `COC_BOOST_DURATION_SECONDS` / `COC_OBSTACLE_GEM_CYCLE` /
`COC_GEM_BOX_VALUE` are declared but **not referenced anywhere yet** — they are
staged data, not live behaviour.

**Re-verified:** 0 walls across all 12 Brain levels (2-6 raids each). tsc + build clean.

**Commit:** (this turn)

---

## 2026-09-03 — Match CoC's building counts + level gating (walls closed)

**Why:** Two walls remained (Brain L5→6, L6→7) because our storage provisioning
didn't match CoC's. Pulled CoC's real buildings-per-Town-Hall data.

**The root cause, from the wiki:** building level races AHEAD of Town Hall level —
a **level-9 Gold Storage (450,000) is legal at TH5**. Our rule capped organ level at
`brainLevel + 1`, throttling storage roughly tenfold. That single wrong gate caused
every wall.

**Changed:**
- Pulled full CoC tables via the Fandom MediaWiki API (`action=parse&prop=wikitext`,
  which works where the HTML returns 402) and regenerated `cocTables.ts` from the
  raw wikitext — Gold Mine, Gold Storage and Town Hall now run to **L12** (were
  truncated at L9, which itself caused three further walls).
- Added `COC_TH_REQUIRED` (level → Town Hall required, verbatim) plus
  `cocStorageCount` / `cocCollectorCount` from CoC's `NumberAvailable` template:
  storages 1@TH1, 2@TH3, 3@TH8, 4@TH9; collectors 1–6 @TH1–6, 7@TH9.
- New `requiredBrainLevelFor()` is the single source of truth for the gate,
  replacing THREE divergent ad-hoc rules (`brainLvl+1` in the engine,
  `ceil(nextLevel/2)` in the dock, `brainLevel+1` in the inspector).
- Storage organs are now capped at CoC's storages-per-TH count (top-N by capacity,
  per resource track) — without this our capacity ran 4–5× CoC's.
- Organ `maxLevel` 8 → 12 to match the table range.

**Verified:** collector organs equal CoC's Gold Mine cost/time L1–12; Brain equals
the Town Hall table L1–12; gating, counts and the gem curve all exact. **0 walls** —
every Town Hall step reachable (2–4 raids each), with our storage capacity at
ratio 1.00 to CoC's at most levels. tsc + vite build clean.

**Correction (same day):** the "Cannon didn't parse" note above concealed a real
substitution — `COC_TH_REQUIRED.DEFENSE` had been filled with the **Gold Mine's**
gating array, not Cannon's, and described as "tracks the collector closely enough".
Now parsed properly (Cannon's table uses inline `||` separators, hence the earlier
empty result) and replaced with verified values: cost/time to L12 and gating
`[1,1,2,3,4,5,6,7,8,8,9,10]`. Cannon is far stricter than the collector — a level-9
Cannon needs **TH8**, not TH5 — so defensive organs had been upgradeable ~3 HQ
levels earlier than CoC allows. The cost/time figures from the earlier research pass
turned out to be correct, but had never been independently verified. Added
`cocDefenseCount` (2@TH1, 3@TH5, 5@TH7, 6@TH10, 7@TH11). Re-checked: still 0 walls.

**Commit:** (this turn)

---

## 2026-09-03 — Raid-income test override (no combat module)

**Why:** CoC's Town Hall costs assume raiding is the main income; collectors are a
trickle. Combat is parked, so pacing couldn't be tested. Rather than build combat,
add an override button that grants raid income directly — same economic
consequence for testing, none of the combat work.

**Changed:**
- `simulationEngine.ts`: new `simulateRaidIncome()` — clearly marked TESTING ONLY.
  Payout follows CoC's real loot rules rather than an arbitrary number: storage
  loot is the TH-scaled share (20% up to TH6, −2 pts/level after, floored at 10%)
  against the player's own cap as the same-level-opponent proxy, plus a League
  Bonus (2% of HQ storage) so every raid pays something. Clamped by storage cap.
- `App.tsx`: amber "⚔️ +1 Raid (test)" button next to the renderer toggle. One
  press = one raid. Must be removed when real raiding lands.
- **Brain now costs nutrients ONLY** (was a 50/50 nutrient+oxygen split I invented).
  CoC's Town Hall is paid in Gold alone, so this is strictly more faithful — and
  the split was walling on oxygen, which has only 2 storage organs behind it vs 4
  for nutrients.

**Measured (full base at each level):** Brain L2→3 = 1 raid, L3→4 = 2, L4→5 = 4,
L7→8 = 6 raids. Progression is now reachable and CoC-shaped.

**Two walls remain, and they are precise:** Brain L5→6 needs 500,000 vs a max cap
of 430,000; L6→7 needs 1,000,000 vs 945,000. Both are ~85–95% — just over. Cause:
our storage-organ counts and unlock levels don't match CoC's storage-buildings-per-
Town-Hall table. Left as-is pending a decision (matching CoC's storage counts vs a
deliberate divergence).

**Commit:** (this turn)

---

## 2026-09-03 — Replicate CoC economics VERBATIM (absolute values, not ratios)

**Why:** Prior passes matched CoC's *ratios* but anchored them to our own invented
base values (storage base 800, a hand-pinned brain curve, "pragmatic" absolute
times). Directive: replicate CoC exactly first — even if wrong for us — then
adjust from a known-good baseline.

**Changed:**
- **New `src/data/cocTables.ts`** — CoC's published per-level tables copied
  verbatim (2026 balance): Gold Mine/Elixir Collector (cost, time, output/hr,
  on-tile capacity), Gold/Elixir Storage (capacity, cost, time), Cannon, Town
  Hall, the 20-value obstacle gem cycle, Gem Box value, Gem Mine rate, builder
  gem costs, boost params. Single source of truth for the whole economy.
- **`organData.ts`**: added `ORGAN_ARCHETYPE` (each organ mapped to COLLECTOR /
  DEFENSE / TOWN_HALL) and `STORAGE_ORGANS`. **Deleted** the hand-tuned
  `BRAIN_UPGRADE_CURVE` and `STORAGE_PER_BRAIN_LEVEL`. Builder costs now come
  from CoC's list.
- **`simulationEngine.ts`**: upgrade cost/time read straight from the archetype's
  CoC table; production uses CoC's collector output/hr; collector bubble capacity
  and all storage capacities use CoC's tables (tick *and* offline paths).
- **Hormone faucet fixed** — it was minting ~706/hr, which voided the entire timer
  economy (every timer skippable, all builders in ~5h). Endocrine glands are now
  the Gem Mine at CoC's rate: measured **3/day** (CoC ≈5/day).

**Verified:** our values equal CoC's published tables exactly for collector organs
(cost + time), defensive organs (Cannon), and the Brain (Town Hall sum + time);
gem skip still exact. Wall check against best-case storage: **0 walls** — and
Brain L5→6 lands exactly at the cap (250,000 = 250,000), reproducing CoC's own
storage-binding design. tsc clean.

**Known consequence (for the adjustment phase):** CoC's Town Hall costs assume
**raiding is the main income** at higher levels; collectors are a trickle. With
combat parked, collectors are our only income, so Brain L5→6 (500,000) is ~71h of
production even with 7 collector organs. Faithful to CoC, but it needs either
combat income or a deliberate divergence.

**Commit:** (this turn)

---

## 2026-09-03 — Exact CoC ratios (real per-level tables, not approximations)

**Why:** The prior pass used invented exponents (×1.45/×1.85). User wants the
comparable ratios to match CoC exactly, since those are proven. Pulled CoC's real
per-level cost/time/production/capacity tables (Elixir Collector, Town Hall,
Storage, Cannon) + the documented gem formula, and encoded the measured values.

**Changed:**
- `simulationEngine.ts`: replaced the growth exponents with CoC's exact **cumulative
  multiplier tables** from the Elixir Collector (the pure economy building):
  cost ×[1, 2.33, 4.67, 10, 23.3, 46.7, 93.3], time ×[1, 4, 8, 20, 60, 120, 240]
  (L1→2 … L7→8), production ×[1,2,3,4,5,6.5,8,9.5] by level. Helpers
  `econCostMult/econTimeMult/productionLevelMultiplier` (extrapolate ×2 past the
  table). Both tick + offline production now use the CoC output curve.
- `hormoneCostToFinish`: replaced the power-curve approximation with CoC's **exact
  documented piecewise-linear gem formula** — knots at 1min→1, 1h→20, 1day→260,
  1wk→1000, ceil'd (verified to the integer at 10m→4, 6h→73, 3d→507).
- `organData.ts`: `STORAGE_PER_BRAIN_LEVEL` ×2.2 → **×2.0** (CoC storage curve);
  storage organs now scale ×2/level too (was linear); brain curve re-pinned to
  ×2.0/level cost at 70%/60% of cap (Town-Hall-shaped time, tops ~1 day).
- Storage bases 600/500 → **800/800** and brain re-pin chosen so the priciest
  organ's top upgrade stays under the brain-ONLY cap — no unreachable walls.

**Verified:** headless 18/18 — cost & time cumulative multipliers equal CoC's
Elixir-Collector numbers exactly; production per level equals CoC's output curve;
storage ×2.0/level; gem skip hits every CoC knot to the integer; every organ
upgrade fits under the brain-only storage cap (no wall); brain cost ×2.0/level,
under cap, >50% of cap (storage binds). Smoke-sim + tsc + vite build clean.

**Commit:** (this turn)

---

## 2026-09-03 — Number-tuning pass to match CoC curve ratios

**Why:** Make the upgrade economy hit CoC's actual ratios so time — not resources
— becomes the late-game binding constraint (the monetization gradient), and price
the instant-finish on time like CoC's gems.

**Changed (`simulationEngine.ts`):**
- Non-HQ upgrade curve: named constants `COST_GROWTH_PER_LEVEL = 1.45` (unchanged,
  CoC-faithful) and `TIME_GROWTH_PER_LEVEL = 1.85` (was 1.55). Time now grows much
  faster than cost — across 7 levels cost ×13.4 vs time ×74, a ~5.5× divergence,
  so you bank the cost in minutes but still wait. Brain/HQ table (×2.2/×2.5) kept.
- New `hormoneCostToFinish(remainingSec)` — the instant-finish price now scales
  with REMAINING TIME only (CoC gem curve: ~1 hormone/min, ~20/hr, ~200/day),
  replacing the flat 1-hormone charge in `instantCompleteUpgradeWithHormone`.
- UI: dock + inspector instant-finish buttons show the live hormone price and
  disable when unaffordable (`OrganContextDock.tsx`, `OrganInspectorModal.tsx`).

**Kept as-is (already CoC-faithful):** production ~linear per level; brain storage
×2.2/level (≈"doubles per level"); the brain curve's cost staying under its storage
cap (no unreachable walls); storage as the binding constraint (top HQ upgrade uses
>50% of cap).

**Verified:** headless 13/13 — cost ratio ≈1.45, time ratio ≈1.85; time diverges
>3× from cost over the tree; every non-brain organ charges one resource with
strictly rising time; brain cost stays under cap at every step; top HQ upgrade
uses >50% of storage cap; skip price hits ~1/20/~200 at min/hr/day, is monotonic,
floors at 1, and costs less per hour for longer timers; absolute support-organ
times land in the 5–60 min range. tsc + vite build clean.

**Commit:** (this turn)

---

## 2026-09-03 — Waste throttle tied to excretory capacity, floored at 10%

**Why:** Make the waste penalty derive from the kidneys' + bladder's capacity (not
a fixed BUN number), taper gradually, and floor at 10% so production never fully
stops — preserving "always some progress" and the no-death-loop law.

**Changed (`simulationEngine.ts`):**
- Waste tolerance is now the excretory system's "storage capacity":
  `WASTE_BASE_CAPACITY 40 + 18·(kidney level) + 12·(bladder level)`. Leveling
  kidneys/bladder raises how much BUN the body shrugs off.
- Production multiplier `toxicityFactor` tapers linearly once BUN exceeds that
  capacity, over a `WASTE_THROTTLE_BAND` of 40 BUN, down to `WASTE_MIN_FACTOR`
  (0.10) — 10% floor, never zero. Removed the old fixed THROTTLE_BUN/HALT_BUN.
- Sick status (TOXIC_NECROSIS, reversible, no HP loss) now flags at heavy throttle
  (≥50% reduction); the "flush to restore" telemetry note fires once when output
  bottoms at the 10% floor; `wasteStallActive` tracks the floor state.
- Updated offline-ceiling and type comments; inspector banner reworded to
  "throttled (down to 10%) … flush or build/level excretory organs."

**Verified:** headless 12/12 — output falls gradually as BUN passes capacity;
floors at ~10% and stays strictly positive; adding kidneys+bladder raises output
at the same BUN; no HP loss / no destruction; sick state is reversible and clears
when BUN drops. tsc + vite build clean.

**Commit:** (this turn)

---

## 2026-09-03 — 1:1 economy mapping (cross-resource costs + storage roles)

**Why:** Implement CoC's exact economy so a balanced build is forced on two axes.
Decided mapping: Nutrients=Gold, Oxygen=Elixir, Hormones=Gems (Dark-Elixir premium
tier deferred; Water stays a hydration side-stat, not a spend currency).

**Changed:**
- `simulationEngine.ts`:
  - Added `producedResource()` and `upgradeCostResource()` helpers.
  - **Cross-resource coupling** in `getUpgradeCost`: nutrient producers now cost
    **oxygen only**, oxygen producers cost **nutrients only**, non-producers
    (defense/filtration/endocrine) cost **nutrients** (Gold sink); Brain/HQ keeps
    its dual-resource curve. Full cost goes to one resource (was split across both).
  - **Storage roles:** Liver (nutrient+oxygen), Muscle (nutrient), Stomach &
    Intestine (nutrient), Lungs (oxygen) now scale storage with level; **Skeleton
    dropped as a store** — it is defensive only now.
- `OrganContextDock.tsx` & `OrganInspectorModal.tsx`: both had their OWN divergent
  cost formulas — replaced with `getUpgradeCost` (single source of truth) and now
  hide the zero-cost side (cross-resource shows only the resource actually charged).

**Design note:** waste (BUN) is the "negative resource" and the second balance-forcer
— production raises it, filtration lowers it, high waste stalls production (no death
loop). So balance is forced by both cross-resource cost AND production↔filtration.

**Verified:** headless 27/27 — correct cost side per organ; brain costs both; time
outgrows cost per level; storage organs add caps and skeleton adds none but keeps
armor; an oxygen-starved base can't level nutrient producers until it builds oxygen
capacity. `tsc --noEmit` clean; `vite build` clean.

**Commit:** (this turn)

---

## 2026-09-03 — CoC mechanics deep-research reference

**Why:** Ground AnatoClash's economy in exactly how Clash of Clans works —
per-building behavior, refresh/production rates, storage caps, the upgrade-time
economy, gem faucet/sinks, and anti-death-loop systems.

**Changed:** added `docs/coc-mechanics-reference.md` — a dense reference compiled
from four parallel research passes over the CoC Fandom wiki + aggregators
(House of Clashers, coclayout, spokland, Pixel Crux) and Supercell release notes.
Covers: resource economy (collector rates, storage caps, boost, loot %), Town Hall
gating, builder scarcity, the time-vs-cost monetization gradient (+ time→gem skip
curve), gem faucet/sinks, retention systems (Star Bonus, Gold Pass, Clan Games,
magic items), anti-death-loop systems (shields, loot caps/penalty, League bonus,
matchmaking), and a condensed building/defense/hero catalog. Ends with a table
mapping each CoC mechanic to its AnatoClash equivalent + the immediate build gaps
(hormone faucet, daily streak/quests, instant-finish price alignment).

**Verified:** research cross-checked across multiple aggregators (Fandom returned
HTTP 402 to direct fetches); reference only — no code change.

**Commit:** (this turn)

---

## 2026-09-03 — Remove the death loop (waste stalls, never destroys)

**Why:** Enforce the CoC "no death loop" law — advancing gets harder but never
impossible, and a free player always has a path back to progress.

**Changed:**
- `simulationEngine.ts`: added `toxicityFactor` (0..1) from incoming BUN —
  full output below `THROTTLE_BUN` (55), linear taper to a full stall at
  `HALT_BUN` (85). Replaced the necrosis HP-damage/`DAMAGED_DESTROYED` block
  with a reversible `TOXIC_NECROSIS` "stalled/sick" flag that auto-recovers on
  flush. No HP loss, no destruction, `totalNecrosisEvents` stays 0. One
  "flush to restart — nothing lost" telemetry note per stall episode via new
  `vitals.wasteStallActive`.
- `types.ts`: added `PlayerVitals.wasteStallActive`; refreshed BUN comment.
- `OrganContextDock.tsx`: stalled organ no longer counts as "destroyed" (no
  bogus REPAIR prompt).
- `OrganInspectorModal.tsx`: amber "production stalled — flush to restart,
  nothing damaged" banner; destroyed banner reworded (waste can't destroy now).

**Verified:** headless 14/14 — high waste halts production but loses no HP and
destroys nothing; flushing restores production and organ status; 8h offline
never stalls/destroys and still produces; throttle zone gives reduced-but-
positive output. `tsc --noEmit` clean; `vite build` clean.

**Commit:** `222fce0`

---

## Earlier (from git history, condensed)

- `ba79bc9` — Vessel-connect parity in the Pixi/WebGL renderer (connect mode,
  preview line, banner) verified in-browser.
- `049c039` — Offline progression + builder gem sink + HUD clarity; 12/12
  headless checks.
- `3e163bb` — Hi-DPI Pixi canvas + generated-sprite loader
  (`public/organs/<key>.png` + `SPRITE_KEYS`).
- `ad1474a` — Organ art style test (heart, brain, lungs) as vector source.
- `7cb379a` — Real README with local run instructions.
- `5cbe6f4` — PixiJS/WebGL organ canvas behind a renderer toggle.
- `5d094af` — Made the upgrade economy real; closed free-progression exploits
  (brain cost curve, builder cap, tap cooldown, flush guards, hydration
  reserve); 8/8 headless checks.
