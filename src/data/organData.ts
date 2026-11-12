import { OrganDefinition, OrganType, ImmuneTroop, ImmuneCellType, QuizQuestion, BodySystemKey } from '../types';
import { COC_BUILDER_GEM_COSTS } from './cocTables';

export const ALL_BODY_SYSTEMS: { key: BodySystemKey; name: string; emoji: string; description: string; organTypes: OrganType[] }[] = [
  {
    key: 'NERVOUS',
    name: 'Nervous System',
    emoji: '🧠',
    description: 'Brain & Spinal Cord: the brain controls the body; the spinal cord carries its messages to every organ.',
    organTypes: ['BRAIN_CNS', 'SPINAL_CORD'],
  },
  {
    key: 'CIRCULATORY',
    name: 'Circulatory System',
    emoji: '❤️',
    description: 'Heart & Blood Vessels: arteries carry blood out from the heart, veins bring it back.',
    organTypes: ['HEART_CARDIO'],
  },
  {
    key: 'RESPIRATORY',
    name: 'Respiratory System',
    emoji: '🫁',
    description: 'Nose, Windpipe, Lungs & Diaphragm: air comes in through the nose and windpipe; the diaphragm pulls it into the lungs.',
    organTypes: ['NOSE_RESP', 'TRACHEA_RESP', 'LUNGS_RESP', 'DIAPHRAGM_RESP'],
  },
  {
    key: 'DIGESTIVE',
    name: 'Digestive System',
    emoji: '🍎',
    description: 'Mouth to Rectum: food is broken down, absorbed in the small intestine, and what is left leaves through the rectum.',
    organTypes: [
      'MOUTH_DIGEST', 'OESOPHAGUS_DIGEST', 'STOMACH_DIGEST', 'LIVER_METABOLIC', 'GALLBLADDER_DIGEST',
      'PANCREAS_DIGEST', 'INTESTINE_DIGEST', 'COLON_DIGEST', 'RECTUM_DIGEST',
    ],
  },
  {
    key: 'EXCRETORY',
    name: 'Excretory System',
    emoji: '🚽',
    description: 'Kidneys, Ureters, Bladder & Urethra: kidneys filter waste out of the blood into urine, which is stored in the bladder.',
    organTypes: ['KIDNEY_EXCRET', 'URETER_EXCRET', 'BLADDER_EXCRET', 'URETHRA_EXCRET'],
  },
  {
    key: 'SKELETAL',
    name: 'Skeletal System',
    emoji: '🦴',
    description: 'Skull, Ribcage & Backbone: the skeleton protects the brain, heart, lungs and spinal cord.',
    organTypes: ['SKULL_BONE', 'SKELETON_RIBCAGE', 'BACKBONE_BONE'],
  },
  {
    key: 'MUSCULAR',
    name: 'Muscular System',
    emoji: '💪',
    description: 'Muscles: move the body and store glycogen as an energy reserve.',
    organTypes: ['MUSCLE_TISSUE'],
  },
  {
    key: 'IMMUNE',
    name: 'Immune System',
    emoji: '🛡️',
    description: 'Bone Marrow, Thymus & Spleen: make and train the white blood cells that fight germs.',
    organTypes: ['BONE_MARROW_IMMUNE', 'THYMUS_IMMUNE', 'SPLEEN_IMMUNE'],
  },
  {
    key: 'LYMPHATIC',
    name: 'Lymphatic System',
    emoji: '🟢',
    description: 'Lymph Nodes: trap germs in the fluid that drains from the tissues.',
    organTypes: ['LYMPH_NODE_IMMUNE'],
  },
  {
    key: 'ENDOCRINE',
    name: 'Endocrine System',
    emoji: '⚡',
    description: 'Pituitary, Thyroid & Adrenals: glands that release hormones into the blood.',
    organTypes: ['PITUITARY_ENDOCRINE', 'THYROID_ENDOCRINE', 'ADRENAL_ENDOCRINE'],
  },
  {
    key: 'INTEGUMENTARY',
    name: 'Integumentary System',
    emoji: '🧱',
    description: 'Skin: the outer barrier that keeps germs out and water in.',
    organTypes: ['SKIN_INTEGUMENT'],
  },
];

// ---------------------------------------------------------------------------
// ECONOMIC ROLES — what each organ does in the game. An organ can have more
// than one job (the large intestine makes nutrients AND clears waste).
//
//   FOOD_MAKER     makes nutrients (a CoC Gold Mine + Elixir Collector)
//   FOOD_HELPER    adds to one maker's output (the food pipe feeds the stomach)
//   FOOD_STORE     holds nutrients (CoC Gold Storage)
//   BREATHING      adds oxygen SUPPLY; oxygen is a budget, never spent
//   WASTE_CLEARER  moves waste out of the blood into the bladder
//   WASTE_HELPER   adds to the kidneys' clearing (ureters, urethra)
//   WASTE_STORE    holds waste until it is flushed
//   PACE           body-wide multiplier: lagging behind the Brain slows everything
//   WALL / GEM_GLAND / BOOST_GLAND / DEFENCE   see each organ
//
// `table` names the cost/time table an organ follows (bodyEconomy.ts):
//   TOWN_HALL, COLLECTOR, DEFENSE are CoC's own tables, verbatim;
//   BREATHING, FOOD_STORE, WASTE_SYSTEM are derived from CoC's per-Town-Hall
//   totals and split across the real organ count.
//
// `oxygenWeight` is the organ's share of the body's resting oxygen use (ours,
// from physiology: brain, liver and skeletal muscle each use about a fifth of
// resting oxygen, the heart about a tenth, the kidneys about 7%).
// ---------------------------------------------------------------------------

export type OrganRole =
  | 'COMMAND'
  | 'FOOD_MAKER'
  | 'FOOD_HELPER'
  | 'FOOD_STORE'
  | 'BREATHING'
  | 'WASTE_CLEARER'
  | 'WASTE_HELPER'
  | 'WASTE_STORE'
  | 'PACE'
  | 'WALL'
  | 'GEM_GLAND'
  | 'BOOST_GLAND'
  | 'DEFENCE';

export type EconomyTable = 'TOWN_HALL' | 'COLLECTOR' | 'DEFENSE' | 'BREATHING' | 'FOOD_STORE' | 'WASTE_SYSTEM';

export interface OrganEconomy {
  role: OrganRole;
  table: EconomyTable;
  /** For helpers: the organ whose output (or clearing) this one adds to. */
  helps?: OrganType;
  /** Also clears waste (the large intestine, into the rectum). */
  clearsWaste?: boolean;
  /** Relative resting oxygen use. */
  oxygenWeight: number;
  /** Jobs as shown to the player. */
  jobs: string;
}

export const ORGAN_ECONOMY: Record<OrganType, OrganEconomy> = {
  BRAIN_CNS: { role: 'COMMAND', table: 'TOWN_HALL', oxygenWeight: 12, jobs: 'Command · stores nutrients' },
  SPINAL_CORD: { role: 'PACE', table: 'DEFENSE', oxygenWeight: 2, jobs: 'Coordinates the body (keep it level with the Brain)' },
  HEART_CARDIO: { role: 'PACE', table: 'DEFENSE', oxygenWeight: 6, jobs: 'Pumps blood (keep it level with the Brain)' },

  NOSE_RESP: { role: 'BREATHING', table: 'BREATHING', oxygenWeight: 0, jobs: 'Oxygen supply' },
  TRACHEA_RESP: { role: 'BREATHING', table: 'BREATHING', oxygenWeight: 0, jobs: 'Oxygen supply' },
  LUNGS_RESP: { role: 'BREATHING', table: 'BREATHING', oxygenWeight: 0, jobs: 'Oxygen supply' },
  DIAPHRAGM_RESP: { role: 'BREATHING', table: 'BREATHING', oxygenWeight: 0, jobs: 'Oxygen supply' },

  MOUTH_DIGEST: { role: 'FOOD_HELPER', table: 'COLLECTOR', helps: 'STOMACH_DIGEST', oxygenWeight: 2, jobs: 'Helps the stomach' },
  OESOPHAGUS_DIGEST: { role: 'FOOD_HELPER', table: 'COLLECTOR', helps: 'STOMACH_DIGEST', oxygenWeight: 1, jobs: 'Helps the stomach' },
  STOMACH_DIGEST: { role: 'FOOD_MAKER', table: 'COLLECTOR', oxygenWeight: 4, jobs: 'Makes nutrients' },
  INTESTINE_DIGEST: { role: 'FOOD_MAKER', table: 'COLLECTOR', oxygenWeight: 4, jobs: 'Makes nutrients' },
  COLON_DIGEST: { role: 'FOOD_MAKER', table: 'COLLECTOR', clearsWaste: true, oxygenWeight: 2, jobs: 'Makes nutrients · clears waste' },
  PANCREAS_DIGEST: { role: 'FOOD_HELPER', table: 'COLLECTOR', helps: 'INTESTINE_DIGEST', oxygenWeight: 2, jobs: 'Helps the small intestine' },
  GALLBLADDER_DIGEST: { role: 'FOOD_HELPER', table: 'COLLECTOR', helps: 'INTESTINE_DIGEST', oxygenWeight: 1, jobs: 'Helps the small intestine' },
  LIVER_METABOLIC: { role: 'FOOD_STORE', table: 'FOOD_STORE', oxygenWeight: 12, jobs: 'Stores nutrients · makes waste less harmful' },
  MUSCLE_TISSUE: { role: 'FOOD_STORE', table: 'FOOD_STORE', oxygenWeight: 12, jobs: 'Stores nutrients' },

  KIDNEY_EXCRET: { role: 'WASTE_CLEARER', table: 'WASTE_SYSTEM', oxygenWeight: 2, jobs: 'Clears waste from the blood' },
  URETER_EXCRET: { role: 'WASTE_HELPER', table: 'WASTE_SYSTEM', helps: 'KIDNEY_EXCRET', oxygenWeight: 1, jobs: 'Helps the kidneys' },
  URETHRA_EXCRET: { role: 'WASTE_HELPER', table: 'WASTE_SYSTEM', helps: 'KIDNEY_EXCRET', oxygenWeight: 1, jobs: 'Helps the kidneys' },
  BLADDER_EXCRET: { role: 'WASTE_STORE', table: 'WASTE_SYSTEM', oxygenWeight: 1, jobs: 'Holds urine until flushed' },
  RECTUM_DIGEST: { role: 'WASTE_STORE', table: 'WASTE_SYSTEM', oxygenWeight: 1, jobs: 'Holds solid waste until flushed' },

  SKULL_BONE: { role: 'WALL', table: 'DEFENSE', oxygenWeight: 1, jobs: 'Wall (guards the brain)' },
  SKELETON_RIBCAGE: { role: 'WALL', table: 'DEFENSE', oxygenWeight: 1, jobs: 'Wall (guards the heart and lungs)' },
  BACKBONE_BONE: { role: 'WALL', table: 'DEFENSE', oxygenWeight: 1, jobs: 'Wall (guards the spinal cord)' },
  SKIN_INTEGUMENT: { role: 'WALL', table: 'DEFENSE', oxygenWeight: 2, jobs: 'Wall (the outer barrier)' },

  PITUITARY_ENDOCRINE: { role: 'GEM_GLAND', table: 'DEFENSE', oxygenWeight: 1, jobs: 'Makes hormones (gems), slowly' },
  THYROID_ENDOCRINE: { role: 'BOOST_GLAND', table: 'DEFENSE', oxygenWeight: 1, jobs: 'Unlocks the production boost' },
  ADRENAL_ENDOCRINE: { role: 'DEFENCE', table: 'DEFENSE', oxygenWeight: 1, jobs: 'Defence (combat is not built yet)' },
  THYMUS_IMMUNE: { role: 'DEFENCE', table: 'DEFENSE', oxygenWeight: 1, jobs: 'Defence (combat is not built yet)' },
  SPLEEN_IMMUNE: { role: 'DEFENCE', table: 'DEFENSE', oxygenWeight: 2, jobs: 'Defence (combat is not built yet)' },
  LYMPH_NODE_IMMUNE: { role: 'DEFENCE', table: 'DEFENSE', oxygenWeight: 1, jobs: 'Defence (combat is not built yet)' },
  BONE_MARROW_IMMUNE: { role: 'DEFENCE', table: 'DEFENSE', oxygenWeight: 2, jobs: 'Defence (combat is not built yet)' },
};

/** Mitotic builders: concurrent upgrade slots. Extra slots are the primary gem sink.
 *  CoC charges 250/500/1000/2000 for the 2nd–5th builder; we grant 2 free, so the
 *  purchasable ones are the 3rd, 4th and 5th. */
export const BASE_BUILDER_COUNT = 2;
export const MAX_BUILDER_COUNT = 5;
export const BUILDER_GEM_COSTS = COC_BUILDER_GEM_COSTS.slice(1); // 500, 1000, 2000

/** Minimum gap between taps on one organ, in ms. Without this, tapping is free money. */
export const TAP_COOLDOWN_MS = 900;

/** Telemetry ring-buffer bound. The log is serialised to storage on every change. */
export const MAX_TELEMETRY_LOGS = 60;

/** Real counts only: two lungs, kidneys, ureters and adrenal glands; one of everything else. */
export const ORGAN_DEFINITIONS: Record<OrganType, OrganDefinition> = {
  // NERVOUS
  BRAIN_CNS: {
    type: 'BRAIN_CNS', name: 'Brain', shortName: 'Brain', category: 'COMMAND', systemName: 'Nervous System',
    baseHp: 1500, unlockedAtBrainLevel: 1, maxPerBase: 1,
    description: 'The control centre of the body — your Town Hall. Upgrading it unlocks new organs and higher levels.',
    biologicalFunction: 'Controls and coordinates every other organ. Uses about a fifth of the body’s oxygen at rest.',
  },
  SPINAL_CORD: {
    type: 'SPINAL_CORD', name: 'Spinal Cord', shortName: 'Spinal Cord', category: 'COMMAND', systemName: 'Nervous System',
    baseHp: 1100, unlockedAtBrainLevel: 3, maxPerBase: 1,
    description: 'Carries messages between the brain and the rest of the body. If it falls behind the Brain, every organ works more slowly.',
    biologicalFunction: 'A bundle of nerves inside the backbone that relays signals to and from the brain, and controls reflexes.',
  },
  // CIRCULATORY
  HEART_CARDIO: {
    type: 'HEART_CARDIO', name: 'Heart', shortName: 'Heart', category: 'CARDIO', systemName: 'Circulatory System',
    baseHp: 1200, unlockedAtBrainLevel: 1, maxPerBase: 1,
    description: 'Pumps blood through the arteries. Connect organs to it; keep it level with the Brain or the whole body slows.',
    biologicalFunction: 'A muscular pump with four chambers that sends blood to the lungs and to the rest of the body.',
  },
  // RESPIRATORY
  NOSE_RESP: {
    type: 'NOSE_RESP', name: 'Nose (Nasal Cavity)', shortName: 'Nose', category: 'BREATHING', systemName: 'Respiratory System',
    baseHp: 600, unlockedAtBrainLevel: 2, maxPerBase: 1,
    description: 'Adds oxygen supply. Every organ uses oxygen; upgrade breathing to make room for more organs and levels.',
    biologicalFunction: 'Air enters through the nostrils; hairs and mucus filter it, and it is warmed and moistened.',
  },
  TRACHEA_RESP: {
    type: 'TRACHEA_RESP', name: 'Windpipe (Trachea)', shortName: 'Windpipe', category: 'BREATHING', systemName: 'Respiratory System',
    baseHp: 600, unlockedAtBrainLevel: 3, maxPerBase: 1,
    description: 'Adds oxygen supply. Includes the voice box (larynx) and the bronchi that branch into the lungs.',
    biologicalFunction: 'A tube held open by rings of cartilage that carries air from the throat to the lungs.',
  },
  LUNGS_RESP: {
    type: 'LUNGS_RESP', name: 'Lung', shortName: 'Lung', category: 'BREATHING', systemName: 'Respiratory System',
    baseHp: 900, unlockedAtBrainLevel: 1, maxPerBase: 2,
    description: 'Adds oxygen supply. You have two. Build them first: every other organ needs oxygen room.',
    biologicalFunction: 'In the alveoli, oxygen passes into the blood and carbon dioxide passes out to be breathed away.',
  },
  DIAPHRAGM_RESP: {
    type: 'DIAPHRAGM_RESP', name: 'Diaphragm', shortName: 'Diaphragm', category: 'BREATHING', systemName: 'Respiratory System',
    baseHp: 900, unlockedAtBrainLevel: 4, maxPerBase: 1,
    description: 'Adds oxygen supply.',
    biologicalFunction: 'A dome-shaped muscle under the lungs. When it flattens, the chest grows and air is drawn in.',
  },
  // DIGESTIVE
  MOUTH_DIGEST: {
    type: 'MOUTH_DIGEST', name: 'Mouth (Teeth, Tongue, Salivary Glands)', shortName: 'Mouth', category: 'DIGESTIVE', systemName: 'Digestive System',
    baseHp: 700, unlockedAtBrainLevel: 3, maxPerBase: 1,
    description: 'Helps the stomach: everything it adds appears in the stomach’s output.',
    biologicalFunction: 'Teeth chew food, the tongue mixes it, and saliva starts digesting starch.',
  },
  OESOPHAGUS_DIGEST: {
    type: 'OESOPHAGUS_DIGEST', name: 'Food Pipe (Oesophagus)', shortName: 'Food Pipe', category: 'DIGESTIVE', systemName: 'Digestive System',
    baseHp: 650, unlockedAtBrainLevel: 5, maxPerBase: 1,
    description: 'Helps the stomach: everything it adds appears in the stomach’s output.',
    biologicalFunction: 'A muscular tube that pushes swallowed food down to the stomach by waves of contraction (peristalsis).',
  },
  STOMACH_DIGEST: {
    type: 'STOMACH_DIGEST', name: 'Stomach', shortName: 'Stomach', category: 'DIGESTIVE', systemName: 'Digestive System',
    baseHp: 800, unlockedAtBrainLevel: 1, maxPerBase: 1,
    description: 'Makes nutrients. The mouth and food pipe add to its output once built.',
    biologicalFunction: 'Churns food with acid and enzymes that begin digesting proteins.',
  },
  INTESTINE_DIGEST: {
    type: 'INTESTINE_DIGEST', name: 'Small Intestine', shortName: 'Small Intestine', category: 'DIGESTIVE', systemName: 'Digestive System',
    baseHp: 750, unlockedAtBrainLevel: 2, maxPerBase: 1,
    description: 'Makes nutrients. The pancreas and gall bladder add to its output once built.',
    biologicalFunction: 'Finishes digestion and absorbs nutrients into the blood through millions of villi.',
  },
  COLON_DIGEST: {
    type: 'COLON_DIGEST', name: 'Large Intestine', shortName: 'Large Intestine', category: 'DIGESTIVE', systemName: 'Digestive System',
    baseHp: 700, unlockedAtBrainLevel: 4, maxPerBase: 1,
    description: 'Makes nutrients and clears waste into the rectum.',
    biologicalFunction: 'Absorbs water and salts from what is left of the food and forms faeces.',
  },
  RECTUM_DIGEST: {
    type: 'RECTUM_DIGEST', name: 'Rectum', shortName: 'Rectum', category: 'EXCRETORY', systemName: 'Digestive System',
    baseHp: 600, unlockedAtBrainLevel: 4, maxPerBase: 1,
    description: 'Holds solid waste until you flush it.',
    biologicalFunction: 'The last part of the large intestine; it stores faeces until they leave through the anus.',
  },
  LIVER_METABOLIC: {
    type: 'LIVER_METABOLIC', name: 'Liver', shortName: 'Liver', category: 'DIGESTIVE', systemName: 'Digestive System',
    baseHp: 1100, unlockedAtBrainLevel: 1, maxPerBase: 1,
    description: 'Stores nutrients, and makes waste less harmful so less of it builds up.',
    biologicalFunction: 'The largest gland. Stores glycogen, makes bile, and turns toxic ammonia into urea.',
  },
  GALLBLADDER_DIGEST: {
    type: 'GALLBLADDER_DIGEST', name: 'Gall Bladder', shortName: 'Gall Bladder', category: 'DIGESTIVE', systemName: 'Digestive System',
    baseHp: 550, unlockedAtBrainLevel: 9, maxPerBase: 1,
    description: 'Helps the small intestine: everything it adds appears in the small intestine’s output.',
    biologicalFunction: 'Stores bile made by the liver and releases it into the small intestine to break up fats.',
  },
  PANCREAS_DIGEST: {
    type: 'PANCREAS_DIGEST', name: 'Pancreas', shortName: 'Pancreas', category: 'DIGESTIVE', systemName: 'Digestive System',
    baseHp: 650, unlockedAtBrainLevel: 6, maxPerBase: 1,
    description: 'Helps the small intestine: everything it adds appears in the small intestine’s output.',
    biologicalFunction: 'Releases digestive juice into the small intestine, and insulin into the blood.',
  },
  // EXCRETORY
  KIDNEY_EXCRET: {
    type: 'KIDNEY_EXCRET', name: 'Kidney', shortName: 'Kidney', category: 'EXCRETORY', systemName: 'Excretory System',
    baseHp: 850, unlockedAtBrainLevel: 1, maxPerBase: 2,
    description: 'Clears waste out of the blood into the bladder. You have two. Needs a vein to work fully.',
    biologicalFunction: 'About a million nephrons filter the blood and remove urea and extra water as urine.',
  },
  URETER_EXCRET: {
    type: 'URETER_EXCRET', name: 'Ureter', shortName: 'Ureter', category: 'EXCRETORY', systemName: 'Excretory System',
    baseHp: 450, unlockedAtBrainLevel: 2, maxPerBase: 2,
    description: 'Helps the kidneys clear waste. You have two, one from each kidney.',
    biologicalFunction: 'A narrow tube that carries urine from a kidney down to the bladder.',
  },
  BLADDER_EXCRET: {
    type: 'BLADDER_EXCRET', name: 'Urinary Bladder', shortName: 'Bladder', category: 'EXCRETORY', systemName: 'Excretory System',
    baseHp: 600, unlockedAtBrainLevel: 1, maxPerBase: 1,
    description: 'Holds the waste the kidneys clear. When it is full, the kidneys stop — flush it.',
    biologicalFunction: 'A stretchy muscular bag that stores urine until it is released.',
  },
  URETHRA_EXCRET: {
    type: 'URETHRA_EXCRET', name: 'Urethra', shortName: 'Urethra', category: 'EXCRETORY', systemName: 'Excretory System',
    baseHp: 450, unlockedAtBrainLevel: 3, maxPerBase: 1,
    description: 'Helps the kidneys clear waste.',
    biologicalFunction: 'The tube that carries urine out of the body from the bladder.',
  },
  // SKELETAL & MUSCULAR
  SKULL_BONE: {
    type: 'SKULL_BONE', name: 'Skull', shortName: 'Skull', category: 'SUPPORT', systemName: 'Skeletal System',
    baseHp: 2200, unlockedAtBrainLevel: 2, maxPerBase: 1,
    description: 'A wall that guards the brain. (Walls matter once combat arrives.)',
    biologicalFunction: 'Bones of the head joined by fixed joints that enclose and protect the brain.',
  },
  SKELETON_RIBCAGE: {
    type: 'SKELETON_RIBCAGE', name: 'Ribcage', shortName: 'Ribcage', category: 'SUPPORT', systemName: 'Skeletal System',
    baseHp: 2000, unlockedAtBrainLevel: 3, maxPerBase: 1,
    description: 'A wall that guards the heart and lungs.',
    biologicalFunction: 'Twelve pairs of ribs that protect the heart and lungs and move during breathing.',
  },
  BACKBONE_BONE: {
    type: 'BACKBONE_BONE', name: 'Backbone (Vertebral Column)', shortName: 'Backbone', category: 'SUPPORT', systemName: 'Skeletal System',
    baseHp: 2000, unlockedAtBrainLevel: 4, maxPerBase: 1,
    description: 'A wall that guards the spinal cord.',
    biologicalFunction: 'A column of 33 vertebrae that supports the body and protects the spinal cord.',
  },
  MUSCLE_TISSUE: {
    type: 'MUSCLE_TISSUE', name: 'Muscles', shortName: 'Muscles', category: 'SUPPORT', systemName: 'Muscular System',
    baseHp: 1300, unlockedAtBrainLevel: 3, maxPerBase: 1,
    description: 'Stores nutrients.',
    biologicalFunction: 'Skeletal muscles move the body and store glycogen as a reserve of energy.',
  },
  // IMMUNE & LYMPHATIC
  BONE_MARROW_IMMUNE: {
    type: 'BONE_MARROW_IMMUNE', name: 'Bone Marrow', shortName: 'Bone Marrow', category: 'DEFENCE', systemName: 'Immune System',
    baseHp: 1000, unlockedAtBrainLevel: 4, maxPerBase: 1,
    description: 'Defence: makes the white blood cells your army will use once combat arrives.',
    biologicalFunction: 'Soft tissue inside bones that makes red blood cells, white blood cells and platelets.',
  },
  THYMUS_IMMUNE: {
    type: 'THYMUS_IMMUNE', name: 'Thymus', shortName: 'Thymus', category: 'DEFENCE', systemName: 'Immune System',
    baseHp: 850, unlockedAtBrainLevel: 6, maxPerBase: 1,
    description: 'Defence: trains T-cells. (Combat is not built yet.)',
    biologicalFunction: 'A gland in the chest where T-cells mature and learn to tell the body’s own cells from germs.',
  },
  SPLEEN_IMMUNE: {
    type: 'SPLEEN_IMMUNE', name: 'Spleen', shortName: 'Spleen', category: 'DEFENCE', systemName: 'Immune System',
    baseHp: 750, unlockedAtBrainLevel: 6, maxPerBase: 1,
    description: 'Defence: filters the blood. (Combat is not built yet.)',
    biologicalFunction: 'Filters the blood, removes old red blood cells and holds white blood cells ready.',
  },
  LYMPH_NODE_IMMUNE: {
    type: 'LYMPH_NODE_IMMUNE', name: 'Lymph Nodes', shortName: 'Lymph Nodes', category: 'DEFENCE', systemName: 'Lymphatic System',
    baseHp: 750, unlockedAtBrainLevel: 7, maxPerBase: 1,
    description: 'Defence: traps germs. (Combat is not built yet.)',
    biologicalFunction: 'Small bean-shaped filters along the lymph vessels where white blood cells trap germs.',
  },
  // ENDOCRINE
  PITUITARY_ENDOCRINE: {
    type: 'PITUITARY_ENDOCRINE', name: 'Pituitary Gland', shortName: 'Pituitary', category: 'ENDOCRINE', systemName: 'Endocrine System',
    baseHp: 500, unlockedAtBrainLevel: 3, maxPerBase: 1,
    description: 'Slowly makes hormones (gems) — the only passive gem income, as CoC’s Gem Mine.',
    biologicalFunction: 'The “master gland” under the brain; its hormones control growth and the other glands.',
  },
  THYROID_ENDOCRINE: {
    type: 'THYROID_ENDOCRINE', name: 'Thyroid Gland', shortName: 'Thyroid', category: 'ENDOCRINE', systemName: 'Endocrine System',
    baseHp: 600, unlockedAtBrainLevel: 2, maxPerBase: 1,
    description: 'Controls metabolism: build it to unlock the production boost in the Hormone Shop.',
    biologicalFunction: 'A gland in the neck whose hormone (thyroxine) sets how fast the body uses energy.',
  },
  ADRENAL_ENDOCRINE: {
    type: 'ADRENAL_ENDOCRINE', name: 'Adrenal Gland', shortName: 'Adrenal', category: 'ENDOCRINE', systemName: 'Endocrine System',
    baseHp: 550, unlockedAtBrainLevel: 5, maxPerBase: 2,
    description: 'Defence: adrenaline for emergencies. You have two, one on each kidney. (Combat is not built yet.)',
    biologicalFunction: 'Glands on top of the kidneys that release adrenaline, preparing the body to fight or run.',
  },
  // INTEGUMENTARY
  SKIN_INTEGUMENT: {
    type: 'SKIN_INTEGUMENT', name: 'Skin', shortName: 'Skin', category: 'SUPPORT', systemName: 'Integumentary System',
    baseHp: 1400, unlockedAtBrainLevel: 5, maxPerBase: 1,
    description: 'The outer wall of the body.',
    biologicalFunction: 'The largest organ: a waterproof barrier against germs that also helps control body temperature.',
  },
};

export const IMMUNE_TROOPS_CATALOG: Record<ImmuneCellType, ImmuneTroop> = {
  NEUTROPHIL: {
    type: 'NEUTROPHIL',
    name: 'Neutrophil (Fast Scout Swarm)',
    count: 0,
    attackPower: 35,
    hpPerUnit: 70,
    speed: 3.2,
    description: 'Fast first-responder defenders that swarm bacteria quickly and trap them with sticky webs!',
    specialAbility: 'Speed Rush: Moves twice as fast toward newly spotted germs.',
    cost: { nutrients: 25, oxygen: 15 },
    trainTimeSeconds: 5,
  },
  MACROPHAGE: {
    type: 'MACROPHAGE',
    name: 'Macrophage (Big Gobbler / Tank)',
    count: 0,
    attackPower: 80,
    hpPerUnit: 250,
    speed: 1.6,
    description: 'Giant cell defenders that swallow germs whole like Pac-Man and clean up cell debris!',
    specialAbility: 'Big Feast: Devours bacteria whole and heals itself for 15% health after eating.',
    cost: { nutrients: 60, oxygen: 40 },
    trainTimeSeconds: 12,
  },
  CD8_T_CELL: {
    type: 'CD8_T_CELL',
    name: 'T-Cell (Virus Sniper)',
    count: 0,
    attackPower: 140,
    hpPerUnit: 160,
    speed: 2.5,
    description: 'Sharp-eyed defenders that search for and eliminate cells that have been taken over by sneaky viruses.',
    specialAbility: 'Precision Strike: Pierces virus armor and inflicts heavy direct damage.',
    cost: { nutrients: 90, oxygen: 70 },
    trainTimeSeconds: 20,
  },
  B_CELL_PLASMA: {
    type: 'B_CELL_PLASMA',
    name: 'B-Cell (Antibody Launcher)',
    count: 0,
    attackPower: 110,
    hpPerUnit: 120,
    speed: 2.0,
    description: 'Shoots thousands of tiny Y-shaped antibodies that stick to germs and freeze them in place so others can destroy them!',
    specialAbility: 'Sticky Antibodies: Glues clusters of germs in place for 3 seconds.',
    cost: { nutrients: 110, oxygen: 85 },
    trainTimeSeconds: 25,
  },
  NATURAL_KILLER: {
    type: 'NATURAL_KILLER',
    name: 'Natural Killer Cell (Elite Bodyguard)',
    count: 0,
    attackPower: 175,
    hpPerUnit: 210,
    speed: 2.8,
    description: 'Elite defenders that patrol your body and instantly eliminate dangerous mutant cells and super germs.',
    specialAbility: 'Instant Takedown: Rapidly finishes off weak germs below 20% health.',
    cost: { nutrients: 150, oxygen: 120 },
    trainTimeSeconds: 35,
  },
};

export const CURRICULAR_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    curriculumTopic: 'Excretory',
    question: 'How do the nephrons in the Kidneys maintain systemic homeostasis when blood urea increases?',
    options: [
      'They pump oxygenated blood directly to the cerebrum',
      'They perform ultrafiltration in the glomerulus and reabsorption to excrete urea as urine',
      'They convert glucose into glycogen for storage in the liver',
      'They produce digestive amylase to break down starch'
    ],
    correctIndex: 1,
    explanation: 'Nephrons in the kidney filter blood via the glomerulus and Bowman’s capsule, removing nitrogenous waste (Urea) and regulating water balance to prevent uremic toxicity.',
    clinicalScenario: 'SCERT Excretion: Renal filtration prevents fatal uremia and stabilizes blood osmotic pressure.'
  },
  {
    id: 'q2',
    curriculumTopic: 'Digestive & Respiratory',
    question: 'Why does cellular respiration strictly require the coordinated action of both Lungs (Alveoli) and Stomach?',
    options: [
      'The lungs provide Oxygen for aerobic respiration while the digestive system supplies Glucose for ATP production',
      'The stomach provides oxygen to the red blood cells directly',
      'The lungs convert proteins into bile salts',
      'Both organs solely regulate body temperature'
    ],
    correctIndex: 0,
    explanation: 'Cellular respiration requires Glucose (absorbed from digestive breakdown) and Oxygen (diffused across alveolar membranes) to synthesize ATP via mitochondrial oxidation.',
    clinicalScenario: 'SCERT Metabolism: Without continuous oxygen perfusion, peripheral cells enter hypoxic ischemia.'
  },
  {
    id: 'q3',
    curriculumTopic: 'Nervous & Endocrine',
    question: 'What endocrine role does the Pancreas play in regulating blood glucose levels after nutrient absorption?',
    options: [
      'Secretes adrenaline to increase cardiac output',
      'Secretes insulin from beta cells to facilitate cellular glucose uptake and glycogen synthesis',
      'Filters urea and excess salts into the bladder',
      'Secretes thyroxine to slow down metabolic rate'
    ],
    correctIndex: 1,
    explanation: 'The islets of Langerhans in the pancreas secrete Insulin to lower elevated blood glucose by promoting cellular absorption and hepatic storage as glycogen.',
    clinicalScenario: 'SCERT Endocrine: Pancreatic hormones maintain tight glycemic control during metabolic surges.'
  },
  {
    id: 'q4',
    curriculumTopic: 'Nervous & Endocrine',
    question: 'How do the Brain (Command HQ) and Spinal Cord coordinate rapid stimulus-response actions across organ systems?',
    options: [
      'By transmitting electrical nerve impulses through neurons and releasing neurotransmitters across synapses',
      'By filtering deoxygenated blood through the spleen',
      'By producing red blood cells in the bone marrow',
      'By generating digestive bile'
    ],
    correctIndex: 0,
    explanation: 'The central nervous system evaluates sensory signals and coordinates motor reflexes using action potentials propagated along axons and synaptic neurotransmission.',
    clinicalScenario: 'SCERT Nervous System: Neural highways ensure continuous cardiovascular and respiratory autoregulation.'
  },
  {
    id: 'q5',
    curriculumTopic: 'Immune',
    question: 'Which biological mechanism enables Macrophages and Neutrophils to eliminate invading pathogens?',
    options: [
      'Phagocytosis: engulfing, digesting, and neutralizing pathogenic microbes with cellular enzymes',
      'Secreting hydrochloric acid into the bloodstream',
      'Crystallizing glucose in the spleen',
      'Absorbing water in the colon'
    ],
    correctIndex: 0,
    explanation: 'Phagocytic leukocytes (Neutrophils and Macrophages) identify foreign antigens, engulf bacteria through phagocytosis, and destroy them using lysosomal enzymes.',
    clinicalScenario: 'SCERT Immunology: First-line white blood cells protect vascular tissues from bacterial lysis.'
  }
];

