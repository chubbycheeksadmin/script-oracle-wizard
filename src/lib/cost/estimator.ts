// ============================================
// COST ESTIMATOR - PRODUCTION & TALENT COSTS
// ============================================

import {
  AssessmentInput,
  ProductionCostEstimate,
  PostProductionBand,
  TalentCostEstimate,
  TalentUsageEstimate,
  CostBand,
  ScheduleSimulation,
  UKAboveLineCosts,
} from '@/types';
import {
  HOD_RATES,
  HOD_PREP_DAYS,
  getCostBandForContext,
  POST_FLOORS,
  TALENT_BSF_RATES,
  TALENT_ADDITIONAL_FEES,
  TALENT_USAGE_RATES,
  UK_ABOVE_LINE_EU,
  EU_PREP_MULTIPLIER,
} from './constants';

// ============================================
// CALCULATE HOD PREP DAYS (UK shoots only)
// ============================================

export interface HODPrepDaysBreakdown {
  dop: { prep: number; shoot: number; total: number };
  firstAD: { prep: number; shoot: number; total: number };
  productionDesigner: { prep: number; shoot: number; total: number };
  wardrobeStylist: { prep: number; shoot: number; total: number };
}

export function calculateHODPrepDays(shootDays: number): HODPrepDaysBreakdown {
  // DOP: recce + pre-light days (1 pre-light per shoot day, minimum 1)
  const dopPrepDays = HOD_PREP_DAYS.dop.recce +
    Math.max(HOD_PREP_DAYS.dop.minPreLight, shootDays * HOD_PREP_DAYS.dop.preLightPerShootDay);

  return {
    dop: {
      prep: dopPrepDays,
      shoot: shootDays,
      total: dopPrepDays + shootDays,
    },
    firstAD: {
      prep: HOD_PREP_DAYS.firstAD.basePrepDays,
      shoot: shootDays,
      total: HOD_PREP_DAYS.firstAD.basePrepDays + shootDays,
    },
    productionDesigner: {
      prep: HOD_PREP_DAYS.productionDesigner.basePrepDays,
      shoot: shootDays,
      total: HOD_PREP_DAYS.productionDesigner.basePrepDays + shootDays,
    },
    wardrobeStylist: {
      prep: HOD_PREP_DAYS.wardrobeStylist.basePrepDays,
      shoot: shootDays,
      total: HOD_PREP_DAYS.wardrobeStylist.basePrepDays + shootDays,
    },
  };
}

// ============================================
// CALCULATE HOD COSTS (Apply to ALL budgets)
// UK includes prep days, EU is shoot days only
// ============================================

export function calculateHODCosts(
  shootDays: number,
  travelDays: number = 0,
  isUK: boolean = true
): { total: number; breakdown: HODPrepDaysBreakdown | null; notes: string[] } {
  const notes: string[] = [];
  let dopDays = shootDays;
  let firstADDays = shootDays;
  let prodDesignerDays = shootDays;
  let wardrobeStylistDays = shootDays;
  let prepBreakdown: HODPrepDaysBreakdown | null = null;

  // UK shoots include prep days
  if (isUK) {
    prepBreakdown = calculateHODPrepDays(shootDays);
    dopDays = prepBreakdown.dop.total;
    firstADDays = prepBreakdown.firstAD.total;
    prodDesignerDays = prepBreakdown.productionDesigner.total;
    wardrobeStylistDays = prepBreakdown.wardrobeStylist.total;

    notes.push(`DOP: ${prepBreakdown.dop.prep} prep + ${shootDays} shoot = ${dopDays} days`);
    notes.push(`1st AD: ${prepBreakdown.firstAD.prep} prep + ${shootDays} shoot = ${firstADDays} days`);
    notes.push(`Prod Designer: ${prepBreakdown.productionDesigner.prep} prep + ${shootDays} shoot = ${prodDesignerDays} days`);
    notes.push(`Wardrobe: ${prepBreakdown.wardrobeStylist.prep} prep + ${shootDays} shoot = ${wardrobeStylistDays} days`);
  }

  // Calculate costs
  const dopCost = HOD_RATES.dop * dopDays;
  const firstADCost = HOD_RATES.firstAD * firstADDays;
  const prodDesignerCost = HOD_RATES.productionDesigner * prodDesignerDays;
  const wardrobeStylistCost = HOD_RATES.wardrobeStylist * wardrobeStylistDays;

  // Travel days at 50% rate (EU shoots)
  const travelDayCost = travelDays * HOD_RATES.travelDayRate * (
    HOD_RATES.dop + HOD_RATES.firstAD + HOD_RATES.productionDesigner + HOD_RATES.wardrobeStylist
  );

  const total = dopCost + firstADCost + prodDesignerCost + wardrobeStylistCost + travelDayCost;

  return { total, breakdown: prepBreakdown, notes };
}

// ============================================
// CALCULATE UK ABOVE-THE-LINE COSTS FOR EU SHOOTS
// Director, Producer, DOP, 1st AD, Prod Designer, Wardrobe travel from UK
// ============================================

export function calculateUKAboveLineForEU(
  shootDays: number,
  productionBudget: number = 0
): UKAboveLineCosts {
  const notes: string[] = [];
  const uk = UK_ABOVE_LINE_EU;
  const travelDays = 2; // Out + return

  // ========================================
  // CREW FEES CALCULATION
  // ========================================

  // Director: flat rate per shoot day
  const directorFee = uk.director.dayRate * shootDays;

  // Producer: flat rate per shoot day
  const producerFee = uk.producer.dayRate * shootDays;

  // DOP: day rate × (shoot + prep) + travel at 50%
  const dopTotalDays = shootDays + uk.dop.prepDays;
  const dopTravelCost = uk.dop.dayRate * 0.5 * uk.dop.travelDays;
  const dopFee = (uk.dop.dayRate * dopTotalDays) + dopTravelCost;

  // 1st AD: same structure as DOP
  const adTotalDays = shootDays + uk.firstAD.prepDays;
  const adTravelCost = uk.firstAD.dayRate * 0.5 * uk.firstAD.travelDays;
  const firstADFee = (uk.firstAD.dayRate * adTotalDays) + adTravelCost;

  // Production Designer: same structure as DOP
  const pdTotalDays = shootDays + uk.productionDesigner.prepDays;
  const pdTravelCost = uk.productionDesigner.dayRate * 0.5 * uk.productionDesigner.travelDays;
  const prodDesignerFee = (uk.productionDesigner.dayRate * pdTotalDays) + pdTravelCost;

  // Wardrobe Stylist: day rate × (shoot + prep) + travel at 50%
  const wardrobeTotalDays = shootDays + uk.wardrobeStylist.prepDays;
  const wardrobeTravelCost = uk.wardrobeStylist.dayRate * 0.5 * uk.wardrobeStylist.travelDays;
  const wardrobeFee = (uk.wardrobeStylist.dayRate * wardrobeTotalDays) + wardrobeTravelCost;

  // Wardrobe Assistant: same duration as stylist
  const assistantFee = uk.wardrobeStylist.assistantDayRate * wardrobeTotalDays +
    (uk.wardrobeStylist.assistantDayRate * 0.5 * uk.wardrobeStylist.travelDays);

  const totalFees = directorFee + producerFee + dopFee + firstADFee + prodDesignerFee + wardrobeFee + assistantFee;

  notes.push('UK Above-the-Line (traveling to EU):');
  notes.push(`  Director: £${directorFee.toLocaleString()} (${shootDays} shoot days × £${uk.director.dayRate.toLocaleString()})`);
  notes.push(`  Producer: £${producerFee.toLocaleString()} (${shootDays} shoot days × £${uk.producer.dayRate.toLocaleString()})`);
  notes.push(`  DOP: £${dopFee.toLocaleString()} (${dopTotalDays} days + travel)`);
  notes.push(`  1st AD: £${firstADFee.toLocaleString()} (${adTotalDays} days + travel)`);
  notes.push(`  Prod Designer: £${prodDesignerFee.toLocaleString()} (${pdTotalDays} days + travel)`);
  notes.push(`  Wardrobe: £${wardrobeFee.toLocaleString()} (${wardrobeTotalDays} days + travel)`);
  notes.push(`  Wardrobe Asst: £${assistantFee.toLocaleString()} (${wardrobeTotalDays} days + travel)`);
  notes.push(`  Crew fees subtotal: £${totalFees.toLocaleString()}`);

  // ========================================
  // TRAVEL COSTS
  // ========================================

  // Count UK crew traveling: Director, Producer, DOP, 1st AD, Prod Designer, Wardrobe, Wardrobe Asst = 7
  const ukCrewCount = 7;

  // Flights for all crew (standard rate)
  const flightCosts = ukCrewCount * uk.travel.flightPerPerson.standard;

  // Calculate days on location for each crew member
  // Most crew: shoot days + their prep days + travel nights
  // Use the longest prep (wardrobe) for hotel calculation as they're all there together
  const maxPrepDays = Math.max(uk.dop.prepDays, uk.firstAD.prepDays, uk.productionDesigner.prepDays, uk.wardrobeStylist.prepDays);
  const hotelNights = shootDays + maxPrepDays + travelDays;

  const hotelCosts = ukCrewCount * hotelNights * uk.travel.hotelPerNight.standard;

  // Per diems for all crew on location
  const daysOnLocation = shootDays + maxPrepDays;
  const perDiems = ukCrewCount * daysOnLocation * uk.travel.perDiemPerDay;

  notes.push('');
  notes.push('Travel & Accommodation:');
  notes.push(`  Flights (${ukCrewCount} crew): £${flightCosts.toLocaleString()}`);
  notes.push(`  Hotels (${hotelNights} nights × ${ukCrewCount} crew): £${hotelCosts.toLocaleString()}`);
  notes.push(`  Per diems (${daysOnLocation} days × ${ukCrewCount} crew): £${perDiems.toLocaleString()}`);

  const totalTravel = flightCosts + hotelCosts + perDiems;
  notes.push(`  Travel subtotal: £${totalTravel.toLocaleString()}`);

  // ========================================
  // PRE-PRODUCTION COSTS (often underbudgeted)
  // ========================================

  const castingCost = uk.preProduction.casting.standard;
  const storyboardsCost = uk.preProduction.storyboards.standard;
  const wardrobeSourcingCost = uk.preProduction.wardrobeSourcing.standard;
  const officeAdminCost = uk.preProduction.officeAdmin.standard;
  const totalPreProduction = castingCost + storyboardsCost + wardrobeSourcingCost + officeAdminCost;

  notes.push('');
  notes.push('Pre-production (UK-side):');
  notes.push(`  Casting: £${castingCost.toLocaleString()}`);
  notes.push(`  Storyboards/animatics: £${storyboardsCost.toLocaleString()}`);
  notes.push(`  Wardrobe sourcing: £${wardrobeSourcingCost.toLocaleString()}`);
  notes.push(`  Office/admin: £${officeAdminCost.toLocaleString()}`);
  notes.push(`  Pre-production subtotal: £${totalPreProduction.toLocaleString()}`);

  // ========================================
  // INSURANCE
  // ========================================

  const estimatedBudget = productionBudget > 0 ? productionBudget : (totalFees + totalTravel + totalPreProduction) * 2;
  const insuranceCost = Math.max(
    uk.insurance.minimum,
    Math.min(uk.insurance.maximum, Math.round(estimatedBudget * uk.insurance.baseRate))
  );

  notes.push('');
  notes.push(`Insurance: £${insuranceCost.toLocaleString()}`);

  // ========================================
  // TOTAL
  // ========================================

  const total = totalFees + flightCosts + hotelCosts + perDiems + totalPreProduction + insuranceCost;

  notes.push('');
  notes.push(`TOTAL UK Above-the-Line: £${total.toLocaleString()}`);

  return {
    crewFees: {
      director: directorFee,
      producer: producerFee,
      dop: dopFee,
      firstAD: firstADFee,
      productionDesigner: prodDesignerFee,
      wardrobeStylist: wardrobeFee,
      wardrobeAssistant: assistantFee,
    },
    totalFees,
    travelCosts: flightCosts,
    hotelCosts,
    perDiems,
    preProductionCosts: totalPreProduction,
    insurance: insuranceCost,
    total,
    notes,
  };
}

// ============================================
// DAY COUNT EFFICIENCY FACTOR
// Costs don't scale linearly - 1 day is more efficient than multi-day
// ============================================
function getDayEfficiencyFactor(days: number): number {
  if (days === 1) return 0.55;      // 1 day: 55% of multi-day rate (simpler crew, less overhead)
  if (days === 2) return 0.75;      // 2 days: 75% of multi-day rate
  if (days === 3) return 0.90;      // 3 days: 90% of multi-day rate
  return 1.0;                       // 4+ days: full multi-day rates apply
}

// ============================================
// ESTIMATE PRODUCTION COSTS
// ============================================

export function estimateProductionCosts(
  input: AssessmentInput,
  schedule: ScheduleSimulation
): ProductionCostEstimate {
  // IMPORTANT: Use proposed shoot days for cost calculation
  // The schedule.totalDaysRequired tells us what's needed, but costs should
  // be based on what the user proposes to budget for
  const shootDays = input.proposedShootDays || schedule.totalDaysRequired || 1;
  const notes: string[] = [];

  // Get cost band based on context
  const costPerDay = getCostBandForContext(input.shootingContext, input.euCountry);

  // Apply day-count efficiency factor (1-day shoots are cheaper per day)
  const efficiencyFactor = getDayEfficiencyFactor(shootDays);
  const adjustedCostPerDay: CostBand = {
    lean: Math.round(costPerDay.lean * efficiencyFactor),
    standard: Math.round(costPerDay.standard * efficiencyFactor),
    ambitious: Math.round(costPerDay.ambitious * efficiencyFactor),
  };

  const isUK = input.shootingContext === 'UK';

  if (isUK) {
    // ========================================
    // UK SHOOT COSTS
    // ========================================

    // Calculate HOD costs with prep days
    const hodResult = calculateHODCosts(shootDays, 0, true);
    const hodCosts = hodResult.total;

    // Add HOD breakdown notes
    if (hodResult.breakdown) {
      notes.push('UK shoot includes HOD prep days:');
      hodResult.notes.forEach(note => notes.push(`  ${note}`));
    }
    notes.push(`Total HOD costs: £${hodCosts.toLocaleString()}`);

    // Note efficiency factor for short shoots
    if (efficiencyFactor < 1.0) {
      notes.push(`Day-count efficiency: ${shootDays} day shoot = ${Math.round(efficiencyFactor * 100)}% of multi-day rate`);
    }

    // Calculate total production costs
    const totalProduction: CostBand = {
      lean: (adjustedCostPerDay.lean * shootDays) + hodCosts,
      standard: (adjustedCostPerDay.standard * shootDays) + hodCosts,
      ambitious: (adjustedCostPerDay.ambitious * shootDays) + hodCosts,
    };

    notes.push('UK (APA-style) production costs');

    // Flag if proposed days differ significantly from required
    if (input.proposedShootDays && schedule.totalDaysRequired > input.proposedShootDays) {
      const deficit = schedule.totalDaysRequired - input.proposedShootDays;
      notes.push(`WARNING: Schedule requires ${schedule.totalDaysRequired} days but budgeting for ${input.proposedShootDays} (${deficit} day deficit)`);
    }

    return {
      shootDays,
      costPerDay: adjustedCostPerDay,
      totalProduction,
      hodCosts,
      travelDays: 0,
      travelCost: 0,
      notes,
    };

  } else {
    // ========================================
    // EU SERVICE COMPANY SHOOT COSTS
    // ========================================

    // EU Service Company costs (local crew, kit, studio, art dept)
    const euServiceCosts: CostBand = {
      lean: adjustedCostPerDay.lean * shootDays,
      standard: adjustedCostPerDay.standard * shootDays,
      ambitious: adjustedCostPerDay.ambitious * shootDays,
    };

    // Note efficiency factor for short shoots
    if (efficiencyFactor < 1.0) {
      notes.push(`Day-count efficiency: ${shootDays} day shoot = ${Math.round(efficiencyFactor * 100)}% of multi-day rate`);
    }

    notes.push(`EU Service Company (${input.euCountry || 'EU Average'}):`);
    notes.push(`  ${shootDays} shoot days × £${adjustedCostPerDay.standard.toLocaleString()}/day (adjusted)`);
    notes.push(`  Service company total: £${euServiceCosts.standard.toLocaleString()}`);

    // UK Above-the-Line costs (Director, Producer, DOP, PM + travel)
    const ukAboveLine = calculateUKAboveLineForEU(shootDays, euServiceCosts.standard);

    // Add UK Above-the-Line notes
    notes.push('');
    ukAboveLine.notes.forEach(note => notes.push(note));

    // Extra prep days note
    notes.push('');
    notes.push(`EU shoots include +${EU_PREP_MULTIPLIER.extraPrepDays} prep days for recce & logistics`);

    // Calculate total production costs
    // UK Above-the-Line is fixed (doesn't vary by scale), EU service varies
    const totalProduction: CostBand = {
      lean: euServiceCosts.lean + ukAboveLine.total,
      standard: euServiceCosts.standard + ukAboveLine.total,
      ambitious: euServiceCosts.ambitious + ukAboveLine.total,
    };

    notes.push('');
    notes.push(`TOTAL PRODUCTION: £${totalProduction.standard.toLocaleString()}`);
    notes.push('(EU Service Company + UK Above-the-Line)');

    if (shootDays <= 2) {
      notes.push('');
      notes.push('Note: Short EU shoot (≤2 days) has higher per-day burn');
    }

    // Flag if proposed days differ significantly from required
    if (input.proposedShootDays && schedule.totalDaysRequired > input.proposedShootDays) {
      const deficit = schedule.totalDaysRequired - input.proposedShootDays;
      notes.push(`WARNING: Schedule requires ${schedule.totalDaysRequired} days but budgeting for ${input.proposedShootDays} (${deficit} day deficit)`);
    }

    return {
      shootDays,
      costPerDay: adjustedCostPerDay,
      totalProduction,
      hodCosts: ukAboveLine.totalFees, // UK crew fees (fixed number)
      travelDays: 2,
      travelCost: ukAboveLine.travelCosts + ukAboveLine.hotelCosts + ukAboveLine.perDiems,
      ukAboveLineCosts: ukAboveLine, // Include full breakdown
      notes,
    };
  }
}

// ============================================
// ESTIMATE POST-PRODUCTION COSTS
// ============================================

export function estimatePostProduction(input: AssessmentInput): PostProductionBand {
  const notes: string[] = [];
  let minimum = POST_FLOORS.minimum;
  let maximum = POST_FLOORS.minimum * 1.5; // Default 50% above minimum
  let vfxAdjusted = false;

  // Check for VFX requirements
  if (input.complexity.vfxHeavy) {
    minimum = POST_FLOORS.vfxHeavy.min;
    maximum = POST_FLOORS.vfxHeavy.max;
    vfxAdjusted = true;
    notes.push('Heavy VFX requires £120-180k post budget');
  } else if (input.complexity.vfxLight) {
    minimum = POST_FLOORS.minimum * 1.2; // 20% uplift for light VFX
    maximum = POST_FLOORS.vfxHeavy.min; // Up to £120k
    notes.push('Light VFX adds 20%+ to baseline post');
  }

  // Check deliverables complexity
  const deliverableCount =
    (input.deliverables.tvc30 ? 1 : 0) +
    (input.deliverables.tvc15 ? 1 : 0) +
    (input.deliverables.tvc10 ? 1 : 0) +
    (input.deliverables.socialCutdowns ? 3 : 0) + // Social counts as multiple
    (input.deliverables.vertical916 ? 2 : 0) + // 9:16 requires significant work
    (input.deliverables.stillGrabs ? 1 : 0);

  if (deliverableCount > 5) {
    minimum *= 1.15;
    maximum *= 1.15;
    notes.push('Multiple deliverable versions increase post scope');
  }

  // Check for 9:16 specifically
  if (input.deliverables.vertical916) {
    notes.push('9:16 versions require reframing, not just resize');
  }

  // Fix in post flag
  if (input.complexity.fixInPost) {
    minimum *= 1.1;
    maximum *= 1.2;
    notes.push('"Fix in post" adds 10-20% post contingency');
  }

  // Post minimum message
  notes.push(`Minimum £${(minimum / 1000).toFixed(0)}k covers: online, grade, sound, music, deliverables`);

  return {
    minimum: Math.round(minimum),
    maximum: Math.round(maximum),
    vfxAdjusted,
    notes,
  };
}

// ============================================
// ESTIMATE TALENT COSTS
// Based on UK advertising industry talent breakdown sheets
// Categories: PF (Principal Featured), SF (Secondary Featured), WO (Walk-on), BG (Background)
// ============================================

export function estimateTalentCosts(
  input: AssessmentInput,
  schedule: ScheduleSimulation
): TalentCostEstimate {
  const estimates: TalentUsageEstimate[] = [];
  const notes: string[] = [];
  // Use proposed shoot days for talent costs (same as production costs)
  const shootDays = input.proposedShootDays || schedule.totalDaysRequired || 1;

  // Get talent counts from AI breakdown, script breakdown, or estimate
  let principalFeaturedCount = 0;  // PF - main characters with action/dialogue
  let secondaryFeaturedCount = 0;  // SF - supporting characters with specific action
  let walkOnCount = 0;              // WO - brief visible moments
  let backgroundCount = 0;          // BG - extras/background

  // Priority: AI breakdown > Script breakdown > Input toggles
  if (input.aiBreakdown) {
    const rollup = input.aiBreakdown.rollup;
    // AI breakdown uses Hero/Principal for main characters
    principalFeaturedCount = rollup.totalHeroPrincipal || 0;
    secondaryFeaturedCount = rollup.totalFeatured || 0;
    walkOnCount = rollup.totalWalkOns || 0;
    backgroundCount = rollup.peakExtras || 0;
    notes.push('Talent counts from AI script breakdown');
  } else if (input.scriptBreakdown) {
    const rollup = input.scriptBreakdown.talentRollup;
    principalFeaturedCount = rollup.totalUniqueHeroRoles || 1;
    secondaryFeaturedCount = rollup.totalUniqueFeaturedRoles || 0;
    walkOnCount = rollup.totalWalkOns || 0;
    backgroundCount = rollup.peakExtrasRequirement || 0;
  } else {
    // Fallback estimate based on input toggles
    principalFeaturedCount = input.complexity.multipleHeroTalent ? 3 : 1;
    secondaryFeaturedCount = input.complexity.multipleHeroTalent ? 2 : 0;
  }

  // Get usage rates based on territory
  const usageRates = TALENT_USAGE_RATES[input.usageTerritory];

  // ========================================
  // BSF CALCULATION (per UK talent breakdown sheet)
  // BSF = (BSF rate × shoot days) + fittings + travel days
  // ========================================

  // Estimate average shoot days per talent (some talent only work 1-2 days)
  const avgShootDaysPerPF = Math.min(shootDays, Math.max(1, Math.ceil(shootDays * 0.75)));
  const avgShootDaysPerSF = Math.min(shootDays, Math.max(1, Math.ceil(shootDays * 0.5)));
  const avgShootDaysPerWO = 1; // Walk-ons typically 1 day

  // Fittings: assume 2 fittings for PF, 1-2 for SF, 0 for WO/BG
  const avgFittingsPerPF = 2;
  const avgFittingsPerSF = 1;

  // Travel days: assume ~1 travel day for PF, 0-1 for SF
  const avgTravelDaysPerPF = 1;
  const avgTravelDaysPerSF = 0.5;

  // ========================================
  // PRINCIPAL FEATURED (PF)
  // ========================================
  if (principalFeaturedCount > 0) {
    // BSF calculation: (BSF rate × days) + (fitting fee × fittings) + (travel rate × travel days)
    const bsfPerPerson =
      (TALENT_BSF_RATES.principalFeatured * avgShootDaysPerPF) +
      (TALENT_ADDITIONAL_FEES.fittingSession * avgFittingsPerPF) +
      (TALENT_ADDITIONAL_FEES.travelRestDay * avgTravelDaysPerPF);

    estimates.push({
      category: 'Principal Featured',
      count: principalFeaturedCount,
      bsfPerPerson: Math.round(bsfPerPerson),
      usagePerPerson: usageRates.principalFeatured || usageRates.hero,
      totalBsf: Math.round(bsfPerPerson * principalFeaturedCount),
      totalUsage: {
        lean: (usageRates.principalFeatured || usageRates.hero).lean * principalFeaturedCount,
        standard: (usageRates.principalFeatured || usageRates.hero).standard * principalFeaturedCount,
        ambitious: (usageRates.principalFeatured || usageRates.hero).ambitious * principalFeaturedCount,
      },
    });
  }

  // ========================================
  // SECONDARY FEATURED (SF)
  // ========================================
  if (secondaryFeaturedCount > 0) {
    const bsfPerPerson =
      (TALENT_BSF_RATES.secondaryFeatured * avgShootDaysPerSF) +
      (TALENT_ADDITIONAL_FEES.fittingSession * avgFittingsPerSF) +
      (TALENT_ADDITIONAL_FEES.travelRestDay * avgTravelDaysPerSF);

    estimates.push({
      category: 'Secondary Featured',
      count: secondaryFeaturedCount,
      bsfPerPerson: Math.round(bsfPerPerson),
      usagePerPerson: usageRates.secondaryFeatured || usageRates.featured,
      totalBsf: Math.round(bsfPerPerson * secondaryFeaturedCount),
      totalUsage: {
        lean: (usageRates.secondaryFeatured || usageRates.featured).lean * secondaryFeaturedCount,
        standard: (usageRates.secondaryFeatured || usageRates.featured).standard * secondaryFeaturedCount,
        ambitious: (usageRates.secondaryFeatured || usageRates.featured).ambitious * secondaryFeaturedCount,
      },
    });
  }

  // ========================================
  // WALK-ONS (WO)
  // £500/day, typically 1 day, includes fitting, no usage buyout
  // ========================================
  if (walkOnCount > 0) {
    // Walk-on BSF includes fitting session
    const bsfPerPerson = TALENT_BSF_RATES.walkOn + TALENT_ADDITIONAL_FEES.fittingSession;

    estimates.push({
      category: 'Walk-on',
      count: walkOnCount,
      bsfPerPerson: Math.round(bsfPerPerson),
      usagePerPerson: { lean: 0, standard: 0, ambitious: 0 },
      totalBsf: Math.round(bsfPerPerson * walkOnCount),
      totalUsage: { lean: 0, standard: 0, ambitious: 0 },
    });
  }

  // ========================================
  // BACKGROUND/EXTRAS (BG)
  // £120/day, no fittings, no usage
  // ========================================
  if (backgroundCount > 0) {
    const bsfPerPerson = TALENT_BSF_RATES.background * avgShootDaysPerWO;

    estimates.push({
      category: 'Background',
      count: backgroundCount,
      bsfPerPerson: Math.round(bsfPerPerson),
      usagePerPerson: { lean: 0, standard: 0, ambitious: 0 },
      totalBsf: Math.round(bsfPerPerson * backgroundCount),
      totalUsage: { lean: 0, standard: 0, ambitious: 0 },
    });
  }

  // ========================================
  // CALLBACKS (all talent who attended casting)
  // ========================================
  const totalCastTalent = principalFeaturedCount + secondaryFeaturedCount + walkOnCount;
  const callbackCosts = totalCastTalent * TALENT_ADDITIONAL_FEES.callback;

  // ========================================
  // CALCULATE TOTALS
  // ========================================
  let totalBsf = estimates.reduce((sum, e) => sum + e.totalBsf, 0);
  totalBsf += callbackCosts;

  const totalUsageMin = estimates.reduce((sum, e) => sum + e.totalUsage.lean, 0);
  const totalUsageMax = estimates.reduce((sum, e) => sum + e.totalUsage.ambitious, 0);

  // ========================================
  // GENERATE NOTES
  // ========================================
  notes.push(`Usage territory: ${input.usageTerritory}, ${input.usageTerm || 1} year(s)`);

  // BSF rate info
  notes.push(`PF BSF: £${TALENT_BSF_RATES.principalFeatured}/day + fittings + travel`);
  notes.push(`SF BSF: £${TALENT_BSF_RATES.secondaryFeatured}/day + fittings`);
  if (walkOnCount > 0) {
    notes.push(`WO BSF: £${TALENT_BSF_RATES.walkOn}/day + fitting`);
  }
  if (backgroundCount > 0) {
    notes.push(`BG: £${TALENT_BSF_RATES.background}/day (no usage)`);
  }

  if (callbackCosts > 0) {
    notes.push(`Callbacks: £${callbackCosts.toLocaleString()} (${totalCastTalent} × £${TALENT_ADDITIONAL_FEES.callback})`);
  }

  // Usage info
  if (principalFeaturedCount > 0) {
    const pfUsage = usageRates.principalFeatured || usageRates.hero;
    notes.push(`PF Usage (${input.usageTerritory} 1yr): £${pfUsage.standard.toLocaleString()}/person`);
  }
  if (secondaryFeaturedCount > 0) {
    const sfUsage = usageRates.secondaryFeatured || usageRates.featured;
    notes.push(`SF Usage (${input.usageTerritory} 1yr): £${sfUsage.standard.toLocaleString()}/person`);
  }

  // Warnings
  if (principalFeaturedCount >= 5) {
    notes.push('⚠ High principal count significantly impacts usage exposure');
  }

  if (input.usageTerritory === 'Worldwide') {
    notes.push('⚠ WW usage materially increases talent costs vs UK only');
  }

  // Totals
  notes.push('');
  notes.push(`Total BSF (incl. fittings/callbacks): £${totalBsf.toLocaleString()}`);
  notes.push(`Total Usage: £${totalUsageMin.toLocaleString()} - £${totalUsageMax.toLocaleString()}`);

  return {
    estimates,
    totalBsf,
    totalUsageMin,
    totalUsageMax,
    notes,
  };
}
