// ============================================
// SCHEDULE SIMULATOR - AD-STYLE TIME RULES
// ============================================

import {
  Scene,
  ScriptBreakdown,
  ScheduleSimulation,
  DaySchedule,
  ScheduleConstants,
  AssessmentInput,
  AIBreakdown,
  ProductionAssumptions,
} from '@/types';
import { SCHEDULE_CONSTANTS } from '@/lib/cost/constants';

// ============================================
// APPLY PRODUCTION ASSUMPTIONS TO SCHEDULE
// ============================================

function applyProductionAssumptions(
  baseDays: number,
  baseCompanyMoves: number,
  mocoRequired: boolean,
  studioShoot: boolean,
  secondUnitPossible: boolean,
  secondUnitSetups: number,
  assumptions: ProductionAssumptions | undefined,
  scheduleNotes: string[]
): { adjustedDays: number; adjustedMoves: number; savingsNotes: string[] } {
  if (!assumptions) {
    return {
      adjustedDays: baseDays,
      adjustedMoves: baseCompanyMoves,
      savingsNotes: [],
    };
  }

  let adjustedDays = baseDays;
  let adjustedMoves = baseCompanyMoves;
  const savingsNotes: string[] = [];

  // 0. Studio shoot recognition - company moves become set changes (much faster)
  if (studioShoot && adjustedMoves > 0) {
    // Studio shoots have no real company moves - just set changes
    // Set changes take ~45 mins vs 105 mins for location moves
    const timeSavedMins = adjustedMoves * 60; // Save 60 mins per "move"
    const daysSaved = Math.floor(timeSavedMins / 510);
    if (daysSaved > 0) {
      adjustedDays = Math.max(1, adjustedDays - daysSaved);
      savingsNotes.push(`Studio shoot: set changes (not location moves) save ~${daysSaved} day(s)`);
    }
    // Reset moves to 0 for studio shoots
    adjustedMoves = 0;
    savingsNotes.push('Studio shoot: 0 company moves (sets built side by side)');
  }

  // 1. Location groupings reduce company moves and save time
  if (assumptions.locationGroups && assumptions.locationGroups.length > 0) {
    // Calculate moves saved: each group with N scenes saves (N-1) moves
    // Because N scenes at different locations = N-1 moves, but consolidated to 1 location = 0 moves for that group
    let totalMovesSaved = 0;
    assumptions.locationGroups.forEach(group => {
      if (group.sceneNumbers.length > 1) {
        // Each scene beyond the first in a group saves a company move
        totalMovesSaved += group.sceneNumbers.length - 1;
      }
    });

    const moveReduction = Math.min(adjustedMoves, totalMovesSaved);
    adjustedMoves = Math.max(0, adjustedMoves - moveReduction);

    if (moveReduction > 0) {
      savingsNotes.push(`Location groupings reduce company moves by ${moveReduction}`);

      // Each company move = ~105 mins overhead (60 min move + 45 min reset)
      // A day has ~510 working minutes (10 hrs - lunch - turnover)
      // So each move saved = ~20% of a day
      const timeSavedMins = moveReduction * 105;
      const daysSaved = Math.floor(timeSavedMins / 510);
      if (daysSaved > 0) {
        adjustedDays = Math.max(1, adjustedDays - daysSaved);
        savingsNotes.push(`Reduced moves save ~${Math.round(timeSavedMins / 60)} hours (${daysSaved} day equivalent)`);
      }
    }
  }

  // 2. MOCO alternatives remove the 50% time penalty (only for location shoots)
  // Studio shoots with MOCO are already efficient - robot is pre-programmed
  if (mocoRequired && !studioShoot && assumptions.mocoAlternatives?.enabled) {
    // The AI's estimate includes a 1.5x multiplier for MOCO on location
    // Removing MOCO means dividing by 1.5 (or multiplying by ~0.67)
    const mocoSavings = Math.round(adjustedDays * 0.33); // ~1/3 reduction
    adjustedDays = Math.max(1, adjustedDays - mocoSavings);
    savingsNotes.push(`VFX approach instead of MOCO saves ~${mocoSavings} day(s)`);
  }

  // 2.5. 2nd Unit - if user confirms location permits parallel food/product unit
  // AI baseline assumes main unit handles everything sequentially
  // With 2nd unit confirmed, those setups run in parallel, reducing main unit days
  if (secondUnitPossible && assumptions.secondUnitAvailable && secondUnitSetups > 0) {
    // Calculate how many days the 2nd unit setups would have taken on main unit
    // Using ~10 setups/day as baseline
    const setupsPerDay = 10;
    const daysSavedBy2ndUnit = Math.floor(secondUnitSetups / setupsPerDay);

    if (daysSavedBy2ndUnit > 0) {
      adjustedDays = Math.max(1, adjustedDays - daysSavedBy2ndUnit);
      savingsNotes.push(`2nd Unit handles ${secondUnitSetups} food/product setups in parallel, saves ~${daysSavedBy2ndUnit} day(s)`);
    } else if (secondUnitSetups >= 5) {
      // Even partial savings matter - if 5+ setups can run on 2nd unit, that's ~half a day
      adjustedDays = Math.max(1, adjustedDays - 0.5);
      savingsNotes.push(`2nd Unit handles ${secondUnitSetups} food/product setups in parallel, saves ~0.5 day`);
    } else {
      savingsNotes.push(`2nd Unit handles ${secondUnitSetups} food/product setups (minor time savings)`);
    }
  }

  // 3. Nearby locations reduce move overhead
  if (assumptions.nearbyLocations && adjustedMoves > 0) {
    // Nearby locations: ~30 min saved per move = ~0.5 setup per move
    // With avg 9 setups/day, each move saved = 0.1 days saved per move
    const moveSavings = adjustedMoves * 0.1;
    if (moveSavings >= 0.5) {
      const savedDays = Math.floor(moveSavings);
      if (savedDays > 0) {
        adjustedDays = Math.max(1, adjustedDays - savedDays);
        savingsNotes.push(`Nearby locations save ~${savedDays * 30} mins total (${savedDays} day equivalent)`);
      }
    }
  }

  // 4. Experienced crew can do 10+ setups/day instead of 9
  if (assumptions.experiencedCrew) {
    // Going from 9 to 10 setups/day = ~10% efficiency gain
    const crewEfficiency = adjustedDays * 0.1;
    if (crewEfficiency >= 0.5) {
      const savedDays = Math.floor(crewEfficiency);
      if (savedDays > 0) {
        adjustedDays = Math.max(1, adjustedDays - savedDays);
        savingsNotes.push(`Experienced crew efficiency saves ~${savedDays} day(s)`);
      }
    }
  }

  // 5. Studio consolidation for INT scenes
  if (assumptions.studioAvailable) {
    // This mainly helps with weather and consistency, minor time savings
    savingsNotes.push('Studio available reduces weather contingency risk');
  }

  // 6. Golden hour grouping
  if (assumptions.goldenHourGrouped) {
    savingsNotes.push('Golden hour scenes grouped efficiently - reduced schedule pressure');
  }

  // 7. Night scenes grouped
  if (assumptions.nightScenesGrouped) {
    savingsNotes.push('Night scenes consolidated into single overnight - avoids turnaround issues');
  }

  return {
    adjustedDays: Math.round(adjustedDays),
    adjustedMoves: adjustedMoves,
    savingsNotes,
  };
}

// ============================================
// SHOT TIME CALCULATION
// ============================================

export function calculateShotTime(
  scene: Scene,
  constants: ScheduleConstants = SCHEDULE_CONSTANTS
): number {
  let minutes = 0;

  // Base shot time
  if (scene.technicalComplexity || scene.heroProductMoment) {
    minutes = constants.technicalShotMinutes;
  } else {
    minutes = constants.avgShotExecutionMinutes;
  }

  // Add reset time between shots
  minutes += constants.avgResetMinutes;

  // Multiply by estimated shots in scene
  return minutes * scene.estimatedShots;
}

// ============================================
// CALCULATE AVAILABLE WORKING TIME PER DAY
// ============================================

export function calculateAvailableMinutes(
  constants: ScheduleConstants = SCHEDULE_CONSTANTS
): number {
  // Total day = 11 hours (660 min)
  // Less turnover = 1.5 hours (90 min)
  // Less lunch = 1 hour (60 min)
  // = 8.5 hours effective shooting time (510 min)
  return constants.workingMinutes - constants.turnoverMinutes;
}

// ============================================
// GROUP SCENES BY LOCATION
// ============================================

export function groupScenesByLocation(scenes: Scene[]): Map<string, Scene[]> {
  const groups = new Map<string, Scene[]>();

  scenes.forEach((scene) => {
    const key = scene.locationName.toLowerCase().trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(scene);
  });

  return groups;
}

// ============================================
// ESTIMATE COMPANY MOVES
// ============================================

export function estimateCompanyMoves(scenes: Scene[]): number {
  const locations = new Set(scenes.map((s) => s.locationName.toLowerCase().trim()));
  // Company moves = unique locations - 1 (start location doesn't count)
  return Math.max(0, locations.size - 1);
}

// ============================================
// SIMULATE A SINGLE DAY
// ============================================

export function simulateDay(
  dayNumber: number,
  scenes: Scene[],
  companyMoves: number,
  constants: ScheduleConstants = SCHEDULE_CONSTANTS
): DaySchedule {
  const availableMinutes = calculateAvailableMinutes(constants);
  const pressurePoints: string[] = [];

  // Calculate total time required for all scenes
  let totalMinutesRequired = 0;
  let totalShots = 0;
  let technicalShotCount = 0;
  let heroProductCount = 0;

  scenes.forEach((scene) => {
    const sceneTime = calculateShotTime(scene, constants);
    totalMinutesRequired += sceneTime;
    totalShots += scene.estimatedShots;

    if (scene.technicalComplexity) technicalShotCount++;
    if (scene.heroProductMoment) heroProductCount++;
  });

  // Add company move overhead
  const companyMoveOverhead =
    companyMoves * (constants.companyMoveMinutes + constants.companyMoveResetMinutes);
  totalMinutesRequired += companyMoveOverhead;

  // Check for INT/EXT mix (lighting reset inefficiency)
  const hasInt = scenes.some((s) => s.intExt === 'INT' || s.intExt === 'INT/EXT');
  const hasExt = scenes.some((s) => s.intExt === 'EXT' || s.intExt === 'INT/EXT');
  if (hasInt && hasExt) {
    // Add 30 minutes for lighting resets on mixed INT/EXT days
    totalMinutesRequired += 30;
    pressurePoints.push('INT/EXT mix requires lighting resets');
  }

  // Check for DAY/NIGHT mix
  const hasDay = scenes.some((s) => s.dayNight === 'DAY' || s.dayNight === 'DAWN');
  const hasNight = scenes.some((s) => s.dayNight === 'NIGHT' || s.dayNight === 'DUSK');
  if (hasDay && hasNight) {
    pressurePoints.push('DAY/NIGHT mix limits shooting window');
  }

  // Generate pressure points
  if (companyMoves >= 2) {
    pressurePoints.push(`${companyMoves} company moves add ${companyMoveOverhead} mins overhead`);
  }

  if (technicalShotCount >= 2) {
    pressurePoints.push(`${technicalShotCount} technical shots competing for time`);
  }

  if (heroProductCount >= 2) {
    pressurePoints.push(`${heroProductCount} hero product moments need careful scheduling`);
  }

  if (totalShots > 7) {
    pressurePoints.push(`${totalShots} shots is aggressive for one day`);
  }

  const overrunMinutes = Math.max(0, totalMinutesRequired - availableMinutes);
  const isOverloaded = overrunMinutes > 0;

  if (isOverloaded) {
    const overrunHours = (overrunMinutes / 60).toFixed(1);
    pressurePoints.push(`Schedule overrun: ${overrunHours}h beyond 10hr working day`);
  }

  return {
    dayNumber,
    scenes,
    shots: totalShots,
    totalMinutesRequired,
    availableMinutes,
    overrunMinutes,
    companyMoves,
    isOverloaded,
    pressurePoints,
  };
}

// ============================================
// DISTRIBUTE SCENES ACROSS DAYS
// ============================================

export function distributeScenes(
  breakdown: ScriptBreakdown,
  proposedDays: number,
  constants: ScheduleConstants = SCHEDULE_CONSTANTS
): DaySchedule[] {
  const availableMinutes = calculateAvailableMinutes(constants);
  const days: DaySchedule[] = [];
  const scenes = [...breakdown.scenes];

  // Group by location to minimize company moves
  const locationGroups = groupScenesByLocation(scenes);
  const sortedLocations = Array.from(locationGroups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Simple greedy distribution
  let currentDayScenes: Scene[] = [];
  let currentDayMinutes = 0;
  let dayNumber = 1;

  const allScenesOrdered = sortedLocations.flatMap(([, sceneList]) => sceneList);

  allScenesOrdered.forEach((scene) => {
    const sceneTime = calculateShotTime(scene, constants);

    // Check if adding this scene would exceed available time
    if (currentDayMinutes + sceneTime > availableMinutes && currentDayScenes.length > 0) {
      // Finish current day
      const companyMoves = estimateCompanyMoves(currentDayScenes);
      days.push(simulateDay(dayNumber, currentDayScenes, companyMoves, constants));
      dayNumber++;
      currentDayScenes = [];
      currentDayMinutes = 0;
    }

    currentDayScenes.push(scene);
    currentDayMinutes += sceneTime;
  });

  // Add final day if there are remaining scenes
  if (currentDayScenes.length > 0) {
    const companyMoves = estimateCompanyMoves(currentDayScenes);
    days.push(simulateDay(dayNumber, currentDayScenes, companyMoves, constants));
  }

  return days;
}

// ============================================
// MAIN SCHEDULE SIMULATION
// ============================================

export function simulateSchedule(
  input: AssessmentInput,
  constants: ScheduleConstants = SCHEDULE_CONSTANTS
): ScheduleSimulation {
  const breakdown = input.scriptBreakdown;
  const aiBreakdown = input.aiBreakdown;
  const proposedDays = input.proposedShootDays || 1;
  const scheduleNotes: string[] = [];

  // If we have an AI breakdown, use its data directly
  if (aiBreakdown && aiBreakdown.rollup) {
    const rollup = aiBreakdown.rollup;
    const baseEstimatedDays = rollup.estimatedShootDays;
    const totalShots = rollup.totalEstimatedShots;
    const baseCompanyMoves = aiBreakdown.companyMoves;
    const mocoRequired = rollup.mocoRequired || false;
    const studioShoot = rollup.studioShoot || false;
    const secondUnitPossible = rollup.secondUnitPossible || false;
    const secondUnitSetups = rollup.secondUnitSetups || 0;

    // Apply production assumptions to get adjusted values
    const { adjustedDays, adjustedMoves, savingsNotes } = applyProductionAssumptions(
      baseEstimatedDays,
      baseCompanyMoves,
      mocoRequired,
      studioShoot,
      secondUnitPossible,
      secondUnitSetups,
      input.productionAssumptions,
      scheduleNotes
    );

    const totalDaysRequired = adjustedDays;
    const avgShotsPerDay = totalShots / Math.max(1, totalDaysRequired);
    const avgCompanyMovesPerDay = adjustedMoves / Math.max(1, totalDaysRequired);

    // Add studio shoot indicator at the top
    if (studioShoot) {
      scheduleNotes.push('🎬 STUDIO SHOOT DETECTED - Higher efficiency (12-15 setups/day achievable)');
    }

    // Generate schedule notes from AI analysis
    scheduleNotes.push(...rollup.scheduleNotes);

    // Add savings notes if any assumptions were applied
    if (savingsNotes.length > 0) {
      scheduleNotes.push('--- Production Assumptions Applied ---');
      scheduleNotes.push(...savingsNotes);
      if (adjustedDays < baseEstimatedDays) {
        scheduleNotes.push(`Optimized: ${baseEstimatedDays} days → ${adjustedDays} days`);
      }
      if (adjustedMoves < baseCompanyMoves) {
        scheduleNotes.push(`Moves reduced: ${baseCompanyMoves} → ${adjustedMoves}`);
      }
    }

    // Day deficit check
    const dayDeficit = totalDaysRequired - proposedDays;
    if (dayDeficit > 0) {
      scheduleNotes.push(
        `${savingsNotes.length > 0 ? 'Optimized estimate' : 'AI analysis'} recommends ${totalDaysRequired} days but ${proposedDays} proposed (${dayDeficit} day deficit)`
      );
    }

    // High-risk days based on company moves and complexity
    const highRiskDays: number[] = [];
    if (avgCompanyMovesPerDay >= 1.5) {
      // If lots of company moves, most days are high-risk
      for (let i = 1; i <= totalDaysRequired; i++) {
        highRiskDays.push(i);
      }
    }

    // Create mock day schedules for the UI
    const days: DaySchedule[] = [];
    for (let i = 1; i <= totalDaysRequired; i++) {
      days.push({
        dayNumber: i,
        scenes: [],
        shots: Math.round(avgShotsPerDay),
        totalMinutesRequired: avgShotsPerDay * 70, // ~70 min per shot average
        availableMinutes: calculateAvailableMinutes(constants),
        overrunMinutes: 0,
        companyMoves: Math.round(avgCompanyMovesPerDay),
        isOverloaded: avgShotsPerDay > 8 || avgCompanyMovesPerDay > 1.5,
        pressurePoints: [],
      });
    }

    return {
      days,
      totalDaysRequired,
      proposedDays,
      dayDeficit: Math.max(0, dayDeficit),
      avgShotsPerDay,
      avgCompanyMovesPerDay,
      highRiskDays,
      scheduleNotes,
    };
  }

  // If no AI breakdown and no script breakdown, create a minimal estimate based on input
  if (!breakdown || breakdown.scenes.length === 0) {
    // Estimate based on input toggles
    const estimatedShots = input.complexity.technical
      ? 5
      : input.complexity.heroProduct
      ? 6
      : 8;

    const mockScene: Scene = {
      id: 'mock-1',
      sceneNumber: 1,
      intExt: input.interiorExteriorMix ? 'INT/EXT' : 'INT',
      dayNight: 'DAY',
      locationName: 'Main Location',
      isLocationReused: true,
      setType: 'Practical',
      actionComplexity: input.complexity.technical ? 'High' : 'Medium',
      technicalComplexity: input.complexity.technical,
      heroProductMoment: input.complexity.heroProduct,
      vfxLevel: input.complexity.vfxHeavy ? 'Heavy' : input.complexity.vfxLight ? 'Light' : 'None',
      description: 'Estimated scene based on input',
      estimatedShots,
      artDept: { setDressingRequired: true, propsRequired: 'Practical', buildImplied: false },
      wardrobe: {
        principalWardrobe: true,
        featuredWardrobe: false,
        continuityMultiples: false,
        quickChanges: false,
      },
      talent: {
        heroPrincipalCount: 1,
        featuredCount: 0,
        walkOnCount: 0,
        extrasCount: 0,
        hasDialogue: true,
        hasFeaturedAction: true,
        isBackgroundOnly: false,
      },
    };

    const mockDay = simulateDay(
      1,
      [mockScene],
      input.companyMovesPerDay || 0,
      constants
    );

    scheduleNotes.push('Schedule estimated from inputs only - no detailed breakdown provided');
    scheduleNotes.push('For accurate assessment, provide script or scene breakdown');

    return {
      days: [mockDay],
      totalDaysRequired: 1,
      proposedDays,
      dayDeficit: proposedDays >= 1 ? 0 : 1 - proposedDays,
      avgShotsPerDay: estimatedShots,
      avgCompanyMovesPerDay: input.companyMovesPerDay || 0,
      highRiskDays: mockDay.isOverloaded ? [1] : [],
      scheduleNotes,
    };
  }

  // Distribute scenes across days
  const days = distributeScenes(breakdown, proposedDays, constants);
  const totalDaysRequired = days.length;

  // Calculate averages
  const totalShots = days.reduce((sum, d) => sum + d.shots, 0);
  const totalCompanyMoves = days.reduce((sum, d) => sum + d.companyMoves, 0);
  const avgShotsPerDay = totalShots / totalDaysRequired;
  const avgCompanyMovesPerDay = totalCompanyMoves / totalDaysRequired;

  // Identify high-risk days
  const highRiskDays = days
    .filter((d) => d.isOverloaded || d.companyMoves >= 3 || d.shots > 7)
    .map((d) => d.dayNumber);

  // Day deficit
  const dayDeficit = totalDaysRequired - proposedDays;

  // Generate schedule notes
  if (dayDeficit > 0) {
    scheduleNotes.push(
      `Schedule requires ${totalDaysRequired} days but only ${proposedDays} proposed`
    );
    scheduleNotes.push(`Day deficit of ${dayDeficit} will likely require overtime or scope reduction`);
  }

  if (avgShotsPerDay > 7) {
    scheduleNotes.push(
      `Average ${avgShotsPerDay.toFixed(1)} shots/day is aggressive at standard complexity`
    );
  }

  if (avgCompanyMovesPerDay >= 2) {
    scheduleNotes.push(
      `Average ${avgCompanyMovesPerDay.toFixed(1)} company moves/day will impact efficiency`
    );
  }

  if (highRiskDays.length > 0) {
    scheduleNotes.push(
      `${highRiskDays.length} day(s) flagged as high-risk: ${highRiskDays.join(', ')}`
    );
  }

  // EU short shoot efficiency note
  if (input.shootingContext === 'EU' && proposedDays <= 2) {
    scheduleNotes.push('Short EU shoot (≤2 days) has higher per-day burn; savings erode');
  } else if (input.shootingContext === 'EU' && proposedDays >= 4) {
    scheduleNotes.push('EU shoot of 4+ days improves efficiency; better value per day');
  }

  return {
    days,
    totalDaysRequired,
    proposedDays,
    dayDeficit,
    avgShotsPerDay,
    avgCompanyMovesPerDay,
    highRiskDays,
    scheduleNotes,
  };
}
