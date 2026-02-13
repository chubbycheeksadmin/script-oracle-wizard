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

const BREAKDOWN_PROMPT = `You are a senior advertising production producer breaking down scripts for feasibility assessment.

## SCRIPT FORMAT HANDLING

**STANDARD SCREENPLAY:** Has scene headers like "INT. OFFICE - DAY" - parse directly.

**TREATMENT/CREATIVE SCRIPT (common in advertising):** Uses "### 1. SCENE TITLE" format, narrative prose like "We find ourselves in an empty office...", NO standard headers. For these:
- Treat each numbered section (### 1, ### 2) as a scene
- Infer INT/EXT from descriptions ("office" = INT, "street" = EXT)  
- Infer DAY/NIGHT from context ("sunny" = DAY, "late" = NIGHT)
- Extract location from "We find ourselves in [location]" phrases

## 5-PASS BREAKDOWN

**PASS 1 - SCENES:** For each scene extract: sceneNumber, intExt, dayNight, locationName, isNewLocation

**PASS 2 - COMPLEXITY:** actionDensity (low/medium/high), technicalComplexity (boolean), productHeroMoment (boolean), vfxLevel (none/light/heavy)

**PASS 3 - DEPARTMENTS:** artDept (setDressing, propsLevel, buildImplied), wardrobe (principals, featured, extras)

**PASS 4 - TALENT:** Count hero/principal, featured, walk-ons, extras per scene

**PASS 5 - SHOTS:** Infer shot count from actions, movement, product moments. 10 setups/day standard for UK commercials.

## KEY RULES
- MOCO on location: max 4 setups/day, adds 50% time
- Studio shoots: 12-15 setups/day, 0 company moves
- 2nd unit: flag as possible but count in main unit baseline
- Version efficiency: Hero + DRTV versions share setups
- High-speed needs daylight; night scenes need MOCO or CG

DAY 1 - DAYLIGHT SCENES:
- Use HIGH-SPEED camera + practical element on wire
- Plenty of light for high-speed (500-1000fps)
- Practical element = organic, real movement
- Rig removal in post is simpler than full CG
- Dynamic camera movement possible

DAY 2 - LOW LIGHT SCENES (DUSK/NIGHT/EVENING):
Option A - MOCO (if budget/logistics allow):
- Normal camera speed = normal light levels OK
- Dynamic camera moves preserved
- CG element composited onto passes
- Premium feel, "1st person" immersion

Option B - STATIC PLATES (if MOCO not possible):
- Standard kit, no specialist equipment needed
- Faster shoot (8-10 setups vs 4 with MOCO)
- Observational "3rd person" feel
- Small movement can be added in post
- Same VFX complexity as MOCO (often easier)

Flag in scheduleNotes when hybrid approach is recommended.

## SHOT TIMING FOR COMMERCIALS
Use these timing standards when estimating shot counts:

SHOT DURATION:
- Average shot: 2 seconds
- End frame (product/logo): 3-4 seconds
- Hero product moment: 2-3 seconds

SHOTS PER DURATION:
- 30" spot: ~13 shots + end frame (14-15 total)
- 20" spot: ~8 shots + end frame (9-10 total)
- 15" spot: ~5-6 shots + end frame
- 10" spot: ~3-4 shots + end frame

When estimating shots per scene:
- Maximum 2-3 shots per scene to tell story beats
- Each shot = one action/moment
- Don't over-count - commercials are efficient

SHORTS FROM HERO FILM:
When script includes hero film + cutdown shorts:
- Shorts are typically LIFTED from hero footage
- Only additional shots needed: alternate end frames
- Maybe 1-2 pickup shots per short for standalone opening
- Don't count shorts as separate shoot days

## STUDIO SHOOT DETECTION (CRITICAL - CHECK THIS FIRST!)
If the script describes:
- Multiple stylized/art-directed "rooms" (kitchen, living room, bedroom, etc.)
- All INT scenes with no specific real-world locations named
- Branded/themed sets that would need to be built (not found)
- "Magic" elements, floating objects, or highly controlled visuals
- Product-heavy commercials with hero product moments in each scene

Then this is likely a STUDIO SHOOT:
- Set as "studioShoot": true in your analysis
- Company moves = 0 (sets are built side by side)
- Set changes take 30-45 mins (not 105 mins like location moves)
- Efficiency is MUCH higher: 12-15 setups/day achievable
- Robot/MOCO is efficient in studio (pre-programmed moves)
- Multiple scenes can share lighting setups
- Parallel work possible (photo unit, prep on next set)

STUDIO SHOOT EXAMPLES:
- Homesense: 4 stylized rooms = 4 studio sets = 2 days (not 4!)
- Food commercial with multiple "kitchen" looks = 1 studio, 1 day
- "Magic" product commercial with floating items = studio with SFX rigs

## SHOOT DAY CALCULATION (CRITICAL - USE THESE RULES)

FIRST: Determine if this is a STUDIO SHOOT or LOCATION SHOOT
SECOND: Check for 2ND UNIT potential (food shots, product inserts)
THIRD: Check for VERSION EFFICIENCY (DRTV variations sharing setups)

STUDIO SHOOT (all INT stylized rooms, built sets):
- 12-15 setups/day achievable
- 0 company moves (set changes only)
- Robot/MOCO is efficient (30 mins per setup, not 1.5 hrs)
- Can shoot 2 "locations" (sets) per day easily
- Total setups ÷ 12 = shoot days (round up)

LOCATION SHOOT (UK professional standard):
- 10 setups/day is realistic with dual camera and experienced crew
- 8 setups/day if technical/hero moments throughout
- 6 setups/day with stunts/rigs/weather effects
- With swing crews + pre-light: can achieve 12 setups/day (optimistic)
- 2nd unit is a POTENTIAL optimization, not assumed in baseline

DO NOT over-estimate OR under-estimate:
- 4 days for a 2-location shoot with food shots = too conservative
- 2 days assuming parallel units = too optimistic
- 3 days = realistic baseline for planning

SHOTS PER DAY (MOCO ON LOCATION):
- 4 moco setups/day maximum
- Each moco setup = 1-1.5 hours (programming + passes)
- Golden hour moco = 2 setups maximum
- Add 50% to schedule estimate if moco is required ON LOCATION

MOCO IN STUDIO:
- Much more efficient - robot pre-programmed overnight
- 6-8 moco setups/day achievable in studio
- Clean plates and element passes are quick
- Do NOT add 50% multiplier for studio moco

COMPANY MOVES (LOCATION SHOOTS ONLY):
- 2 company moves per day is comfortable, 3 is achievable if locations are close
- moves ÷ 2.5 = minimum days from moves (round up)
- Nearby locations (under 15 min drive) are more efficient
- Same practical location, different areas = NOT a company move (just a set change)
- CRITICAL: House (kitchen, living room, etc.) = 1 location, 0 company moves

CALCULATION FOR UK LOCATION SHOOTS:
1. Count ALL setups including food/product shots (assume main unit handles sequentially)
2. Total setups ÷ 10 (realistic UK efficiency) = shot-based days
3. Count actual location MOVES (not areas within same location)
4. Location moves ÷ 2 = move-based days (can do 2 locations/day with good planning)
5. Take the HIGHER of shot-based OR move-based days
6. Add +0.5 day for stunts, +0.5 for SFX weather (rain/snow)
7. If MOCO required ON LOCATION: multiply by 1.5
8. Round UP to nearest whole day
9. Flag secondUnitPossible if food/product shots exist (user can optimize from there)

CALCULATION FOR STUDIO SHOOTS:
1. Count total estimated setups across all scenes
2. Divide by 12 (studio efficiency) = base days
3. Add 0.5 days if more than 3 sets to dress
4. Round UP to nearest whole day
5. Do NOT add moco penalty for studio shoots

BENCHMARKS (REAL PRODUCTION DATA):
- Gousto Heist (house + supermarket, food shots): 3 days baseline, 2 if 2nd unit works
- Homesense (4 stylized rooms, moco, magic elements): 2 days STUDIO
- Multi-location car commercials: 2-3 locations per day achievable
- Toyota UK commercial: 11 locations, 7 company moves = 4 days LOCATION
- Flying object/moco on location: expect 50% more time
- Golden hour dependent: build schedule around that 90-min window

UK PRODUCTION COST REFERENCE (per shoot day):
- Lean: £180,000 (simple shoot, minimal locations, small crew)
- Standard: £215,000 (standard commercial, some complexity)
- Ambitious: £250,000 (multiple locations, 2nd unit, complex setups)
Reference: Gousto "The Heist" - 2 days with 2nd unit, swing crews, techno crane = £474,928 (~£237k/day)

EU SERVICE COMPANY COSTS (per shoot day, local crew + kit):
- EU Average: £85k-£140k depending on complexity
- Poland: £90k-£145k
- Bulgaria: £70k-£120k
- Czech: £95k-£150k
- Serbia/Georgia: £60k-£115k
Note: UK above-the-line (director, producer, DOP, AD, PD, wardrobe) must be added separately for EU shoots

GOUSTO EXAMPLE IN DETAIL:
- 2 real locations: house + supermarket
- ~25-30 main unit setups + ~12 food setups = ~40 total
- At 10 setups/day = 4 days (too conservative)
- BUT: version efficiency (DRTV shares setups) reduces to ~25 unique setups
- 25 setups ÷ 10/day = 2.5 days → 3 days realistic
- With 2nd unit (if location permits): could reduce to 2 days

## OUTPUT FORMAT

Return a JSON object with this exact structure:

{
  "scriptExtracted": true,
  "rawScriptText": "the extracted script text...",
  "breakdown": {
    "totalScenes": number,
    "uniqueLocations": number,
    "companyMoves": number,
    "scenes": [
      {
        "sceneNumber": 1,
        "intExt": "INT" | "EXT" | "INT/EXT",
        "dayNight": "DAY" | "NIGHT" | "DUSK" | "DAWN",
        "locationName": "string",
        "isNewLocation": true,
        "isReturnLocation": false,
        "companyMoveRisk": false,
        "description": "brief action summary",

        "complexity": {
          "actionDensity": "low" | "medium" | "high",
          "technicalComplexity": false,
          "technicalNotes": "string or null",
          "productHeroMoment": false,
          "productHeroNotes": "string or null",
          "vfxSfxLevel": "none" | "light" | "heavy",
          "vfxSfxNotes": "string or null",
          "mocoLikely": false, // true if flying objects, repeatable precision moves, or complex VFX tracking
          "mocoNotes": "string or null",
          "highSpeedViable": true, // false if night/dusk scene where high-speed camera won't work
          "highSpeedNotes": "string or null" // note if lighting constraints affect high-speed
        },

        "artDept": {
          "setDressingRequired": true,
          "propsLevel": "none" | "practical" | "hero",
          "buildImplied": false,
          "specialItems": ["list of items"],
          "notes": "string or null"
        },

        "wardrobe": {
          "principalNeeds": "string or null",
          "featuredExtrasNeeds": "string or null",
          "multiplesRequired": false,
          "quickChanges": false,
          "notes": "string or null"
        },

        "talent": {
          "heroPrincipal": { "count": 1, "descriptions": ["MUM - hero action with product"] },
          "featured": { "count": 1, "descriptions": ["KID - reaction shots"] },
          "walkOns": { "count": 0, "descriptions": [] },
          "extras": { "count": 0, "descriptions": [] },
          "hasDialogue": true,
          "hasFeaturedAction": true
        },

        "schedule": {
          "estimatedShots": 4,
          "shotBreakdown": ["wide establishing", "OTS mum to fridge", "hero product insert", "kid reaction CU"],
          "estimatedMinutes": 180,
          "scheduleNotes": "Hero insert needs dedicated time/lighting",
          "pressurePoints": ["product hero moment requires extra setup time"]
        }
      }
    ],

    "rollup": {
      "totalEstimatedShots": number,
      "mainUnitSetups": number, // setups for main unit only (exclude 2nd unit)
      "secondUnitSetups": number, // setups that can run on 2nd unit (food, product, inserts)
      "totalHeroPrincipal": number,
      "totalFeatured": number,
      "totalWalkOns": number,
      "peakExtras": number,
      "hasVFX": boolean,
      "vfxComplexity": "none" | "light" | "heavy",
      "hasTechnicalShots": boolean,
      "hasHeroProduct": boolean,
      "studioShoot": boolean, // TRUE if all INT stylized rooms/sets that would be built in studio
      "secondUnitPossible": boolean, // TRUE if food/product shots can run in parallel
      "versionEfficiency": string | null, // e.g., "12 versions share 6 unique setups"
      "mocoRequired": boolean, // true if any scene has flying objects, product in motion, or complex VFX tracking
      "mocoSetups": number, // estimated number of moco setups if mocoRequired is true
      "highSpeedLimited": boolean, // true if some scenes can't use high-speed due to low light
      "hybridApproachNeeded": boolean, // true if mixed day/night requires different camera approaches
      "hybridApproachNotes": string | null, // e.g., "Day 1: high-speed (daylight), Day 2: MOCO or static (night)"
      "goldenHourDependent": boolean, // true if script requires sunset/sunrise lighting
      "nightShootRequired": boolean, // true if script has night exteriors
      "actualLocations": number, // count of REAL physical locations (not areas within same location)
      "locationMoves": number, // actual company moves between different physical locations
      "estimatedShootDays": number, // MUST follow the calculation rules above - use 2nd unit efficiency if applicable
      "scheduleNotes": ["key observations about schedule pressure"]
    }
  }
}

If no script is found in the document, return:
{
  "scriptExtracted": false,
  "error": "No recognizable production script found in the document"
}

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks or explanation
- Be REALISTIC with shoot day estimates - UK productions are EFFICIENT
- Assume dual camera (A & B cam) operation which is standard for commercials
- Company moves are schedule pressure but 2/day is standard with swing crews
- Group scenes by location - multiple setups at same location is efficient
- Flag genuine schedule risks (stunts, weather, children, complex rigs)
- Use your experience to infer what's NOT written but is clearly implied
- Think like a senior producer giving an honest assessment, not worst-case padding

CRITICAL - BE REALISTIC, NOT OVER-CONSERVATIVE:
- DRTV versions share setups - count UNIQUE setups, not total versions
- House scenes (kitchen, bedroom, living room) = 1 location if same practical
- UK crews realistically do 10 setups/day (12 with perfect conditions)
- 2 real locations over 2 days = very achievable
- 2nd unit is a POTENTIAL optimization - flag it but don't assume it

THE GOAL: Estimate the realistic planning number
- NOT worst-case (padding everything)
- NOT best-case (assuming everything goes right)
- The number a senior producer would put in a bid

MOCO DETECTION:
- Flag mocoRequired: true if script mentions: flying objects, bottle caps/cans in motion,
  objects moving through frame that need VFX, repeatable precision camera moves,
  complex tracking shots for compositing
- If moco is required ON LOCATION, add 50% to the schedule estimate
- Note in scheduleNotes if moco will constrain golden hour shooting
- Always note: "Static plates + CG is fallback if MOCO not possible"

HIGH-SPEED CAMERA DETECTION:
- If script has product moments (bottle opening, cap pop, liquid splash) = high-speed likely
- Check lighting conditions for those scenes:
  - DAY scenes: highSpeedViable = true
  - NIGHT/DUSK/EVENING scenes: highSpeedViable = false
- Flag conflict if high-speed needed but lighting won't support it

HYBRID APPROACH DETECTION:
- If script has BOTH day and night scenes with product/element moments:
  - Set hybridApproachNeeded: true
  - Set hybridApproachNotes: "Day 1: high-speed (daylight scenes), Day 2: MOCO or static (night scenes)"
- This is common for drinks/beverage commercials with varied settings

PRACTICAL EXAMPLES:
- "Bottle cap flies through the air" = MOCO REQUIRED
- "Product slides across table" = MOCO LIKELY
- "Camera follows character through crowd" = standard (no moco)
- "Sunset aperitivo scene" = goldenHourDependent: true
- "Night exterior bar scene" = nightShootRequired: true, highSpeedViable: false
- "Hero bottle opening at golden hour" = highSpeedViable: true (enough light)
- "Night rooftop with flying bottle cap" = highSpeedViable: false, hybridApproachNeeded: true
- "Daylight beach + evening bar scenes" = hybridApproachNeeded: true`;

export async function POST(request: NextRequest) {
  try {
    const { pdfText, stream: shouldStream } = await request.json();

    if (!pdfText || typeof pdfText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid pdfText' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // ============================================
    // PRIVACY: Sanitize script before AI processing
    // ============================================
    const { sanitizedText, mapping, stats } = sanitizeScript(pdfText);
    console.log(`[Privacy] Sanitized ${stats.totalRedacted} entities:`, stats);

    // Truncate if extremely long
    const maxChars = 150000;
    const truncatedText = sanitizedText.length > maxChars
      ? sanitizedText.substring(0, maxChars) + '\n\n[Document truncated due to length...]'
      : sanitizedText;

    // If streaming is requested, return a streaming response
    if (shouldStream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullText = '';

            const messageStream = await anthropic.messages.create({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 16384,
              messages: [
                {
                  role: 'user',
                  content: `${BREAKDOWN_PROMPT}\n\n---\n\nDOCUMENT CONTENT:\n\n${truncatedText}`,
                },
              ],
              stream: true,
            });

            for await (const event of messageStream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const text = event.delta.text;
                fullText += text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`));
              }
            }

            // Parse final JSON and send complete result
            try {
              const cleanedResponse = extractJSON(fullText);
              const breakdown = JSON.parse(cleanedResponse);
              const desanitizedBreakdown = desanitizeObject(breakdown, mapping);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', data: desanitizedBreakdown })}\n\n`));
            } catch (parseError) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                data: {
                  scriptExtracted: false,
                  error: 'Failed to parse breakdown response',
                  rawResponse: fullText.substring(0, 1000),
                }
              })}\n\n`));
            }

            controller.close();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming fallback
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `${BREAKDOWN_PROMPT}\n\n---\n\nDOCUMENT CONTENT:\n\n${truncatedText}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Check if the response was truncated
    if (message.stop_reason === 'max_tokens') {
      console.warn('[Breakdown] Response truncated - max_tokens reached. Response length:', responseText.length);
    }

    // Parse the JSON response
    try {
      const cleanedResponse = extractJSON(responseText);

      // Parse JSON first (with tokens still in place), then desanitize values
      // This avoids corrupting JSON structure during string replacement
      const breakdown = JSON.parse(cleanedResponse);
      const desanitizedBreakdown = desanitizeObject(breakdown, mapping);
      return NextResponse.json(desanitizedBreakdown);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Stop reason:', message.stop_reason);
      console.error('Response length:', responseText.length);
      console.error('Raw response (first 500 chars):', responseText.substring(0, 500));
      console.error('Raw response (last 200 chars):', responseText.substring(responseText.length - 200));
      return NextResponse.json({
        scriptExtracted: false,
        error: message.stop_reason === 'max_tokens'
          ? 'AI response was truncated. Try a shorter script or paste key scenes only.'
          : 'Failed to parse breakdown response',
        rawResponse: responseText.substring(0, 1000),
      });
    }

  } catch (error) {
    console.error('Script breakdown error:', error);

    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', error.status, error.message);
      return NextResponse.json(
        { scriptExtracted: false, error: `API error: ${error.message}` },
        { status: 200 } // Return 200 so client can read the error message
      );
    }

    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error:', errorMsg);
    return NextResponse.json(
      { scriptExtracted: false, error: `Failed to breakdown script: ${errorMsg}` },
      { status: 200 } // Return 200 so client can read the error message
    );
  }
}
