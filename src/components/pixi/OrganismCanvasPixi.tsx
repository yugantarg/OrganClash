/**
 * WebGL organ canvas (PixiJS v8), a drop-in for the DOM/SVG OrganismCanvas.
 *
 * Renders the base as real sprites on a body-cavity ground with idle motion,
 * selection glow, resource bubbles, upgrade rings, flowing vessels and tap
 * juice - the effect density the DOM renderer could not reach. Organ art is
 * procedural placeholder (see organShapes.ts) until the generated atlas lands;
 * swapping to textures touches only the draw call.
 *
 * Same prop contract as OrganismCanvas, so App can switch renderers with a flag.
 */
import React, { useRef, useEffect } from 'react';
import { Application, Container, Graphics, Sprite, Text, Texture, Ticker, Rectangle } from 'pixi.js';
import { OrganNode, VesselConnection, VesselType, OrganType, Obstacle } from '../../types';
import { drawOrgan, ORGAN_PALETTES, loadOrganTextures } from './organShapes';

interface Props {
  organs: OrganNode[];
  obstacles: Obstacle[];
  onClearObstacle: (id: string) => void;
  canAffordClear: (cost: number) => boolean;
  vessels: VesselConnection[];
  selectedOrganId: string | null;
  onSelectOrgan: (id: string) => void;
  onMoveOrgan: (id: string, x: number, y: number) => void;
  onTapOrgan: (id: string) => void;
  onCollectOrgan: (id: string) => void;
  isAdrenalineActive: boolean;
  vesselConnectSource: { organId: string; type: VesselType } | null;
  onAddVessel: (fromId: string, toId: string, type: VesselType) => void;
  onCancelVesselConnect: () => void;
}

const ORGAN_R = 46; // logical radius of an organ sprite

interface OrganDO {
  root: Container;
  body: Container; // holds the shape, scaled for breathing/tap
  ring: Graphics; // selection + upgrade ring
  shadow: Graphics;
  badge: Container;
  bubble: Container;
  phase: number; // idle breathing offset
  squash: number; // tap squash amount, decays
  node: OrganNode;
}

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

export const OrganismCanvasPixi: React.FC<Props> = (props) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Persistent Pixi state across renders.
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const vesselLayerRef = useRef<Container | null>(null);
  const organLayerRef = useRef<Container | null>(null);
  const fxLayerRef = useRef<Container | null>(null);
  const obstacleLayerRef = useRef<Container | null>(null);
  const organsRef = useRef<Map<string, OrganDO>>(new Map());
  const texturesRef = useRef<Map<OrganType, Texture>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const previewRef = useRef<Graphics | null>(null);
  const pointerWorldRef = useRef({ x: 0, y: 0 });
  const flowRef = useRef(0);
  const framedSigRef = useRef('');
  const camRef = useRef({ x: 0, y: 0, zoom: 0.9, tx: 0, ty: 0, tz: 0.9 });

  // ---- init once ----
  useEffect(() => {
    let destroyed = false;
    const host = hostRef.current!;
    const app = new Application();

    app
      .init({
        resizeTo: host,
        antialias: true,
        // Match the device pixel ratio so the canvas is crisp on retina/hi-dpi
        // screens instead of rendering at 1x and looking blurry.
        resolution: Math.min(window.devicePixelRatio || 1, 3),
        autoDensity: true,
        backgroundAlpha: 1,
        background: 0x0d1b21,
        preference: 'webgl',
        powerPreference: 'high-performance',
      })
      .then(async () => {
        if (destroyed) {
          app.destroy(true, { children: true });
          return;
        }
        appRef.current = app;
        host.appendChild(app.canvas);

        // Load any generated organ sprites; organs without art keep the placeholder.
        texturesRef.current = await loadOrganTextures();
        if (destroyed) {
          app.destroy(true, { children: true });
          return;
        }

        const world = new Container();
        const vesselLayer = new Container();
        const obstacleLayer = new Container();
        const organLayer = new Container();
        const fxLayer = new Container();
        const preview = new Graphics();
        world.addChild(vesselLayer, obstacleLayer, organLayer, fxLayer, preview);
        app.stage.addChild(drawGround(app), world);
        worldRef.current = world;
        vesselLayerRef.current = vesselLayer;
        organLayerRef.current = organLayer;
        fxLayerRef.current = fxLayer;
        obstacleLayerRef.current = obstacleLayer;
        previewRef.current = preview;

        // Centre the camera on the base.
        camRef.current.x = camRef.current.tx = app.screen.width / 2;
        camRef.current.y = camRef.current.ty = app.screen.height / 2;

        setupCameraInput(app, host, camRef, organsRef);
        // Track the pointer in world space for the vessel-connect preview line.
        app.stage.on('globalpointermove', (e) => {
          const w = worldRef.current;
          if (w) {
            const lp = w.toLocal(e.global);
            pointerWorldRef.current = { x: lp.x, y: lp.y };
          }
        });
        reconcile(); // first paint
        frameBase();
        // snap the camera on first frame instead of easing in from origin
        const c = camRef.current;
        c.x = c.tx; c.y = c.ty; c.zoom = c.tz;
        app.ticker.add(tick);
      });

    return () => {
      destroyed = true;
      app.ticker?.remove(tick);
      appRef.current = null;
      try {
        app.destroy(true, { children: true });
      } catch {
        /* already gone */
      }
      organsRef.current.clear();
      particlesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- reconcile scene graph whenever organs/vessels/selection change ----
  useEffect(() => {
    reconcile();
    const sig = props.organs.map((o) => o.id).sort().join(',');
    if (sig !== framedSigRef.current) {
      framedSigRef.current = sig;
      frameBase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.organs, props.vessels, props.selectedOrganId]);

  function frameBase() {
    const app = appRef.current;
    const organs = propsRef.current.organs;
    if (!app || organs.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const o of organs) {
      minX = Math.min(minX, o.x); maxX = Math.max(maxX, o.x);
      minY = Math.min(minY, o.y); maxY = Math.max(maxY, o.y);
    }
    const pad = ORGAN_R * 2.4;
    const bw = maxX - minX + pad * 2;
    const bh = maxY - minY + pad * 2;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const zoom = Math.max(0.5, Math.min(1.4, Math.min(app.screen.width / bw, app.screen.height / bh)));
    const cam = camRef.current;
    cam.tz = zoom;
    cam.tx = app.screen.width / 2 - cx * zoom;
    cam.ty = app.screen.height / 2 - cy * zoom;
  }

  function reconcile() {
    const organLayer = organLayerRef.current;
    if (!organLayer) return;
    const map = organsRef.current;
    const seen = new Set<string>();

    for (const node of propsRef.current.organs) {
      seen.add(node.id);
      let do_ = map.get(node.id);
      if (!do_) {
        do_ = buildOrgan(
          node,
          texturesRef.current.get(node.type),
          (id) => propsRef.current.onSelectOrgan(id),
          tapOrgan,
          dragMove,
          handleConnectPress
        );
        organLayer.addChild(do_.root);
        map.set(node.id, do_);
      }
      do_.node = node;
      do_.root.position.set(node.x, node.y);
      updateOrganVisual(do_, node, propsRef.current.selectedOrganId === node.id);
    }
    for (const [id, do_] of map) {
      if (!seen.has(id)) {
        do_.root.destroy({ children: true });
        map.delete(id);
      }
    }
    drawVessels();
  }

  function drawVessels() {
    const layer = vesselLayerRef.current;
    if (!layer) return;
    layer.removeChildren().forEach((c) => c.destroy());
    const byId = new Map<string, OrganNode>(propsRef.current.organs.map((o) => [o.id, o] as const));
    for (const v of propsRef.current.vessels) {
      const a = byId.get(v.fromNodeId);
      const b = byId.get(v.toNodeId);
      if (!a || !b) continue;
      const g = new Graphics();
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 11, color: 0x3a1520, cap: 'round' });
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 6, color: 0xb23048, cap: 'round', alpha: 0.9 });
      (g as any)._a = a;
      (g as any)._b = b;
      (g as any)._vessel = true;
      layer.addChild(g);
    }
  }

  /**
   * A press while a vessel connection is pending. If it lands on a different
   * organ, complete the connection and consume the press (no select/drag/tap).
   * Returns true when consumed.
   */
  function handleConnectPress(id: string): boolean {
    const src = propsRef.current.vesselConnectSource;
    if (src && src.organId !== id) {
      propsRef.current.onAddVessel(src.organId, id, src.type);
      return true;
    }
    return false;
  }

  function tapOrgan(id: string) {
    const p = propsRef.current;
    p.onTapOrgan(id);
    const do_ = organsRef.current.get(id);
    if (!do_) return;
    do_.squash = 1;
    burst(do_.node.x, do_.node.y, ORGAN_PALETTES[do_.node.type].light);
    p.onCollectOrgan(id);
  }

  function dragMove(id: string, x: number, y: number) {
    propsRef.current.onMoveOrgan(id, x, y);
    const do_ = organsRef.current.get(id);
    if (do_) {
      do_.root.position.set(x, y);
      do_.node = { ...do_.node, x, y };
      drawVessels();
    }
  }

  function burst(x: number, y: number, color: number) {
    const fx = fxLayerRef.current;
    if (!fx) return;
    for (let i = 0; i < 10; i++) {
      const g = new Graphics().circle(0, 0, 3 + Math.random() * 3).fill(color);
      g.position.set(x, y - ORGAN_R * 0.4);
      fx.addChild(g);
      const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
      const spd = 1.5 + Math.random() * 2.5;
      particlesRef.current.push({ g, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 1.5, life: 0, max: 40 + Math.random() * 20 });
    }
  }

  // ---- per-frame animation ----
  function tick(ticker: Ticker) {
    const dt = ticker.deltaTime;
    flowRef.current += dt;
    const t = flowRef.current;

    // camera easing
    const cam = camRef.current;
    cam.zoom += (cam.tz - cam.zoom) * 0.18;
    cam.x += (cam.tx - cam.x) * 0.22;
    cam.y += (cam.ty - cam.y) * 0.22;
    const world = worldRef.current;
    if (world) {
      world.scale.set(cam.zoom);
      world.position.set(cam.x, cam.y);
    }

    const adren = propsRef.current.isAdrenalineActive;
    for (const do_ of organsRef.current.values()) {
      // idle breathing; heart and lungs beat faster
      const rate = do_.node.type === 'HEART_CARDIO' ? 0.16 : do_.node.type === 'LUNGS_RESP' ? 0.07 : 0.045;
      const amp = do_.node.type === 'HEART_CARDIO' ? 0.06 : 0.035;
      const breathe = 1 + Math.sin(t * rate * (adren ? 2 : 1) + do_.phase) * amp;
      const sq = do_.squash;
      do_.body.scale.set(breathe * (1 + sq * 0.18), breathe * (1 - sq * 0.14));
      if (do_.squash > 0) do_.squash = Math.max(0, do_.squash - dt * 0.06);

      // resource bubble bob + visibility
      const u = (do_.node.uncollectedNutrients || 0) + (do_.node.uncollectedOxygen || 0) + (do_.node.uncollectedWater || 0);
      do_.bubble.visible = u >= 8 && do_.node.status !== 'UNDER_UPGRADE';
      do_.bubble.y = -ORGAN_R - 26 + Math.sin(t * 0.08 + do_.phase) * 4;

      // upgrade ring progress
      if (do_.node.status === 'UNDER_UPGRADE' && do_.node.upgradeEndTime && do_.node.upgradeDurationSeconds) {
        const remain = (do_.node.upgradeEndTime - Date.now()) / 1000;
        const frac = Math.max(0, Math.min(1, 1 - remain / do_.node.upgradeDurationSeconds));
        do_.ring.clear();
        do_.ring.arc(0, 0, ORGAN_R + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2).stroke({ width: 5, color: 0x37c8e0, cap: 'round' });
      }
    }

    // vessel-connect preview line from the source organ to the pointer
    const preview = previewRef.current;
    if (preview) {
      preview.clear();
      const src = propsRef.current.vesselConnectSource;
      if (src) {
        const from = organsRef.current.get(src.organId);
        if (from) {
          const p = pointerWorldRef.current;
          preview
            .moveTo(from.node.x, from.node.y)
            .lineTo(p.x, p.y)
            .stroke({ width: 5, color: 0x37c8e0, alpha: 0.85, cap: 'round' });
          preview.circle(p.x, p.y, 7).fill({ color: 0x37c8e0, alpha: 0.5 });
        }
      }
    }

    // flowing dots along vessels
    const layer = vesselLayerRef.current;
    if (layer) {
      for (const child of layer.children) {
        const g = child as Graphics & {
          _vessel?: boolean;
          _dot?: Graphics;
          _a: { x: number; y: number };
          _b: { x: number; y: number };
        };
        if (!g._vessel) continue;
        if (!g._dot) {
          g._dot = new Graphics().circle(0, 0, 4).fill(0xffd0d8);
          g.addChild(g._dot);
        }
        const f = (((t * 0.01 * (adren ? 2.4 : 1)) % 1) + 1) % 1;
        g._dot.position.set(g._a.x + (g._b.x - g._a.x) * f, g._a.y + (g._b.y - g._a.y) * f);
      }
    }

    // particles
    const alive: Particle[] = [];
    for (const p of particlesRef.current) {
      p.life += dt;
      p.vy += dt * 0.08;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = 1 - p.life / p.max;
      if (p.life < p.max) alive.push(p);
      else p.g.destroy();
    }
    particlesRef.current = alive;
  }


  // Deposits (obstacles). Rebuilt whenever the set changes; tapping one clears it
  // and pays out hormones via CoC's fixed gem cycle.
  useEffect(() => {
    const layer = obstacleLayerRef.current;
    if (!layer) return;
    layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    for (const ob of props.obstacles || []) {
      const isBox = ob.kind === 'GEM_BOX';
      const affordable = props.canAffordClear(ob.clearCost);
      const root = new Container();
      root.x = ob.x;
      root.y = ob.y;
      root.eventMode = 'static';
      root.cursor = affordable ? 'pointer' : 'not-allowed';

      const g = new Graphics();
      if (isBox) {
        // Hormone Crystal — a faceted gem, unmistakable against the deposits.
        g.poly([0, -18, 15, -5, 9, 16, -9, 16, -15, -5]).fill({ color: 0x7dd3fc });
        g.poly([0, -18, 15, -5, 0, 2]).fill({ color: 0xbae6fd });
        g.poly([0, -18, -15, -5, 0, 2]).fill({ color: 0x38bdf8 });
        g.stroke({ color: 0x0369a1, width: 2.5, alpha: 0.9 });
      } else {
        // Toxin deposit — a dull organic lump.
        g.ellipse(0, 4, 17, 12).fill({ color: 0x8a8172 });
        g.ellipse(-5, -2, 10, 9).fill({ color: 0xa39985 });
        g.ellipse(6, -1, 8, 7).fill({ color: 0x9a907c });
        g.stroke({ color: 0x5f584c, width: 2, alpha: 0.75 });
      }
      g.alpha = affordable ? 1 : 0.55;
      root.addChild(g);

      const label = new Text({
        text: isBox ? '25 ◆' : `${ob.clearCost}N`,
        style: {
          fontFamily: 'monospace',
          fontSize: 11,
          fill: isBox ? 0x0369a1 : 0x5f584c,
          fontWeight: 'bold',
        },
      });
      label.anchor.set(0.5);
      label.y = isBox ? 30 : 24;
      root.addChild(label);

      root.on('pointertap', (e: any) => {
        e.stopPropagation();
        if (props.canAffordClear(ob.clearCost)) props.onClearObstacle(ob.id);
      });
      layer.addChild(root);
    }
  }, [props.obstacles, props.canAffordClear, props.onClearObstacle]);

  return (
    <>
      <div ref={hostRef} className="absolute inset-0" style={{ touchAction: 'none' }} />
      {props.vesselConnectSource && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900/90 text-white rounded-xl px-3 py-1.5 shadow-lg pointer-events-auto">
          <span className="font-game text-xs">
            Tap a target organ to connect {props.vesselConnectSource.type.toLowerCase()} vessel
          </span>
          <button
            onClick={props.onCancelVesselConnect}
            className="px-2 py-0.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-mono cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
};

// ---------- builders (module scope, no React) ----------

function drawGround(app: Application): Graphics {
  const g = new Graphics();
  const paint = () => {
    g.clear();
    const w = app.screen.width;
    const h = app.screen.height;
    g.rect(0, 0, w, h).fill(0x0d1b21);
    // soft warm cavity glow in the centre
    for (let i = 6; i >= 1; i--) {
      g.ellipse(w / 2, h / 2, (w / 2) * (i / 6), (h / 2) * (i / 6)).fill({ color: 0x3a2230, alpha: 0.05 });
    }
  };
  paint();
  app.renderer.on('resize', paint);
  return g;
}

function buildOrgan(
  node: OrganNode,
  texture: Texture | undefined,
  onSelect: (id: string) => void,
  onTap: (id: string) => void,
  onDrag: (id: string, x: number, y: number) => void,
  onConnectPress: (id: string) => boolean
): OrganDO {
  const root = new Container();
  root.eventMode = 'static';
  root.cursor = 'pointer';

  const shadow = new Graphics().ellipse(0, ORGAN_R * 0.75, ORGAN_R * 0.8, ORGAN_R * 0.28).fill({ color: 0x000000, alpha: 0.32 });
  const ring = new Graphics();
  const body = new Container();
  if (texture) {
    // Generated sprite: fit its longest side to the organ footprint, sit it
    // on the ground plane like the procedural shape does.
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.55);
    const fit = (ORGAN_R * 2.2) / Math.max(texture.width, texture.height);
    sprite.scale.set(fit);
    body.addChild(sprite);
  } else {
    const shape = new Graphics();
    drawOrgan(shape, node.type, ORGAN_R);
    body.addChild(shape);
  }

  const badge = new Container();
  const badgeBg = new Graphics().roundRect(-16, -11, 32, 22, 7).fill(0x0f172a).stroke({ width: 1.5, color: 0x334155 });
  const badgeText = new Text({ text: `${node.level}`, style: { fontFamily: 'Arial', fontSize: 14, fontWeight: '700', fill: 0xffffff } });
  badgeText.anchor.set(0.5);
  badge.addChild(badgeBg, badgeText);
  badge.position.set(-ORGAN_R * 0.7, -ORGAN_R * 0.85);

  const bubble = new Container();
  const bBg = new Graphics().roundRect(-20, -12, 40, 24, 8).fill(0xf6b93b).stroke({ width: 2, color: 0x8a5a10 });
  const bTxt = new Text({ text: '+', style: { fontFamily: 'Arial', fontSize: 13, fontWeight: '700', fill: 0x3a2504 } });
  bTxt.anchor.set(0.5);
  bubble.addChild(bBg, bTxt);
  bubble.visible = false;
  (bubble as any)._txt = bTxt;

  root.addChild(shadow, ring, body, badge, bubble);

  // ---- interaction: distinguish tap from drag ----
  let downAt = { x: 0, y: 0, t: 0 };
  let dragging = false;
  root.on('pointerdown', (e) => {
    e.stopPropagation();
    // If a vessel connection is pending, a press completes it — no select/drag.
    if (onConnectPress(node.id)) {
      downAt.t = 0;
      return;
    }
    downAt = { x: e.global.x, y: e.global.y, t: performance.now() };
    dragging = false;
    onSelect(node.id);
  });
  root.on('globalpointermove', (e) => {
    if (downAt.t === 0) return;
    const dx = e.global.x - downAt.x;
    const dy = e.global.y - downAt.y;
    if (!dragging && Math.hypot(dx, dy) > 6) dragging = true;
    if (dragging && root.parent) {
      const local = root.parent.toLocal(e.global);
      onDrag(node.id, local.x, local.y);
    }
  });
  const end = () => {
    if (downAt.t === 0) return;
    if (!dragging && performance.now() - downAt.t < 400) onTap(node.id);
    downAt.t = 0;
    dragging = false;
  };
  root.on('pointerup', end);
  root.on('pointerupoutside', end);

  return { root, body, ring, shadow, badge, bubble, phase: Math.random() * Math.PI * 2, squash: 0, node };
}

function updateOrganVisual(do_: OrganDO, node: OrganNode, selected: boolean) {
  (do_.badge.children[1] as Text).text = `${node.level}`;
  const bubbleTxt = (do_.bubble as any)._txt as Text;
  const u = Math.floor((node.uncollectedNutrients || 0) + (node.uncollectedOxygen || 0) + (node.uncollectedWater || 0));
  bubbleTxt.text = `+${u}`;

  // status tint
  let tint = 0xffffff;
  if (node.status === 'HYPOXIC') tint = 0x89b6d6;
  else if (node.status === 'TOXIC_NECROSIS') tint = 0xb6c07a;
  else if (node.status === 'DAMAGED_DESTROYED') tint = 0x6b6b6b;
  do_.body.tint = tint;
  do_.body.alpha = node.status === 'DAMAGED_DESTROYED' ? 0.65 : 1;

  // selection ring (skip while upgrade ring owns it)
  if (node.status !== 'UNDER_UPGRADE') {
    do_.ring.clear();
    if (selected) do_.ring.circle(0, 0, ORGAN_R + 8).stroke({ width: 4, color: 0x37c8e0, alpha: 0.9 });
  }
}

// ---------- camera: pan (background drag) + wheel zoom ----------

function setupCameraInput(
  app: Application,
  host: HTMLElement,
  camRef: React.MutableRefObject<{ x: number; y: number; zoom: number; tx: number; ty: number; tz: number }>,
  organsRef: React.MutableRefObject<Map<string, OrganDO>>
) {
  app.stage.eventMode = 'static';
  app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
  app.renderer.on('resize', () => {
    app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
  });

  let panning = false;
  let last = { x: 0, y: 0 };
  app.stage.on('pointerdown', (e) => {
    // only pan when the press misses an organ (organs stopPropagation on down)
    panning = true;
    last = { x: e.global.x, y: e.global.y };
  });
  app.stage.on('globalpointermove', (e) => {
    if (!panning) return;
    const cam = camRef.current;
    cam.tx += e.global.x - last.x;
    cam.ty += e.global.y - last.y;
    cam.x = cam.tx;
    cam.y = cam.ty;
    last = { x: e.global.x, y: e.global.y };
  });
  const stop = () => (panning = false);
  app.stage.on('pointerup', stop);
  app.stage.on('pointerupoutside', stop);

  host.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const cam = camRef.current;
      cam.tz = Math.max(0.5, Math.min(2.2, cam.tz + (ev.deltaY < 0 ? 0.12 : -0.12)));
    },
    { passive: false }
  );
}
