import React, { useRef, useEffect, useState, useCallback } from 'react';
import { OrganNode, VesselConnection, VesselType, OrganType } from '../types';
import { ORGAN_DEFINITIONS } from '../data/organData';
import { AnatomicalOrganView } from './AnatomicalOrganView';
import {
  Heart,
  Droplets,
  Sparkles,
  Wrench,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface FloatingPopupText {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

interface OrganismCanvasProps {
  organs: OrganNode[];
  vessels: VesselConnection[];
  selectedOrganId: string | null;
  onSelectOrgan: (id: string) => void;
  onMoveOrgan: (id: string, x: number, y: number) => void;
  onAddVessel: (fromId: string, toId: string, type: VesselType) => void;
  onRemoveVessel: (id: string) => void;
  onOpenBuildMenu: () => void;
  onRepairOrgan: (id: string) => void;
  onUpgradeOrgan: (id: string) => void;
  onInstantUpgrade: (id: string) => void;
  onCollectOrgan: (id: string) => void;
  onUrinate: (id: string) => void;
  onExcrete: (id: string) => void;
  onTapOrgan: (id: string) => void;
  isAdrenalineActive: boolean;
  vesselConnectSource: { organId: string; type: VesselType } | null;
  onCancelVesselConnect: () => void;
}

interface BloodParticle {
  vesselId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  speed: number;
  type: 'RBC' | 'NUTRIENT' | 'UREA' | 'WBC' | 'NERVE';
  size: number;
}

export const OrganismCanvas: React.FC<OrganismCanvasProps> = ({
  organs,
  vessels,
  selectedOrganId,
  onSelectOrgan,
  onMoveOrgan,
  onAddVessel,
  onRemoveVessel,
  onOpenBuildMenu,
  onRepairOrgan,
  onUpgradeOrgan,
  onInstantUpgrade,
  onCollectOrgan,
  onUrinate,
  onExcrete,
  onTapOrgan,
  isAdrenalineActive,
  vesselConnectSource,
  onCancelVesselConnect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas pan & zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging organ state
  const [draggingOrganId, setDraggingOrganId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Floating text animations
  const [floatingTexts, setFloatingTexts] = useState<FloatingPopupText[]>([]);

  // Particles simulation ref
  const particlesRef = useRef<BloodParticle[]>([]);

  // Spawn a floating +X popup
  const spawnFloatingText = (text: string, color: string, x: number, y: number) => {
    const id = `pop_${Date.now()}_${Math.random()}`;
    setFloatingTexts((prev) => [...prev, { id, text, color, x, y }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((p) => p.id !== id));
    }, 1200);
  };

  // Node position helper (center point)
  const getNodeCenter = useCallback(
    (nodeId: string) => {
      const node = organs.find((o) => o.id === nodeId);
      if (!node) return { x: 0, y: 0 };
      return {
        x: node.x + 48,
        y: node.y + 48,
      };
    },
    [organs]
  );

  // Handle canvas background pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'CANVAS') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingOrganId) {
      // Drag organ on SimCity grid with snapping
      const gridSize = 20;
      const rawX = (e.clientX - pan.x) / zoom - dragOffset.x;
      const rawY = (e.clientY - pan.y) / zoom - dragOffset.y;
      const snappedX = Math.round(rawX / gridSize) * gridSize;
      const snappedY = Math.round(rawY / gridSize) * gridSize;
      onMoveOrgan(draggingOrganId, Math.max(20, snappedX), Math.max(20, snappedY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingOrganId(null);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(2.0, Math.max(0.5, prev + zoomDelta)));
  };

  // Touch Support for Mobile & Tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'CANVAS') {
        setIsPanning(true);
        setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isPanning) {
        setPan({
          x: touch.clientX - panStart.x,
          y: touch.clientY - panStart.y,
        });
      } else if (draggingOrganId) {
        const gridSize = 20;
        const rawX = (touch.clientX - pan.x) / zoom - dragOffset.x;
        const rawY = (touch.clientY - pan.y) / zoom - dragOffset.y;
        const snappedX = Math.round(rawX / gridSize) * gridSize;
        const snappedY = Math.round(rawY / gridSize) * gridSize;
        onMoveOrgan(draggingOrganId, Math.max(20, snappedX), Math.max(20, snappedY));
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setDraggingOrganId(null);
  };

  const handleOrganMouseDown = (e: React.MouseEvent, organ: OrganNode) => {
    e.stopPropagation();
    if (vesselConnectSource) {
      // Connect vessel road
      if (vesselConnectSource.organId !== organ.id) {
        onAddVessel(vesselConnectSource.organId, organ.id, vesselConnectSource.type);
      }
      return;
    }

    onSelectOrgan(organ.id);
    setDraggingOrganId(organ.id);
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - organ.x,
      y: (e.clientY - pan.y) / zoom - organ.y,
    });
  };

  const handleOrganTouchStart = (e: React.TouchEvent, organ: OrganNode) => {
    e.stopPropagation();
    if (vesselConnectSource) {
      if (vesselConnectSource.organId !== organ.id) {
        onAddVessel(vesselConnectSource.organId, organ.id, vesselConnectSource.type);
      }
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      onSelectOrgan(organ.id);
      setDraggingOrganId(organ.id);
      setDragOffset({
        x: (touch.clientX - pan.x) / zoom - organ.x,
        y: (touch.clientY - pan.y) / zoom - organ.y,
      });
    }
  };

  // Canvas particle render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const updateParticles = () => {
      if (particlesRef.current.length < vessels.length * 14 && vessels.length > 0) {
        const randomVessel = vessels[Math.floor(Math.random() * vessels.length)];
        const from = getNodeCenter(randomVessel.fromNodeId);
        const to = getNodeCenter(randomVessel.toNodeId);

        if (from.x !== 0 && to.x !== 0) {
          let pType: 'RBC' | 'NUTRIENT' | 'UREA' | 'WBC' | 'NERVE' = 'RBC';
          if (randomVessel.type === 'LYMPHATIC') {
            pType = 'WBC';
          } else if (randomVessel.type === 'NERVE') {
            pType = 'NERVE';
          } else if (Math.random() < 0.25) {
            pType = 'NUTRIENT';
          } else if (Math.random() < 0.2) {
            pType = 'UREA';
          }

          particlesRef.current.push({
            vesselId: randomVessel.id,
            fromX: from.x,
            fromY: from.y,
            toX: to.x,
            toY: to.y,
            progress: 0,
            speed: (0.007 + Math.random() * 0.008) * (isAdrenalineActive ? 2.5 : 1),
            type: pType,
            size: pType === 'WBC' ? 4 : pType === 'NUTRIENT' ? 3 : 2.5,
          });
        }
      }

      particlesRef.current.forEach((p) => {
        p.progress += p.speed;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.progress <= 1);
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 1. Draw Clean Base Grid (Sophisticated light canvas blueprint)
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
      ctx.lineWidth = 1.2;
      const gridSize = 60;
      const startX = -pan.x / zoom - 200;
      const startY = -pan.y / zoom - 200;
      const endX = (canvas.width - pan.x) / zoom + 200;
      const endY = (canvas.height - pan.y) / zoom + 200;

      ctx.beginPath();
      for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      // 2. Draw Vessels (Roads)
      vessels.forEach((vessel) => {
        const from = getNodeCenter(vessel.fromNodeId);
        const to = getNodeCenter(vessel.toNodeId);

        if (from.x === 0 || to.x === 0) return;

        const midX = (from.x + to.x) / 2 + (from.y - to.y) * 0.12;
        const midY = (from.y + to.y) / 2 + (to.x - from.x) * 0.12;

        // Outer vessel stroke
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(midX, midY, to.x, to.y);

        if (vessel.type === 'ARTERY') {
          ctx.strokeStyle = isAdrenalineActive ? 'rgba(239, 68, 68, 0.95)' : 'rgba(225, 29, 72, 0.85)';
          ctx.lineWidth = 7;
        } else if (vessel.type === 'VEIN') {
          ctx.strokeStyle = 'rgba(2, 132, 199, 0.85)';
          ctx.lineWidth = 6.5;
        } else if (vessel.type === 'NERVE') {
          ctx.strokeStyle = 'rgba(147, 51, 234, 0.85)';
          ctx.lineWidth = 5.5;
        } else {
          // LYMPHATIC
          ctx.strokeStyle = 'rgba(13, 148, 136, 0.85)';
          ctx.lineWidth = 6;
        }
        ctx.stroke();

        // Inner core
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(midX, midY, to.x, to.y);
        ctx.strokeStyle =
          vessel.type === 'ARTERY'
            ? 'rgba(254, 226, 226, 0.95)'
            : vessel.type === 'VEIN'
            ? 'rgba(224, 242, 254, 0.95)'
            : vessel.type === 'NERVE'
            ? 'rgba(243, 232, 255, 0.95)'
            : 'rgba(204, 251, 241, 0.95)';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // 3. Draw Flowing Particles
      updateParticles();
      particlesRef.current.forEach((p) => {
        const vessel = vessels.find((v) => v.id === p.vesselId);
        if (!vessel) return;

        const from = getNodeCenter(vessel.fromNodeId);
        const to = getNodeCenter(vessel.toNodeId);
        const midX = (from.x + to.x) / 2 + (from.y - to.y) * 0.12;
        const midY = (from.y + to.y) / 2 + (to.x - from.x) * 0.12;

        const t = p.progress;
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * to.y;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);

        if (p.type === 'RBC') {
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 6;
        } else if (p.type === 'NUTRIENT') {
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
        } else if (p.type === 'UREA') {
          ctx.fillStyle = '#a855f7';
          ctx.shadowColor = '#9333ea';
          ctx.shadowBlur = 6;
        } else if (p.type === 'NERVE') {
          ctx.fillStyle = '#c084fc';
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. Connecting Target Indicator
      if (vesselConnectSource) {
        const srcCenter = getNodeCenter(vesselConnectSource.organId);
        ctx.beginPath();
        ctx.arc(srcCenter.x, srcCenter.y, 48, 0, Math.PI * 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [vessels, organs, pan, zoom, isAdrenalineActive, vesselConnectSource, getNodeCenter]);

  return (
    <div
      id="organism-canvas-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative flex-1 w-full h-full bg-slate-50 overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      {/* Background Microvascular Flow Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-auto" />

      {/* Floating Canvas Zoom & Reset Controls (Positioned cleanly on top-right below HUD) */}
      <div className="absolute top-20 right-3.5 sm:top-20 sm:right-4 z-20 flex flex-col items-center space-y-1 bg-white/95 border border-slate-200 p-1 rounded-2xl shadow-md backdrop-blur-xs">
        <button
          onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
          className="w-7 h-7 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold cursor-pointer transition"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
          className="w-7 h-7 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold cursor-pointer transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="w-7 h-7 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer transition"
          title="Reset View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Vessel Route Guidance Banner if connecting */}
      {vesselConnectSource && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900 border border-slate-700 text-white px-4 py-1.5 rounded-full shadow-lg text-xs font-mono flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <span>Tap target organ to connect {vesselConnectSource.type} vessel</span>
          <button
            onClick={onCancelVesselConnect}
            className="ml-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[10px] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Organ Node Cards Container */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {organs.map((organ) => {
          const isSelected = selectedOrganId === organ.id;
          const def = ORGAN_DEFINITIONS[organ.type];
          const hpPct = Math.round((organ.hp / organ.maxHp) * 100);
          const isDestroyed = organ.status === 'DAMAGED_DESTROYED';
          const isNecrotic = organ.status === 'TOXIC_NECROSIS';
          const isUpgrading = organ.status === 'UNDER_UPGRADE';

          const secondsRemaining =
            isUpgrading && organ.upgradeEndTime
              ? Math.max(0, Math.ceil((organ.upgradeEndTime - Date.now()) / 1000))
              : 0;

          // Check uncollected resources for collector tags
          const nut = Math.floor(organ.uncollectedNutrients || 0);
          const ox = Math.floor(organ.uncollectedOxygen || 0);
          const wat = Math.floor(organ.uncollectedWater || 0);
          const hor = Math.floor(organ.uncollectedHormones || 0);
          const urine = Math.floor(organ.uncollectedUrine || 0);
          const excretion = Math.floor(organ.uncollectedExcretion || 0);

          const hasHarvestableResources = nut >= 8 || ox >= 8 || wat >= 8 || hor >= 1;
          const hasUrineToFlush = urine >= 12;
          const hasExcretionToFlush = excretion >= 12;

          return (
            <div
              key={organ.id}
              id={`organ-node-${organ.id}`}
              onMouseDown={(e) => handleOrganMouseDown(e, organ)}
              onTouchStart={(e) => handleOrganTouchStart(e, organ)}
              style={{
                left: `${organ.x}px`,
                top: `${organ.y}px`,
                width: '96px',
                height: '96px',
              }}
              className={`absolute pointer-events-auto cursor-pointer group flex flex-col items-center justify-center transition-transform ${
                isSelected ? 'scale-105 z-20' : 'hover:scale-102 z-10'
              }`}
            >
              {/* --- 1. Floating Resource Collector Tag --- */}
              {hasHarvestableResources && !isDestroyed && !isUpgrading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCollectOrgan(organ.id);
                    if (nut > 0) spawnFloatingText(`+${nut} Nutrients`, '#059669', organ.x + 20, organ.y - 10);
                    if (ox > 0) spawnFloatingText(`+${ox} Oxygen`, '#0284c7', organ.x + 40, organ.y - 10);
                    if (wat > 0) spawnFloatingText(`+${wat} Water`, '#2563eb', organ.x + 30, organ.y - 10);
                    if (hor > 0) spawnFloatingText(`+${hor} Gem`, '#7c3aed', organ.x + 45, organ.y - 10);
                  }}
                  className="absolute -top-7 z-30 cursor-pointer flex items-center bg-amber-400 hover:bg-amber-300 border border-amber-500/30 rounded-lg px-2 py-0.5 shadow-md transition-all text-amber-950 font-game text-[10px]"
                  title="Click to Harvest"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-amber-950" />
                  <span>
                    {nut > 0 ? `+${nut}` : ox > 0 ? `+${ox}` : wat > 0 ? `+${wat}` : `+${hor} 💎`}
                  </span>
                </button>
              )}

              {/* --- 2. Urination Waste Tag (Kidneys / Bladder) --- */}
              {hasUrineToFlush && !isDestroyed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUrinate(organ.id);
                    spawnFloatingText('Waste Cleared! (-Waste)', '#0284c7', organ.x + 10, organ.y - 15);
                  }}
                  className="absolute -top-8 z-30 cursor-pointer flex items-center bg-blue-600 hover:bg-blue-500 border border-blue-400 rounded-lg px-2.5 py-0.5 shadow-md text-white font-game text-[10px]"
                  title="Urinate and Flush Toxic Blood Urea Waste"
                >
                  <Droplets className="w-3 h-3 mr-1" />
                  <span>Urinate</span>
                </button>
              )}

              {/* --- 3. Solid Excretion Tag (Colon / Large Intestine) --- */}
              {hasExcretionToFlush && !isDestroyed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExcrete(organ.id);
                    spawnFloatingText('Flushed Waste (+50 🍏)', '#d97706', organ.x + 10, organ.y - 15);
                  }}
                  className="absolute -top-8 z-30 cursor-pointer flex items-center bg-amber-600 hover:bg-amber-500 border border-amber-400 rounded-lg px-2.5 py-0.5 shadow-md text-white font-game text-[10px]"
                  title="Excrete Solid Waste"
                >
                  <span>Excrete</span>
                </button>
              )}

              {/* --- 4. Anatomical Organ Rendering (Exact Organ Shape with Organic Outline) --- */}
              <div
                onClick={() => {
                  onTapOrgan(organ.id);
                  if (organ.type === 'BRAIN_CNS') spawnFloatingText('+3 🧠', '#7c3aed', organ.x + 35, organ.y + 20);
                  else if (organ.type === 'STOMACH_DIGEST') spawnFloatingText('+4 🍏', '#059669', organ.x + 35, organ.y + 20);
                  else if (organ.type === 'LUNGS_RESP') spawnFloatingText('+4 💨', '#0284c7', organ.x + 35, organ.y + 20);
                  else if (organ.type === 'HEART_CARDIO') spawnFloatingText('❤️ PUMP', '#e11d48', organ.x + 35, organ.y + 20);
                }}
                className="relative flex flex-col items-center justify-center cursor-pointer select-none"
              >
                {/* Level Tag Floating Top Left */}
                <div className="absolute -top-1 -left-1 z-20 px-1.5 py-0.5 rounded-full bg-slate-900/90 text-white font-mono text-[9px] font-bold shadow-md border border-slate-700">
                  Lvl {organ.level}
                </div>

                {/* The Exact Anatomical Organ Graphic */}
                <div className="relative p-1">
                  <AnatomicalOrganView
                    type={organ.type}
                    level={organ.level}
                    isDestroyed={isDestroyed}
                    isNecrotic={isNecrotic}
                    isUpgrading={isUpgrading}
                    isSelected={isSelected}
                    size={88}
                  />
                </div>

                {/* Sleek Floating Organ Name Pill */}
                <div className="mt-0.5 px-2 py-0.5 rounded-full bg-white/90 border border-slate-200/80 shadow-xs backdrop-blur-xs flex items-center justify-center max-w-[92px]">
                  <span className="font-game text-[10px] text-slate-800 tracking-tight truncate">
                    {organ.name.split(' (')[0]}
                  </span>
                </div>

                {/* Mitosis Upgrade Timer */}
                {isUpgrading && (
                  <div className="absolute -bottom-2 z-20 bg-purple-600 border border-purple-400 text-white font-mono text-[9px] px-2 py-0.2 rounded-full shadow flex items-center space-x-1 animate-pulse">
                    <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                    <span>{secondsRemaining}s</span>
                  </div>
                )}

                {/* Repair Status */}
                {(isDestroyed || isNecrotic) && (
                  <div className="absolute -bottom-2 z-20 bg-rose-600 border border-rose-400 text-white font-game text-[9px] px-2 py-0.2 rounded-full shadow flex items-center space-x-1">
                    <Wrench className="w-2.5 h-2.5" />
                    <span>REPAIR</span>
                  </div>
                )}
              </div>

              {/* Health Indicator if damaged or selected */}
              {(hpPct < 100 || isSelected) && (
                <div className="w-16 h-1.5 rounded-full bg-slate-200 border border-slate-300 p-0.2 mt-0.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      hpPct < 30 ? 'bg-rose-500' : hpPct < 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(4, hpPct)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Floating Number Popups */}
        {floatingTexts.map((f) => (
          <div
            key={f.id}
            className="absolute z-50 pointer-events-none font-game text-sm font-extrabold animate-bounce drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
            style={{
              left: `${f.x}px`,
              top: `${f.y}px`,
              color: f.color,
            }}
          >
            {f.text}
          </div>
        ))}
      </div>
    </div>
  );
};
