# AnatoClash

A *Clash of Clans*–style base-builder where the base is a human body. You grow
a macro-anatomical network — heart, lungs, liver, kidneys, immune organs —
balancing a physiological economy, waste filtration, and (later) immune defence,
on an exponential timer economy.

Built with React 19 + Vite + Tailwind 4. The organ base renders on a WebGL
canvas (PixiJS); the rest of the UI is React.

---

## Run it locally

You need **Node 18+** *or* **[Bun](https://bun.sh)**. Nothing else — the game is a
purely client-side app, so there is no server to start and **no `.env` or API key
required** to run it.

```bash
# 1. Clone and switch to the active development branch
git clone https://github.com/yugantarg/OrganClash
cd OrganClash
git checkout claude/game-review-k79xr1

# 2. Install dependencies (pick one)
bun install       # fast
# or
npm install

# 3. Start the dev server
bun run dev       # or: npm run dev
```

Then open **http://localhost:3000**. Edits hot-reload.

> The `dev` script binds to `0.0.0.0`, so you can also open the game from a phone
> on the same network at `http://<your-computer-ip>:3000` — useful for feeling the
> touch controls, since this is a mobile game.

---

## Playing

The game opens on a starter base: a single **Brain (HQ)**. The Brain makes no
oxygen on its own, so your first moves are to build **Lungs** and a **Stomach**,
then start upgrading.

| Action | How |
|---|---|
| Select an organ | Click / tap it |
| Tap for resources | Tap a selected organ (rate-limited) |
| Move an organ | Drag it |
| Pan the base | Drag the background |
| Zoom | Mouse wheel / pinch |
| Build | **BUILD SHOP** (bottom-right) |
| Upgrade / repair / connect | Use the context dock at the bottom when an organ is selected |
| Collect resources | Tap the floating `+` bubbles, or **Collect Harvest** |

**Two things worth trying immediately:**

- **Renderer toggle** (top-left): switches between the new **WebGL (Pixi)** renderer
  and the legacy **DOM** one, so you can compare them live.
- **Demos** (bottom-left): jump to a **Full 11-System Body** or a **Waste Crisis**
  scenario to see a populated base without playing up to it.

Progress is saved to your browser's `localStorage`, so it persists across reloads
on the same browser.

---

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Dev server with hot-reload at `:3000` |
| `bun run build` | Production build to `dist/` (static, deploy anywhere) |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | Type-check with `tsc --noEmit` |

(Swap `bun` for `npm` throughout if you prefer.)

---

## Project layout

```
src/
  App.tsx                     game shell, state wiring, renderer toggle
  types.ts                    core game types
  data/organData.ts           organ definitions, balance curves, catalogs
  services/
    simulationEngine.ts       the 1-second tick: economy, vitals, upgrades
    soundEffects.ts           procedural WebAudio
  components/
    pixi/
      OrganismCanvasPixi.tsx   WebGL organ renderer (active)
      organShapes.ts           procedural PLACEHOLDER organ art
    OrganismCanvas.tsx         legacy DOM/SVG renderer
    …                          HUD, modals, context dock
```

---

## Status

Active development happens on **`claude/game-review-k79xr1`**. Current focus is
turning the prototype into a shippable free-to-play builder: a real upgrade
economy, the WebGL renderer, and (next) generated organ art. The organ shapes you
see now are procedural placeholders standing in for that art set.
