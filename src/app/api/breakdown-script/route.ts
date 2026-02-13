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

## INPUT FORMAT
Script may be:
1. **STANDARD SCREENPLAY:** INT. OFFICE - DAY headers
2. **TREATMENT:** "### 1. TITLE" sections with narrative prose like "We find ourselves in an office..."

For treatments: treat each ### section as a scene, infer INT/EXT from context, extract location from "in [location]" phrases.

## OUTPUT FORMAT
Return ONLY valid JSON:
{
  "scriptExtracted": true,
  "breakdown": {
    "scenes": [
      {
        "sceneNumber": 1,
        "intExt": "INT",
        "dayNight": "DAY", 
        "locationName": "Office",
        "isNewLocation": true,
        "actionDensity": "medium",
        "technicalComplexity": false,
        "productHeroMoment": false,
        "vfxLevel": "none",
        "estimatedSetups": 3
      }
    ],
    "rollup": {
      "totalScenes": 3,
      "uniqueLocations": 2,
      "estimatedShootDays": 2,
      "companyMoves": 1,
      "secondUnitPossible": false,
      "scheduleNotes": "Key observations"
    }
  }
}

## RULES
- 1 setup per major action/beat in scene
- 10 setups/day location, 12-15 studio
- MOCO on location = 4 setups/day max
- Flag secondUnitPossible if food/product shots exist`;

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
    const maxChars = 8000;
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
      max_tokens: 4096,
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
      const breakdown = JSON.parse(cleanedResponse);
      const desanitizedBreakdown = desanitizeObject(breakdown, mapping);
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
