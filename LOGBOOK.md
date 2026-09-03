# AnatoClash — Development Logbook

A running summary of changes, newest first. One entry per working turn.
Each entry: date, a short title, what changed and why, how it was verified,
and the commit (if pushed).

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
