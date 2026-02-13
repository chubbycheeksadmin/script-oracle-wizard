// ============================================
// PRODUCTION FEASIBILITY ENGINE - TYPE DEFINITIONS
// ============================================

// Re-export AI breakdown types
export * from './breakdown';

// Shooting Context
export type ShootingContext = 'UK' | 'EU';

export type EUCountry = 'Poland' | 'Bulgaria' | 'Czech' | 'Serbia' | 'Georgia' | 'Spain' | 'Portugal' | 'EU_Average';

export type UsageTerritory = 'UK' | 'US' | 'Worldwide';

// Scene Types
export type IntExt = 'INT' | 'EXT' | 'INT/EXT';
export type DayNight = 'DAY' | 'NIGHT' | 'DUSK' | 'DAWN';
export type SetType = 'Practical' | 'Studio' | 'Hybrid';
export type ComplexityLevel = 'Low' | 'Medium' | 'High';
export type VFXLevel = 'None' | 'Light' | 'Heavy';
export type PropsLevel = 'None' | 'Practical' | 'Hero';

// Verdict Types
export type Verdict = 'GREEN' | 'AMBER' | 'RED';
export type Confidence = 'Low' | 'Medium' | 'High';

// Assumption Alignment Status (traffic light)
export type AssumptionStatus = 'aligned' | 'stretched' | 'misaligned';

// Production Scale
export type ProductionScale = 'Lean' | 'Standard' | 'Ambitious';

// ============================================
// SCENE BREAKDOWN SCHEMA
// ============================================

export interface SceneTalent {
  heroPrincipalCount: number;
  featuredCount: number;
  walkOnCount: number;
  extrasCount: number;
  hasDialogue: boolean;
  hasFeaturedAction: boolean;
  isBackgroundOnly: boolean;
}

export interface SceneArtDept {
  setDressingRequired: boolean;
  propsRequired: PropsLevel;
  buildImplied: boolean;
}

export interface SceneWardrobe {
  principalWardrobe: boolean;
  featuredWardrobe: boolean;
  continuityMultiples: boolean;
  quickChanges: boolean;
}

export interface Scene {
  id: string;
  sceneNumber: number;
  intExt: IntExt;
  dayNight: DayNight;
  locationName: string;
  isLocationReused: boolean;
  setType: SetType;
  actionComplexity: ComplexityLevel;
  technicalComplexity: boolean;
  heroProductMoment: boolean;
  vfxLevel: VFXLevel;
  description: string;
  estimatedShots: number;
  artDept: SceneArtDept;
  wardrobe: SceneWardrobe;
  talent: SceneTalent;
}

// ============================================
// SCRIPT BREAKDOWN ROLLUP
// ============================================

export interface TalentRollup {
  totalUniqueHeroRoles: number;
  totalUniqueFeaturedRoles: number;
  totalWalkOns: number;
  peakExtrasRequirement: number;
  totalTalentDays: number;
}

export interface ScriptBreakdown {
  scenes: Scene[];
  totalScenes: number;
  uniqueLocations: number;
  companyMovesEstimate: number;
  intExtMix: boolean;
  dayNightMix: boolean;
  totalEstimatedShots: number;
  talentRollup: TalentRollup;
  hasVFX: boolean;
  vfxComplexity: VFXLevel;
  hasTechnicalShots: boolean;
  hasHeroProduct: boolean;
  techniques?: string[]; // Production techniques detected (e.g., 'car rig', 'MOCO', 'drone')
  locations?: string[]; // Location names for matching
}

// ============================================
// ASSESSMENT INPUT
// ============================================

export interface Deliverables {
  tvc30: boolean;
  tvc15: boolean;
  tvc10: boolean;
  socialCutdowns: boolean;
  vertical916: boolean;
  stillGrabs: boolean;
  behindTheScenes: boolean;
}

export interface ComplexityToggles {
  technical: boolean;
  heroProduct: boolean;
  vfxLight: boolean;
  vfxHeavy: boolean;
  fixInPost: boolean;
  multipleHeroTalent: boolean;
  specialEquipment: boolean;
  childrenInvolved: boolean;       // Children on set (triggers hour restrictions)
  childrenUnder5: boolean;         // Children under 5 (most restrictive)
}

export interface PoliticsToggles {
  numberBeforeBoardsLocked: boolean;
  procurementInvolvedEarly: boolean;
  multipleAgencyStakeholders: boolean;
  clientOnSet: boolean;
}

export interface BudgetSnapshot {
  totalBudget?: number;
  productionBudget?: number;
  postBudget?: number;
  talentBudget?: number;
  contingencyPercent?: number;
  hasContingency: boolean;
  otAllowed: boolean;
}

export interface AssessmentInput {
  // Script input
  scriptText?: string;
  scriptBreakdown?: ScriptBreakdown;

  // AI Breakdown (from PDF upload)
  aiBreakdown?: import('./breakdown').AIBreakdown;

  // Context
  shootingContext: ShootingContext;
  location?: string; // Primary shoot location (e.g., "Barcelona", "London")
  euCountry?: EUCountry;
  usageTerritory: UsageTerritory;
  usageTerm: number; // years

  // Proposed schedule
  proposedShootDays?: number;
  companyMovesPerDay?: number;
  interiorExteriorMix: boolean;

  // Deliverables
  deliverables: Deliverables;

  // Complexity
  complexity: ComplexityToggles;

  // Politics
  politics: PoliticsToggles;

  // Budget
  budgetSnapshot: BudgetSnapshot;

  // Production assumptions / location groupings
  productionAssumptions?: ProductionAssumptions;
}

// ============================================
// SCHEDULE SIMULATION
// ============================================

export interface ScheduleConstants {
  totalDayMinutes: number;      // 660 (11 hours)
  workingMinutes: number;       // 600 (10 hours)
  lunchMinutes: number;         // 60 (1 hour)
  turnoverMinutes: number;      // 90 (1.5 hours)
  avgShotExecutionMinutes: number;    // 40
  avgResetMinutes: number;            // 30
  technicalShotMinutes: number;       // 60
  companyMoveMinutes: number;         // 60
  companyMoveResetMinutes: number;    // 45
}

export interface DaySchedule {
  dayNumber: number;
  scenes: Scene[];
  shots: number;
  totalMinutesRequired: number;
  availableMinutes: number;
  overrunMinutes: number;
  companyMoves: number;
  isOverloaded: boolean;
  pressurePoints: string[];
}

export interface ScheduleSimulation {
  days: DaySchedule[];
  totalDaysRequired: number;
  proposedDays: number;
  dayDeficit: number;
  avgShotsPerDay: number;
  avgCompanyMovesPerDay: number;
  highRiskDays: number[];
  scheduleNotes: string[];
}

// ============================================
// RULES ENGINE
// ============================================

export interface RuleFlag {
  ruleId: string;
  title: string;
  explanation: string;
  challenge: string;
  category: 'schedule' | 'creative' | 'post' | 'budget' | 'politics' | 'talent' | 'pibs';
  severity: 'low' | 'medium' | 'high';
}

export interface Rule {
  id: string;
  description: string;
  category: 'schedule' | 'creative' | 'post' | 'budget' | 'politics' | 'talent' | 'pibs';
  condition: (input: AssessmentInput, schedule?: ScheduleSimulation) => boolean;
  scoreDelta: number;
  generateFlag: (input: AssessmentInput, schedule?: ScheduleSimulation) => RuleFlag | null;
}

// ============================================
// COST ESTIMATION
// ============================================

export interface CostBand {
  lean: number;
  standard: number;
  ambitious: number;
}

export interface EUCountryCosts {
  country: EUCountry;
  costPerDay: CostBand;
  currency: string;
  fxRate: number;
  fxBuffer: number;
  bufferedRate: number;
}

export interface HODRates {
  dop: number;
  firstAD: number;
  productionDesigner: number;
  wardrobeStylist: number;
  travelDayRate: number; // 50% of shoot day rate
}

export interface UKAboveLineCosts {
  crewFees: {
    director: number;
    producer: number;
    dop: number;
    firstAD: number;
    productionDesigner: number;
    wardrobeStylist: number;
    wardrobeAssistant: number;
  };
  totalFees: number;
  travelCosts: number;
  hotelCosts: number;
  perDiems: number;
  preProductionCosts: number;  // Casting, storyboards, wardrobe sourcing, office/admin
  insurance: number;
  total: number;
  notes: string[];
}

export interface ProductionCostEstimate {
  shootDays: number;
  costPerDay: CostBand;
  totalProduction: CostBand;
  hodCosts: number;
  travelDays: number;
  travelCost: number;
  ukAboveLineCosts?: UKAboveLineCosts; // Only for EU shoots
  notes: string[];
}

export interface PostProductionBand {
  minimum: number;
  maximum: number;
  vfxAdjusted: boolean;
  notes: string[];
}

export interface TalentUsageEstimate {
  category: 'Principal Featured' | 'Secondary Featured' | 'Walk-on' | 'Background' | 'Hero' | 'Featured' | 'WalkOn' | 'Extras';
  count: number;
  bsfPerPerson: number;
  usagePerPerson: CostBand;
  totalBsf: number;
  totalUsage: CostBand;
}

export interface TalentCostEstimate {
  estimates: TalentUsageEstimate[];
  totalBsf: number;
  totalUsageMin: number;
  totalUsageMax: number;
  notes: string[];
}

// ============================================
// PIBS CHECK
// ============================================

export interface PIBSItem {
  category: string;
  present: boolean;
  required: boolean;
  note?: string;
}

export interface PIBSCheck {
  items: PIBSItem[];
  isComplete: boolean;
  isClientSafe: boolean;
  missingCritical: string[];
  warnings: string[];
}

// ============================================
// ASSUMPTIONS VS REALITY
// ============================================

export interface AssumptionComparison {
  label: string;
  assumed: string | number | null;
  reality: string | number;
  status: AssumptionStatus;
  note?: string;
}

// ============================================
// FINAL ASSESSMENT OUTPUT
// ============================================

export interface AssessmentOutput {
  // 1. Feasibility Verdict (headline)
  verdict: Verdict;
  verdictReason: string;  // One-line explanation

  // 2. Why this verdict? (Top 3-5 reasons)
  whyThisVerdict: string[];

  // 3. Assumptions vs Reality
  assumptionsVsReality: AssumptionComparison[];

  // 4. Shoot days & schedule reality
  recommendedShootDays: number;
  avgShotsPerDay: number;
  highRiskDays: number[];
  companyMovePressure: { flagged: boolean; reason?: string };
  schedule: ScheduleSimulation;

  // 5. Production scale & budget bands
  productionScale: ProductionScale;
  productionCost: ProductionCostEstimate;

  // 6. Post-production reality check
  postProduction: PostProductionBand;
  postUnderAllowed: boolean;

  // 7. Talent & usage exposure summary
  talentCost: TalentCostEstimate;
  talentSummary: {
    heroPrincipal: number;
    featured: number;
    walkOns: number;
    peakExtras: number;
  };
  usageExposureRange: { min: number; max: number };

  // 8. PIBS / client-safety check
  pibsCheck: PIBSCheck;
  pibsWarnings: string[];  // Checklist-style warnings

  // 9. What to challenge first (action items)
  whatToChallenge: string[];

  // 10. Copy-ready summary
  copyReadySummary: string;

  // 11. Producer summary (technical + risks + checklist)
  producerSummary: {
    technical: string[];
    risks: string[];
    checklist: string[];
  };

  // Internal (hidden from UI)
  riskScore: number;
  confidence: Confidence;
  flags: RuleFlag[];

  // Metadata
  assessedAt: Date;
  inputHash: string;
}

// ============================================
// CONSTANTS CONFIG
// ============================================

export interface FeasibilityConfig {
  scheduleConstants: ScheduleConstants;
  verdictThresholds: {
    green: { max: number };
    amber: { min: number; max: number };
    red: { min: number };
  };
  overrunRanges: {
    green: { min: number; max: number };
    amber: { min: number; max: number };
    red: { min: number; max: number };
  };
  hodRates: HODRates;
  euCountryCosts: Record<EUCountry, EUCountryCosts>;
  postFloors: {
    minimum: number;
    vfxHeavy: { min: number; max: number };
  };
  talentUsageRates: Record<UsageTerritory, {
    hero: CostBand;
    featured: CostBand;
  }>;
}

// ============================================
// PRODUCTION ASSUMPTIONS / LOCATION GROUPINGS
// ============================================

export interface LocationGroup {
  id: string;
  name: string;           // User-friendly name (e.g., "Beach Location", "Studio")
  sceneNumbers: number[]; // Scenes that can be shot at this location
  notes?: string;         // Why these scenes can be grouped
}

export interface ProductionAssumptions {
  // Location groupings - scenes that can be consolidated to same location
  locationGroups: LocationGroup[];

  // MOCO alternatives - can VFX replace MOCO for specific scenes?
  mocoAlternatives: {
    enabled: boolean;                    // Global toggle
    sceneOverrides: Record<number, boolean>; // Per-scene overrides
    notes?: string;                      // e.g., "Client approved post-VFX approach for flying bottles"
  };

  // 2nd Unit - confirmed that location permits parallel food/product unit
  secondUnitAvailable: boolean;          // User confirmed 2nd unit can run in parallel
  secondUnitNotes?: string;              // e.g., "Kitchen allows two crews side by side"

  // Golden hour efficiency
  goldenHourGrouped: boolean;            // Are golden hour scenes scheduled back-to-back?
  goldenHourNotes?: string;

  // Night shoot efficiency
  nightScenesGrouped: boolean;           // Are night scenes grouped into single overnight?
  nightShootNotes?: string;

  // General schedule assumptions
  experiencedCrew: boolean;              // Assumes faster execution (10+ setups/day possible)
  nearbyLocations: boolean;              // All locations within 15 min of each other
  studioAvailable: boolean;              // Can consolidate INT scenes to studio

  // Calculated results (populated by engine)
  adjustedCompanyMoves?: number;
  adjustedShootDays?: number;
  savingsNotes?: string[];
}
