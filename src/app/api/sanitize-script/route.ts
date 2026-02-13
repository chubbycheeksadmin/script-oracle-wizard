// ============================================
// SCRIPT SANITIZATION - Privacy & Security Layer
// ============================================
// Redacts sensitive client information before sending to external AI APIs
// Reversible mapping so results come back with original terms

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// SANITIZATION CONFIGURATION
// ============================================

const SANITIZATION_PATTERNS = {
  // Brand/Company names (common advertising clients)
  BRANDS: [
    'nike', 'adidas', 'puma', 'reebok', 'apple', 'samsung', 'google', 'amazon',
    'microsoft', 'coca-cola', 'pepsi', 'ford', 'bmw', 'mercedes', 'audi',
    'toyota', 'honda', 'vodafone', 'ee', 'o2', 'three', 'bt', 'sky',
    'virgin', 'ba', 'john lewis', 'marks & spencer', 'sainsbury', 'tesco',
    'asda', 'morrisons', 'waitrose', 'aldi', 'lidl', 'boots', 'superdrug',
    'barclays', 'hsbc', 'natwest', 'lloyds', 'santander', 'monzo', 'starling',
  ],
  
  // Product lines (often follow brand names)
  PRODUCTS: [
    'air max', 'air force', 'jordan', 'galaxy', 'iphone', 'ipad', 'macbook',
    'surface', 'xbox', 'playstation', 'corsa', 'golf', 'focus', 'a-class',
    '3-series', 'a4', 'q5', 'q7', 'iphone', 'ipad', 'airpods', 'apple watch',
  ],
  
  // Common talent/first names (for pattern matching)
  COMMON_FIRST_NAMES: [
    'john', 'jane', 'michael', 'sarah', 'david', 'emma', 'james', 'laura',
    'robert', 'lisa', 'william', 'jennifer', 'richard', 'maria', 'thomas',
    'susan', 'charles', 'margaret', 'daniel', 'jessica', 'matthew', 'ashley',
  ],
  
  // Cities/locations that might identify client
  IDENTIFYING_LOCATIONS: [
    'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'liverpool',
    'newcastle', 'sheffield', 'bristol', 'cardiff', 'belfast', 'nottingham',
    'southampton', 'portsmouth', 'leicester', 'edinburgh', 'aberdeen',
  ],
};

// Token prefixes for redaction
const TOKENS = {
  BRAND: 'BRAND',
  PRODUCT: 'PRODUCT',
  TALENT: 'ACTOR',
  LOCATION: 'LOCATION',
  CAMPAIGN: 'CAMPAIGN',
  GENERIC: 'ENTITY',
};

// ============================================
// SANITIZATION ENGINE
// ============================================

interface SanitizationMap {
  original: string;
  token: string;
  type: string;
}

interface SanitizationResult {
  sanitizedText: string;
  mapping: SanitizationMap[];
  stats: {
    brandsRedacted: number;
    productsRedacted: number;
    talentRedacted: number;
    locationsRedacted: number;
    totalRedacted: number;
  };
}

/**
 * Main sanitization function - redacts sensitive information from scripts
 */
export function sanitizeScript(scriptText: string): SanitizationResult {
  const mapping: SanitizationMap[] = [];
  let sanitizedText = scriptText;
  
  const counters = {
    brand: 0,
    product: 0,
    talent: 0,
    location: 0,
  };
  
  // Step 1: Redact known brand names (case insensitive)
  SANITIZATION_PATTERNS.BRANDS.forEach((brand, index) => {
    const regex = new RegExp(`\\b${brand}\\b`, 'gi');
    if (regex.test(sanitizedText)) {
      counters.brand++;
      const token = `${TOKENS.BRAND}_${String(counters.brand).padStart(2, '0')}`;
      mapping.push({ original: brand, token, type: 'BRAND' });
      sanitizedText = sanitizedText.replace(regex, token);
    }
  });
  
  // Step 2: Redact product names
  SANITIZATION_PATTERNS.PRODUCTS.forEach((product, index) => {
    const regex = new RegExp(`\\b${product}\\b`, 'gi');
    if (regex.test(sanitizedText)) {
      counters.product++;
      const token = `${TOKENS.PRODUCT}_${String(counters.product).padStart(2, '0')}`;
      mapping.push({ original: product, token, type: 'PRODUCT' });
      sanitizedText = sanitizedText.replace(regex, token);
    }
  });
  
  // Step 3: Redact talent names (Capitalized Words that look like names)
  // Pattern: Capital letter + lowercase, optionally with hyphen/space and another capital
  const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+|\-[A-Z][a-z]+)*\b/g;
  const potentialNames = sanitizedText.match(namePattern) || [];
  
  potentialNames.forEach((name) => {
    // Skip if already a token
    if (name.startsWith('BRAND_') || name.startsWith('PRODUCT_') || 
        name.startsWith('ACTOR_') || name.startsWith('LOCATION_')) {
      return;
    }
    
    // Skip common screenplay terms
    const skipTerms = ['INT', 'EXT', 'DAY', 'NIGHT', 'CONTINUOUS', 'LATER', 'SAME',
      'FADE', 'CUT', 'DISSOLVE', 'CLOSE', 'WIDE', 'MEDIUM', 'SHOT', 'ANGLE'];
    if (skipTerms.includes(name.toUpperCase())) return;
    
    // Check if it looks like a name (not all caps, not all lowercase)
    if (name.length > 2 && name[0] === name[0].toUpperCase()) {
      counters.talent++;
      const token = `${TOKENS.TALENT}_${String(counters.talent).padStart(2, '0')}`;
      mapping.push({ original: name, token, type: 'TALENT' });
      sanitizedText = sanitizedText.replace(new RegExp(`\\b${name}\\b`, 'g'), token);
    }
  });
  
  // Step 4: Redact specific identifying locations
  SANITIZATION_PATTERNS.IDENTIFYING_LOCATIONS.forEach((location, index) => {
    const regex = new RegExp(`\\b${location}\\b`, 'gi');
    if (regex.test(sanitizedText)) {
      counters.location++;
      const token = `${TOKENS.LOCATION}_${String(counters.location).padStart(2, '0')}`;
      mapping.push({ original: location, token, type: 'LOCATION' });
      sanitizedText = sanitizedText.replace(regex, token);
    }
  });
  
  return {
    sanitizedText,
    mapping,
    stats: {
      brandsRedacted: counters.brand,
      productsRedacted: counters.product,
      talentRedacted: counters.talent,
      locationsRedacted: counters.location,
      totalRedacted: counters.brand + counters.product + counters.talent + counters.location,
    },
  };
}

/**
 * Reverse sanitization - restores original terms from sanitized output
 */
export function desanitizeText(sanitizedText: string, mapping: SanitizationMap[]): string {
  let originalText = sanitizedText;
  
  // Sort by token length (longest first) to avoid partial replacements
  const sortedMapping = [...mapping].sort((a, b) => b.token.length - a.token.length);
  
  sortedMapping.forEach(({ original, token }) => {
    originalText = originalText.replace(new RegExp(token, 'g'), original);
  });
  
  return originalText;
}

/**
 * API Route: Sanitize script for external processing
 */
export async function POST(request: NextRequest) {
  try {
    const { scriptText } = await request.json();
    
    if (!scriptText || typeof scriptText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid scriptText' },
        { status: 400 }
      );
    }
    
    const result = sanitizeScript(scriptText);
    
    return NextResponse.json({
      success: true,
      sanitizedText: result.sanitizedText,
      mapping: result.mapping,
      stats: result.stats,
    });
    
  } catch (error) {
    console.error('Sanitization error:', error);
    return NextResponse.json(
      { error: 'Failed to sanitize script' },
      { status: 500 }
    );
  }
}

// ============================================
// USAGE EXAMPLE
// ============================================
/*
Before sending to Anthropic:

const { sanitizedText, mapping } = sanitizeScript(userScript);
// Send sanitizedText to AI API
const aiResponse = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: sanitizedText }],
});
// Restore original terms
const resultForUser = desanitizeText(aiResponse.content[0].text, mapping);
*/
