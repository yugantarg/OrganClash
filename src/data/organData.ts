import { OrganDefinition, OrganType, ImmuneTroop, ImmuneCellType, QuizQuestion, BodySystemInfo, BodySystemKey } from '../types';

export const ALL_BODY_SYSTEMS: { key: BodySystemKey; name: string; emoji: string; description: string; organTypes: OrganType[] }[] = [
  {
    key: 'NERVOUS',
    name: 'Nervous System',
    emoji: '🧠',
    description: 'Brain & Spinal Cord: Controls thoughts, sends fast nerve impulses, and coordinates all organs.',
    organTypes: ['BRAIN_CNS', 'SPINAL_CORD'],
  },
  {
    key: 'CIRCULATORY',
    name: 'Circulatory System',
    emoji: '❤️',
    description: 'Heart & Blood Vessels: Pumps oxygenated blood and food nutrients to every living cell.',
    organTypes: ['HEART_CARDIO'],
  },
  {
    key: 'RESPIRATORY',
    name: 'Respiratory System',
    emoji: '🫁',
    description: 'Lungs & Trachea: Inhales vital Oxygen gas and exhales Carbon Dioxide waste.',
    organTypes: ['LUNGS_RESP', 'TRACHEA_RESP'],
  },
  {
    key: 'DIGESTIVE',
    name: 'Digestive System',
    emoji: '🍎',
    description: 'Stomach, Intestines, Colon, Liver & Pancreas: Breaks food into glucose nutrients and clears digestive waste.',
    organTypes: ['STOMACH_DIGEST', 'INTESTINE_DIGEST', 'COLON_DIGEST', 'LIVER_METABOLIC', 'PANCREAS_DIGEST'],
  },
  {
    key: 'EXCRETORY',
    name: 'Excretory / Urinary System',
    emoji: '🚽',
    description: 'Kidneys & Bladder: Filters nitrogenous waste (Urea) out of the blood and flushes it out through urination.',
    organTypes: ['KIDNEY_EXCRET', 'BLADDER_EXCRET'],
  },
  {
    key: 'SKELETAL',
    name: 'Skeletal System',
    emoji: '🦴',
    description: 'Ribcage & Bones: Provides a sturdy protective frame and expands storage capacity for resources.',
    organTypes: ['SKELETON_RIBCAGE'],
  },
  {
    key: 'MUSCULAR',
    name: 'Muscular System',
    emoji: '💪',
    description: 'Muscle Tissues: Powers bodily movement, generates essential body heat, and stabilizes organs.',
    organTypes: ['MUSCLE_TISSUE'],
  },
  {
    key: 'IMMUNE',
    name: 'Immune System',
    emoji: '🛡️',
    description: 'Bone Marrow, Thymus & Spleen: Creates and deploys White Blood Cells to eliminate germs.',
    organTypes: ['BONE_MARROW_IMMUNE', 'THYMUS_IMMUNE', 'SPLEEN_IMMUNE'],
  },
  {
    key: 'LYMPHATIC',
    name: 'Lymphatic System',
    emoji: '🟢',
    description: 'Lymph Nodes & Vessels: Traps invading microbes and drains extra fluid back to the bloodstream.',
    organTypes: ['LYMPH_NODE_IMMUNE'],
  },
  {
    key: 'ENDOCRINE',
    name: 'Endocrine System',
    emoji: '⚡',
    description: 'Adrenal & Thyroid Glands: Secretes hormones and adrenaline to boost speed and metabolism.',
    organTypes: ['ADRENAL_ENDOCRINE', 'THYROID_ENDOCRINE'],
  },
  {
    key: 'INTEGUMENTARY',
    name: 'Integumentary System',
    emoji: '🧱',
    description: 'Skin Barrier: Waterproof outer armor protecting internal organs from external dirt and bacteria.',
    organTypes: ['SKIN_INTEGUMENT'],
  },
];

export interface BrainUpgradeStep {
  toLevel: number;
  nutrients: number;
  oxygen: number;
  seconds: number;
}

/**
 * Brain (Command HQ) progression curve.
 *
 * Cost grows ~2.2x per level; time grows ~2.5x. The gap is deliberate:
 * resources accumulate on their own, time never does, so the widening
 * wait is what a time-skip currency sells against.
 *
 * Every step is affordable within the storage cap available at that Brain
 * level (see STORAGE_PER_BRAIN_LEVEL) - a cost above the cap would be an
 * unreachable wall, not a challenge.
 *
 * Kept as a table rather than a formula so balance can be retuned without
 * touching upgrade logic.
 */
export const BRAIN_UPGRADE_CURVE: BrainUpgradeStep[] = [
  { toLevel: 2, nutrients: 400, oxygen: 280, seconds: 120 },
  { toLevel: 3, nutrients: 900, oxygen: 630, seconds: 600 },
  { toLevel: 4, nutrients: 2000, oxygen: 1400, seconds: 2400 },
  { toLevel: 5, nutrients: 4500, oxygen: 3100, seconds: 7200 },
  { toLevel: 6, nutrients: 10000, oxygen: 7000, seconds: 21600 },
  { toLevel: 7, nutrients: 22000, oxygen: 15000, seconds: 57600 },
  { toLevel: 8, nutrients: 48000, oxygen: 33000, seconds: 144000 },
];

/** Base storage cap by Brain level. Upgrading the HQ is what raises the ceiling. */
export const STORAGE_PER_BRAIN_LEVEL = (level: number, base: number): number =>
  Math.round(base * Math.pow(2.2, Math.max(0, level - 1)));

/** Mitotic builders: concurrent upgrade slots. Extra slots are the primary gem sink. */
export const BASE_BUILDER_COUNT = 2;
export const MAX_BUILDER_COUNT = 5;
export const BUILDER_GEM_COSTS = [500, 1000, 2000]; // for the 3rd, 4th, 5th builder

/** Hydration is measured against a fixed healthy reserve, never against storage capacity. */
export const HEALTHY_WATER_RESERVE = 250;

/** Minimum gap between taps on one organ, in ms. Without this, tapping is free money. */
export const TAP_COOLDOWN_MS = 900;

/** Telemetry ring-buffer bound. The log is serialised to storage on every change. */
export const MAX_TELEMETRY_LOGS = 60;

export const ORGAN_DEFINITIONS: Record<OrganType, OrganDefinition> = {
  // 1. NERVOUS SYSTEM
  BRAIN_CNS: {
    type: 'BRAIN_CNS',
    name: 'Brain (Command HQ)',
    category: 'COMMAND',
    systemName: 'Nervous System',
    baseHp: 1500,
    baseCost: { nutrients: 400, oxygen: 280 },
    baseUpgradeSeconds: 120,
    description: 'The master control center of your body base (Town Center)! It coordinates neural signals, unlocks new organs, and expands your body level.',
    biologicalFunction: 'Coordinates all other organ systems. Upgrading the Brain unlocks new organs and higher tier biological pathways!',
    unlockedAtBrainLevel: 1,
    maxPerBase: 1,
    outputs: {
      nutrientsPerSec: 1.0, // Base neural generation
      troopCapacity: 30,
      hormoneChance: 0.05, // Generates hormone units slowly
    },
    metabolicWastePerSec: 0.25,
  },
  SPINAL_CORD: {
    type: 'SPINAL_CORD',
    name: 'Spinal Cord (Nerve Superhighway)',
    category: 'COMMAND',
    systemName: 'Nervous System',
    baseHp: 1100,
    baseCost: { nutrients: 180, oxygen: 140 },
    baseUpgradeSeconds: 45,
    description: 'The main nerve trunk relaying electrical commands between the Brain and all other body organs at 200 mph!',
    biologicalFunction: 'Gives a +15% speed and production boost to all connected organs across the base.',
    unlockedAtBrainLevel: 4,
    maxPerBase: 1,
    outputs: {
      nutrientsPerSec: 2.0,
    },
    metabolicWastePerSec: 0.25,
  },

  // 2. CIRCULATORY SYSTEM
  HEART_CARDIO: {
    type: 'HEART_CARDIO',
    name: 'Heart (Blood Pump)',
    category: 'CARDIO',
    systemName: 'Circulatory System',
    baseHp: 1200,
    baseCost: { nutrients: 120, oxygen: 80 },
    baseUpgradeSeconds: 30,
    description: 'A powerful muscular pump that beats 100,000 times a day to push fresh blood, oxygen, and food energy through arterial roads to all organs.',
    biologicalFunction: 'Central Hub; determines peripheral flow. Connect organs to the Heart with Arteries to keep them alive and producing!',
    unlockedAtBrainLevel: 1,
    maxPerBase: 1,
    outputs: {
      waterPerSec: 0.5,
    },
    metabolicWastePerSec: 0.25,
  },

  // 3. RESPIRATORY SYSTEM
  LUNGS_RESP: {
    type: 'LUNGS_RESP',
    name: 'Lungs (Oxygen Breathers)',
    category: 'METABOLIC',
    systemName: 'Respiratory System',
    baseHp: 900,
    baseCost: { nutrients: 100, oxygen: 40 },
    baseUpgradeSeconds: 25,
    description: 'Breathes in fresh Oxygen (O2) from the air into red blood cells, and exhales Carbon Dioxide (CO2) waste gas.',
    biologicalFunction: 'Main gas generator; +150 O2 capacity. Primary Oxygen generator for cellular respiration.',
    unlockedAtBrainLevel: 1,
    maxPerBase: 2,
    outputs: {
      oxygenPerSec: 12.0,
    },
    metabolicWastePerSec: 0.25,
  },
  TRACHEA_RESP: {
    type: 'TRACHEA_RESP',
    name: 'Trachea (Airway Windpipe)',
    category: 'METABOLIC',
    systemName: 'Respiratory System',
    baseHp: 600,
    baseCost: { nutrients: 80, oxygen: 60 },
    baseUpgradeSeconds: 30,
    description: 'The reinforced cartilage tube that channels clean filtered air directly into your lungs.',
    biologicalFunction: 'Airway pipeline; boosts Lungs by +25% efficiency and adds +6 O2/s directly.',
    unlockedAtBrainLevel: 3,
    maxPerBase: 1,
    outputs: {
      oxygenPerSec: 6.0,
    },
    metabolicWastePerSec: 0.25,
  },

  // 4. DIGESTIVE SYSTEM
  STOMACH_DIGEST: {
    type: 'STOMACH_DIGEST',
    name: 'Stomach (Food Digestor)',
    category: 'METABOLIC',
    systemName: 'Digestive System',
    baseHp: 800,
    baseCost: { nutrients: 100, oxygen: 50 },
    baseUpgradeSeconds: 20,
    description: 'Uses stomach acid and digestive enzymes to break down food into simple glucose nutrients your cells can use for fuel.',
    biologicalFunction: 'Primary glucose digestor; chyme breakdown into metabolic energy without early water drainage.',
    unlockedAtBrainLevel: 1,
    maxPerBase: 3,
    outputs: {
      nutrientsPerSec: 10.0,
    },
    metabolicWastePerSec: 0.25,
  },
  INTESTINE_DIGEST: {
    type: 'INTESTINE_DIGEST',
    name: 'Small Intestine (Nutrient Absorber)',
    category: 'METABOLIC',
    systemName: 'Digestive System',
    baseHp: 750,
    baseCost: { nutrients: 140, oxygen: 90 },
    baseUpgradeSeconds: 35,
    description: 'A 20-foot long tube lined with millions of tiny sponge villi that absorb food nutrients and water directly into the blood.',
    biologicalFunction: 'Absorptive villi; baseline fluid uptake and high-yield glucose harvesting (+14 N/s, +4 Water/s).',
    unlockedAtBrainLevel: 2,
    maxPerBase: 2,
    outputs: {
      nutrientsPerSec: 14.0,
      waterPerSec: 4.0,
    },
    metabolicWastePerSec: 0.25,
  },
  COLON_DIGEST: {
    type: 'COLON_DIGEST',
    name: 'Large Intestine / Colon (Excretion & Solid Waste)',
    category: 'EXCRETORY',
    systemName: 'Digestive System',
    baseHp: 700,
    baseCost: { nutrients: 130, oxygen: 80 },
    baseUpgradeSeconds: 40,
    description: 'Absorbs remaining water and compacts leftover food waste. Displays an EXCRETE bubble to flush solid waste and recycle energy!',
    biologicalFunction: 'Fluid retention and microbiome extraction (+10 Water/s); clears solid waste on demand.',
    unlockedAtBrainLevel: 2,
    maxPerBase: 1,
    outputs: {
      waterPerSec: 10.0,
    },
    metabolicWastePerSec: 0.25,
  },
  LIVER_METABOLIC: {
    type: 'LIVER_METABOLIC',
    name: 'Liver (Energy Storage & Detox)',
    category: 'METABOLIC',
    systemName: 'Digestive & Metabolic',
    baseHp: 1100,
    baseCost: { nutrients: 200, oxygen: 140 },
    baseUpgradeSeconds: 45,
    description: 'The body chemical factory! Stores backup glycogen fuel and breaks down ammonia toxins in the blood.',
    biologicalFunction: 'Detoxifies ammonia; expands Nutrient Storage Capacity (+250 N cap) to unlock advanced tiers!',
    unlockedAtBrainLevel: 3,
    maxPerBase: 1,
    outputs: {
      filtrationPerSec: 2.0,
      nutrientsPerSec: 2.0,
    },
    metabolicWastePerSec: 0.25,
  },
  PANCREAS_DIGEST: {
    type: 'PANCREAS_DIGEST',
    name: 'Pancreas (Insulin & Enzyme Lab)',
    category: 'METABOLIC',
    systemName: 'Digestive & Endocrine',
    baseHp: 650,
    baseCost: { nutrients: 160, oxygen: 110 },
    baseUpgradeSeconds: 40,
    description: 'Secretes insulin to regulate blood sugar levels and digestive enzymes into the small intestine.',
    biologicalFunction: 'Insulin production; boosts systemic nutrient absorption efficiency by +20% and buffers spikes.',
    unlockedAtBrainLevel: 3,
    maxPerBase: 1,
    outputs: {
      nutrientsPerSec: 4.0,
    },
    metabolicWastePerSec: 0.25,
  },

  // 5. EXCRETORY / URINARY SYSTEM
  KIDNEY_EXCRET: {
    type: 'KIDNEY_EXCRET',
    name: 'Kidneys (Blood Cleaners / Waste Filters)',
    category: 'EXCRETORY',
    systemName: 'Excretory System',
    baseHp: 850,
    baseCost: { nutrients: 150, oxygen: 100 },
    baseUpgradeSeconds: 25,
    description: 'Contains 1 million microscopic nephron filters that continuously clean toxic nitrogen waste (Urea) from your blood and send it to the Bladder.',
    biologicalFunction: 'Glomerular filter; clears -5 BUN toxicity/s and sends urine to the bladder for excretion.',
    unlockedAtBrainLevel: 2,
    maxPerBase: 2,
    outputs: {
      filtrationPerSec: 6.0, // Clears blood urea waste
    },
    metabolicWastePerSec: 0.25,
  },
  BLADDER_EXCRET: {
    type: 'BLADDER_EXCRET',
    name: 'Bladder (Urination & Liquid Waste Tank)',
    category: 'EXCRETORY',
    systemName: 'Excretory System',
    baseHp: 600,
    baseCost: { nutrients: 90, oxygen: 60 },
    baseUpgradeSeconds: 20,
    description: 'A flexible muscular pouch that collects filtered urine from your kidneys. Shows a URINATE bubble when full!',
    biologicalFunction: 'Urine receptacle; triggers Urination macro to flush BUN blood waste and restore homeostasis.',
    unlockedAtBrainLevel: 2,
    maxPerBase: 1,
    outputs: {
      filtrationPerSec: 2.0,
    },
    metabolicWastePerSec: 0.25,
  },

  // 6. SKELETAL SYSTEM
  SKELETON_RIBCAGE: {
    type: 'SKELETON_RIBCAGE',
    name: 'Ribcage & Bones (Skeletal Armor & Storage)',
    category: 'BARRIER',
    systemName: 'Skeletal System',
    baseHp: 2000,
    baseCost: { nutrients: 220, oxygen: 120 },
    baseUpgradeSeconds: 35,
    description: 'Tough calcium-phosphate bone cage that protects delicate chest organs (Heart and Lungs) and stores vital minerals.',
    biologicalFunction: 'Passive thoracic armor against pathogens; grants +300 HP and +200 storage capacity to adjacent organs.',
    unlockedAtBrainLevel: 4,
    maxPerBase: 2,
    outputs: {
      defenseArmor: 40,
    },
    metabolicWastePerSec: 0.25,
  },

  // 7. MUSCULAR SYSTEM
  MUSCLE_TISSUE: {
    type: 'MUSCLE_TISSUE',
    name: 'Muscle Tissue / Diaphragm (Strength & Heat)',
    category: 'METABOLIC',
    systemName: 'Muscular System',
    baseHp: 1300,
    baseCost: { nutrients: 160, oxygen: 120 },
    baseUpgradeSeconds: 30,
    description: 'Bundles of contracting muscle fibers that power bodily movement, burn fuel, and generate homeostatic body heat (37°C).',
    biologicalFunction: 'Mechanical respiratory support (Diaphragm) and steady metabolic vitality generator.',
    unlockedAtBrainLevel: 4,
    maxPerBase: 3,
    outputs: {
      nutrientsPerSec: 3.0,
    },
    metabolicWastePerSec: 0.25,
  },

  // 8. IMMUNE SYSTEM
  BONE_MARROW_IMMUNE: {
    type: 'BONE_MARROW_IMMUNE',
    name: 'Bone Marrow (White Blood Cell Factory)',
    category: 'IMMUNE',
    systemName: 'Immune System',
    baseHp: 1000,
    baseCost: { nutrients: 250, oxygen: 180 },
    baseUpgradeSeconds: 35,
    description: 'Spongy tissue inside your bones that produces billions of White Blood Cell defenders (Neutrophils, Macrophages) via hematopoiesis.',
    biologicalFunction: 'Hematopoiesis; generates leukocyte army capacity to defend organs against pathogenic invasion.',
    unlockedAtBrainLevel: 4,
    maxPerBase: 2,
    outputs: {
      troopCapacity: 40, // reserved for immune combat
      nutrientsPerSec: 2.4, // haematopoiesis: new blood cells enter circulation
      oxygenPerSec: 1.8, // erythrocytes raise oxygen-carrying capacity
    },
    metabolicWastePerSec: 0.25,
  },
  THYMUS_IMMUNE: {
    type: 'THYMUS_IMMUNE',
    name: 'Thymus (T-Cell Training Academy)',
    category: 'IMMUNE',
    systemName: 'Immune System',
    baseHp: 850,
    baseCost: { nutrients: 220, oxygen: 180 },
    baseUpgradeSeconds: 50,
    description: 'A specialized chest gland that trains T-Cells to recognize self from foreign invaders.',
    biologicalFunction: 'Unlocks elite T-Cell defenders and increases immune troop resilience by +20%.',
    unlockedAtBrainLevel: 4,
    maxPerBase: 1,
    outputs: {
      troopCapacity: 25, // reserved for immune combat
      hormoneChance: 0.05, // thymosin secretion
    },
    metabolicWastePerSec: 0.25,
  },
  SPLEEN_IMMUNE: {
    type: 'SPLEEN_IMMUNE',
    name: 'Spleen (Blood Guard & Recycler)',
    category: 'IMMUNE',
    systemName: 'Immune System',
    baseHp: 750,
    baseCost: { nutrients: 170, oxygen: 120 },
    baseUpgradeSeconds: 40,
    description: 'Filters blood to recycle old red blood cells and keeps extra White Blood Cells ready on standby.',
    biologicalFunction: 'Recycles RBCs, filters blood pathogens, and acts as a macrophage reservoir.',
    unlockedAtBrainLevel: 4,
    maxPerBase: 1,
    outputs: {
      defenseArmor: 15, // capsule blunts systemic toxicity
      filtrationPerSec: 1.0, // red-pulp blood filtration
      nutrientsPerSec: 1.2, // iron recycled from senescent erythrocytes
    },
    metabolicWastePerSec: 0.25,
  },

  // 9. LYMPHATIC SYSTEM
  LYMPH_NODE_IMMUNE: {
    type: 'LYMPH_NODE_IMMUNE',
    name: 'Lymph Node (Immune Guard Tower)',
    category: 'IMMUNE',
    systemName: 'Lymphatic System',
    baseHp: 750,
    baseCost: { nutrients: 95, oxygen: 80 },
    baseUpgradeSeconds: 20,
    description: 'Security checkpoints around your body that trap passing germs and filter lymphatic fluid.',
    biologicalFunction: 'Acts as an automated checkpoint that prevents pathogen spread across tissues.',
    unlockedAtBrainLevel: 4,
    maxPerBase: 4,
    outputs: {
      defenseArmor: 20,
      filtrationPerSec: 0.8, // lymphatic drainage clears interstitial waste
    },
    metabolicWastePerSec: 0.25,
  },

  // 10. ENDOCRINE SYSTEM
  ADRENAL_ENDOCRINE: {
    type: 'ADRENAL_ENDOCRINE',
    name: 'Adrenal Glands (Hormones & Adrenaline)',
    category: 'ENDOCRINE',
    systemName: 'Endocrine System',
    baseHp: 550,
    baseCost: { nutrients: 200, oxygen: 150 },
    baseUpgradeSeconds: 45,
    description: 'Glands perched on top of your kidneys that release adrenaline hormones during emergencies to accelerate blood velocity.',
    biologicalFunction: 'Generates Hormones (+1 Hormone / 60s) and unlocks the Adrenaline Surge override (3x speed).',
    unlockedAtBrainLevel: 3,
    maxPerBase: 2,
    outputs: {
      hormoneChance: 0.15,
    },
    metabolicWastePerSec: 0.25,
  },
  THYROID_ENDOCRINE: {
    type: 'THYROID_ENDOCRINE',
    name: 'Thyroid Gland (Metabolism Controller)',
    category: 'ENDOCRINE',
    systemName: 'Endocrine System',
    baseHp: 600,
    baseCost: { nutrients: 180, oxygen: 130 },
    baseUpgradeSeconds: 45,
    description: 'Butterfly-shaped neck gland that regulates body metabolic rate, heart speed, and energy consumption.',
    biologicalFunction: 'Basal metabolic regulator; speed multiplier and generates Hormones (+1 Hormone / 90s).',
    unlockedAtBrainLevel: 3,
    maxPerBase: 1,
    outputs: {
      nutrientsPerSec: 3.0,
      oxygenPerSec: 2.0,
    },
    metabolicWastePerSec: 0.25,
  },

  // 11. INTEGUMENTARY SYSTEM
  SKIN_INTEGUMENT: {
    type: 'SKIN_INTEGUMENT',
    name: 'Skin (Protective Barrier Wall)',
    category: 'BARRIER',
    systemName: 'Integumentary System',
    baseHp: 1400,
    baseCost: { nutrients: 180, oxygen: 100 },
    baseUpgradeSeconds: 15,
    description: 'Your body’s outer shield! A tough waterproof outer layer that keeps internal organs protected and prevents fluid loss.',
    biologicalFunction: 'Microbial barrier; systemic hydration buffer and defense armor.',
    unlockedAtBrainLevel: 4,
    maxPerBase: 8,
    outputs: {
      defenseArmor: 35, // barrier: reduces toxic damage taken base-wide
      waterPerSec: 0.4, // reduces insensible water loss
    },
    metabolicWastePerSec: 0.25,
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

