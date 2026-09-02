/**
 * Procedural placeholder organ art for the Pixi renderer.
 *
 * These are NOT the final assets. They exist so the renderer can be built and
 * reviewed before the generated sprite set (see the Organ Atlas spec) lands.
 * Each organ draws to the art-spec direction on purpose - one heavy dark
 * outline around the whole silhouette, two or three warm colour masses, a
 * single upper-left key light - so the target look is what gets reviewed.
 *
 * When real sprites arrive, this whole file is replaced by a texture-atlas
 * lookup; nothing else in the renderer changes.
 */
import { Assets, Graphics, Texture } from 'pixi.js';
import { OrganType } from '../../types';

export interface OrganPalette {
  base: number;
  shade: number;
  light: number;
  outline: number;
}

// Distinct base colours so a 50% desaturation still separates every organ.
export const ORGAN_PALETTES: Record<OrganType, OrganPalette> = {
  BRAIN_CNS: { base: 0xc98bd8, shade: 0x9a5bb0, light: 0xe6bfef, outline: 0x3a1f47 },
  SPINAL_CORD: { base: 0xe8dcc0, shade: 0xbfa878, light: 0xf6efdd, outline: 0x4a3d22 },
  HEART_CARDIO: { base: 0xe0455a, shade: 0xa11f34, light: 0xf6889a, outline: 0x4a0f1a },
  LUNGS_RESP: { base: 0xf09aa8, shade: 0xc65f74, light: 0xfccdd5, outline: 0x54212c },
  TRACHEA_RESP: { base: 0xaebfc8, shade: 0x7d94a1, light: 0xd6e2e8, outline: 0x2e3d45 },
  STOMACH_DIGEST: { base: 0xf2a07a, shade: 0xc66f47, light: 0xfccab0, outline: 0x582d18 },
  INTESTINE_DIGEST: { base: 0xf0b48c, shade: 0xc9855c, light: 0xfad6bd, outline: 0x5a3220 },
  COLON_DIGEST: { base: 0xb98bb0, shade: 0x8a5c82, light: 0xd8bcd2, outline: 0x412d3d },
  LIVER_METABOLIC: { base: 0x9a4636, shade: 0x6e2c20, light: 0xc07160, outline: 0x381009 },
  PANCREAS_DIGEST: { base: 0xf0b45a, shade: 0xc8882f, light: 0xf9d692, outline: 0x543a10 },
  KIDNEY_EXCRET: { base: 0x9c3b4a, shade: 0x6f2530, light: 0xc16875, outline: 0x360d14 },
  BLADDER_EXCRET: { base: 0xf2d668, shade: 0xc9a838, light: 0xf9e9a4, outline: 0x53470f },
  SKELETON_RIBCAGE: { base: 0xeee3cc, shade: 0xc3b590, light: 0xfaf4e6, outline: 0x453b24 },
  MUSCLE_TISSUE: { base: 0xcf4a4a, shade: 0x9a2a2a, light: 0xe98686, outline: 0x420f0f },
  BONE_MARROW_IMMUNE: { base: 0xead9c4, shade: 0xd08a76, light: 0xf7ede0, outline: 0x453421 },
  THYMUS_IMMUNE: { base: 0xe6c6cc, shade: 0xba9096, light: 0xf5e5e8, outline: 0x413035 },
  SPLEEN_IMMUNE: { base: 0x8b4a86, shade: 0x5f2c5b, light: 0xb072a9, outline: 0x2f142d },
  LYMPH_NODE_IMMUNE: { base: 0xdfe6d0, shade: 0xa8b894, light: 0xf1f5e8, outline: 0x353f2a },
  ADRENAL_ENDOCRINE: { base: 0xe0b04a, shade: 0xb0842a, light: 0xf2d488, outline: 0x4a3810 },
  THYROID_ENDOCRINE: { base: 0xdb6072, shade: 0xac3a4a, light: 0xf090a0, outline: 0x400f18 },
  SKIN_INTEGUMENT: { base: 0xdca678, shade: 0xb07c50, light: 0xf0cca4, outline: 0x4a2f18 },
};

/**
 * Draws a placeholder organ into `g`, centred on (0,0), roughly `r` in radius.
 * Shapes are deliberately distinct silhouettes so the base doesn't read as a
 * field of identical blobs.
 */
export function drawOrgan(g: Graphics, type: OrganType, r: number): void {
  const p = ORGAN_PALETTES[type];
  const outline = { width: Math.max(3, r * 0.09), color: p.outline, alpha: 1, join: 'round' as const };

  switch (type) {
    case 'HEART_CARDIO':
    case 'THYROID_ENDOCRINE': {
      // Two upper lobes tapering to a point - the classic heart silhouette.
      g.moveTo(0, r * 0.9);
      g.bezierCurveTo(-r * 1.15, r * 0.1, -r * 0.75, -r, 0, -r * 0.35);
      g.bezierCurveTo(r * 0.75, -r, r * 1.15, r * 0.1, 0, r * 0.9);
      g.fill(p.base).stroke(outline);
      g.ellipse(-r * 0.38, -r * 0.35, r * 0.32, r * 0.26).fill({ color: p.light, alpha: 0.55 });
      break;
    }
    case 'BRAIN_CNS': {
      g.ellipse(0, 0, r * 0.95, r * 0.82).fill(p.base).stroke(outline);
      // gyri as darker arcs
      for (let i = -2; i <= 2; i++) {
        g.moveTo(-r * 0.7, i * r * 0.28);
        g.bezierCurveTo(-r * 0.2, i * r * 0.28 - r * 0.18, r * 0.2, i * r * 0.28 + r * 0.18, r * 0.7, i * r * 0.28);
        g.stroke({ width: r * 0.06, color: p.shade, alpha: 0.7 });
      }
      g.ellipse(-r * 0.4, -r * 0.35, r * 0.3, r * 0.22).fill({ color: p.light, alpha: 0.5 });
      break;
    }
    case 'LUNGS_RESP': {
      for (const s of [-1, 1]) {
        g.ellipse(s * r * 0.5, r * 0.05, r * 0.48, r * 0.82).fill(p.base).stroke(outline);
      }
      g.roundRect(-r * 0.09, -r * 0.95, r * 0.18, r * 0.7, r * 0.09).fill(p.shade).stroke(outline);
      break;
    }
    case 'KIDNEY_EXCRET': {
      for (const s of [-1, 1]) {
        g.moveTo(s * r * 0.3, -r * 0.75);
        g.bezierCurveTo(s * r * 1.0, -r * 0.65, s * r * 1.0, r * 0.65, s * r * 0.3, r * 0.75);
        g.bezierCurveTo(s * r * 0.55, r * 0.1, s * r * 0.55, -r * 0.1, s * r * 0.3, -r * 0.75);
        g.fill(p.base).stroke(outline);
      }
      break;
    }
    case 'LIVER_METABOLIC': {
      g.moveTo(-r, -r * 0.35);
      g.bezierCurveTo(-r, -r * 0.85, r, -r * 0.85, r, -r * 0.2);
      g.bezierCurveTo(r * 0.9, r * 0.7, -r * 0.4, r * 0.85, -r, r * 0.1);
      g.fill(p.base).stroke(outline);
      g.moveTo(-r * 0.1, -r * 0.55).lineTo(-r * 0.1, r * 0.6).stroke({ width: r * 0.05, color: p.shade, alpha: 0.6 });
      break;
    }
    case 'STOMACH_DIGEST': {
      g.moveTo(-r * 0.2, -r * 0.85);
      g.bezierCurveTo(r * 0.9, -r * 0.9, r * 0.9, r * 0.7, -r * 0.1, r * 0.85);
      g.bezierCurveTo(-r * 0.85, r * 0.6, -r * 0.7, -r * 0.3, -r * 0.2, -r * 0.85);
      g.fill(p.base).stroke(outline);
      g.roundRect(-r * 0.55, -r, r * 0.22, r * 0.4, r * 0.08).fill(p.shade).stroke(outline);
      break;
    }
    case 'INTESTINE_DIGEST':
    case 'COLON_DIGEST': {
      // Coiled/pouched ring.
      g.ellipse(0, 0, r * 0.92, r * 0.82).fill(p.base).stroke(outline);
      g.ellipse(0, 0, r * 0.42, r * 0.34).fill(p.shade).stroke({ width: r * 0.05, color: p.outline, alpha: 0.8 });
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        g.circle(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.58, r * 0.16).fill({ color: p.light, alpha: 0.4 });
      }
      break;
    }
    case 'SKELETON_RIBCAGE': {
      for (let i = 0; i < 4; i++) {
        const yy = -r * 0.6 + i * r * 0.42;
        const w = r * (0.9 - i * 0.06);
        g.moveTo(-w, yy);
        g.bezierCurveTo(-w * 0.4, yy + r * 0.32, w * 0.4, yy + r * 0.32, w, yy);
        g.stroke({ width: r * 0.14, color: p.base, alpha: 1, cap: 'round' });
      }
      g.roundRect(-r * 0.08, -r * 0.8, r * 0.16, r * 1.5, r * 0.08).fill(p.shade).stroke(outline);
      break;
    }
    case 'SKIN_INTEGUMENT': {
      for (let i = 0; i < 3; i++) {
        g.roundRect(-r * 0.9, -r * 0.7 + i * r * 0.5, r * 1.8, r * 0.42, r * 0.12)
          .fill(i === 0 ? p.base : i === 1 ? p.light : p.shade)
          .stroke(outline);
      }
      break;
    }
    case 'BLADDER_EXCRET':
    case 'SPLEEN_IMMUNE':
    case 'ADRENAL_ENDOCRINE':
    case 'PANCREAS_DIGEST': {
      // Rounded organic blob, slightly asymmetric.
      g.moveTo(-r * 0.85, 0);
      g.bezierCurveTo(-r * 0.85, -r * 0.95, r * 0.95, -r * 0.8, r * 0.85, r * 0.05);
      g.bezierCurveTo(r * 0.8, r * 0.9, -r * 0.7, r * 0.9, -r * 0.85, 0);
      g.fill(p.base).stroke(outline);
      g.ellipse(-r * 0.35, -r * 0.4, r * 0.3, r * 0.22).fill({ color: p.light, alpha: 0.5 });
      break;
    }
    case 'TRACHEA_RESP':
    case 'SPINAL_CORD': {
      g.roundRect(-r * 0.32, -r * 0.95, r * 0.64, r * 1.9, r * 0.28).fill(p.base).stroke(outline);
      for (let i = -3; i <= 3; i++) {
        g.moveTo(-r * 0.32, i * r * 0.26).lineTo(r * 0.32, i * r * 0.26).stroke({ width: r * 0.05, color: p.shade, alpha: 0.7 });
      }
      break;
    }
    case 'BONE_MARROW_IMMUNE': {
      g.roundRect(-r * 0.9, -r * 0.42, r * 1.8, r * 0.84, r * 0.4).fill(p.base).stroke(outline);
      g.ellipse(0, 0, r * 0.5, r * 0.3).fill(p.shade);
      g.ellipse(0, 0, r * 0.28, r * 0.16).fill({ color: p.light, alpha: 0.8 });
      break;
    }
    case 'THYMUS_IMMUNE':
    case 'LYMPH_NODE_IMMUNE':
    case 'MUSCLE_TISSUE':
    default: {
      g.ellipse(0, 0, r * 0.9, r * 0.78).fill(p.base).stroke(outline);
      g.ellipse(-r * 0.35, -r * 0.35, r * 0.3, r * 0.22).fill({ color: p.light, alpha: 0.5 });
      break;
    }
  }
}

/**
 * Generated-sprite integration.
 *
 * Final organ art (see the Organ Generation Kit) drops into `public/organs/`
 * as `<organtype-lowercased>.png`. A type is listed in SPRITE_KEYS only once
 * its PNG exists; every other organ keeps the procedural placeholder above,
 * so the set can be swapped in one organ at a time with no code change beyond
 * this list.
 */
export const SPRITE_KEYS = new Set<OrganType>([
  // e.g. 'HEART_CARDIO', 'BRAIN_CNS', 'LUNGS_RESP' — added as art lands.
]);

export const spriteUrl = (type: OrganType): string => `/organs/${type.toLowerCase()}.png`;

/** Loads textures for the organs listed in SPRITE_KEYS. Missing/failed loads are skipped. */
export async function loadOrganTextures(): Promise<Map<OrganType, Texture>> {
  const out = new Map<OrganType, Texture>();
  await Promise.all(
    [...SPRITE_KEYS].map(async (type) => {
      try {
        const tex = await Assets.load(spriteUrl(type));
        if (tex && (tex as Texture).width > 1) out.set(type, tex as Texture);
      } catch {
        /* no art for this organ yet — placeholder stays */
      }
    })
  );
  return out;
}
