// ============================================
// RULES ENGINE - TRANSPARENT SCORING SYSTEM
// ============================================

import {
  Rule,
  RuleFlag,
  AssessmentInput,
  ScheduleSimulation,
  Verdict,
  Confidence,
} from '@/types';
import { VERDICT_THRESHOLDS, CONFIDENCE_THRESHOLDS, CHILDREN_WORKING_HOURS } from '@/lib/cost/constants';

// ============================================
// RULE DEFINITIONS
// Each rule has: id, description, category, condition, scoreDelta, generateFlag
// ============================================

export const RULES: Rule[] = [
  // ==========================================
  // SCHEDULE / LOGISTICS RULES
  // ==========================================
  {
    id: 'schedule-overload',
    description: 'Schedule day overload check',
    category: 'schedule',
    condition: (input, schedule) => {
      if (!schedule) return false;
      return schedule.days.some((d) => d.isOverloaded);
    },
    scoreDelta: 1.5,
    generateFlag: (input, schedule) => ({
      ruleId: 'schedule-overload',
      title: 'Schedule overload',
      explanation: `${schedule?.days.filter((d) => d.isOverloaded).length || 0} day(s) exceed available working time. Simulated minutes required exceeds 10-hour working day.`,
      challenge: 'Review shot list and consider adding shoot days or reducing scope per day.',
      category: 'schedule',
      severity: 'high',
    }),
  },
  {
    id: 'company-moves-excessive',
    description: 'Excessive company moves per day',
    category: 'schedule',
    condition: (input, schedule) => {
      if (!schedule) return (input.companyMovesPerDay || 0) >= 3;
      return schedule.days.some((d) => d.companyMoves >= 3);
    },
    scoreDelta: 1.2,
    generateFlag: (input, schedule) => ({
      ruleId: 'company-moves-excessive',
      title: 'Company move overtime risk',
      explanation: `≥3 company moves on one or more days. Each move costs ~105 mins (60 travel + 45 reset).`,
      challenge: 'Consolidate locations or add travel days. Consider if all locations are essential.',
      category: 'schedule',
      severity: 'medium',
    }),
  },
  {
    id: 'int-ext-mix',
    description: 'Heavy INT/EXT mix within day',
    category: 'schedule',
    condition: (input) => input.interiorExteriorMix,
    scoreDelta: 0.8,
    generateFlag: () => ({
      ruleId: 'int-ext-mix',
      title: 'Lighting reset inefficiency',
      explanation: 'Mixing interior and exterior within same day requires significant lighting resets.',
      challenge: 'Group INT and EXT scenes on separate days where possible.',
      category: 'schedule',
      severity: 'low',
    }),
  },
  {
    id: 'hero-shots-competing',
    description: 'Multiple hero/technical shots on same day',
    category: 'schedule',
    condition: (input, schedule) => {
      if (!schedule) return input.complexity.technical && input.complexity.heroProduct;
      return schedule.days.some((d) => {
        const techCount = d.scenes.filter((s) => s.technicalComplexity).length;
        const heroCount = d.scenes.filter((s) => s.heroProductMoment).length;
        return techCount + heroCount >= 2;
      });
    },
    scoreDelta: 1.0,
    generateFlag: () => ({
      ruleId: 'hero-shots-competing',
      title: 'Hero shots competing for time',
      explanation: 'Multiple technical or hero product shots scheduled on same day. Each requires minimum 60 mins execution.',
      challenge: 'Spread hero/technical shots across days or allow more time per day.',
      category: 'schedule',
      severity: 'medium',
    }),
  },
  {
    id: 'inputs-incomplete',
    description: 'Critical input fields missing',
    category: 'schedule',
    condition: (input) => {
      let blanks = 0;
      if (!input.scriptBreakdown || input.scriptBreakdown.scenes.length === 0) blanks++;
      if (!input.proposedShootDays) blanks++;
      if (!input.budgetSnapshot.productionBudget && !input.budgetSnapshot.totalBudget) blanks++;
      if (!input.deliverables.tvc30 && !input.deliverables.tvc15 && !input.deliverables.socialCutdowns) blanks++;
      if (input.companyMovesPerDay === undefined) blanks++;
      return blanks >= 3;
    },
    scoreDelta: 0.8,
    generateFlag: () => ({
      ruleId: 'inputs-incomplete',
      title: 'Inputs incomplete; risk understated',
      explanation: '≥3 critical fields are blank. Assessment confidence is reduced.',
      challenge: 'Provide script breakdown, proposed shoot days, and budget snapshot for accurate assessment.',
      category: 'schedule',
      severity: 'medium',
    }),
  },

  // ==========================================
  // CREATIVE VS TIME RULES
  // ==========================================
  {
    id: 'complexity-days-mismatch',
    description: 'High complexity with insufficient days',
    category: 'creative',
    condition: (input) => {
      const highComplexity =
        input.complexity.technical ||
        input.complexity.vfxHeavy ||
        input.complexity.multipleHeroTalent;
      return highComplexity && (input.proposedShootDays || 1) <= 2;
    },
    scoreDelta: 1.2,
    generateFlag: (input) => ({
      ruleId: 'complexity-days-mismatch',
      title: 'Complexity vs days mismatch',
      explanation: `High complexity flagged but only ${input.proposedShootDays || 1} shoot day(s) proposed.`,
      challenge: 'Either add shoot days or descope complexity requirements.',
      category: 'creative',
      severity: 'high',
    }),
  },
  {
    id: 'setup-density-high',
    description: 'Setup density too high',
    category: 'creative',
    condition: (input, schedule) => {
      if (!schedule) return false;
      // Note: avgShotsPerDay represents setups (camera/lighting configurations)
      // Multiple shots can share the same setup
      return schedule.avgShotsPerDay > 8;
    },
    scoreDelta: 1.0,
    generateFlag: (input, schedule) => ({
      ruleId: 'setup-density-high',
      title: 'Setup density too high',
      explanation: `Average ${schedule?.avgShotsPerDay.toFixed(1)} setups/day. A setup is a camera/lighting configuration - multiple shots can share the same setup. Target 6-8 setups/day.`,
      challenge: 'Add shoot days or consolidate setups. Review if all camera positions are essential.',
      category: 'creative',
      severity: 'medium',
    }),
  },

  // ==========================================
  // POST / DELIVERABLES RULES
  // ==========================================
  {
    id: 'post-underscoped',
    description: 'Post likely under-scoped',
    category: 'post',
    condition: (input) => {
      const hasMultipleDeliverables =
        (input.deliverables.tvc30 ? 1 : 0) +
          (input.deliverables.tvc15 ? 1 : 0) +
          (input.deliverables.socialCutdowns ? 1 : 0) >= 2;
      const postBudget = input.budgetSnapshot.postBudget || 0;
      return hasMultipleDeliverables && postBudget < 130000;
    },
    scoreDelta: 1.0,
    generateFlag: () => ({
      ruleId: 'post-underscoped',
      title: 'Post likely under-scoped if not explicit',
      explanation: 'Multiple deliverables (TVC + social + cutdowns) require significant post work.',
      challenge: 'Ensure post budget covers online, grade, sound, music for all versions. Minimum £130k.',
      category: 'post',
      severity: 'medium',
    }),
  },
  {
    id: 'versioning-load',
    description: '9:16 versions increase post load',
    category: 'post',
    condition: (input) => input.deliverables.vertical916,
    scoreDelta: 1.0,
    generateFlag: () => ({
      ruleId: 'versioning-load',
      title: 'Versioning load',
      explanation: '9:16 vertical versions require reframing and often re-editing. Not just a resize.',
      challenge: 'Budget additional post time for vertical versions. May need dedicated shooting coverage.',
      category: 'post',
      severity: 'medium',
    }),
  },
  {
    id: 'fix-in-post-crutch',
    description: 'Post being used as a crutch',
    category: 'post',
    condition: (input) => input.complexity.fixInPost,
    scoreDelta: 0.7,
    generateFlag: () => ({
      ruleId: 'fix-in-post-crutch',
      title: 'Post used as a crutch',
      explanation: '"We\'ll fix it in post" is flagged. This often leads to scope creep and budget overruns.',
      challenge: 'Identify specific items to be fixed in post and budget accordingly. Better to get it right on set.',
      category: 'post',
      severity: 'low',
    }),
  },
  {
    id: 'vfx-scope-creep',
    description: 'VFX scope creep risk',
    category: 'post',
    condition: (input) => input.complexity.vfxLight,
    scoreDelta: 0.8,
    generateFlag: () => ({
      ruleId: 'vfx-scope-creep',
      title: 'VFX scope creep risk',
      explanation: '"Light/simple" VFX often grows in scope during post. Rounds of revisions add cost.',
      challenge: 'Define VFX shots precisely. Budget for at least 2 rounds of revisions. Consider bidding heavy.',
      category: 'post',
      severity: 'medium',
    }),
  },

  // ==========================================
  // BUDGET STRUCTURE RULES
  // ==========================================
  {
    id: 'no-contingency',
    description: 'Missing or inadequate contingency',
    category: 'budget',
    condition: (input) => {
      return (
        !input.budgetSnapshot.hasContingency ||
        (input.budgetSnapshot.contingencyPercent !== undefined &&
          input.budgetSnapshot.contingencyPercent < 5)
      );
    },
    scoreDelta: 1.0,
    generateFlag: (input) => ({
      ruleId: 'no-contingency',
      title: 'No real contingency',
      explanation: `Contingency is ${
        input.budgetSnapshot.contingencyPercent !== undefined
          ? `only ${input.budgetSnapshot.contingencyPercent}%`
          : 'missing'
      }. Industry standard is minimum 5-10%.`,
      challenge: 'Ensure minimum 5% contingency is visible in budget. 10% preferred for complex shoots.',
      category: 'budget',
      severity: 'high',
    }),
  },
  {
    id: 'ot-unpriced',
    description: 'OT implied but not budgeted',
    category: 'budget',
    condition: (input, schedule) => {
      const scheduleIsTight = schedule
        ? schedule.dayDeficit > 0 || schedule.highRiskDays.length > 0
        : (input.proposedShootDays || 1) <= 1;
      return scheduleIsTight && !input.budgetSnapshot.otAllowed;
    },
    scoreDelta: 0.8,
    generateFlag: () => ({
      ruleId: 'ot-unpriced',
      title: 'OT implied but unpriced',
      explanation: 'Schedule is tight but overtime is not allowed/budgeted. OT will likely be needed.',
      challenge: 'Either allow for OT in budget or add shoot days to reduce pressure.',
      category: 'budget',
      severity: 'medium',
    }),
  },

  // ==========================================
  // POLITICS RULES
  // ==========================================
  {
    id: 'number-too-early',
    description: 'Number locked before boards',
    category: 'politics',
    condition: (input) => input.politics.numberBeforeBoardsLocked,
    scoreDelta: 0.7,
    generateFlag: () => ({
      ruleId: 'number-too-early',
      title: 'Expectations harden too early',
      explanation: 'Budget number being set before boards/script is locked. Changes will feel like overruns.',
      challenge: 'Flag this early with client. Present as range, not single number. Document assumptions.',
      category: 'politics',
      severity: 'medium',
    }),
  },
  {
    id: 'procurement-early',
    description: 'Procurement involved early',
    category: 'politics',
    condition: (input) => input.politics.procurementInvolvedEarly,
    scoreDelta: 0.6,
    generateFlag: () => ({
      ruleId: 'procurement-early',
      title: 'Creative compromise likely',
      explanation: 'Procurement involvement early often leads to budget pressure before scope is understood.',
      challenge: 'Ensure creative decision-makers see budget alongside scope. Document trade-offs clearly.',
      category: 'politics',
      severity: 'low',
    }),
  },

  // ==========================================
  // TALENT RULES
  // ==========================================
  {
    id: 'talent-usage-material',
    description: 'Talent usage exposure material',
    category: 'talent',
    condition: (input) => {
      if (!input.scriptBreakdown) return input.complexity.multipleHeroTalent;
      const rollup = input.scriptBreakdown.talentRollup;
      return rollup.totalUniqueHeroRoles >= 2 || rollup.totalUniqueFeaturedRoles >= 3;
    },
    scoreDelta: 0.6,
    generateFlag: (input) => ({
      ruleId: 'talent-usage-material',
      title: 'Multiple featured roles driving usage exposure',
      explanation: 'Multiple hero or featured roles on camera. Usage fees will be significant.',
      challenge: 'Ensure talent usage is budgeted per role. Consider usage territory carefully.',
      category: 'talent',
      severity: 'medium',
    }),
  },
  {
    id: 'ww-usage-impact',
    description: 'Worldwide usage materially changes budget',
    category: 'talent',
    condition: (input) => input.usageTerritory === 'Worldwide',
    scoreDelta: 0.5,
    generateFlag: () => ({
      ruleId: 'ww-usage-impact',
      title: 'WW usage materially changes budget',
      explanation: 'Worldwide usage significantly increases talent costs vs. UK or US only.',
      challenge: 'Confirm WW is actually needed. Consider staged rollout to manage exposure.',
      category: 'talent',
      severity: 'low',
    }),
  },

  // ==========================================
  // CHILDREN RULES (UK Regulations)
  // ==========================================
  {
    id: 'children-involved',
    description: 'Children on set - restricted working hours',
    category: 'schedule',
    condition: (input) => input.complexity.childrenInvolved,
    scoreDelta: 0.8,
    generateFlag: () => ({
      ruleId: 'children-involved',
      title: 'Children: restricted working hours',
      explanation: `Children have legally restricted hours. ${CHILDREN_WORKING_HOURS.age9Plus.description}. Requires licensed chaperone.`,
      challenge: 'Schedule children\'s scenes for their best working hours. Budget for chaperone and welfare. May need additional shoot days.',
      category: 'schedule',
      severity: 'medium',
    }),
  },
  {
    id: 'children-under-5',
    description: 'Very young children - severely restricted hours',
    category: 'schedule',
    condition: (input) => input.complexity.childrenUnder5,
    scoreDelta: 1.5,
    generateFlag: () => ({
      ruleId: 'children-under-5',
      title: 'Children under 5: severe restrictions',
      explanation: `${CHILDREN_WORKING_HOURS.under5.description}. Very limited shooting window - typically only 2 hours of actual performance time.`,
      challenge: 'Plan to shoot all under-5 scenes within 2-hour performance window. Consider twins/doubles. Licensed chaperone mandatory. May need significantly more days.',
      category: 'schedule',
      severity: 'high',
    }),
  },

  // ==========================================
  // EU-SPECIFIC RULES
  // ==========================================
  {
    id: 'eu-short-shoot',
    description: 'EU short shoot efficiency loss',
    category: 'budget',
    condition: (input) => input.shootingContext === 'EU' && (input.proposedShootDays || 1) <= 2,
    scoreDelta: 0.5,
    generateFlag: () => ({
      ruleId: 'eu-short-shoot',
      title: 'Short shoot day burn is higher',
      explanation: '2-day EU shoots have higher per-day cost. Mobilization costs spread over fewer days.',
      challenge: 'Consider if EU service company still offers savings at this scale. UK might be comparable.',
      category: 'budget',
      severity: 'low',
    }),
  },
];

// ============================================
// EVALUATE RULES
// ============================================

export function evaluateRules(
  input: AssessmentInput,
  schedule?: ScheduleSimulation
): { score: number; flags: RuleFlag[] } {
  let score = 0;
  const flags: RuleFlag[] = [];

  RULES.forEach((rule) => {
    try {
      if (rule.condition(input, schedule)) {
        score += rule.scoreDelta;
        const flag = rule.generateFlag(input, schedule);
        if (flag) flags.push(flag);
      }
    } catch {
      // Rule evaluation failed, skip
      console.warn(`Rule ${rule.id} evaluation failed`);
    }
  });

  // Cap score at 10
  score = Math.min(10, score);

  return { score, flags };
}

// ============================================
// DETERMINE VERDICT
// ============================================

export function determineVerdict(score: number): Verdict {
  if (score <= VERDICT_THRESHOLDS.green.max) {
    return 'GREEN';
  } else if (score <= VERDICT_THRESHOLDS.amber.max) {
    return 'AMBER';
  } else {
    return 'RED';
  }
}

// ============================================
// DETERMINE CONFIDENCE
// ============================================

export function determineConfidence(input: AssessmentInput): Confidence {
  let filledFields = 0;

  // Count filled key fields
  if (input.scriptBreakdown && input.scriptBreakdown.scenes.length > 0) filledFields += 3;
  if (input.proposedShootDays) filledFields++;
  if (input.budgetSnapshot.totalBudget || input.budgetSnapshot.productionBudget) filledFields++;
  if (input.budgetSnapshot.postBudget) filledFields++;
  if (input.deliverables.tvc30 || input.deliverables.tvc15 || input.deliverables.socialCutdowns) filledFields++;
  if (input.companyMovesPerDay !== undefined) filledFields++;
  if (input.euCountry && input.shootingContext === 'EU') filledFields++;
  if (input.usageTerritory) filledFields++;

  // Check for unknowns
  const hasUnknowns =
    !input.budgetSnapshot.hasContingency &&
    !input.budgetSnapshot.postBudget &&
    !input.scriptBreakdown;

  if (hasUnknowns && filledFields <= CONFIDENCE_THRESHOLDS.low) {
    return 'Low';
  }

  if (filledFields >= CONFIDENCE_THRESHOLDS.high) {
    return 'High';
  } else if (filledFields >= CONFIDENCE_THRESHOLDS.medium) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

// ============================================
// GET OVERRUN RANGE
// ============================================

export function getOverrunRange(verdict: Verdict): { min: number; max: number } {
  switch (verdict) {
    case 'GREEN':
      return { min: 0, max: 10 };
    case 'AMBER':
      return { min: 10, max: 25 };
    case 'RED':
      return { min: 25, max: 50 };
  }
}

// ============================================
// GET TOP CHALLENGES
// ============================================

export function getTopChallenges(flags: RuleFlag[], limit: number = 5): string[] {
  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...flags].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return sorted.slice(0, limit).map((f) => f.challenge);
}

// ============================================
// GET VERDICT REASON (one-line explanation)
// ============================================

export function getVerdictReason(verdict: Verdict, flags: RuleFlag[]): string {
  if (verdict === 'GREEN') {
    return 'Schedule and budget assumptions align with production reality.';
  } else if (verdict === 'AMBER') {
    const highCount = flags.filter(f => f.severity === 'high').length;
    if (highCount > 0) {
      return `${highCount} significant pressure point${highCount > 1 ? 's' : ''} to address before committing.`;
    }
    return 'Some tension between assumptions and reality that needs attention.';
  } else {
    return 'Material misalignment between assumptions and production reality.';
  }
}

// ============================================
// GET WHY THIS VERDICT (producer-friendly bullet points)
// ============================================

export function getWhyThisVerdict(flags: RuleFlag[], limit: number = 5): string[] {
  // Sort by severity and take top items
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...flags].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  // Convert to producer-friendly language (no rule IDs, no maths)
  return sorted.slice(0, limit).map((flag) => {
    // Map technical explanations to producer-friendly language
    switch (flag.category) {
      case 'schedule':
        if (flag.title.includes('overload')) {
          return 'The schedule is overloaded – not enough hours in the day.';
        }
        if (flag.title.includes('company move')) {
          return 'Too many company moves eating into shooting time.';
        }
        if (flag.title.includes('children')) {
          return 'Children on set will significantly restrict your shooting window.';
        }
        return flag.title;
      case 'creative':
        if (flag.title.includes('complexity')) {
          return 'High complexity flagged but not enough shoot days to deliver it.';
        }
        if (flag.title.includes('density')) {
          return 'Too many setups per day – something will slip.';
        }
        return flag.title;
      case 'post':
        if (flag.title.includes('under-scoped')) {
          return 'Post-production budget looks light for the deliverables.';
        }
        if (flag.title.includes('VFX')) {
          return 'VFX scope has a habit of growing – budget accordingly.';
        }
        return flag.title;
      case 'budget':
        if (flag.title.includes('contingency')) {
          return 'No real contingency in the budget.';
        }
        if (flag.title.includes('OT')) {
          return 'Overtime is likely but not budgeted.';
        }
        return flag.title;
      case 'talent':
        return 'Talent usage exposure will be significant.';
      case 'pibs':
        return 'Budget is not client-safe – missing critical elements.';
      default:
        return flag.title;
    }
  });
}

// ============================================
// GET WHAT TO CHALLENGE (action items)
// ============================================

export function getWhatToChallenge(flags: RuleFlag[], limit: number = 5): string[] {
  // Sort by severity and generate actionable next steps
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...flags].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  // Return the challenge field which already has actionable language
  return sorted.slice(0, limit).map((f) => f.challenge);
}
