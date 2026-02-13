// ============================================
// SCRIPT PARSER - EXTRACT SCENES FROM TEXT
// ============================================

import {
  Scene,
  ScriptBreakdown,
  TalentRollup,
  IntExt,
  DayNight,
  VFXLevel,
  ComplexityLevel,
} from '@/types';

// ============================================
// SCENE HEADER REGEX PATTERNS
// ============================================

// Standard screenplay format: INT. LOCATION - DAY/NIGHT
const SCENE_HEADER_REGEX = /^(INT|EXT|INT\/EXT|I\/E)[.\s]+(.+?)\s*[-–—]\s*(DAY|NIGHT|DUSK|DAWN|CONTINUOUS|LATER|SAME)/i;

// Alternative format without dash
const SCENE_HEADER_ALT_REGEX = /^(INT|EXT|INT\/EXT|I\/E)[.\s]+(.+?)\s+(DAY|NIGHT|DUSK|DAWN)/i;

// Scene number pattern
const SCENE_NUMBER_REGEX = /^(\d+[A-Z]?)[.\s]/;

// ============================================
// KEYWORDS FOR COMPLEXITY DETECTION
// ============================================

const TECHNICAL_KEYWORDS = [
  'crane', 'dolly', 'steadicam', 'drone', 'aerial', 'tracking shot',
  'slow motion', 'slo-mo', 'high speed', 'motion control', 'technocrane',
  'underwater', 'car mount', 'process trailer', 'green screen', 'blue screen',
];

const HERO_PRODUCT_KEYWORDS = [
  'hero shot', 'product shot', 'pack shot', 'beauty shot', 'pour',
  'splash', 'tabletop', 'macro', 'close-up on product', 'cu product',
];

const VFX_KEYWORDS = [
  'vfx', 'cgi', 'visual effects', 'composite', 'green screen', 'blue screen',
  'removal', 'cleanup', 'rig removal', 'wire removal', 'digital', 'morph',
  'transformation', 'animation', 'particles', '3d', 'cg elements',
];

const SFX_KEYWORDS = [
  'sfx', 'special effects', 'pyro', 'explosion', 'fire', 'smoke', 'rain',
  'wind', 'snow', 'fog', 'atmospheric', 'practical effects', 'squib',
];

// ============================================
// CHARACTER/TALENT DETECTION
// ============================================

const CHARACTER_NAME_REGEX = /^([A-Z][A-Z\s]+)(\s*\(.*?\))?$/m;
const PARENTHETICAL_REGEX = /\(([^)]+)\)/;

// ============================================
// PARSE SCENE HEADER
// ============================================

function parseSceneHeader(line: string): {
  intExt: IntExt;
  location: string;
  dayNight: DayNight;
} | null {
  // Try standard format first
  let match = line.match(SCENE_HEADER_REGEX);
  if (!match) {
    match = line.match(SCENE_HEADER_ALT_REGEX);
  }

  if (!match) return null;

  const intExtRaw = match[1].toUpperCase();
  let intExt: IntExt = 'INT';
  if (intExtRaw === 'EXT') intExt = 'EXT';
  else if (intExtRaw === 'INT/EXT' || intExtRaw === 'I/E') intExt = 'INT/EXT';

  const location = match[2].trim();

  const dayNightRaw = match[3].toUpperCase();
  let dayNight: DayNight = 'DAY';
  if (dayNightRaw === 'NIGHT') dayNight = 'NIGHT';
  else if (dayNightRaw === 'DUSK') dayNight = 'DUSK';
  else if (dayNightRaw === 'DAWN') dayNight = 'DAWN';

  return { intExt, location, dayNight };
}

// ============================================
// DETECT COMPLEXITY
// ============================================

function detectTechnicalComplexity(text: string): boolean {
  const lowerText = text.toLowerCase();
  return TECHNICAL_KEYWORDS.some((kw) => lowerText.includes(kw));
}

function detectHeroProduct(text: string): boolean {
  const lowerText = text.toLowerCase();
  return HERO_PRODUCT_KEYWORDS.some((kw) => lowerText.includes(kw));
}

function detectVFX(text: string): VFXLevel {
  const lowerText = text.toLowerCase();
  const vfxCount = VFX_KEYWORDS.filter((kw) => lowerText.includes(kw)).length;
  if (vfxCount >= 2) return 'Heavy';
  if (vfxCount >= 1) return 'Light';
  return 'None';
}

function detectActionComplexity(text: string): ComplexityLevel {
  const lowerText = text.toLowerCase();

  const highComplexityKeywords = [
    'stunt', 'fight', 'chase', 'explosion', 'crash', 'crowd', 'mass',
    'choreograph', 'dance', 'action sequence', 'battle',
  ];

  const mediumComplexityKeywords = [
    'run', 'jump', 'climb', 'swim', 'drive', 'ride', 'physical',
  ];

  if (highComplexityKeywords.some((kw) => lowerText.includes(kw))) return 'High';
  if (mediumComplexityKeywords.some((kw) => lowerText.includes(kw))) return 'Medium';
  return 'Low';
}

// ============================================
// ESTIMATE SHOTS FROM SCENE TEXT
// ============================================

function estimateShots(sceneText: string): number {
  // Count action paragraphs (rough proxy for shots)
  const paragraphs = sceneText.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const actionParagraphs = paragraphs.filter((p) => {
    // Not dialogue (character names are all caps)
    return !CHARACTER_NAME_REGEX.test(p.trim().split('\n')[0]);
  });

  // Minimum 1 shot per scene, estimate based on action paragraphs
  const estimate = Math.max(1, Math.ceil(actionParagraphs.length / 2));
  return Math.min(estimate, 10); // Cap at 10 per scene
}

// ============================================
// EXTRACT CHARACTERS FROM SCENE
// ============================================

function extractCharacters(sceneText: string): {
  heroPrincipalCount: number;
  featuredCount: number;
  hasDialogue: boolean;
} {
  const lines = sceneText.split('\n');
  const characters = new Set<string>();
  let hasDialogue = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (CHARACTER_NAME_REGEX.test(trimmed)) {
      const match = trimmed.match(CHARACTER_NAME_REGEX);
      if (match) {
        const charName = match[1].trim();
        // Exclude common action words mistaken for characters
        const excludeWords = ['THE', 'WE', 'CUT', 'FADE', 'DISSOLVE', 'ANGLE', 'CLOSE', 'WIDE'];
        if (!excludeWords.includes(charName)) {
          characters.add(charName);
          hasDialogue = true;
        }
      }
    }
  });

  // Assume first 2 unique characters are hero/principal, rest are featured
  const charArray = Array.from(characters);
  const heroPrincipalCount = Math.min(charArray.length, 2);
  const featuredCount = Math.max(0, charArray.length - 2);

  return { heroPrincipalCount, featuredCount, hasDialogue };
}

// ============================================
// PARSE FULL SCRIPT
// ============================================

export function parseScript(scriptText: string): ScriptBreakdown {
  const lines = scriptText.split('\n');
  const scenes: Scene[] = [];
  const locationMap = new Map<string, number>();

  let currentSceneLines: string[] = [];
  let currentSceneNumber = 0;
  let currentHeader: ReturnType<typeof parseSceneHeader> | null = null;

  const processCurrentScene = () => {
    if (currentHeader && currentSceneLines.length > 0) {
      const sceneText = currentSceneLines.join('\n');
      const locationKey = currentHeader.location.toLowerCase();

      // Track location reuse
      const locationCount = (locationMap.get(locationKey) || 0) + 1;
      locationMap.set(locationKey, locationCount);
      const isLocationReused = locationCount > 1;

      // Extract scene data
      const characters = extractCharacters(sceneText);
      const estimatedShots = estimateShots(sceneText);
      const technicalComplexity = detectTechnicalComplexity(sceneText);
      const heroProductMoment = detectHeroProduct(sceneText);
      const vfxLevel = detectVFX(sceneText);
      const actionComplexity = detectActionComplexity(sceneText);

      const scene: Scene = {
        id: `scene-${currentSceneNumber}`,
        sceneNumber: currentSceneNumber,
        intExt: currentHeader.intExt,
        dayNight: currentHeader.dayNight,
        locationName: currentHeader.location,
        isLocationReused,
        setType: currentHeader.intExt === 'INT' ? 'Studio' : 'Practical',
        actionComplexity,
        technicalComplexity,
        heroProductMoment,
        vfxLevel,
        description: sceneText.substring(0, 200),
        estimatedShots,
        artDept: {
          setDressingRequired: true,
          propsRequired: heroProductMoment ? 'Hero' : 'Practical',
          buildImplied: false,
        },
        wardrobe: {
          principalWardrobe: characters.heroPrincipalCount > 0,
          featuredWardrobe: characters.featuredCount > 0,
          continuityMultiples: false,
          quickChanges: false,
        },
        talent: {
          heroPrincipalCount: characters.heroPrincipalCount,
          featuredCount: characters.featuredCount,
          walkOnCount: 0,
          extrasCount: 0,
          hasDialogue: characters.hasDialogue,
          hasFeaturedAction: actionComplexity !== 'Low',
          isBackgroundOnly: false,
        },
      };

      scenes.push(scene);
    }
  };

  // Process line by line
  lines.forEach((line) => {
    const trimmed = line.trim();

    // Check for scene number
    const numberMatch = trimmed.match(SCENE_NUMBER_REGEX);
    if (numberMatch) {
      // Remove scene number from line for header parsing
      const lineWithoutNumber = trimmed.replace(SCENE_NUMBER_REGEX, '').trim();
      const headerResult = parseSceneHeader(lineWithoutNumber);
      if (headerResult) {
        processCurrentScene();
        currentSceneNumber++;
        currentHeader = headerResult;
        currentSceneLines = [];
        return;
      }
    }

    // Check for scene header without number
    const headerResult = parseSceneHeader(trimmed);
    if (headerResult) {
      processCurrentScene();
      currentSceneNumber++;
      currentHeader = headerResult;
      currentSceneLines = [];
      return;
    }

    // Add line to current scene
    if (currentHeader) {
      currentSceneLines.push(line);
    }
  });

  // Process final scene
  processCurrentScene();

  // Build rollup
  const talentRollup = buildTalentRollup(scenes);

  // Build breakdown
  const uniqueLocations = locationMap.size;
  const companyMovesEstimate = Math.max(0, uniqueLocations - 1);
  const intExtMix = scenes.some((s) => s.intExt === 'INT') && scenes.some((s) => s.intExt === 'EXT');
  const dayNightMix = scenes.some((s) => s.dayNight === 'DAY') && scenes.some((s) => s.dayNight === 'NIGHT');
  const totalEstimatedShots = scenes.reduce((sum, s) => sum + s.estimatedShots, 0);
  const hasVFX = scenes.some((s) => s.vfxLevel !== 'None');
  const vfxComplexity: VFXLevel = scenes.some((s) => s.vfxLevel === 'Heavy')
    ? 'Heavy'
    : scenes.some((s) => s.vfxLevel === 'Light')
    ? 'Light'
    : 'None';
  const hasTechnicalShots = scenes.some((s) => s.technicalComplexity);
  const hasHeroProduct = scenes.some((s) => s.heroProductMoment);

  return {
    scenes,
    totalScenes: scenes.length,
    uniqueLocations,
    companyMovesEstimate,
    intExtMix,
    dayNightMix,
    totalEstimatedShots,
    talentRollup,
    hasVFX,
    vfxComplexity,
    hasTechnicalShots,
    hasHeroProduct,
  };
}

// ============================================
// BUILD TALENT ROLLUP
// ============================================

function buildTalentRollup(scenes: Scene[]): TalentRollup {
  // Collect unique character names (approximation)
  const heroCharacters = new Set<string>();
  const featuredCharacters = new Set<string>();
  let totalWalkOns = 0;
  let peakExtras = 0;

  scenes.forEach((scene, idx) => {
    // Approximate unique hero roles
    for (let i = 0; i < scene.talent.heroPrincipalCount; i++) {
      heroCharacters.add(`hero-${idx}-${i}`);
    }
    for (let i = 0; i < scene.talent.featuredCount; i++) {
      featuredCharacters.add(`featured-${idx}-${i}`);
    }
    totalWalkOns += scene.talent.walkOnCount;
    peakExtras = Math.max(peakExtras, scene.talent.extrasCount);
  });

  // Estimate unique roles (reduce duplicates across scenes)
  const totalUniqueHeroRoles = Math.ceil(heroCharacters.size * 0.6); // Assume 60% unique
  const totalUniqueFeaturedRoles = Math.ceil(featuredCharacters.size * 0.5);

  const totalTalentDays = scenes.length; // Rough estimate

  return {
    totalUniqueHeroRoles: Math.max(1, totalUniqueHeroRoles),
    totalUniqueFeaturedRoles,
    totalWalkOns,
    peakExtrasRequirement: peakExtras,
    totalTalentDays,
  };
}

// ============================================
// PARSE CSV/XLSX BREAKDOWN (placeholder)
// ============================================

export function parseBreakdownFile(data: ArrayBuffer, filename: string): ScriptBreakdown | null {
  // This would use xlsx library to parse spreadsheet
  // For MVP, return null and rely on script parsing
  console.log('File parsing not yet implemented:', filename);
  return null;
}
