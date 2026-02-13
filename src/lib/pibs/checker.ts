// ============================================
// PIBS CHECKER - CLIENT-SAFETY COMPLETENESS
// ============================================

import {
  AssessmentInput,
  PIBSCheck,
  PIBSItem,
  PostProductionBand,
  TalentCostEstimate,
} from '@/types';
import { POST_FLOORS } from '@/lib/cost/constants';

// ============================================
// PIBS CATEGORIES
// ============================================

const PIBS_CATEGORIES = [
  { id: 'preproduction', name: 'Pre-production', required: true },
  { id: 'shoot', name: 'Shoot costs', required: true },
  { id: 'director', name: 'Director & Producer fees', required: true },
  { id: 'talent_bsf', name: 'Talent (BSF)', required: true },
  { id: 'talent_usage', name: 'Talent (Usage exposure)', required: true },
  { id: 'travel', name: 'Travel & accommodation', required: false }, // Required for EU
  { id: 'insurance', name: 'Insurance & risk', required: true },
  { id: 'post', name: 'Post-production', required: true },
  { id: 'contingency', name: 'Contingency', required: true },
];

// ============================================
// CHECK PIBS COMPLETENESS
// ============================================

export function checkPIBS(
  input: AssessmentInput,
  postBand: PostProductionBand,
  talentCost: TalentCostEstimate
): PIBSCheck {
  const items: PIBSItem[] = [];
  const missingCritical: string[] = [];
  const warnings: string[] = [];

  // Check each category
  PIBS_CATEGORIES.forEach((cat) => {
    const item = checkCategory(cat.id, cat.name, cat.required, input, postBand, talentCost);
    items.push(item);

    if (item.required && !item.present) {
      missingCritical.push(cat.name);
    }

    if (item.note) {
      warnings.push(item.note);
    }
  });

  // Special check: EU mode requires travel/hotels/per diems
  if (input.shootingContext === 'EU') {
    const travelItem = items.find((i) => i.category === 'Travel & accommodation');
    if (travelItem && !travelItem.present) {
      missingCritical.push('Travel & accommodation (required for EU shoot)');
      warnings.push('PIBS incomplete for foreign shoot - travel/hotels/per diems/freight/insurance required');
    }
  }

  // Check if post floor is met
  const postBudget = input.budgetSnapshot.postBudget || 0;
  if (postBudget > 0 && postBudget < POST_FLOORS.minimum) {
    warnings.push(`Post budget £${postBudget.toLocaleString()} below minimum £${POST_FLOORS.minimum.toLocaleString()}`);
    if (!missingCritical.includes('Post-production')) {
      missingCritical.push('Post-production (under-allowed)');
    }
  }

  // Check talent usage
  if (talentCost.totalUsageMin > 0) {
    const talentBudget = input.budgetSnapshot.talentBudget || 0;
    if (talentBudget === 0) {
      warnings.push('Talent usage exposure not explicitly budgeted');
    }
  }

  const isComplete = missingCritical.length === 0;
  const isClientSafe = isComplete && warnings.filter((w) => w.includes('Not client-safe')).length === 0;

  return {
    items,
    isComplete,
    isClientSafe,
    missingCritical,
    warnings,
  };
}

// ============================================
// CHECK INDIVIDUAL CATEGORY
// ============================================

function checkCategory(
  id: string,
  name: string,
  baseRequired: boolean,
  input: AssessmentInput,
  postBand: PostProductionBand,
  talentCost: TalentCostEstimate
): PIBSItem {
  let present = false;
  let required = baseRequired;
  let note: string | undefined;

  switch (id) {
    case 'preproduction':
      // Assumed present if any budget is provided
      present = !!(input.budgetSnapshot.totalBudget || input.budgetSnapshot.productionBudget);
      if (!present) {
        note = 'Pre-production costs should be explicitly included';
      }
      break;

    case 'shoot':
      present = !!(input.budgetSnapshot.productionBudget || input.budgetSnapshot.totalBudget);
      break;

    case 'director':
      // Assumed present if production budget exists
      present = !!(input.budgetSnapshot.productionBudget || input.budgetSnapshot.totalBudget);
      if (!present) {
        note = 'Director & Producer fees should be explicitly budgeted';
      }
      break;

    case 'talent_bsf':
      present = talentCost.totalBsf > 0 || !!(input.budgetSnapshot.talentBudget);
      if (!present) {
        note = 'Talent BSF (basic session fees) not accounted for';
      }
      break;

    case 'talent_usage':
      present = talentCost.totalUsageMin > 0 || !!(input.budgetSnapshot.talentBudget);
      if (!present && talentCost.estimates.some((e) => e.category === 'Hero' || e.category === 'Featured')) {
        note = 'Not client-safe: talent usage exposure missing';
      }
      break;

    case 'travel':
      // Required for EU shoots
      required = input.shootingContext === 'EU';
      // Assume present if EU country selected (we factor it in)
      present = input.shootingContext === 'EU' ? true : true; // UK doesn't need explicit travel
      if (input.shootingContext === 'EU' && !present) {
        note = 'EU shoot requires travel, hotels, per diems, freight, extra insurance';
      }
      break;

    case 'insurance':
      // Assumed present in any professional production
      present = !!(input.budgetSnapshot.totalBudget || input.budgetSnapshot.productionBudget);
      break;

    case 'post':
      present = !!(input.budgetSnapshot.postBudget) || postBand.minimum > 0;
      const postBudget = input.budgetSnapshot.postBudget || 0;
      if (postBudget > 0 && postBudget < postBand.minimum) {
        note = `Not client-safe: post budget £${postBudget.toLocaleString()} below floor £${postBand.minimum.toLocaleString()}`;
      } else if (!input.budgetSnapshot.postBudget) {
        note = 'Post budget not explicitly provided - using minimum floor';
      }
      break;

    case 'contingency':
      present = input.budgetSnapshot.hasContingency;
      if (!present) {
        note = 'No contingency visible - budget vulnerable to overruns';
      } else if (input.budgetSnapshot.contingencyPercent !== undefined && input.budgetSnapshot.contingencyPercent < 5) {
        note = `Contingency only ${input.budgetSnapshot.contingencyPercent}% - recommend minimum 5%`;
      }
      break;

    default:
      present = false;
  }

  return {
    category: name,
    present,
    required,
    note,
  };
}

// ============================================
// FORMAT PIBS SUMMARY
// ============================================

export function formatPIBSSummary(pibs: PIBSCheck): string {
  const lines: string[] = [];

  if (pibs.isClientSafe) {
    lines.push('PIBS Status: Client-safe');
  } else if (pibs.isComplete) {
    lines.push('PIBS Status: Complete with warnings');
  } else {
    lines.push('PIBS Status: INCOMPLETE - NOT CLIENT-SAFE');
  }

  if (pibs.missingCritical.length > 0) {
    lines.push(`Missing: ${pibs.missingCritical.join(', ')}`);
  }

  if (pibs.warnings.length > 0) {
    lines.push('Warnings:');
    pibs.warnings.forEach((w) => lines.push(`  - ${w}`));
  }

  return lines.join('\n');
}
