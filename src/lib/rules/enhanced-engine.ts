// ============================================
// ENHANCED RULES ENGINE WITH REAL TRAINING DATA
// Integrates: Real projects + Pattern analysis + Rules + Guidelines
// ============================================

import {
  Rule,
  RuleFlag,
  AssessmentInput,
  ScheduleSimulation,
  Verdict,
  Confidence,
} from '@/types';
import { 
  VERDICT_THRESHOLDS, 
  CONFIDENCE_THRESHOLDS, 
  CHILDREN_WORKING_HOURS,
  UK_ABOVE_LINE_EU,
} from '@/lib/cost/constants';
import {
  REAL_PROJECTS,
  REAL_DATA_STATS,
  COMPLEXITY_INDICATORS,
  findSimilarProjects,
  getBudgetRangeForContext,
  estimateDaysFromFeatures,
} from '@/lib/data/training-data';

// ============================================
// NEW PATTERN-BASED RULES (from schedule analysis)
// ============================================

export const ENHANCED_RULES: Rule[] = [
  // ==========================================
  // REAL DATA MATCH RULES (60% weight layer)
  // ==========================================
  {
    id: 'real-data-benchmark',
    description: 'Compare to similar real projects from training data',
    category: 'budget',
    condition: (input) => {
      // Always evaluate to provide benchmark context
      return input.proposedShootDays !== undefined || input.location !== undefined;
    },
    scoreDelta: 0,
    generateFlag: (input) => {
      const similar = findSimilarProjects(
        input.location || '',
        input.proposedShootDays || 3,
        input.scriptBreakdown?.techniques || []
      );
      
      if (similar.length > 0) {
        const avgBudget = similar.reduce((sum, p) => sum + p.budgetPerDay, 0) / similar.length;
        const userBudget = input.budgetSnapshot.totalBudget && input.proposedShootDays
          ? input.budgetSnapshot.totalBudget / input.proposedShootDays
          : 0;
        
        if (userBudget > 0 && userBudget < avgBudget * 0.8) {
          return {
            ruleId: 'real-data-benchmark',
            title: 'Budget below similar real projects',
            explanation: `Your budget of £${(userBudget/1000).toFixed(0)}k/day is below the £${(avgBudget/1000).toFixed(0)}k/day average for similar ${similar[0].location} shoots. Reference: ${similar[0].projectName} was £${(similar[0].budgetPerDay/1000).toFixed(0)}k/day.`,
            challenge: 'Review budget against real project comparables. Consider if scope is reduced or risks are higher.',
            category: 'budget',
            severity: 'medium',
          };
        }
      }
      return null;
    },
  },

  // ==========================================
  // PATTERN-BASED RULES (from schedule analysis)
  // ==========================================
  
  // Car Rig Rule
  {
    id: 'car-rig-complexity',
    description: 'Car rig adds significant time',
    category: 'schedule',
    condition: (input) => {
      const features = input.scriptBreakdown?.techniques || [];
      return features.some(f => 
        f.toLowerCase().includes('car rig') || 
        f.toLowerCase().includes('car mount') ||
        f.toLowerCase().includes('process trailer')
      );
    },
    scoreDelta: 1.0,
    generateFlag: () => ({
      ruleId: 'car-rig-complexity',
      title: 'Car rig: 1.5 hours rig/derig per vehicle',
      explanation: 'Based on Toyota analysis: Car rigs take 90 minutes to rig and 90 minutes to derig. Significantly reduces setups per day.',
      challenge: 'Budget 3 hours per car rig (setup + wrap). Reduce setups/day by 2-3. Consider if car shots can be grouped to minimize rig changes.',
      category: 'schedule',
      severity: 'high',
    }),
  },

  // MOCO/Robot Rule
  {
    id: 'moco-precision-time',
    description: 'Motion control requires precision time',
    category: 'schedule',
    condition: (input) => {
      const features = input.scriptBreakdown?.techniques || [];
      return features.some(f => 
        f.toLowerCase().includes('moco') || 
        f.toLowerCase().includes('motion control') ||
        f.toLowerCase().includes('bolt') ||
        f.toLowerCase().includes('robot')
      );
    },
    scoreDelta: 0.8,
    generateFlag: () => ({
      ruleId: 'moco-precision-time',
      title: 'MOCO/Bolt: Precision work reduces throughput',
      explanation: 'Based on Homesense analysis: Robot camera enables fast resets (20-25 min/setup) but precision product work still limits to 6-8 setups/day.',
      challenge: 'Budget 6-8 setups/day max with MOCO. Product precision shots cannot be rushed. Pre-program moves where possible.',
      category: 'schedule',
      severity: 'medium',
    }),
  },

  // Night Shoot Rule
  {
    id: 'night-shoot-premium',
    description: 'Night shoots cost more and move slower',
    category: 'schedule',
    condition: (input) => {
      const features = input.scriptBreakdown?.techniques || [];
      return features.some(f => 
        f.toLowerCase().includes('night') || 
        f.toLowerCase().includes('dusk') ||
        f.toLowerCase().includes('golden hour')
      );
    },
    scoreDelta: 1.2,
    generateFlag: () => ({
      ruleId: 'night-shoot-premium',
      title: 'Night/Golden hour: Time pressure + lighting cost',
      explanation: 'Night exteriors require extensive lighting setup. Golden hour windows are short (often <2 hours usable).',
      challenge: 'Budget +50% day rate for night lighting. Early call times (07:00) to rig before dark. Pre-light day often needed.',
      category: 'schedule',
      severity: 'high',
    }),
  },

  // Studio vs Location Rule
  {
    id: 'studio-efficiency',
    description: 'Studio shoots are more efficient',
    category: 'schedule',
    condition: (input) => {
      const locations = input.scriptBreakdown?.locations || [];
      const allStudio = locations.every(l => 
        l.toLowerCase().includes('studio') || l.toLowerCase().includes('stage')
      );
      return allStudio && locations.length > 0;
    },
    scoreDelta: -0.5, // Negative = reduces risk
    generateFlag: () => ({
      ruleId: 'studio-efficiency',
      title: 'All studio: Higher efficiency, predictable',
      explanation: 'Studio shoots achieve 6-8 setups/day vs 4-5 for location. No weather/travel variables.',
      challenge: 'Good efficiency. Ensure studio build costs are budgeted. Homesense achieved 6 setups in 3 hours with robot.',
      category: 'schedule',
      severity: 'low',
    }),
  },

  // EU Travel Day Rule
  {
    id: 'eu-travel-buffer',
    description: 'EU shoots need travel/recce buffer',
    category: 'schedule',
    condition: (input) => input.shootingContext === 'EU' || !!(input.location?.toLowerCase().includes('spain')) || !!(input.location?.toLowerCase().includes('portugal')),
    scoreDelta: 0.6,
    generateFlag: (input) => {
      const country = input.euCountry || 'EU country';
      return {
        ruleId: 'eu-travel-buffer',
        title: 'EU shoot: Build in travel/recce days',
        explanation: `Based on KRAKEN/Toyota analysis: EU shoots require travel days at 50% rate and recce time. KRAKEN built in 1 hour travel to beach location.`,
        challenge: `Add 2 travel days + 1-2 recce days for ${country}. Travel days at 50% crew rate. Consider if savings still work at this scale.`,
        category: 'schedule',
        severity: 'medium',
      };
    },
  },

  // Child Talent Rule (already in original, enhanced)
  {
    id: 'child-talent-restrictions',
    description: 'Children severely restrict working hours',
    category: 'schedule',
    condition: (input) => input.complexity.childrenInvolved,
    scoreDelta: 1.5,
    generateFlag: (input) => {
      const isUnder5 = input.complexity.childrenUnder5;
      return {
        ruleId: 'child-talent-restrictions',
        title: isUnder5 ? 'Children under 5: Severe time limits' : 'Children on set: Restricted hours',
        explanation: isUnder5 
          ? 'Under 5s: Max 5hrs on set, only 2hrs performing. Based on UK regulations and Toyota example (child talent 14:00 call).'
          : 'Children 9+: Max 9.5hrs on set, 5hrs performing. Requires licensed chaperone.',
        challenge: isUnder5
          ? 'Plan ALL under-5 scenes within 2-hour window. Consider twins/doubles. Likely need +1 day.'
          : 'Schedule child scenes for morning (best performance). Budget chaperone fees. Shorter hours may need extra days.',
        category: 'schedule',
        severity: isUnder5 ? 'high' : 'medium',
      };
    },
  },

  // Multi-Version Rule
  {
    id: 'multi-version-scope',
    description: 'Multiple versions multiply work',
    category: 'creative',
    condition: (input) => {
      const deliverables = input.deliverables;
      const versionCount = (deliverables.tvc30 ? 1 : 0) + 
                          (deliverables.tvc15 ? 1 : 0) + 
                          (deliverables.socialCutdowns ? 2 : 0);
      return versionCount >= 3;
    },
    scoreDelta: 1.0,
    generateFlag: (input) => ({
      ruleId: 'multi-version-scope',
      title: 'Multiple versions: Scope creep risk',
      explanation: 'Based on Smirnoff (4 versions) and Axe (4 versions): Multiple cuts significantly increase setup complexity and edit time.',
      challenge: 'Each version may need dedicated coverage. Budget additional edit/online time. Consider if all versions are essential for launch.',
      category: 'creative',
      severity: 'medium',
    }),
  },

  // Beach/Exterior Weather Rule
  {
    id: 'weather-dependent-exterior',
    description: 'Exteriors need weather buffer',
    category: 'schedule',
    condition: (input) => {
      const locations = input.scriptBreakdown?.locations || [];
      return locations.some(l => 
        l.toLowerCase().includes('beach') || 
        l.toLowerCase().includes('exterior') ||
        l.toLowerCase().includes('outdoor')
      );
    },
    scoreDelta: 0.8,
    generateFlag: () => ({
      ruleId: 'weather-dependent-exterior',
      title: 'Exterior locations: Weather contingency needed',
      explanation: 'Based on KRAKEN (beach) analysis: Weather-dependent exteriors need backup dates or VFX cover.',
      challenge: 'Budget weather cover day or VFX sky replacement. Consider stage + greenscreen as backup. Monitor forecasts 48hrs ahead.',
      category: 'schedule',
      severity: 'medium',
    }),
  },

  // Food/Product Precision Rule
  {
    id: 'food-product-precision',
    description: 'Food and product need precision time',
    category: 'schedule',
    condition: (input) => {
      const features = input.scriptBreakdown?.techniques || [];
      return features.some(f => 
        f.toLowerCase().includes('food') || 
        f.toLowerCase().includes('product') ||
        f.toLowerCase().includes('tabletop') ||
        f.toLowerCase().includes('macro')
      );
    },
    scoreDelta: 0.7,
    generateFlag: () => ({
      ruleId: 'food-product-precision',
      title: 'Food/Product: Precision cannot be rushed',
      explanation: 'Based on Homesense (kitchen/tabletop): Product shots need precise styling, lighting, and multiple takes.',
      challenge: 'Budget extra art dept time for food styling. Robot/MOCO helps but still needs 20-30 min per setup. Hero product = hero time.',
      category: 'schedule',
      severity: 'low',
    }),
  },

  // Early Call Rule (Sunrise)
  {
    id: 'sunrise-early-call',
    description: 'Sunrise shots need very early calls',
    category: 'schedule',
    condition: (input) => {
      const features = input.scriptBreakdown?.techniques || [];
      return features.some(f => 
        f.toLowerCase().includes('sunrise') || 
        f.toLowerCase().includes('dawn') ||
        f.toLowerCase().includes('magic hour')
      );
    },
    scoreDelta: 0.6,
    generateFlag: () => ({
      ruleId: 'sunrise-early-call',
      title: 'Sunrise: 07:00 or earlier crew call',
      explanation: 'Based on Toyota analysis: Sunrise 05:52 required 07:00 unit call and 06:30 breakfast. Crew need advance warning.',
      challenge: 'Warn crew of early call 48hrs ahead. Budget breakfast on set. Golden hour window is short - be ready to shoot immediately.',
      category: 'schedule',
      severity: 'low',
    }),
  },

  // ==========================================
  // BUDGET REALITY CHECK RULES
  // ==========================================
  {
    id: 'budget-vs-real-data',
    description: 'Budget way off from comparable projects',
    category: 'budget',
    condition: (input) => {
      if (!input.budgetSnapshot.totalBudget || !input.proposedShootDays) return false;
      const perDay = input.budgetSnapshot.totalBudget / input.proposedShootDays;
      const locationType = input.shootingContext === 'UK' ? 'UK' : 'EU';
      const range = getBudgetRangeForContext(locationType, input.proposedShootDays, 'standard');
      return perDay < range.min * 0.7 || perDay > range.max * 1.3;
    },
    scoreDelta: 1.5,
    generateFlag: (input) => {
      const perDay = input.budgetSnapshot.totalBudget! / input.proposedShootDays!;
      const locationType = input.shootingContext === 'UK' ? 'UK' : 'EU';
      const range = getBudgetRangeForContext(locationType, input.proposedShootDays!, 'standard');
      const direction = perDay < range.avg ? 'below' : 'above';
      
      return {
        ruleId: 'budget-vs-real-data',
        title: `Budget ${direction} real project comparables`,
        explanation: `Your £${(perDay/1000).toFixed(0)}k/day is ${direction} the typical £${(range.min/1000).toFixed(0)}k-£${(range.max/1000).toFixed(0)}k range for ${locationType} ${input.proposedShootDays}-day shoots.`,
        challenge: direction === 'below' 
          ? 'Risk of under-bidding. Either scope is reduced or something is missing. Compare to similar projects in training data.'
          : 'Premium budget - ensure client understands value. May be competitive disadvantage.',
        category: 'budget',
        severity: 'high',
      };
    },
  },
];

// ============================================
// ENHANCED EVALUATION FUNCTION
// ============================================

export function evaluateWithTrainingData(
  input: AssessmentInput,
  schedule?: ScheduleSimulation
): { 
  score: number; 
  flags: RuleFlag[];
  similarProjects: typeof REAL_PROJECTS;
  recommendedDays: number;
  budgetRange: { min: number; max: number; avg: number };
} {
  let score = 0;
  const flags: RuleFlag[] = [];

  // Run enhanced rules
  ENHANCED_RULES.forEach((rule) => {
    try {
      if (rule.condition(input, schedule)) {
        score += rule.scoreDelta;
        const flag = rule.generateFlag(input, schedule);
        if (flag) flags.push(flag);
      }
    } catch (err) {
      console.warn(`Rule ${rule.id} evaluation failed:`, err);
    }
  });

  // Cap score
  score = Math.min(10, Math.max(0, score));

  // Find similar projects
  const similarProjects = findSimilarProjects(
    input.location || '',
    input.proposedShootDays || 3,
    input.scriptBreakdown?.techniques || []
  );

  // Recommend days based on features
  const recommendedDays = estimateDaysFromFeatures(
    input.scriptBreakdown?.techniques || []
  );

  // Calculate budget range
  const locationType = input.shootingContext === 'UK' ? 'UK' : 'EU';
  const complexity = score > 6 ? 'complex' : score > 3 ? 'standard' : 'simple';
  const budgetRange = getBudgetRangeForContext(
    locationType,
    recommendedDays,
    complexity
  );

  return { 
    score, 
    flags, 
    similarProjects, 
    recommendedDays, 
    budgetRange 
  };
}

// ============================================
// EXPORT ALL RULES (enhanced + original)
// ============================================

export * from './engine';
