export type OrganType =
  // Nervous System
  | 'BRAIN_CNS'
  | 'SPINAL_CORD'
  // Circulatory System
  | 'HEART_CARDIO'
  // Respiratory System
  | 'LUNGS_RESP'
  | 'TRACHEA_RESP'
  // Digestive System
  | 'STOMACH_DIGEST'
  | 'INTESTINE_DIGEST'
  | 'COLON_DIGEST'
  | 'LIVER_METABOLIC'
  | 'PANCREAS_DIGEST'
  // Excretory / Urinary System
  | 'KIDNEY_EXCRET'
  | 'BLADDER_EXCRET'
  // Musculoskeletal System
  | 'SKELETON_RIBCAGE'
  | 'MUSCLE_TISSUE'
  // Immune & Lymphatic System
  | 'BONE_MARROW_IMMUNE'
  | 'THYMUS_IMMUNE'
  | 'LYMPH_NODE_IMMUNE'
  | 'SPLEEN_IMMUNE'
  // Endocrine System
  | 'ADRENAL_ENDOCRINE'
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
    oxygen: number;
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
  toxicityBun: number; // 5 - 120 mg/dL. Throttles production once it exceeds the excretory (kidney+bladder) capacity; floors at 10%, never stalls fully
  hydrationPct: number; // 0% - 100%
  coreTempC: number; // 36.5 - 40.5
  homeostasisScore: number; // 0 - 100
  wasteStallActive?: boolean; // true while production is pinned to the 10% waste floor (reversible, no damage)
}

export interface Currencies {
  nutrients: number; // Soft currency
  maxNutrients: number;
  oxygen: number; // Soft currency
  maxOxygen: number;
  water: number; // Soft currency
  maxWater: number;
  hormones: number; // Hard/Premium currency (Adrenaline, Growth Hormone)
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
  category: 'COMMAND' | 'CARDIO' | 'METABOLIC' | 'EXCRETORY' | 'IMMUNE' | 'BARRIER' | 'ENDOCRINE';
  systemName: string;
  baseHp: number;
  baseCost: {
    nutrients: number;
    oxygen: number;
    water?: number;
  };
  baseUpgradeSeconds: number;
  description: string;
  biologicalFunction: string;
  unlockedAtBrainLevel: number;
  maxPerBase: number;
  outputs: {
    nutrientsPerSec?: number;
    oxygenPerSec?: number;
    waterPerSec?: number;
    filtrationPerSec?: number;
    hormoneChance?: number;
    troopCapacity?: number;
    defenseArmor?: number;
  };
  metabolicWastePerSec: number; // Toxicity generation
}
