import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { sanitizeScript, desanitizeText } from '@/lib/sanitization';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `You are a script extraction specialist for advertising and film production.

You will be given the full text content extracted from a PDF document. This document may contain multiple sections such as:
- The actual production script (what we want)
- Casting briefs
- Location briefs
- Strategy documents
- Creative briefs
- Mood boards descriptions
- Budget information
- Production schedules
- Director's notes

Your task is to identify and extract ONLY the production script portion.

A production script typically:
- Has scene headings like "INT. LOCATION - DAY" or "EXT. LOCATION - NIGHT"
- Contains action/description lines
- May have character names in CAPS followed by dialogue
- Describes what happens visually in each scene
- Uses standard screenplay formatting conventions

IMPORTANT RULES:
1. If you find a clear script section, extract it completely and preserve its formatting
2. If the document contains no recognizable script, respond with: "NO_SCRIPT_FOUND"
3. Do NOT include casting briefs, location briefs, strategy, or other non-script content
4. Preserve scene numbers if present
5. Keep the original formatting (line breaks, indentation patterns)
6. If there are multiple versions of the script (e.g., "V1", "V2"), extract the latest/final version

Respond with ONLY the extracted script text. Do not add any commentary, explanations, or wrapper text.`;

export async function POST(request: NextRequest) {
  try {
    const { pdfText } = await request.json();

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

    // Truncate if extremely long (Claude has context limits)
    const maxChars = 150000;
    const truncatedText = sanitizedText.length > maxChars
      ? sanitizedText.substring(0, maxChars) + '\n\n[Document truncated due to length...]'
      : sanitizedText;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\n---\n\nDOCUMENT CONTENT:\n\n${truncatedText}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // ============================================
    // PRIVACY: Restore original terms in response
    // ============================================
    const desanitizedResponse = desanitizeText(responseText, mapping);

    if (responseText === 'NO_SCRIPT_FOUND') {
      return NextResponse.json({
        success: false,
        error: 'No recognizable script found in the document. The PDF may contain briefs or other materials but no production script.',
        extractedScript: null,
        privacyStats: stats,
      });
    }

    return NextResponse.json({
      success: true,
      extractedScript: desanitizedResponse,
      privacyStats: stats,
    });

  } catch (error) {
    console.error('Script extraction error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract script' },
      { status: 500 }
    );
  }
}
