import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { sanitizeScript, desanitizeText, SanitizationMap } from '@/lib/sanitization';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Recursively desanitize all string values in a parsed JSON object
function desanitizeObject(obj: unknown, mapping: SanitizationMap[]): unknown {
  if (typeof obj === 'string') {
    return desanitizeText(obj, mapping);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => desanitizeObject(item, mapping));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = desanitizeObject(value, mapping);
    }
    return result;
  }
  return obj;
}

// Extract valid JSON from AI response, handling code fences and extra text
function extractJSON(text: string): string {
  let cleaned = text.trim();

  // Strip markdown code fences
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // If the response contains JSON embedded in other text, extract it
  // Look for the outermost { ... } block
  if (!cleaned.startsWith('{')) {
    const jsonStart = cleaned.indexOf('{');
    if (jsonStart !== -1) {
      cleaned = cleaned.substring(jsonStart);
    }
  }
  // Find the matching closing brace
  if (cleaned.startsWith('{')) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"' && !escape) { inString = !inString; continue; }
      if (!inString) {
        if (ch === '{') depth++;
        if (ch === '}') { depth--; if (depth === 0) { cleaned = cleaned.substring(0, i + 1); break; } }
      }
    }
  }

  return cleaned.trim();
}

// ============================================
// TRAINING DATA CONTEXT (injected into prompt)
// ============================================

const TRAINING_CONTEXT = `
## REAL PROJECT BENCHMARKS (use these to calibrate your estimates)

UK SHOOTS:
- Toyota Corolla 25: 4 days, £784,736 (£196k/day). Complex: car rigs (1.5hr each), 4 locations, child talent, rally driver. 07:00 call for sunrise.
- British Gas: 3 days, £754,214 (£251k/day). Standard: multiple setups, VO driven.
- Luton Express: 1 day, £189,984. Simple: single location, music video style.
- John Lewis Confession Box: 1 day, £95,876. Standard: studio build.
- IAMS Cat Food: 2 days, £126,001. Simple: animals, cats.

EU SHOOTS:
- Smirnoff (Portugal): 4 days, £1.24M (£310k/day). 4 versions = 1 day per version. 14hr days.
- Kraken (Barcelona): 4 days, £1.34M (£334k/day). Beach at Sitges, crowd control.
- Homesense (Poland): 1 day, £407k. Studio, robot camera (Bolt), 6 master shots in 3 hours, 20-25 min per setup.
- Samsung (Budapest): 3 days, £710k (£237k/day). Complex: tech product.

KEY PATTERNS FROM REAL DATA:
- UK complex shoots average ~£200-250k/day
- Car rig work: 1.5 hours per rig setup + 1.5 hours derig
- Standard location: 4-5 setups/day across multiple locations
- Studio (robot camera): 6 setups in ~3 hours
- Location setup time: ~45 min per setup
- Unit move (close): 45 min. Unit move (far): 60 min.
- Early calls (07:00) for sunrise shoots, standard 08:00 for location
- Multiple versions of same ad often = 1 day per version (if sharing setups efficiently)
- DO NOT over-estimate days. Real producers push for efficiency. 4 days for a complex UK car shoot is realistic.`;

// ============================================
// BREAKDOWN PROMPT (matches AIBreakdown types)
// ============================================

const BREAKDOWN_PROMPT = `You are a senior advertising production producer with 20 years of UK/EU experience breaking down scripts for feasibility assessment.

## INPUT FORMAT
Script may be:
1. **STANDARD SCREENPLAY:** INT. OFFICE - DAY headers with action/dialogue
2. **TREATMENT:** "### 1. TITLE" sections with narrative prose like "We find ourselves in an office..."

For treatments: treat each ### section as a scene, infer INT/EXT from context, extract location from description.

${TRAINING_CONTEXT}

## OUTPUT FORMAT
Return ONLY valid JSON matching this EXACT structure:
{
  "scriptExtracted": true,
  "breakdown": {
    "totalScenes": 17,
    "uniqueLocations": 4,
    "companyMoves": 3,
    "scenes": [
      {
        "sceneNumber": 1,
        "intExt": "INT",
        "dayNight": "DAY",
        "locationName": "Office",
        "isNewLocation": true,
        "isReturnLocation": false,
        "companyMoveRisk": false,
        "description": "Brief scene description",
        "complexity": {
          "actionDensity": "medium",
          "technicalComplexity": false,
          "technicalNotes": null,
          "productHeroMoment": false,
          "productHeroNotes": null,
          "vfxSfxLevel": "none",
          "vfxSfxNotes": null,
          "mocoLikely": false,
          "mocoNotes": null,
          "highSpeedViable": true,
          "highSpeedNotes": null
        },
        "artDept": {
          "setDressingRequired": false,
          "propsLevel": "none",
          "buildImplied": false,
          "specialItems": [],
          "notes": null
        },
        "wardrobe": {
          "principalNeeds": null,
          "featuredExtrasNeeds": null,
          "multiplesRequired": false,
          "quickChanges": false,
          "notes": null
        },
        "talent": {
          "heroPrincipal": { "count": 1, "descriptions": ["Driver"] },
          "featured": { "count": 0, "descriptions": [] },
          "walkOns": { "count": 0, "descriptions": [] },
          "extras": { "count": 0, "descriptions": [] },
          "hasDialogue": false,
          "hasFeaturedAction": true
        },
        "schedule": {
          "estimatedShots": 3,
          "shotBreakdown": ["Wide establishing", "Mid on talent", "CU product"],
          "estimatedMinutes": 135,
          "scheduleNotes": null,
          "pressurePoints": []
        }
      }
    ],
    "rollup": {
      "totalEstimatedShots": 40,
      "mainUnitSetups": 35,
      "secondUnitSetups": 5,
      "totalHeroPrincipal": 2,
      "totalFeatured": 3,
      "totalWalkOns": 0,
      "peakExtras": 10,
      "hasVFX": false,
      "vfxComplexity": "none",
      "hasTechnicalShots": true,
      "hasHeroProduct": true,
      "studioShoot": false,
      "secondUnitPossible": true,
      "mocoRequired": false,
      "mocoSetups": 0,
      "highSpeedLimited": false,
      "hybridApproachNeeded": false,
      "hybridApproachNotes": null,
      "goldenHourDependent": false,
      "nightShootRequired": false,
      "actualLocations": 4,
      "locationMoves": 3,
      "estimatedShootDays": 4,
      "scheduleNotes": ["Key scheduling observations here"]
    }
  }
}

## CRITICAL RULES
- **totalScenes, uniqueLocations, companyMoves** MUST be at the TOP LEVEL of "breakdown" (NOT inside rollup)
- Each scene MUST have the full nested structure shown above (complexity, artDept, wardrobe, talent, schedule)
- rollup.totalEstimatedShots = sum of all scene schedule.estimatedShots
- rollup.mainUnitSetups = total setups minus any that could run on 2nd unit
- rollup.secondUnitSetups = food/product/insert shots that could run parallel
- rollup.locationMoves = companyMoves (same number, for consistency)
- rollup.actualLocations = uniqueLocations (same number, for consistency)
- Same house/building with multiple rooms = 1 location, not multiple
- 1 setup per major action/beat in a scene
- 10 setups/day on location, 12-15 in studio
- MOCO on location = 4 setups/day max
- Car rig work = reduces setups by 3 per day (1.5hr rig time)
- Flag secondUnitPossible if food/product/tabletop shots exist
- DO NOT over-estimate shoot days. Reference the real project benchmarks above.
- schedule.estimatedMinutes per scene: 45 min per setup on location, 20 min per setup in studio`;

// ============================================
// NORMALIZE AI RESPONSE to match TypeScript types
// Handles cases where AI puts fields in wrong locations
// ============================================

interface AnyObj { [key: string]: unknown }

function normalizeBreakdownResponse(raw: AnyObj): AnyObj {
  if (!raw.breakdown || typeof raw.breakdown !== 'object') {
    return raw;
  }

  const bd = raw.breakdown as AnyObj;
  const rollup = (bd.rollup || {}) as AnyObj;
  const scenes = (bd.scenes || []) as AnyObj[];

  // Ensure top-level breakdown fields exist
  if (bd.totalScenes === undefined) {
    bd.totalScenes = rollup.totalScenes || scenes.length || 0;
  }
  if (bd.uniqueLocations === undefined) {
    bd.uniqueLocations = rollup.uniqueLocations || rollup.actualLocations ||
      new Set(scenes.map((s: AnyObj) => s.locationName).filter(Boolean)).size || 0;
  }
  if (bd.companyMoves === undefined) {
    bd.companyMoves = rollup.companyMoves || rollup.locationMoves ||
      Math.max(0, (bd.uniqueLocations as number) - 1) || 0;
  }

  // Ensure rollup has all required fields
  if (rollup.totalEstimatedShots === undefined) {
    rollup.totalEstimatedShots = scenes.reduce((sum: number, s: AnyObj) => {
      const schedule = s.schedule as AnyObj | undefined;
      const shots = schedule?.estimatedShots || s.estimatedSetups || 0;
      return sum + (shots as number);
    }, 0);
  }
  if (rollup.mainUnitSetups === undefined) {
    const total = rollup.totalEstimatedShots as number || 0;
    const second = rollup.secondUnitSetups as number || 0;
    rollup.mainUnitSetups = total - second;
  }
  if (rollup.secondUnitSetups === undefined) {
    rollup.secondUnitSetups = 0;
  }
  if (rollup.actualLocations === undefined) {
    rollup.actualLocations = bd.uniqueLocations;
  }
  if (rollup.locationMoves === undefined) {
    rollup.locationMoves = bd.companyMoves;
  }
  if (rollup.totalHeroPrincipal === undefined) {
    rollup.totalHeroPrincipal = countTalentAcrossScenes(scenes, 'heroPrincipal');
  }
  if (rollup.totalFeatured === undefined) {
    rollup.totalFeatured = countTalentAcrossScenes(scenes, 'featured');
  }
  if (rollup.totalWalkOns === undefined) {
    rollup.totalWalkOns = countTalentAcrossScenes(scenes, 'walkOns');
  }
  if (rollup.peakExtras === undefined) {
    rollup.peakExtras = peakTalentAcrossScenes(scenes, 'extras');
  }

  // Ensure boolean fields default to false
  const booleanDefaults = [
    'hasVFX', 'hasTechnicalShots', 'hasHeroProduct', 'studioShoot',
    'secondUnitPossible', 'mocoRequired', 'highSpeedLimited',
    'hybridApproachNeeded', 'goldenHourDependent', 'nightShootRequired'
  ];
  for (const field of booleanDefaults) {
    if (rollup[field] === undefined) rollup[field] = false;
  }

  // Derive hasVFX and hasTechnicalShots from scenes if not set
  if (!rollup.hasVFX) {
    rollup.hasVFX = scenes.some((s: AnyObj) => {
      const c = s.complexity as AnyObj | undefined;
      return c?.vfxSfxLevel !== 'none' && c?.vfxSfxLevel !== undefined;
    });
  }
  if (!rollup.hasTechnicalShots) {
    rollup.hasTechnicalShots = scenes.some((s: AnyObj) => {
      const c = s.complexity as AnyObj | undefined;
      return c?.technicalComplexity === true;
    });
  }
  if (!rollup.hasHeroProduct) {
    rollup.hasHeroProduct = scenes.some((s: AnyObj) => {
      const c = s.complexity as AnyObj | undefined;
      return c?.productHeroMoment === true;
    });
  }

  if (rollup.vfxComplexity === undefined) {
    rollup.vfxComplexity = rollup.hasVFX ? 'light' : 'none';
  }
  if (rollup.mocoSetups === undefined) {
    rollup.mocoSetups = 0;
  }
  if (rollup.scheduleNotes === undefined) {
    rollup.scheduleNotes = [];
  }
  // Ensure scheduleNotes is an array
  if (typeof rollup.scheduleNotes === 'string') {
    rollup.scheduleNotes = [rollup.scheduleNotes];
  }

  // Normalize scenes - ensure each has full nested structure
  bd.scenes = scenes.map((scene: AnyObj, idx: number) => normalizeScene(scene, idx));
  bd.rollup = rollup;

  return raw;
}

function normalizeScene(scene: AnyObj, idx: number): AnyObj {
  // Ensure complexity sub-object
  if (!scene.complexity || typeof scene.complexity !== 'object') {
    scene.complexity = {
      actionDensity: scene.actionDensity || 'medium',
      technicalComplexity: scene.technicalComplexity || false,
      technicalNotes: null,
      productHeroMoment: scene.productHeroMoment || false,
      productHeroNotes: null,
      vfxSfxLevel: scene.vfxLevel || scene.vfxSfxLevel || 'none',
      vfxSfxNotes: null,
      mocoLikely: false,
      mocoNotes: null,
      highSpeedViable: true,
      highSpeedNotes: null,
    };
  }

  // Ensure schedule sub-object
  if (!scene.schedule || typeof scene.schedule !== 'object') {
    const shots = scene.estimatedSetups || scene.estimatedShots || 3;
    scene.schedule = {
      estimatedShots: shots,
      shotBreakdown: [],
      estimatedMinutes: (shots as number) * 45,
      scheduleNotes: null,
      pressurePoints: [],
    };
  }

  // Ensure talent sub-object
  if (!scene.talent || typeof scene.talent !== 'object') {
    scene.talent = {
      heroPrincipal: { count: 0, descriptions: [] },
      featured: { count: 0, descriptions: [] },
      walkOns: { count: 0, descriptions: [] },
      extras: { count: 0, descriptions: [] },
      hasDialogue: false,
      hasFeaturedAction: false,
    };
  }

  // Ensure artDept sub-object
  if (!scene.artDept || typeof scene.artDept !== 'object') {
    scene.artDept = {
      setDressingRequired: false,
      propsLevel: 'none',
      buildImplied: false,
      specialItems: [],
      notes: null,
    };
  }

  // Ensure wardrobe sub-object
  if (!scene.wardrobe || typeof scene.wardrobe !== 'object') {
    scene.wardrobe = {
      principalNeeds: null,
      featuredExtrasNeeds: null,
      multiplesRequired: false,
      quickChanges: false,
      notes: null,
    };
  }

  // Ensure basic scene fields
  if (scene.sceneNumber === undefined) scene.sceneNumber = idx + 1;
  if (scene.isReturnLocation === undefined) scene.isReturnLocation = false;
  if (scene.companyMoveRisk === undefined) scene.companyMoveRisk = false;
  if (scene.description === undefined) scene.description = '';

  return scene;
}

function countTalentAcrossScenes(scenes: AnyObj[], role: string): number {
  const allDescriptions = new Set<string>();
  for (const scene of scenes) {
    const talent = scene.talent as AnyObj | undefined;
    if (talent && talent[role]) {
      const group = talent[role] as AnyObj;
      const descs = group.descriptions as string[] | undefined;
      if (descs) descs.forEach((d: string) => allDescriptions.add(d.toLowerCase()));
    }
  }
  return allDescriptions.size;
}

function peakTalentAcrossScenes(scenes: AnyObj[], role: string): number {
  let peak = 0;
  for (const scene of scenes) {
    const talent = scene.talent as AnyObj | undefined;
    if (talent && talent[role]) {
      const group = talent[role] as AnyObj;
      const count = group.count as number || 0;
      if (count > peak) peak = count;
    }
  }
  return peak;
}

export async function POST(request: NextRequest) {
  try {
    const { pdfText } = await request.json();

    if (!pdfText || typeof pdfText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid pdfText' },
        { status: 400 }
      );
    }

    // Limit text length to prevent timeouts
    const maxChars = 12000;
    const truncatedText = pdfText.length > maxChars
      ? pdfText.substring(0, maxChars) + '\n\n[Document truncated...]'
      : pdfText;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { scriptExtracted: false, error: 'API key not configured' },
        { status: 200 }
      );
    }

    // Sanitize script before AI processing
    const { sanitizedText, mapping } = sanitizeScript(truncatedText);

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: `${BREAKDOWN_PROMPT}\n\n---\n\nDOCUMENT:\n\n${sanitizedText}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse JSON response
    try {
      const cleanedResponse = extractJSON(responseText);
      const parsed = JSON.parse(cleanedResponse);

      // Normalize to ensure all fields match TypeScript types
      const normalized = normalizeBreakdownResponse(parsed);

      const desanitizedBreakdown = desanitizeObject(normalized, mapping);
      return NextResponse.json(desanitizedBreakdown);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return NextResponse.json({
        scriptExtracted: false,
        error: 'Failed to parse AI response',
        rawResponse: responseText.substring(0, 500),
      });
    }

  } catch (error) {
    console.error('Error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { scriptExtracted: false, error: errorMsg },
      { status: 200 }
    );
  }
}
