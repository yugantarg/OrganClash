# Clash of Clans — Exact Mechanics Reference (for AnatoClash)

Deep-research reference on how Clash of Clans (CoC) actually works: what every
building does, production/refresh rates, storage caps, the upgrade-time economy,
the gem faucet/sinks, and the anti-death-loop systems. Compiled from the CoC
Fandom wiki and corroborating aggregators (House of Clashers, coclayout, spokland,
Pixel Crux) plus Supercell's official release notes.

**Version caveat:** figures reflect the ~2024–2026 game (TH17/TH18 era), after the
Dec-2023 cost/time reductions. Supercell rebalances top-end numbers often, but the
**mechanics, formulas, and scaling ratios are stable** — only the absolute max-level
numbers keep growing. Treat exact values as "current ballpark," and the *ratios* as
the durable design truth.

The final section maps every mechanic to its AnatoClash equivalent — that's the part
that drives our build.

---

## 1. The core loop (one sentence)

Collect resources from producers → resources pile into capped storages → spend them
to upgrade buildings → upgrades take real-world *time* gated by scarce *builders* →
higher buildings unlock at the Town Hall gate → raid others / defend to refill →
repeat. Gems (hard currency) exist almost entirely to **skip the time**, not to
afford the cost.

---

## 2. Resource economy — producers, storages, refresh rates

### Producers (Gold Mine / Elixir Collector — mirror-image buildings)

- **Gold Mine** makes Gold, upgraded with **Elixir**. **Elixir Collector** makes Elixir,
  upgraded with **Gold** (deliberate cross-resource coupling so you can't tunnel one track).
- Continuous **offline production** — credited by real elapsed time.

| Level | Production/hr | Collector's own cap | Upgrade cost | Upgrade time |
|---|---|---|---|---|
| 1 | 200/h | 500 | 150 | 10 s |
| 5 | 1,000/h | 10,000 | 3,500 | 1 h |
| 10 | 2,800/h | 100,000 | 84,000 | 12 h |
| 13 (max, TH13 era) | 4,900/h | 250,000 | 504,000 | 3 d |

- **Production scales ~linearly** (≈+250–400/h per level), NOT exponentially.
- **Collector's own cap scales geometrically** (×~500 over the range) and is tuned so a
  full collector holds **many hours** of output (~51 h at max) — enough to survive a
  normal shield without overflowing. **Once the collector's own cap is hit, further
  output is wasted** until you tap it.
- **Tap-to-collect bubble:** produced resources sit *in the collector* (a floating bubble
  appears); tapping moves them into **Storage**. In the collector they're ~50% raidable;
  in storage they're only the TH-scaled 10–20% raidable — so **collecting reduces raid loss**.

### Dark Elixir Drill (premium/slow resource, unlocks TH7)

- ~**1–2% of a Gold Mine's rate** (20–120/h). Tiny own-cap (160–2,400) but, because it's so
  slow, that cap still buys a long buffer (cap tuned to survive a full shield). Fill ≈ 20 h at max.

### Storages — the binding constraint

| Lvl | Gold/Elixir Storage cap | Lvl | cap |
|---|---|---|---|
| 1 | 1,500 | 8 | 225,000 |
| 3 | 6,000 | 10 | 850,000 |
| 5 | 25,000 | 12 | 2,000,000 |
| 7 | 100,000 | 14 (max era) | 4,000,000 |

- **Capacity ~doubles per level to ~L11**, then tapers. Total cap = (#storages) × (per-storage cap)
  + Town Hall's own storage.
- **Dark Elixir Storage:** only **1 per village**, 10k → 280k over its range.
- **Why storage binds, not production:** upgrade costs run into the millions, so you're almost
  always **storage-capped** — you physically can't hold enough to afford the next big upgrade.
  Leveling storages (to hold more) is often more urgent than leveling mines (to make more).
  This is the deliberate economic bottleneck.

### Collector boost (gem sink)

- **×2 production for 24 h**, per building, paid in gems. Requires mine/collector **L5+**.
- **Resource Potion** (magic item) = same ×2/24h but hits **all** producers at once.
- Event boosts stack on top (Hammer Jam ×3, Summer Jam ×2 + timer discount, occasional 1-gem boosts).

### Raid/loot rules (economy-facing)

| Source | % stealable |
|---|---|
| Mines / Collectors | up to **50%** of held |
| Dark Elixir Drills | **75%** of held |
| Storages + Town Hall | **20% → ~10%** by TH, cap 200k → 550k+ |
| Treasury (Clan Castle) | flat **3%**, no TH penalty |

- **TH-mismatch loot penalty** (attacker vs defender TH): same/higher **100%**, −1 **80%**, −2 **50%**,
  −3 **25%**, −4+ **5%**. Discourages bullying weaker bases → pushes same-TH matchmaking.

---

## 3. Progression gate — Town Hall

The **Town Hall (TH)** is the single master gate: each level raises the **count** of each
building you may place, **unlocks new building/troop/trap/hero/spell types**, and raises the
**max level cap** on everything. You can't push any building or troop past your current TH.

| TH | Gold cost | Time | TH | Gold cost | Time |
|---|---|---|---|---|---|
| 3 | 4,000 | 30 m | 12 | 6,000,000 | 6 d |
| 5 | 150,000 | 6 h | 13 | 9,000,000 | 7 d |
| 7 | 1,000,000 | 18 h | 15 | 13,000,000 | 8 d |
| 9 | 2,500,000 | 2 d | 16 | 15,000,000 | 9 d |
| 10 | 3,500,000 | 3 d | 18 | 25,000,000 | 12 d |

Total to max TH ≈ **110M gold / ~72 days of build time**.

---

## 4. Builders — scarcity is the pacing engine

**The core rule: one builder does exactly one upgrade at a time.** Your builder count is the
hard cap on concurrent upgrades — for most of the game, **builder scarcity, not resources, is
the pacing lever.**

- **Start with 2.** Buy up to **5** with gems: **250 / 500 / 1,000 / 2,000** (≈3,750 gems total,
  the biggest gem priority for most free players).
- **6th builder (O.T.T.O):** earned by maxing the Builder Base, not bought.
- **Builder Apprentice** (~TH10, 500 gems): *speeds* an already-running upgrade ~1 h/day, can't
  *start* one.
- **Laboratory** is a parallel bottleneck: **one troop/spell research at a time**, times running
  into 12–16+ days each; maxing an army is a multi-month serialized grind regardless of resources.

---

## 5. The monetization gradient — time vs cost divergence (the most important mechanic)

Two curves diverge as you climb:

- **Early game the binding constraint is COST** ("can I afford it?").
- **Late game the binding constraint is TIME** ("can I wait?") — your raiding income scales up so
  you bank the cost in a day or two, but the timer is still **1–2 weeks**.

| Item | Low | Mid | High |
|---|---|---|---|
| Cannon | L1: 250 / 5 s | L10: 330k / 4 h | L21: 3M / 1 d 12 h |
| Town Hall | TH5: 150k / 6 h | TH12: 6M / 6 d | TH18: 25M / 12 d |
| Laboratory | L3: 50k / 2 h | L10: 3.8M / 4 d | L16: 27M / **16 d** |

Per level, mid-late: cost grows ~×1.2–1.4, time grows ~×1.2–1.5 — but time compounds off a base
already measured in **days**, so a couple of levels turns a 4-day job into a 16-day job.

**The time→gem skip conversion depends ONLY on the remaining timer, never on the resource cost:**

| Remaining | Gems to finish | Gems/hour |
|---|---|---|
| 1 min | 1 | — |
| 1 h | 20 | 20 |
| 1 day | 260 | ~10.8 |
| 1 week | ~1,000 | ~6 |
| ~2 weeks | ~1,800–2,000 | ~5.5 |

Piecewise: `<1h ≈ 20 + 11·(hrs−1)`; `>1d ≈ 260 + 123·(days−1)`. **Longer timers are cheaper per
hour but far more expensive in absolute gems.** Because the skip price is set purely by the clock,
a 16-day/27M-elixir upgrade and any other 16-day upgrade cost the **same ~2,000 gems** to skip.

**This is the whole business model:** Supercell lets cost become trivial relative to income while
time stretches to weeks, manufacturing "I can afford it but must wait 2 weeks." Gems resolve *time*.

---

## 6. Gems — faucet and sinks (how ~98% never pay yet keep progressing)

**Faucet (free earning):**
- **Obstacle removal:** each cleared tree/bush drops **0–6 gems** on a fixed 20-value cycle (avg ~2).
- **Gem Box** (rare obstacle): exactly **25 gems**, one at a time, respawns every ~2–3 weeks.
- **Gem Mine** (Builder Base, BH3+): passive ~**5/day → ~35/week**.
- **Achievements:** one-time bounty totalling **~21,000 gems** across ~54 achievements — front-loads
  a big stockpile (enough to buy every extra builder).
- Recurring dribbles from Star Bonus, Clan Games, Season/Silver track.
- **Sustained free rate ≈ 50–100 gems/week** once achievements are exhausted.

**Sinks:** extra builders (biggest), finishing upgrades early (~7–8 gems/hour rule of thumb),
boosting collectors/training, buying resources, buying potions.

---

## 7. Retention systems (the daily-return + catch-up layer)

- **Star Bonus:** earn 5 stars in multiplayer → lump of resources into the raid-safe **Treasury**;
  scales with TH/League; resets 24 h after completion; up to 2 stack. The core **daily habit loop**.
- **Season Challenges / Gold Pass** (monthly): free "Silver" track hands **magic items, potions,
  hammers, resources** to free players; paid Gold Pass (~$5) adds a hero skin, books, runes, wall
  rings, ~20% build/research/training discount, bigger Season Bank.
- **Clan Games** (~monthly co-op): shared point pool unlocks 6 tiers of **choose-1-of-3** rewards
  (resources, magic items, gems) — a major free source of instant-finish items.
- **Magic Items** — accelerate without gems:
  - **Hammers** — instant-finish an upgrade (no resources, no time). Building/Heroes/Spells/Fighting.
  - **Books** — skip the *time* only (still pay resources). Book of Everything = any type.
  - **Runes** — instantly fill a storage to max. Wall Ring for walls.
  - **Potions** — timed multipliers: Builder ×10/1h, Research ×24/1h, Resource ×2/1day, Power (max
    troops 1h), etc. Stacking a potion *extends duration*, doesn't multiply the rate.
  - **Net:** a diligent free player banking Clan Games + Season rewards can instant-complete TH/hero/
    lab upgrades and fill storages **without spending a gem** — closing much of the gap to payers.

---

## 8. Anti-death-loop / anti-frustration systems (guarantee you can always recover)

- **Shields** after being raided: ≥30% destruction → **12 h**, ≥60% → **14 h**, ≥90% → **16 h**;
  TH destroyed also shields. While shielded you can't be attacked.
- **Village Guard:** free post-shield grace to attack without burning shield time; 15 min → 2 h by League.
- **Personal Break Time:** periodic protection windows even for shieldless active players; 15 min
  offline resets it.
- **Loot caps + penalties:** stealable loot is a capped % of storages (never zero — a floor always
  remains), plus the TH-mismatch penalty (5% for attacking 4+ TH down) so small bases aren't farmed.
- **League Bonus:** a *fixed* payout on any successful attack, **independent of the defender's actual
  loot** — so even hitting an empty base pays, guaranteeing progression income (100% bonus at 70% destruction).
- **Trophy matchmaking:** matched near your trophy count; losing drops you to easier brackets where you
  recover — a self-correcting difficulty loop.
- **Combined guarantee:** you can lose trophies and loot but **can never be permanently locked out of
  progress**. This is the mechanical embodiment of "advancing gets harder but never impossible."

---

## 9. Building catalog (what each does) — condensed

**Defenses** (role · target · cadence/mechanic):
- **Cannon** — cheap ground DPS, fast (~0.8 s), medium range.
- **Archer Tower** — ground+air, fast, mode toggle (long-range vs fast).
- **Mortar** — ground splash, **very slow (~5 s)**, long range with a **minimum-range blind spot**; anti-swarm.
- **Air Defense** — anti-air single-target, high DPS; top upgrade priority.
- **Wizard Tower** — ground+air splash, short range; anti-swarm both domains.
- **Air Sweeper** — pushes air troops back in a 120° cone (no damage), manually aimed.
- **Hidden Tesla** — stealth until triggered, then fast; bonus vs P.E.K.K.A.
- **Bomb Tower** — ground splash + **death explosion** when destroyed.
- **X-Bow** — very rapid, very long range, **reloaded with Elixir**; ground or ground+air mode.
- **Inferno Tower** — **reloaded with Dark Elixir**; single-target **ramping damage + blocks healing**,
  or multi-target anti-swarm.
- **Eagle Artillery** — dormant until ~200 housing deployed, then base-wide heavy artillery.
- **Scattershot** — largest-area splash, reloadable.
- **Monolith** — long range, **bonus damage = % of target max HP** (shreds high-HP units).
- **Spell Towers** — cast a defensive spell (Rage/Poison/Invisibility) in radius, don't shoot.
- **Walls** — HP-sink/funnel, no damage; upgraded per-segment, cheap-but-hundreds → a long separate grind.

**Traps** (one-shot, must **re-arm** with resources): Bomb (splash), Spring Trap (flings troops off map),
Air Bomb, Giant Bomb (big splash), Seeking Air Mine (homing anti-big-air), Skeleton Trap (spawns skeletons),
Tornado Trap (pulls + holds + damages).

**Army buildings:** Army Camp (housing space = army size cap), Barracks / Dark Barracks (unlock+train troops,
cost+time per unit), **Laboratory** (upgrade troops/spells, one at a time), Spell Factory / Dark Spell Factory,
Clan Castle (request reinforcements + defensive garrison), Workshop (siege machines, one at a time),
Pet House (hero pets), Blacksmith (hero equipment).

**Heroes** (immortal — "sleep" instead of dying; go fully **offline while being upgraded**): Barbarian King
(ground tank), Archer Queen (ranged carry), Grand Warden (support aura + invincibility ability), Royal Champion
(defense-buster), Battle Machine (Builder Base). The March-2025 update removed between-battle regeneration.

---

## 10. Mapping to AnatoClash — what each CoC mechanic becomes here

| CoC mechanic | AnatoClash equivalent | Status |
|---|---|---|
| Town Hall (master gate) | **Brain / CNS** — level gates storage caps and unlocks | ✅ in place |
| Gold Mine / Elixir Collector | **Producer organs** (stomach→nutrients, lungs→oxygen, etc.) | ✅ in place |
| Cross-resource upgrades (Gold Mine costs Elixir) | Nutrient organs cost **oxygen only**; oxygen organs cost **nutrients only**; non-producers cost nutrients (Gold sink); Brain/HQ costs both | ✅ implemented |
| Collector own-cap + tap bubble | **Per-organ uncollected cap + tap-to-collect** | ✅ in place |
| Storage caps bind, not production | **Brain-scaled caps + storage organs**: Liver/Muscle/Stomach/Intestine (nutrient), Liver/Lungs (oxygen); skeleton no longer stores | ✅ implemented |
| Collector boost (×2/24h, gems) | **Adrenaline/EPO boosts**; add a hormone-priced collector boost | ⚠️ partial |
| Offline production, capped | **applyOfflineProgress** (8h cap, BUN ceiling 70) | ✅ in place |
| One builder = one upgrade | **Builder slots (2→5), gem/hormone sink** | ✅ in place |
| Time≫cost divergence (monetization) | Non-HQ organs: cost ×1.45/lvl, **time ×1.85/lvl** → time diverges from cost ~5.5× across the tree; Brain/HQ ×2.2 cost / ×2.5 time | ✅ tuned to CoC ratios |
| Time→gem skip (timer-only price) | `hormoneCostToFinish(remainingSec)` — CoC curve (~1/min, ~20/hr, ~200/day), priced on time only | ✅ implemented |
| Gem faucet (obstacles, achievements, gem mine) | **Hormone faucet: tap crits, achievements, daily** | ❌ thin — build next |
| Star Bonus (daily habit) | **Daily login streak + daily quest** | ❌ to build |
| Clan Games / Season pass (catch-up) | Later live-ops; single-player events | ❌ later |
| Magic Items (hammers/potions/runes) | Consumables (instant-finish, fill-storage, ×boost) | ❌ later |
| Shields / loot penalty / League bonus | **No-death-loop laws** — waste stalls (never destroys); flush to restart | ✅ implemented |
| Trophy matchmaking (self-correcting) | N/A while combat parked; asymptotic difficulty instead | ✅ by design |

**Immediate gaps to close (next build order):** hormone (gem) faucet — achievements + daily
login streak + daily quests + obstacle/toxin-clear drip — then align the instant-finish price to
the timer-only conversion curve, then re-run the dry-run against the four F2P laws.

---

## Sources

CoC Fandom wiki (Gold Mine, Elixir Collector, Dark Elixir Drill, Gold/Dark Storage, Town Hall,
Laboratory, Builder's Hut, Builder's Apprentice, Obstacles, Gems, Achievements, Star Bonus, Season
Challenges, Clan Games, Magic Items, Shield, Guard, Defensive Buildings, Monolith, Eagle Artillery,
X-Bow, Inferno Tower, Hero Hall); House of Clashers (loot calculation, potions, personal break);
coclayout / spokland / cocland / Pixel Crux (upgrade tables, gem formulas); Supercell official
release notes (Dec-2023 cost/time reductions, TH18 Crash Lands, Gold Pass changes). Numbers verified
against wiki-mirroring aggregators because clashofclans.fandom.com returned HTTP 402 to direct fetches.
