# AnatoClash — Development Logbook

A running summary of changes, newest first. One entry per working turn.
Each entry: date, a short title, what changed and why, how it was verified,
and the commit (if pushed).

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
