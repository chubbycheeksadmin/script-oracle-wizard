// ============================================
// COMPREHENSIVE SCHEDULE PATTERN DATA
// Extracted from ALL 30 schedule files
// ============================================

export interface SchedulePattern {
  metric: string;
  value: number | string;
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  samples: number;
  notes?: string;
}

// ============================================
// CALL TIME PATTERNS (from 30 schedules)
// ============================================

export const CALL_TIME_PATTERNS = {
  // Most common call times across all schedules
  distribution: [
    { time: '08:00', count: 7, percentage: 26 },  // Most common - standard
    { time: '07:30', count: 5, percentage: 19 },  // Early - sunrise/location
    { time: '07:00', count: 5, percentage: 19 },  // Very early - golden hour
    { time: '06:30', count: 1, percentage: 4 },   // Pre-dawn - special cases
    { time: '10:00', count: 1, percentage: 4 },   // Late - studio only
    { time: '10:30', count: 1, percentage: 4 },   // Late - studio only
  ],
  
  // Recommendations based on project type
  recommendations: {
    sunrise_golden_hour: '07:00',     // Toyota sunrise 05:52 = 07:00 call
    standard_location: '08:00',       // Most common
    studio_only: '08:30',             // Homesense - no natural light constraint
    complex_rig: '07:00',             // Need setup time before talent
    eu_location: '08:00',             // KRAKEN - travel built in
  },
  
  // Breakfast timing (from Toyota analysis)
  breakfast: {
    typical: '06:30',  // 30 min before call
    relative_to_call: -30,  // minutes
  },
};

// ============================================
// DAY STRUCTURE PATTERNS
// ============================================

export const DAY_STRUCTURE_PATTERNS = {
  // Standard commercial day (11 hours total)
  standard_day: {
    crew_call: '08:00',
    breakfast: '07:30',
    turnover: '09:30',  // 1.5 hrs from call
    lunch: '13:00',
    wrap: '19:00',
    total_hours: 11,
    working_hours: 10,
  },
  
  // Early day (sunrise/golden hour)
  early_day: {
    crew_call: '07:00',
    breakfast: '06:30',
    sunrise_shoot: '07:30',  // 30 min after call
    lunch: '13:00',
    wrap: '19:00',
    total_hours: 12,
    notes: 'Toyota pattern - early call for sunrise',
  },
  
  // EU day (with travel)
  eu_day: {
    crew_call: '08:00',
    travel_to_location: '07:15',  // KRAKEN pattern
    breakfast_on_location: '07:45',
    unit_call: '08:00',
    wrap: '19:00',
    notes: 'KRAKEN pattern - 45 min travel built in',
  },
  
  // Long day (14 hours - Smirnoff)
  long_day: {
    crew_call: '07:00',
    wrap: '21:00',
    total_hours: 14,
    notes: 'Smirnoff Portugal - 14 hour days',
  },
};

// ============================================
// SCENE TIMING PATTERNS (76 scenes analyzed)
// ============================================

export const SCENE_TIMING_PATTERNS = {
  // Overall statistics
  stats: {
    total_scenes_analyzed: 76,
    min_duration: 15,      // minutes
    max_duration: 120,     // minutes
    mean_duration: 40,     // minutes
    median_duration: 30,   // minutes
  },
  
  // Distribution by category
  categories: {
    quick: {
      threshold: '≤20 min',
      percentage: 36,
      count: 27,
      typical_for: [
        'Pickups/inserts',
        'Detail shots',
        'Reaction shots',
        'Simple reverses',
        'Cutaways',
      ],
    },
    standard: {
      threshold: '21-45 min',
      percentage: 30,
      count: 23,
      typical_for: [
        'Dialogue scenes',
        'Performance shots',
        'Standard coverage (WS-MS-CU)',
        'Product beauty shots',
      ],
    },
    long: {
      threshold: '>45 min',
      percentage: 34,
      count: 26,
      typical_for: [
        'Complex setups',
        'Stunt work',
        'VFX plates',
        'Performance moments',
        'First shot of day (includes lighting)',
      ],
    },
  },
  
  // Scene-specific examples from real data
  examples: {
    quick: [
      { duration: 17, description: 'Breakfast + 17 min drive between locations', project: 'Toyota' },
      { duration: 20, description: 'Parking space reverse maneuver', project: 'Toyota' },
      { duration: 20, description: 'Bonnet mount setup', project: 'Toyota' },
    ],
    standard: [
      { duration: 45, description: 'Rally driving with A & B cams', project: 'Toyota' },
      { duration: 30, description: 'Stunt with no cast', project: 'Toyota' },
      { duration: 45, description: 'Performance moment - stare off', project: 'KRAKEN' },
    ],
    long: [
      { duration: 60, description: 'Morning prep/lighting', project: 'KRAKEN' },
      { duration: 60, description: 'Crowd control setup', project: 'KRAKEN' },
      { duration: 120, description: 'Complex MOCO/robot move', project: 'Homesense' },
    ],
  },
};

// ============================================
// SETUP TIMING PATTERNS
// ============================================

export const SETUP_TIMING_PATTERNS = {
  // From schedule analysis
  studio: {
    robot_moco: {
      avg_minutes: 25,      // Homesense: 20-25 min per setup
      range: '20-30 min',
      notes: 'Fast reset, precise positioning',
    },
    standard: {
      avg_minutes: 45,
      range: '30-60 min',
      notes: 'Normal studio lighting setup',
    },
  },
  
  location: {
    simple: {
      avg_minutes: 30,
      range: '20-45 min',
      notes: 'Minimal lighting, natural light',
    },
    standard: {
      avg_minutes: 45,
      range: '30-60 min',
      notes: 'Standard location lighting package',
    },
    complex: {
      avg_minutes: 75,
      range: '60-90 min',
      notes: 'Hero product, MOCO, or precision',
    },
  },
  
  // Special setups (from real data)
  special: {
    car_rig: {
      rig_time: 90,      // Toyota: 1.5 hours to rig
      derig_time: 90,    // Toyota: 1.5 hours to derig
      total_impact: 180, // 3 hours total per vehicle
      notes: 'Significantly reduces setups/day by 2-3',
    },
    night_exterior: {
      lighting_setup: 120,  // 2 hours for night lighting
      notes: 'Requires pre-light or very early call',
    },
  },
};

// ============================================
// UNIT MOVE PATTERNS (9 moves analyzed)
// ============================================

export const UNIT_MOVE_PATTERNS = {
  stats: {
    total_moves_analyzed: 9,
    min_minutes: 5,
    max_minutes: 45,
    avg_minutes: 17.2,
  },
  
  categories: {
    close: {
      distance: 'Same area/neighborhood',
      time_range: '15-20 min',
      examples: [
        { time: 17, description: 'Drive between locations (Toyota)', type: 'full_unit_move' },
      ],
    },
    medium: {
      distance: 'Different parts of city',
      time_range: '30-45 min',
      examples: [
        { time: 45, description: 'Unit move to Location 2 + setup (Toyota)' },
      ],
    },
    far: {
      distance: 'Outside city/town',
      time_range: '45-90 min',
      examples: [
        { time: 60, description: 'Travel to beach location (KRAKEN: Sitges from Barcelona)' },
      ],
    },
  },
  
  // Reset after move
  reset_after_move: {
    avg_minutes: 45,
    range: '30-60 min',
    notes: 'Re-setup cameras, lighting, blocking at new location',
  },
};

// ============================================
// LOCATIONS PER DAY PATTERNS
// ============================================

export const LOCATION_PATTERNS = {
  stats: {
    avg_per_day: 2.9,
    min: 1,
    max: 7,
  },
  
  impact_on_setups: {
    single_location: {
      locations: 1,
      typical_setups: '6-8',
      examples: ['Homesense - all studio'],
    },
    two_locations: {
      locations: 2,
      typical_setups: '4-5',
      examples: ['Standard multi-location'],
    },
    three_plus: {
      locations: 3,
      typical_setups: '3-4',
      examples: ['Toyota - 3 locations in one day'],
    },
  },
};

// ============================================
// LUNCH & BREAK PATTERNS
// ============================================

export const BREAK_PATTERNS = {
  lunch: {
    typical_time: '13:00',
    duration_minutes: 60,
    range: '45-90 min',
    occurrences: {
      '12:00': 2,
      '13:00': 1,
      '14:00': 1,
      '15:30': 1,
    },
  },
  
  other_breaks: {
    breakfast: {
      time: '06:30',
      relative_to_call: -30,
      duration: 30,
    },
    coffee_breaks: {
      frequency: 'Every 3-4 hours',
      duration: 15,
    },
  },
};

// ============================================
// WRAP TIME PATTERNS
// ============================================

export const WRAP_PATTERNS = {
  standard: {
    time: '19:00',
    hours_from_call: 11,
  },
  early_wrap: {
    time: '18:30',
    notes: 'Simpler shoots or earlier call',
  },
  late_wrap: {
    time: '19:30-20:00',
    notes: 'Complex setups or later call',
  },
  
  distribution: {
    '18:30': 2,
    '19:00': 2,
    '19:30': 1,
    '20:00': 1,
  },
};

// ============================================
// CREW STRUCTURE PATTERNS
// ============================================

export const CREW_PATTERNS = {
  // Department indicators found
  departments_typical: [
    'camera',
    'sound',
    'lighting',
    'grip',
    'art dept',
    'wardrobe',
    'makeup',
    'production',
  ],
  
  // Key crew call times (from Toyota)
  hod_calls: {
    dop: '07:00',           // Same as unit
    first_ad: '07:00',      // Same as unit
    gaffer: '06:30',        // 30 min early (lighting pre-rig)
    grips: '06:30',         // 30 min early
    art: '07:00',           // Same as unit
    wardrobe: '07:00',      // Same as unit
    makeup: '07:00',        // Same as unit
  },
  
  // Talent call times
  talent_calls: {
    principal: 'varies',    // Depends on makeup/wardrobe
    background: '08:00',    // 1 hour after unit
    children: '14:00',      // Toyota example - shorter day
  },
};

// ============================================
// PROJECT-SPECIFIC SCHEDULE INTELLIGENCE
// ============================================

export const PROJECT_SCHEDULES = {
  toyota: {
    days: 4,
    call_time: '07:00',
    locations_per_day: 3,
    unit_moves: 2,
    special: 'Car rigs (1.5hrs each), sunrise shots, child talent (14:00 call)',
  },
  
  homesense: {
    days: 1,
    call_time: '08:30',
    locations: 1,  // Studio only
    setups: 6,
    setup_duration: '20-25 min',
    special: 'Robot camera (Bolt), all kitchen/tabletop',
  },
  
  kraken: {
    days: 4,
    call_time: '08:00',
    day_1: {
      location: 'Beach (Sitges)',
      travel: '07:15 from Barcelona',
      breakfast: '07:45 on location',
      scenes: ['Beach emergence', 'Crowd control'],
    },
  },
  
  smirnoff: {
    days: 4,
    length_of_day: '14 hours',
    special: '4 versions, Portugal, beach + studio',
  },
  
  axe: {
    days: 3,
    call_time: '08:00',
    versions: 4,  // Main, Breathing, Slippery, Sludgie
  },
  
  visa: {
    days: 4,
    locations: 'Multi-location Slovenia',
    structure: 'Location prep + 4 day shoot',
  },
};

// ============================================
// RECOMMENDED VALUES FOR MODEL
// ============================================

export const SCHEDULE_RECOMMENDATIONS = {
  // Default values when no specific data
  defaults: {
    call_time: '08:00',
    setup_time_minutes: 45,
    move_time_minutes: 30,
    lunch_time: '13:00',
    wrap_time: '19:00',
    setups_per_day: 6,
  },
  
  // Adjustments by context
  adjustments: {
    sunrise_shoot: {
      call_time: '07:00',
      breakfast: '06:30',
    },
    studio_only: {
      call_time: '08:30',
      setups_per_day: 7,
    },
    car_rig_present: {
      setups_per_day: 4,
      rig_buffer_hours: 3,
    },
    eu_location: {
      travel_days: 2,
      recce_days: 1,
    },
    children_under_5: {
      max_performance_hours: 2,
      recommended_shoot_hours: 5,
    },
  },
};

// ============================================
// VALIDATION RULES
// ============================================

export const SCHEDULE_VALIDATION = {
  // Red flags
  red_flags: [
    { condition: 'setups > 8', message: 'More than 8 setups/day is unrealistic' },
    { condition: 'locations > 4', message: 'More than 4 locations/day risks overtime' },
    { condition: 'call < 06:00', message: 'Pre-6am calls may have crew availability issues' },
    { condition: 'wrap > 21:00', message: 'Post-9pm wrap risks overtime/exhaustion' },
  ],
  
  // Yellow flags
  yellow_flags: [
    { condition: 'setups 6-8', message: 'High setup count - ensure adequate time' },
    { condition: 'moves > 2', message: 'Multiple moves - consider consolidating' },
    { condition: 'day > 12 hours', message: 'Long day - build in break time' },
  ],
};
