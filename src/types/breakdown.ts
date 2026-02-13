// ============================================
// AI BREAKDOWN TYPES - Producer-level script analysis
// ============================================

export type ActionDensity = 'low' | 'medium' | 'high';
export type VFXSFXLevel = 'none' | 'light' | 'heavy';
export type PropsLevel = 'none' | 'practical' | 'hero';

export interface SceneComplexity {
  actionDensity: ActionDensity;
  technicalComplexity: boolean;
  technicalNotes: string | null;
  productHeroMoment: boolean;
  productHeroNotes: string | null;
  vfxSfxLevel: VFXSFXLevel;
  vfxSfxNotes: string | null;
  mocoLikely?: boolean; // true if flying objects, repeatable precision moves, or complex VFX tracking
  mocoNotes?: string | null;
  highSpeedViable?: boolean; // false if night/dusk scene where high-speed camera won't work
  highSpeedNotes?: string | null; // note if lighting constraints affect high-speed
}

export interface SceneArtDeptBreakdown {
  setDressingRequired: boolean;
  propsLevel: PropsLevel;
  buildImplied: boolean;
  specialItems: string[];
  notes: string | null;
}

export interface SceneWardrobeBreakdown {
  principalNeeds: string | null;
  featuredExtrasNeeds: string | null;
  multiplesRequired: boolean;
  quickChanges: boolean;
  notes: string | null;
}

export interface TalentGroup {
  count: number;
  descriptions: string[];
}

export interface SceneTalentBreakdown {
  heroPrincipal: TalentGroup;
  featured: TalentGroup;
  walkOns: TalentGroup;
  extras: TalentGroup;
  hasDialogue: boolean;
  hasFeaturedAction: boolean;
}

export interface SceneScheduleBreakdown {
  estimatedShots: number;
  shotBreakdown: string[];
  estimatedMinutes: number;
  scheduleNotes: string | null;
  pressurePoints: string[];
}

export interface AISceneBreakdown {
  sceneNumber: number;
  intExt: 'INT' | 'EXT' | 'INT/EXT';
  dayNight: 'DAY' | 'NIGHT' | 'DUSK' | 'DAWN';
  locationName: string;
  isNewLocation: boolean;
  isReturnLocation: boolean;
  companyMoveRisk: boolean;
  description: string;

  complexity: SceneComplexity;
  artDept: SceneArtDeptBreakdown;
  wardrobe: SceneWardrobeBreakdown;
  talent: SceneTalentBreakdown;
  schedule: SceneScheduleBreakdown;
}

export interface BreakdownRollup {
  totalEstimatedShots: number;
  mainUnitSetups?: number; // setups for main unit only (exclude 2nd unit)
  secondUnitSetups?: number; // setups that can run on 2nd unit (food, product, inserts)
  totalHeroPrincipal: number;
  totalFeatured: number;
  totalWalkOns: number;
  peakExtras: number;
  hasVFX: boolean;
  vfxComplexity: VFXSFXLevel;
  hasTechnicalShots: boolean;
  hasHeroProduct: boolean;
  studioShoot?: boolean; // true if all INT stylized rooms/sets that would be built in studio
  secondUnitPossible?: boolean; // true if food/product shots can run in parallel
  versionEfficiency?: string | null; // e.g., "12 versions share 6 unique setups"
  mocoRequired?: boolean; // true if any scene has flying objects, product in motion, or complex VFX tracking
  mocoSetups?: number; // estimated number of moco setups if mocoRequired
  highSpeedLimited?: boolean; // true if some scenes can't use high-speed due to low light
  hybridApproachNeeded?: boolean; // true if mixed day/night requires different camera approaches
  hybridApproachNotes?: string | null; // e.g., "Day 1: high-speed (daylight), Day 2: MOCO or static (night)"
  goldenHourDependent?: boolean; // true if script requires sunset/sunrise lighting
  nightShootRequired?: boolean; // true if script has night exteriors
  actualLocations?: number; // count of REAL physical locations (not areas within same location)
  locationMoves?: number; // actual company moves between different physical locations
  estimatedShootDays: number;
  scheduleNotes: string[];
}

export interface AIBreakdown {
  totalScenes: number;
  uniqueLocations: number;
  companyMoves: number;
  scenes: AISceneBreakdown[];
  rollup: BreakdownRollup;
}

export interface AIBreakdownResponse {
  scriptExtracted: boolean;
  rawScriptText?: string;
  breakdown?: AIBreakdown;
  error?: string;
  rawResponse?: string;
}
