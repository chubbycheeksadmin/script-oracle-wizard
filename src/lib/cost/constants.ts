// ============================================
// PRODUCTION FEASIBILITY ENGINE - COST CONSTANTS
// ============================================

import { FeasibilityConfig, EUCountry, EUCountryCosts, CostBand } from '@/types';

// ============================================
// HOD RATES (Apply to ALL budgets - UK and EU)
// These are senior crew planning rates
// ============================================

export const HOD_RATES = {
  dop: 3000,              // DOP: £3,000 / shoot day
  firstAD: 900,           // 1st AD: £900 / shoot day
  productionDesigner: 950, // Production Designer: £900-1,000 / shoot day (using midpoint)
  wardrobeStylist: 850,   // Wardrobe Stylist: £850 / shoot day
  travelDayRate: 0.5,     // Travel & down days: 50% of shoot-day rate
};

// ============================================
// HOD PREP DAYS (UK shoots only)
// Prep days are calculated in addition to shoot days
// ============================================

export const HOD_PREP_DAYS = {
  dop: {
    // DOP prep: recce + pre-light days
    // Typically recce + 1 pre-light per shoot day (minimum 1)
    recce: 1,
    preLightPerShootDay: 1,
    minPreLight: 1,
  },
  productionDesigner: {
    // Production Designer: approximately 10 prep days + shoot days
    basePrepDays: 10,
  },
  wardrobeStylist: {
    // Wardrobe Stylist: approximately 8 prep days (including returns) + shoot days
    basePrepDays: 8,
  },
  firstAD: {
    // 1st AD: approximately 4 prep days + shoot days
    basePrepDays: 4,
  },
};

// ============================================
// SCHEDULE CONSTANTS (APA-style)
// NOTE: A "setup" is a camera/lighting configuration.
// Multiple shots can share the same setup.
// Average 6-8 setups per day is realistic at standard complexity.
// ============================================

export const SCHEDULE_CONSTANTS = {
  totalDayMinutes: 660,        // 11 hours total
  workingMinutes: 600,         // 10 working hours
  lunchMinutes: 60,            // 1 hour lunch (mandatory)
  turnoverMinutes: 90,         // 1.5 hours from crew call to turnover

  // Setup timing (a setup is a camera/lighting configuration)
  avgSetupMinutes: 45,         // Average setup time (camera, lights, blocking)
  avgShotsPerSetup: 3,         // Average shots captured per setup
  avgSetupsPerDay: 7,          // Target 6-8 setups per day at standard complexity

  // Legacy shot timing (for backward compatibility)
  avgShotExecutionMinutes: 40, // Average shot execution
  avgResetMinutes: 30,         // Average reset between different camera setups

  // Technical complexity
  technicalSetupMinutes: 75,   // Technical or hero product setup minimum
  technicalShotMinutes: 60,    // Technical or hero product shot (legacy)

  // Company moves
  companyMoveMinutes: 60,      // Company move travel time
  companyMoveResetMinutes: 45, // Re-setup after company move
};

// ============================================
// CHILDREN'S WORKING HOURS (UK Regulations)
// These are legal maximums - plan conservatively
// ============================================

export const CHILDREN_WORKING_HOURS = {
  under5: {
    maxTotalHours: 5,          // Maximum 5 hours on set
    maxPerformanceHours: 2,    // Maximum 2 hours performing
    description: 'Children under 5: max 5hrs on set, 2hrs performance',
  },
  age5to8: {
    maxTotalHours: 8,          // Maximum 8 hours on set
    maxPerformanceHours: 3,    // Maximum 3 hours performing
    description: 'Children 5-8: max 8hrs on set, 3hrs performance',
  },
  age9Plus: {
    maxTotalHours: 9.5,        // Maximum 9.5 hours on set
    maxPerformanceHours: 5,    // Maximum 5 hours performing
    description: 'Children 9+: max 9.5hrs on set, 5hrs performance',
  },
};

// ============================================
// VERDICT THRESHOLDS
// ============================================

export const VERDICT_THRESHOLDS = {
  green: { max: 3.0 },
  amber: { min: 3.1, max: 6.5 },
  red: { min: 6.6 },
};

export const OVERRUN_RANGES = {
  green: { min: 0, max: 10 },   // 0-10%
  amber: { min: 10, max: 25 },  // 10-25%
  red: { min: 25, max: 50 },    // 25-50%
};

// ============================================
// EU SERVICE COMPANY COSTS PER SHOOT DAY
// (local crew + kit + studio/locations + art dept + catering + local logistics)
// Does NOT include: UK above-the-line, UK crew travel, insurance, post
// ============================================

export const EU_AVERAGE_COSTS: CostBand = {
  lean: 85000,      // Simple shoot, minimal builds
  standard: 110000,  // Standard commercial
  ambitious: 140000, // Studio builds, MOCO, complex art dept
};

export const EU_COUNTRY_COSTS: Record<EUCountry, EUCountryCosts> = {
  EU_Average: {
    country: 'EU_Average',
    costPerDay: { lean: 85000, standard: 110000, ambitious: 140000 },
    currency: 'GBP',
    fxRate: 1,
    fxBuffer: 0,
    bufferedRate: 1,
  },
  Poland: {
    country: 'Poland',
    costPerDay: { lean: 90000, standard: 115000, ambitious: 145000 },
    currency: 'PLN',
    fxRate: 4.8422,
    fxBuffer: 0.02, // 2%
    bufferedRate: 4.7454,
  },
  Bulgaria: {
    country: 'Bulgaria',
    costPerDay: { lean: 70000, standard: 95000, ambitious: 120000 },
    currency: 'BGN',
    fxRate: 2.2485,
    fxBuffer: 0.02, // 2%
    bufferedRate: 2.2035,
  },
  Czech: {
    country: 'Czech',
    costPerDay: { lean: 95000, standard: 120000, ambitious: 150000 },
    currency: 'CZK',
    fxRate: 27.967,
    fxBuffer: 0.02, // 2%
    bufferedRate: 27.4077,
  },
  Serbia: {
    country: 'Serbia',
    costPerDay: { lean: 65000, standard: 90000, ambitious: 115000 },
    currency: 'RSD',
    fxRate: 134.96,
    fxBuffer: 0.03, // 3%
    bufferedRate: 130.9112,
  },
  Georgia: {
    country: 'Georgia',
    costPerDay: { lean: 60000, standard: 85000, ambitious: 110000 },
    currency: 'GEL',
    fxRate: 3.6181,
    fxBuffer: 0.03, // 3%
    bufferedRate: 3.5096,
  },
  Spain: {
    country: 'Spain',
    costPerDay: { lean: 105000, standard: 130000, ambitious: 165000 },
    currency: 'EUR',
    fxRate: 1.20,
    fxBuffer: 0.03, // 3%
    bufferedRate: 1.236,
  },
  Portugal: {
    country: 'Portugal',
    costPerDay: { lean: 95000, standard: 115000, ambitious: 145000 },
    currency: 'EUR',
    fxRate: 1.20,
    fxBuffer: 0.03, // 3%
    bufferedRate: 1.236,
  },
};

// ============================================
// UK ABOVE-THE-LINE FOR EU SHOOTS
// These are UK-based crew who travel to EU shoots
// Paid separately from EU service company
// All rates are per day, travel days at 50% rate
// ============================================

export const UK_ABOVE_LINE_EU = {
  // Director - project fee, approx per shoot day. Tiered by experience:
  // Top tier: £14k/day, Standard: £12k/day, Less experienced: £10k/day
  director: {
    dayRate: 12000, // £12k per shoot day (standard)
    dayRateLean: 10000,     // Less experienced directors
    dayRateStandard: 12000, // Standard directors
    dayRateAmbitious: 14000, // Top tier directors
    prepDays: 0,    // Included in project fee
  },
  producer: {
    dayRate: 8000,  // £8k per shoot day
    prepDays: 0,    // Included in day rate
  },

  // DOP - day rate + prep days + travel at half
  dop: {
    dayRate: 3000,  // £3k per shoot day
    prepDays: 5,    // 4-5 days prep before shoot (recce, tech scout, pre-light)
    travelDays: 2,  // Out + return at 50% rate
  },

  // 1st AD - same structure as DOP
  firstAD: {
    dayRate: 900,   // £900 per day
    prepDays: 5,    // 4-5 days prep
    travelDays: 2,  // At 50% rate
  },

  // Production Designer - same structure as DOP
  productionDesigner: {
    dayRate: 900,   // £900 per day
    prepDays: 5,    // 4-5 days prep
    travelDays: 2,  // At 50% rate
  },

  // Wardrobe Stylist - needs more prep + traveling assistant
  wardrobeStylist: {
    dayRate: 850,   // £850 per day
    prepDays: 6,    // 6 prep days (EU wardrobe can be poor)
    travelDays: 2,  // At 50% rate
    needsAssistant: true,
    assistantDayRate: 500, // £500 per day for same duration
  },

  // Travel costs per person
  travel: {
    flightPerPerson: { lean: 500, standard: 750, ambitious: 1000 }, // Return flights
    hotelPerNight: { lean: 180, standard: 250, ambitious: 350 },
    perDiemPerDay: 100, // Daily allowance
  },

  // Pre-production costs (often underbudgeted)
  // Covers: casting, storyboards/animatics, wardrobe sourcing, office/admin
  preProduction: {
    casting: { lean: 5000, standard: 8000, ambitious: 12000 },
    storyboards: { lean: 3000, standard: 5000, ambitious: 8000 },
    wardrobeSourcing: { lean: 5000, standard: 8000, ambitious: 15000 },
    officeAdmin: { lean: 2000, standard: 3000, ambitious: 5000 },
  },

  // Insurance (UK policy covering EU shoot)
  insurance: {
    baseRate: 0.025, // 2.5% of production budget
    minimum: 10000,
    maximum: 18000,
  },
};

// ============================================
// EU PREP MULTIPLIER
// Extra prep/travel days for EU shoots
// ============================================

export const EU_PREP_MULTIPLIER = {
  extraPrepDays: 3, // Extra prep days for recce & logistics in EU
};

// ============================================
// UK (APA) PRODUCTION COST BANDS
// These are indicative planning bands, not full line budgets
// Reflects realistic UK APA shoot costs for 2024-2025
// Based on real bid data: Gousto (2 days, 2nd unit, swing crews) = £475k = ~£237k/day
// ============================================

export const UK_PRODUCTION_COSTS: CostBand = {
  lean: 180000,     // £180k/day - simple shoot, minimal locations, small crew
  standard: 215000, // £215k/day - standard commercial, some complexity
  ambitious: 250000, // £250k/day - multiple locations, 2nd unit, complex setups (e.g. Gousto)
};

// ============================================
// POST-PRODUCTION FLOORS
// ============================================

export const POST_FLOORS = {
  minimum: 80000,  // £80k minimum for: online + grade + sound + music + deliverables
  vfxHeavy: {
    min: 120000,   // £120k minimum if VFX/CG heavy
    max: 180000,   // £180k upper band for heavy VFX
  },
};

// ============================================
// TALENT FEES AND USAGE HEURISTICS
// Based on UK advertising industry standards
// ============================================

export const TALENT_BSF_RATES = {
  // Basic Session Fees (per shoot day)
  // PF = Principal Featured, SF = Secondary Featured
  principalFeatured: 350,   // PF: £350 per shoot day
  secondaryFeatured: 350,   // SF: £350 per shoot day
  walkOn: 500,              // WO: £500 per shoot day
  background: 120,          // BG: £120 per shoot day

  // Legacy aliases for compatibility
  hero: 350,
  featured: 350,
  extras: 120,
};

// Additional talent fees per person
export const TALENT_ADDITIONAL_FEES = {
  fittingSession: 50,       // Fittings: £50 for 2 hours
  travelRestDay: 175,       // Travel/rest day rate
  rehearsalDay: 175,        // Rehearsal day rate
  callback: 50,             // Callbacks: £50 per person

  // Overtime rates per hour
  overtimeRatePF: 70,       // PF/SF OT rate
  overtimeRateWO: 100,      // Walk-on OT rate

  // Typical prep assumptions (fitting + travel)
  avgFittingsPerTalent: 1,  // Average 1 fitting session
  avgTravelDaysPerTalent: 0.5, // Some talent need travel days
};

// Usage/Buyout rates (per person, per year)
// Based on: All AV, Sponsorship, OOH, Audio, Display, Social, PPC
export const TALENT_USAGE_RATES = {
  UK: {
    // UK only, 1 year all media
    principalFeatured: { lean: 4500, standard: 5000, ambitious: 5500 },
    secondaryFeatured: { lean: 2700, standard: 3000, ambitious: 3300 },
    // Legacy aliases
    hero: { lean: 4500, standard: 5000, ambitious: 5500 },
    featured: { lean: 2700, standard: 3000, ambitious: 3300 },
  },
  US: {
    // US only, 1 year all media (higher rates)
    principalFeatured: { lean: 7000, standard: 8000, ambitious: 9000 },
    secondaryFeatured: { lean: 4500, standard: 5000, ambitious: 5500 },
    hero: { lean: 7000, standard: 8000, ambitious: 9000 },
    featured: { lean: 4500, standard: 5000, ambitious: 5500 },
  },
  Worldwide: {
    // Worldwide, 1 year all media
    principalFeatured: { lean: 10000, standard: 12000, ambitious: 14000 },
    secondaryFeatured: { lean: 6000, standard: 7500, ambitious: 9000 },
    hero: { lean: 10000, standard: 12000, ambitious: 14000 },
    featured: { lean: 6000, standard: 7500, ambitious: 9000 },
  },
};

// Year-on-year renewal uplift
export const USAGE_RENEWAL_UPLIFT = 0.10; // +10% per year for renewals

// ============================================
// CONFIDENCE THRESHOLDS
// ============================================

export const CONFIDENCE_THRESHOLDS = {
  high: 10, // ≥10 key fields filled
  medium: 6, // 6-9 key fields filled
  low: 5,   // ≤5 key fields filled
};

// ============================================
// COMPLETE CONFIG OBJECT
// ============================================

export const DEFAULT_CONFIG: FeasibilityConfig = {
  scheduleConstants: SCHEDULE_CONSTANTS,
  verdictThresholds: VERDICT_THRESHOLDS,
  overrunRanges: OVERRUN_RANGES,
  hodRates: {
    dop: HOD_RATES.dop,
    firstAD: HOD_RATES.firstAD,
    productionDesigner: HOD_RATES.productionDesigner,
    wardrobeStylist: HOD_RATES.wardrobeStylist,
    travelDayRate: HOD_RATES.travelDayRate,
  },
  euCountryCosts: EU_COUNTRY_COSTS,
  postFloors: POST_FLOORS,
  talentUsageRates: TALENT_USAGE_RATES,
};

// ============================================
// HELPER: Convert local currency to GBP
// ============================================

export function convertToGBP(localAmount: number, country: EUCountry): number {
  const countryData = EU_COUNTRY_COSTS[country];
  if (!countryData || countryData.currency === 'GBP') {
    return localAmount;
  }
  return localAmount / countryData.bufferedRate;
}

// ============================================
// HELPER: Get cost band for context
// ============================================

export function getCostBandForContext(
  context: 'UK' | 'EU',
  country?: EUCountry
): CostBand {
  if (context === 'UK') {
    return UK_PRODUCTION_COSTS;
  }

  if (country && EU_COUNTRY_COSTS[country]) {
    return EU_COUNTRY_COSTS[country].costPerDay;
  }

  return EU_AVERAGE_COSTS;
}
