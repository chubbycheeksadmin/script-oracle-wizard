// ============================================
// MAIN ASSESSOR - TIES ALL MODULES TOGETHER
// ============================================

import {
  AssessmentInput,
  AssessmentOutput,
  Verdict,
  ProductionScale,
  AssumptionComparison,
  AssumptionStatus,
  ScheduleSimulation,
} from '@/types';
import { parseScript } from '@/lib/parser/scriptParser';
import { simulateSchedule } from '@/lib/schedule/simulator';
import { evaluateRules, determineVerdict, determineConfidence, getVerdictReason, getWhyThisVerdict, getWhatToChallenge } from '@/lib/rules/engine';
import { estimateProductionCosts, estimatePostProduction, estimateTalentCosts } from '@/lib/cost/estimator';
import { checkPIBS } from '@/lib/pibs/checker';
import { POST_FLOORS } from '@/lib/cost/constants';

// ============================================
// GENERATE INPUT HASH (for caching/comparison)
// ============================================

function generateInputHash(input: AssessmentInput): string {
  const key = JSON.stringify({
    context: input.shootingContext,
    country: input.euCountry,
    days: input.proposedShootDays,
    deliverables: input.deliverables,
    complexity: input.complexity,
  });
  // Simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// ============================================
// DETERMINE PRODUCTION SCALE
// ============================================

function determineProductionScale(input: AssessmentInput, recommendedDays: number): ProductionScale {
  // Check budget vs typical cost bands
  const productionBudget = input.budgetSnapshot.productionBudget || input.budgetSnapshot.totalBudget;

  if (!productionBudget) {
    // Default based on complexity
    if (input.complexity.vfxHeavy || input.complexity.multipleHeroTalent) {
      return 'Ambitious';
    }
    if (input.complexity.technical || input.complexity.heroProduct) {
      return 'Standard';
    }
    return 'Lean';
  }

  // Calculate implied per-day spend
  const perDaySpend = productionBudget / Math.max(1, recommendedDays);

  // UK APA typical bands per day
  if (input.shootingContext === 'UK') {
    if (perDaySpend < 80000) return 'Lean';
    if (perDaySpend < 120000) return 'Standard';
    return 'Ambitious';
  } else {
    // EU service company bands
    if (perDaySpend < 60000) return 'Lean';
    if (perDaySpend < 100000) return 'Standard';
    return 'Ambitious';
  }
}

// ============================================
// GENERATE ASSUMPTIONS VS REALITY
// ============================================

function generateAssumptionsVsReality(
  input: AssessmentInput,
  recommendedDays: number,
  productionScale: ProductionScale,
  postMinimum: number,
  usageExposure: { min: number; max: number }
): AssumptionComparison[] {
  const comparisons: AssumptionComparison[] = [];

  // 1. Shoot Days
  if (input.proposedShootDays) {
    const dayDiff = recommendedDays - input.proposedShootDays;
    let status: AssumptionStatus = 'aligned';
    let note: string | undefined;

    if (dayDiff > 1) {
      status = 'misaligned';
      note = `${dayDiff} days short of recommended`;
    } else if (dayDiff === 1) {
      status = 'stretched';
      note = 'Tight but possible with discipline';
    } else if (dayDiff < 0) {
      status = 'aligned';
      note = 'Comfortable margin';
    }

    comparisons.push({
      label: 'Shoot days',
      assumed: input.proposedShootDays,
      reality: recommendedDays,
      status,
      note,
    });
  }

  // 2. Production Scale
  const budgetValue = input.budgetSnapshot.productionBudget || input.budgetSnapshot.totalBudget;
  if (budgetValue) {
    const impliedScale = productionScale;
    // Determine if budget implies lean but script implies ambitious
    const scriptComplexity = input.complexity.vfxHeavy || input.complexity.multipleHeroTalent
      ? 'Ambitious'
      : input.complexity.technical || input.complexity.heroProduct
      ? 'Standard'
      : 'Lean';

    let status: AssumptionStatus = 'aligned';
    if (impliedScale === 'Lean' && scriptComplexity === 'Ambitious') {
      status = 'misaligned';
    } else if (impliedScale === 'Lean' && scriptComplexity === 'Standard') {
      status = 'stretched';
    } else if (impliedScale === 'Standard' && scriptComplexity === 'Ambitious') {
      status = 'stretched';
    }

    comparisons.push({
      label: 'Production scale',
      assumed: impliedScale,
      reality: `${scriptComplexity} implied by script`,
      status,
      note: status !== 'aligned' ? 'Budget may not match ambition' : undefined,
    });
  }

  // 3. Post-production allowance
  if (input.budgetSnapshot.postBudget !== undefined) {
    const postBudget = input.budgetSnapshot.postBudget;
    let status: AssumptionStatus = 'aligned';
    let note: string | undefined;

    if (postBudget < POST_FLOORS.minimum) {
      status = 'misaligned';
      note = `Below £${(POST_FLOORS.minimum / 1000).toFixed(0)}k floor`;
    } else if (postBudget < postMinimum) {
      status = 'stretched';
      note = 'Light for deliverables scope';
    }

    comparisons.push({
      label: 'Post-production allowance',
      assumed: `£${(postBudget / 1000).toFixed(0)}k`,
      reality: `£${(postMinimum / 1000).toFixed(0)}k minimum`,
      status,
      note,
    });
  }

  // 4. Usage territory exposure
  if (usageExposure.max > 0) {
    const assumedTalentBudget = input.budgetSnapshot.talentBudget || 0;
    let status: AssumptionStatus = 'aligned';
    let note: string | undefined;

    if (assumedTalentBudget > 0 && assumedTalentBudget < usageExposure.min) {
      status = 'misaligned';
      note = 'Talent budget significantly under exposure';
    } else if (assumedTalentBudget > 0 && assumedTalentBudget < usageExposure.max * 0.7) {
      status = 'stretched';
      note = 'May need to revisit talent strategy';
    }

    if (assumedTalentBudget > 0) {
      comparisons.push({
        label: 'Talent/usage exposure',
        assumed: `£${(assumedTalentBudget / 1000).toFixed(0)}k`,
        reality: `£${(usageExposure.min / 1000).toFixed(0)}k - £${(usageExposure.max / 1000).toFixed(0)}k`,
        status,
        note,
      });
    }
  }

  // 5. Contingency
  const contingency = input.budgetSnapshot.contingencyPercent;
  if (contingency !== undefined || !input.budgetSnapshot.hasContingency) {
    let status: AssumptionStatus = 'aligned';
    let note: string | undefined;

    if (!input.budgetSnapshot.hasContingency || contingency === 0) {
      status = 'misaligned';
      note = 'No safety net';
    } else if (contingency !== undefined && contingency < 5) {
      status = 'stretched';
      note = 'Below industry standard';
    }

    comparisons.push({
      label: 'Contingency',
      assumed: contingency !== undefined ? `${contingency}%` : 'None',
      reality: '5-10% standard',
      status,
      note,
    });
  }

  return comparisons;
}

// ============================================
// GENERATE PIBS WARNINGS (checklist style)
// ============================================

function generatePIBSWarnings(
  input: AssessmentInput,
  postMinimum: number,
  talentExposure: { min: number; max: number }
): string[] {
  const warnings: string[] = [];

  // Post under-allowed
  if (input.budgetSnapshot.postBudget !== undefined && input.budgetSnapshot.postBudget < postMinimum) {
    warnings.push('Post under-allowed');
  }

  // Foreign shoot without travel allowance
  if (input.shootingContext === 'EU' && !input.budgetSnapshot.productionBudget) {
    warnings.push('EU shoot without confirmed production budget');
  }

  // Usage exposure not acknowledged
  if (talentExposure.max > 50000 && !input.budgetSnapshot.talentBudget) {
    warnings.push('Usage exposure not budgeted');
  }

  // Contingency missing
  if (!input.budgetSnapshot.hasContingency) {
    warnings.push('Contingency missing');
  }

  // OT likely but not allowed
  if (!input.budgetSnapshot.otAllowed && input.proposedShootDays && input.proposedShootDays <= 2) {
    warnings.push('Tight schedule but no OT allowance');
  }

  return warnings;
}

// ============================================
// GENERATE PRODUCER SUMMARY
// ============================================

interface SummarySections {
  technical: string[];
  risks: string[];
  checklist: string[];
}

function generateProducerSummary(
  input: AssessmentInput,
  schedule: ScheduleSimulation,
  recommendedDays: number,
  verdict: Verdict
): SummarySections {
  const sections: SummarySections = {
    technical: [],
    risks: [],
    checklist: []
  };

  const rollup = input.aiBreakdown?.rollup;
  const totalScenes = input.aiBreakdown?.scenes?.length || input.scriptBreakdown?.totalScenes || 0;
  const companyMoves = rollup?.locationMoves ?? (isNaN(schedule.avgCompanyMovesPerDay) ? 0 : Math.round(schedule.avgCompanyMovesPerDay * schedule.totalDaysRequired));
  const uniqueLocs = input.aiBreakdown?.uniqueLocations || rollup?.actualLocations || (companyMoves ? companyMoves + 1 : 1);
  const totalSetups = rollup?.totalEstimatedShots || rollup?.mainUnitSetups || 0;
  const isStudio = rollup?.studioShoot || false;

  // TECHNICAL BREAKDOWN
  sections.technical.push(`${totalScenes} scene${totalScenes !== 1 ? 's' : ''} across ${uniqueLocs} unique location${uniqueLocs !== 1 ? 's' : ''}`);
  
  if (isStudio) {
    sections.technical.push('Studio shoot: 0 company moves, sets built side-by-side');
    sections.technical.push(`Estimated ${totalSetups} setups at 12-15 setups/day achievable`);
  } else {
    sections.technical.push(`${companyMoves} company move${companyMoves !== 1 ? 's' : ''} required`);
    const setupsPerDay = Math.round(totalSetups / recommendedDays);
    sections.technical.push(`${totalSetups} setups = ~${setupsPerDay} setups/day target`);
  }

  // 2nd unit detection
  if (rollup?.secondUnitPossible) {
    const secondUnitSetups = rollup.secondUnitSetups || 0;
    sections.technical.push(`2nd unit possible: ${secondUnitSetups} setups (food/product) could run parallel`);
  }

  // MOCO detection
  if (rollup?.mocoRequired) {
    const mocoSetups = rollup.mocoSetups || 0;
    sections.technical.push(`MOCO required: ${mocoSetups} setup${mocoSetups !== 1 ? 's' : ''} (4 max/day on location, 6-8 in studio)`);
  }

  // RISK FACTORS
  if (schedule.avgCompanyMovesPerDay >= 2) {
    sections.risks.push(`Schedule pressure: ${schedule.avgCompanyMovesPerDay.toFixed(1)} company moves/day will eat into shooting time`);
  }
  
  if (schedule.highRiskDays.length > 0) {
    const riskDaysCount = schedule.highRiskDays.length;
    sections.risks.push(`${riskDaysCount} high-risk day${riskDaysCount !== 1 ? 's' : ''} (>10 setups or multiple moves)`);
  }

  if (rollup?.goldenHourDependent) {
    sections.risks.push('Golden hour dependent: sunset/sunrise lighting is weather-contingent');
  }

  if (rollup?.nightShootRequired) {
    sections.risks.push('Night shoot required: overtime premiums apply, crew turnaround concerns');
  }

  if (rollup?.hybridApproachNeeded) {
    sections.risks.push('Hybrid approach needed: mixed day/night requires different camera techniques');
  }

  if (verdict === 'RED') {
    sections.risks.push('Multiple risk factors stacking - consider splitting into multiple shoot days');
  }

  // PRODUCER CHECKLIST
  if (rollup?.secondUnitPossible) {
    sections.checklist.push('Confirm: Does location permit two crews working simultaneously?');
  }

  if (isStudio) {
    sections.checklist.push('Verify: Studio can accommodate all sets side-by-side');
    sections.checklist.push('Check: Pre-light schedule for set transitions');
  } else {
    sections.checklist.push('Confirm: Location proximity - all within 15min drive?');
    sections.checklist.push('Check: Swing crew availability for pre-dressing next location');
  }

  if (rollup?.mocoRequired) {
    sections.checklist.push('Verify: MOCO rig access and space requirements at each location');
    sections.checklist.push('Confirm: VFX supervisor availability for MOCO programming');
  }

  if (rollup?.hasVFX) {
    sections.checklist.push('Check: VFX shots storyboarded and approved');
    sections.checklist.push('Confirm: VFX supervisor booked for shoot dates');
  }

  if (rollup?.highSpeedLimited) {
    sections.checklist.push('Resolve: High-speed camera cannot work in low-light scenes - confirm CG approach with client');
  }

  // Talent checklist
  const heroCount = rollup?.totalHeroPrincipal || 0;
  if (heroCount > 2) {
    sections.checklist.push(`Check: ${heroCount} hero talent - wardrobe multiples for continuity?`);
  }

  // General
  sections.checklist.push('Verify: Call times work for talent/agent schedules');
  sections.checklist.push('Confirm: Catering can handle crew size and dietary requirements');

  if (input.proposedShootDays && recommendedDays > input.proposedShootDays) {
    const deficit = recommendedDays - input.proposedShootDays;
    sections.checklist.push(`CRITICAL: Schedule requires ${deficit} more day${deficit !== 1 ? 's' : ''} than budget allows - negotiate scope or days`);
  }

  return sections;
}

// ============================================
// GENERATE COPY-READY SUMMARY (legacy format)
// ============================================

function generateCopyReadySummary(
  verdict: Verdict,
  verdictReason: string,
  recommendedDays: number,
  productionScale: ProductionScale,
  whatToChallenge: string[]
): string {
  const verdictWord = verdict === 'GREEN' ? 'achievable' : verdict === 'AMBER' ? 'possible with adjustments' : 'challenging';

  let summary = `Initial feasibility check: ${verdictWord}. `;
  summary += `Recommended ${recommendedDays} shoot day${recommendedDays > 1 ? 's' : ''} at ${productionScale.toLowerCase()} production scale. `;

  if (whatToChallenge.length > 0 && verdict !== 'GREEN') {
    summary += `Key consideration: ${whatToChallenge[0].toLowerCase()}`;
  } else if (verdict === 'GREEN') {
    summary += 'Assumptions align with production reality.';
  }

  return summary;
}

// ============================================
// RUN FULL ASSESSMENT
// ============================================

export function runAssessment(input: AssessmentInput): AssessmentOutput {
  // Step 1: Parse script if provided (skip if we have AI breakdown)
  if (input.scriptText && !input.scriptBreakdown && !input.aiBreakdown) {
    input.scriptBreakdown = parseScript(input.scriptText);
  }

  // Step 2: Simulate schedule (uses AI breakdown if available)
  const schedule = simulateSchedule(input);

  // Step 3: Evaluate rules
  const { score: riskScore, flags } = evaluateRules(input, schedule);

  // Step 4: Determine verdict and confidence
  const verdict = determineVerdict(riskScore);
  const confidence = determineConfidence(input);

  // Step 5: Estimate costs
  const productionCost = estimateProductionCosts(input, schedule);
  const postProduction = estimatePostProduction(input);
  const talentCost = estimateTalentCosts(input, schedule);

  // Step 6: PIBS check
  const pibsCheck = checkPIBS(input, postProduction, talentCost);

  // Step 7: Adjust verdict if PIBS fails
  let finalVerdict = verdict;
  if (!pibsCheck.isClientSafe && verdict === 'GREEN') {
    finalVerdict = 'AMBER';
    flags.push({
      ruleId: 'pibs-incomplete',
      title: 'PIBS incomplete',
      explanation: 'Budget is not client-safe due to missing elements.',
      challenge: `Address: ${pibsCheck.missingCritical.join(', ')}`,
      category: 'pibs',
      severity: 'high',
    });
  }

  // Step 8: Generate new output fields
  const verdictReason = getVerdictReason(finalVerdict, flags);
  const whyThisVerdict = getWhyThisVerdict(flags);
  const whatToChallenge = getWhatToChallenge(flags);
  const productionScale = determineProductionScale(input, schedule.totalDaysRequired);

  const usageExposureRange = {
    min: talentCost.totalBsf + talentCost.totalUsageMin,
    max: talentCost.totalBsf + talentCost.totalUsageMax,
  };

  const assumptionsVsReality = generateAssumptionsVsReality(
    input,
    schedule.totalDaysRequired,
    productionScale,
    postProduction.minimum,
    usageExposureRange
  );

  const pibsWarnings = generatePIBSWarnings(input, postProduction.minimum, usageExposureRange);

  // Step 9: Talent summary
  const talentSummary = {
    heroPrincipal: input.aiBreakdown?.rollup?.totalHeroPrincipal ||
                   input.scriptBreakdown?.talentRollup?.totalUniqueHeroRoles || 0,
    featured: input.aiBreakdown?.rollup?.totalFeatured ||
              input.scriptBreakdown?.talentRollup?.totalUniqueFeaturedRoles || 0,
    walkOns: input.aiBreakdown?.rollup?.totalWalkOns ||
             input.scriptBreakdown?.talentRollup?.totalWalkOns || 0,
    peakExtras: input.aiBreakdown?.rollup?.peakExtras ||
                input.scriptBreakdown?.talentRollup?.peakExtrasRequirement || 0,
  };

  // Step 10: Company move pressure
  const companyMovePressure = {
    flagged: schedule.avgCompanyMovesPerDay >= 2,
    reason: schedule.avgCompanyMovesPerDay >= 3
      ? 'Multiple company moves per day will eat into shooting time'
      : schedule.avgCompanyMovesPerDay >= 2
      ? 'Company moves adding schedule pressure'
      : undefined,
  };

  // Step 11: Generate copy-ready summary
  const copyReadySummary = generateCopyReadySummary(
    finalVerdict,
    verdictReason,
    schedule.totalDaysRequired,
    productionScale,
    whatToChallenge
  );

  // Step 12: Generate producer summary (technical + risks + checklist)
  const producerSummary = generateProducerSummary(
    input,
    schedule,
    schedule.totalDaysRequired,
    finalVerdict
  );

  // Step 13: Check if post is under-allowed
  const postUnderAllowed = input.budgetSnapshot.postBudget !== undefined &&
                           input.budgetSnapshot.postBudget < postProduction.minimum;

  return {
    // 1. Feasibility Verdict
    verdict: finalVerdict,
    verdictReason,

    // 2. Why this verdict
    whyThisVerdict,

    // 3. Assumptions vs Reality
    assumptionsVsReality,

    // 4. Schedule reality
    recommendedShootDays: schedule.totalDaysRequired,
    avgShotsPerDay: schedule.avgShotsPerDay,
    highRiskDays: schedule.highRiskDays,
    companyMovePressure,
    schedule,

    // 5. Production scale & cost
    productionScale,
    productionCost,

    // 6. Post-production
    postProduction,
    postUnderAllowed,

    // 7. Talent & usage
    talentCost,
    talentSummary,
    usageExposureRange,

    // 8. PIBS
    pibsCheck,
    pibsWarnings,

    // 9. What to challenge
    whatToChallenge,

    // 10. Producer summary
    producerSummary,

    // 10. Copy-ready summary
    copyReadySummary,

    // Internal
    riskScore,
    confidence,
    flags,

    // Metadata
    assessedAt: new Date(),
    inputHash: generateInputHash(input),
  };
}

// ============================================
// CREATE DEFAULT INPUT
// ============================================

export function createDefaultInput(): AssessmentInput {
  return {
    shootingContext: 'UK',
    euCountry: undefined,
    usageTerritory: 'UK',
    usageTerm: 1,
    proposedShootDays: undefined,
    companyMovesPerDay: undefined,
    interiorExteriorMix: false,
    deliverables: {
      tvc30: true,
      tvc15: false,
      tvc10: false,
      socialCutdowns: false,
      vertical916: false,
      stillGrabs: false,
      behindTheScenes: false,
    },
    complexity: {
      technical: false,
      heroProduct: false,
      vfxLight: false,
      vfxHeavy: false,
      fixInPost: false,
      multipleHeroTalent: false,
      specialEquipment: false,
      childrenInvolved: false,
      childrenUnder5: false,
    },
    politics: {
      numberBeforeBoardsLocked: false,
      procurementInvolvedEarly: false,
      multipleAgencyStakeholders: false,
      clientOnSet: false,
    },
    budgetSnapshot: {
      hasContingency: false,
      otAllowed: false,
    },
    productionAssumptions: createDefaultProductionAssumptions(),
  };
}

// ============================================
// CREATE DEFAULT PRODUCTION ASSUMPTIONS
// ============================================

export function createDefaultProductionAssumptions(): import('@/types').ProductionAssumptions {
  return {
    locationGroups: [],
    mocoAlternatives: {
      enabled: false,
      sceneOverrides: {},
    },
    secondUnitAvailable: false,
    goldenHourGrouped: false,
    nightScenesGrouped: false,
    experiencedCrew: false,
    nearbyLocations: false,
    studioAvailable: false,
  };
}

// ============================================
// FORMAT CURRENCY
// ============================================

export function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString('en-GB')}`;
}

// ============================================
// FORMAT COST BAND
// ============================================

export function formatCostBand(band: { lean: number; standard: number; ambitious: number }): string {
  return `${formatCurrency(band.lean)} - ${formatCurrency(band.ambitious)}`;
}
