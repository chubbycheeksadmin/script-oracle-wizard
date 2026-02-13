// ============================================
// PDF PARSER - Client-side exports
// Server-side parsing is now handled by /api/parse-pdf
// ============================================

import { AIBreakdownResponse } from '@/types/breakdown';

// ============================================
// CLEAN SCRIPT TEXT
// Removes common PDF artifacts and normalizes formatting
// ============================================

export function cleanScriptText(rawText: string): string {
  let text = rawText;

  // Remove page numbers (common patterns)
  text = text.replace(/^\s*\d+\s*$/gm, '');
  text = text.replace(/^Page \d+ of \d+$/gim, '');
  text = text.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');

  // Remove common header/footer patterns
  text = text.replace(/^(CONTINUED|MORE|\(CONTINUED\)|\(MORE\))$/gim, '');
  text = text.replace(/^\s*CONT'D\s*$/gim, '');

  // Normalize scene headers
  // Convert variations like "INT:" or "INT -" to standard "INT."
  text = text.replace(/^(INT|EXT|INT\/EXT|I\/E)[\s:\-]+/gim, (match, prefix) => {
    return prefix.toUpperCase() + '. ';
  });

  // Remove excessive blank lines (more than 2 consecutive)
  text = text.replace(/\n{4,}/g, '\n\n\n');

  // Trim each line
  text = text.split('\n').map(line => line.trim()).join('\n');

  // Remove leading/trailing whitespace
  text = text.trim();

  return text;
}

// ============================================
// EXTRACT SCRIPT VIA AI (Simple extraction)
// Sends text to API for intelligent script extraction
// ============================================

export async function extractScriptWithAI(pdfText: string): Promise<{
  success: boolean;
  extractedScript: string | null;
  error?: string;
}> {
  try {
    const response = await fetch('/api/extract-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pdfText }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI extraction error:', error);
    return {
      success: false,
      extractedScript: null,
      error: error instanceof Error ? error.message : 'Failed to extract script',
    };
  }
}

// ============================================
// FULL AI BREAKDOWN (Producer-level analysis)
// Extracts script AND performs comprehensive breakdown
// ============================================

export async function getAIBreakdown(pdfText: string): Promise<AIBreakdownResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
    
    const response = await fetch('/api/breakdown-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pdfText, stream: false }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI breakdown error:', error);
    return {
      scriptExtracted: false,
      error: error instanceof Error ? error.message : 'Failed to breakdown script',
    };
  }
}

// ============================================
// STREAMING AI BREAKDOWN
// Shows real-time progress as AI analyzes the script
// ============================================

export async function getAIBreakdownStreaming(
  pdfText: string,
  onProgress: (progress: { stage: string; message: string }) => void,
  onComplete: (result: AIBreakdownResponse) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    // Start progress updates
    onProgress({ stage: 'initializing', message: 'Initializing AI analysis...' });
    
    // Use non-streaming API for reliability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout for large scripts
    
    onProgress({ stage: 'analyzing', message: 'Analyzing script structure...' });
    
    const response = await fetch('/api/breakdown-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pdfText, stream: false }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Breakdown] API error:', response.status, errorText);
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { error: errorText }; }
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('[AI Breakdown] Result:', result.scriptExtracted ? 'success' : 'failed', result.error || '');
    
    // Simulate progress updates based on result
    if (result.scriptExtracted && result.breakdown) {
      onProgress({ stage: 'scenes', message: `Identified ${result.breakdown.totalScenes} scenes...` });
      await delay(300);
      
      onProgress({ stage: 'locations', message: `Found ${result.breakdown.uniqueLocations} unique locations...` });
      await delay(300);
      
      if (result.breakdown.rollup) {
        onProgress({ stage: 'schedule', message: `Estimated ${result.breakdown.rollup.estimatedShootDays} shoot days...` });
        await delay(300);
        
        if (result.breakdown.rollup.hasTechnicalShots) {
          onProgress({ stage: 'features', message: 'Detected technical shots...' });
          await delay(200);
        }
        
        if (result.breakdown.rollup.hasHeroProduct) {
          onProgress({ stage: 'features', message: 'Found hero product moment...' });
          await delay(200);
        }
        
        if (result.breakdown.rollup.vfxComplexity !== 'none') {
          onProgress({ stage: 'features', message: `VFX complexity: ${result.breakdown.rollup.vfxComplexity}...` });
          await delay(200);
        }
      }
      
      onProgress({ stage: 'complete', message: 'Analysis complete!' });
    }
    
    onComplete(result);
  } catch (error) {
    console.error('Streaming AI breakdown error:', error);
    onError(error instanceof Error ? error.message : 'Failed to breakdown script');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
