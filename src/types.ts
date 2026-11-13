export type OrganType =
  // Nervous System
  | 'BRAIN_CNS'
  | 'SPINAL_CORD'
  // Circulatory System
  | 'HEART_CARDIO'
  // Respiratory System
  | 'NOSE_RESP'
  | 'TRACHEA_RESP' // windpipe, with the voice box and bronchi
  | 'LUNGS_RESP' // one lung; the body has two
  | 'DIAPHRAGM_RESP'
  // Digestive System
  | 'MOUTH_DIGEST' // with teeth, tongue and salivary glands
  | 'OESOPHAGUS_DIGEST' // food pipe
  | 'STOMACH_DIGEST'
  | 'INTESTINE_DIGEST' // small intestine
  | 'COLON_DIGEST' // large intestine
  | 'RECTUM_DIGEST'
  | 'LIVER_METABOLIC'
  | 'GALLBLADDER_DIGEST'
  | 'PANCREAS_DIGEST'
  // Excretory / Urinary System
  | 'KIDNEY_EXCRET' // one kidney; the body has two
  | 'URETER_EXCRET' // one ureter; the body has two
  | 'BLADDER_EXCRET'
  | 'URETHRA_EXCRET'
  // Musculoskeletal System
  | 'SKULL_BONE'
  | 'SKELETON_RIBCAGE'
  | 'BACKBONE_BONE'
  | 'MUSCLE_TISSUE'
  // Immune & Lymphatic System
  | 'BONE_MARROW_IMMUNE'
  | 'THYMUS_IMMUNE'
  | 'LYMPH_NODE_IMMUNE'
  | 'SPLEEN_IMMUNE'
  // Endocrine System
  | 'PITUITARY_ENDOCRINE'
  | 'ADRENAL_ENDOCRINE' // one adrenal gland; the body has two
  | 'THYROID_ENDOCRINE'
  // Integumentary System
  | 'SKIN_INTEGUMENT';

export type VesselType = 'ARTERY' | 'VEIN' | 'LYMPHATIC' | 'NERVE';

export type BodySystemKey =
  | 'NERVOUS'
  | 'CIRCULATORY'
  | 'RESPIRATORY'
  | 'DIGESTIVE'
  | 'EXCRETORY'
  | 'SKELETAL'
  | 'MUSCULAR'
  | 'IMMUNE'
  | 'LYMPHATIC'
  | 'ENDOCRINE'
  | 'INTEGUMENTARY';

export interface BodySystemInfo {
  key: BodySystemKey;
  name: string;
  emoji: string;
  description: string;
  organTypes: OrganType[];
  isComplete: boolean;
  builtCount: number;
  totalAvailable: number;
}

export type PathogenType =
  | 'RHINOVIRUS'
  | 'VIBRIO_CHOLERAE'
  | 'INFLUENZA_1918'
  | 'YERSINIA_PESTIS'
  | 'MRSA_BACTERIA'
  | 'SARS_COV_2'
  | 'EBOLA_FILOVIRUS'
  | 'RABIES_VIRUS';

export type ImmuneCellType =
  | 'NEUTROPHIL'
  | 'MACROPHAGE'
  | 'CD8_T_CELL'
  | 'B_CELL_PLASMA'
  | 'NATURAL_KILLER';

export interface OrganNode {
  id: string;
  type: OrganType;
  name: string;
  level: number;
  maxLevel: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  status: 'OPTIMAL' | 'HYPOXIC' | 'TOXIC_NECROSIS' | 'UNDER_UPGRADE' | 'DAMAGED_DESTROYED';
  upgradeEndTime?: number; // timestamp
  upgradeDurationSeconds?: number;
  lastProductionTime: number;
  bloodFlowEfficiency: number; // 0.0 to 1.0 based on vessel connections to Heart
  oxygenSaturation: number; // 0.0 to 1.0
  toxicityLevel: number; // 0 to 100
  repairCost: {
    nutrients: number;
  };
  // Clash of Clans collector storage per organ
  uncollectedNutrients: number;
  uncollectedOxygen: number;
  uncollectedWater: number;
  uncollectedHormones: number;
  uncollectedUrine: number; // For Kidneys & Bladder (Urination / Peeing)
  uncollectedExcretion: number; // For Colon / Large Intestine (Excretion / Solid Waste)
  tapCount: number; // Tap to generate boost count
  lastTapTime?: number; // timestamp of last tap, for cooldown enforcement
  constructing?: boolean; // true during the very first build (finishing it does not add a level)
  /** Wall organs only: wallSections[i] = sections at level i+1. */
  wallSections?: number[];
  boostedUntil?: number; // timestamp until which this collector's output is doubled
}

export interface VesselConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: VesselType;
  level: number;
  capacity: number; // ml/s blood throughput
  flowSpeed: number; // visual & mechanical speed
}

export interface ImmuneTroop {
  type: ImmuneCellType;
  name: string;
  count: number;
  attackPower: number;
  hpPerUnit: number;
  speed: number;
  description: string;
  specialAbility: string;
  cost: {
    nutrients: number;
    oxygen: number;
  };
  trainTimeSeconds: number;
}

export interface PathogenSpec {
  id: string;
  name: string;
  scientificName: string;
  type: PathogenType;
  category: 'VIRUS' | 'BACTERIA' | 'PARASITE';
  level: number;
  hp: number;
  attackPower: number;
  speed: number;
  count: number;
  rewardNutrients: number;
  rewardHormones: number;
  description: string;
  symptoms: string[];
  historicalFact: string;
  vulnerabilities: ImmuneCellType[];
}

export interface PlayerVitals {
  heartRateBpm: number; // 60 - 180
  bloodPressureSys: number; // 100 - 160
  bloodPressureDia: number; // 60 - 100
  spO2: number; // 85% - 100%
  toxicityBun: number; // blood-urea readout of the waste left in the blood (5 = clean)
  hydrationPct: number; // 0% - 100%
  coreTempC: number; // 36.5 - 40.5
  homeostasisScore: number; // 0 - 100
  wasteFillPct?: number; // bladder + rectum fill, % of their capacity (100 = full: flush)
  bloodWastePct?: number; // waste left in the blood, % of what the body tolerates (over 100 slows production)
  wasteStallActive?: boolean; // true while production is pinned to the 10% waste floor (reversible, no damage)
  oxygenUsed?: number; // oxygen demand of every organ (reserved levels included)
  oxygenSupply?: number; // oxygen the breathing organs supply
}

/**
 * One currency. Nutrients carry what CoC splits into Gold and Elixir; oxygen is
 * not a currency but a supply-and-demand budget (see bodyEconomy.ts).
 */
export interface Currencies {
  nutrients: number;
  maxNutrients: number;
  hormones: number; // Hard/Premium currency (CoC gems)
}

export interface ActiveBoost {
  type: 'ADRENALINE' | 'GROWTH_HORMONE' | 'EPO_OXYGEN' | 'CORTISOL_SHIELD';
  name: string;
  remainingSeconds: number;
  multiplier: number;
  description: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: number;
  studentId: string;
  studentName: string;
  eventType: 'ORGAN_UPGRADE' | 'TOXICITY_SPIKE' | 'NECROSIS_EVENT' | 'RAID_VICTORY' | 'RAID_DEFEAT' | 'QUIZ_SUBMIT' | 'TREATMENT_APPLIED' | 'RESOURCE_COLLECTED';
  details: string;
  scoreImpact: number;
  metabolicEfficiency: number;
  renalFiltrationEfficiency: number;
  immuneReadinessScore: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  avatar: string;
  brainLevel: number;
  totalOrgans: number;
  homeostasisRating: number;
  toxicityIncidents: number;
  pvpRating: number;
  completedCurriculumModules: number;
  lastActive: string;
}

export interface QuizQuestion {
  id: string;
  curriculumTopic: 'Circulatory' | 'Excretory' | 'Immune' | 'Digestive & Respiratory' | 'Nervous & Endocrine';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  clinicalScenario?: string;
}

/**
 * A clearable deposit on the body map — our Obstacle. Clearing one yields gems
 * from CoC's fixed cycle. GEM_BOX is the rare 25-gem variety (only one at a time).
 */
export interface Obstacle {
  id: string;
  kind: 'TOXIN_DEPOSIT' | 'GEM_BOX';
  name: string;
  x: number;
  y: number;
  /** Nutrient cost to clear. */
  clearCost: number;
}

export interface OrganDefinition {
  type: OrganType;
  name: string;
  /** Short name for labels on the map. */
  shortName: string;
  category: 'COMMAND' | 'CARDIO' | 'BREATHING' | 'DIGESTIVE' | 'EXCRETORY' | 'SUPPORT' | 'ENDOCRINE' | 'DEFENCE';
  systemName: string;
  baseHp: number;
  description: string;
  biologicalFunction: string;
  unlockedAtBrainLevel: number;
  /** The real count in a human body (two lungs, two kidneys...). */
  maxPerBase: number;
}
