// ============================================
// SCRIPT SANITIZATION - Privacy & Security Layer
// ============================================
// Redacts sensitive client information before sending to external AI APIs
// Reversible mapping so results come back with original terms

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
    'cadbury', 'kellogg', 'nestle', 'unilever', 'procter', 'gamble', 'dove',
    'lynx', 'axe', ' Sure', 'gillette', 'always', 'tampax', 'oral-b',
    'heinz', 'hellmann', 'magnum', 'ben & jerry', 'häagen-dazs', 'domestos',
    'cif', 'persil', 'surf', 'comfort', 'lenor', 'daz', 'arial', 'tide',
    'febreze', 'mr muscle', 'vanish', 'dettol', 'nurofen', 'strepsils',
    'gaviscon', 'imodium', 'calpol', 'anadin', 'lemsip', 'benylin',
    'clearasil', 'e45', 'aveeno', 'simple', 'nivea', 'loreal', 'garnier',
    'maybelline', 'rimmel', 'revlon', 'max factor', 'covergirl', 'laura mercier',
    'charlotte tilbury', 'mac', 'benefit', 'clinique', 'estee lauder',
    'british airways', 'easyjet', 'ryanair', 'jet2', 'virgin atlantic',
    'expedia', 'booking.com', 'airbnb', 'uber', 'bolt', 'deliveroo',
    'just eat', 'uber eats', 'opentable', 'groupon', 'wowcher',
    'currys', 'argos', 'john lewis', 'ikea', 'dfs', 'dreams',
    'b&q', 'homebase', 'wickes', 'travis perkins', 'screwfix',
    'toolstation', 'halfords', 'euro car parts', 'kwik fit', 'ats',
  ],
  
  // Product lines (often follow brand names)
  PRODUCTS: [
    'air max', 'air force', 'jordan', 'dunk', 'blazer', 'cortez',
    'galaxy', 'iphone', 'ipad', 'macbook', 'imac', 'mac pro', 'airpods', 'apple watch',
    'surface', 'xbox', 'playstation', 'ps5', 'ps4', 'nintendo switch',
    'corsa', 'astra', 'golf', 'polo', 'focus', 'fiesta', 'a-class', 'c-class',
    '3-series', '5-series', 'a4', 'a3', 'q5', 'q7', 'q3', 'x5', 'x3',
    'iphone 15', 'iphone 14', 'iphone 13', 'iphone 12', 'iphone 11',
    'ipad pro', 'ipad air', 'ipad mini', 'macbook pro', 'macbook air',
    'airpods pro', 'airpods max', 'homepod', 'apple tv',
    'kindle', 'echo', 'alexa', 'fire tv', 'fire stick',
    'pixel', 'pixelbook', 'nest', 'home hub',
    'surface pro', 'surface laptop', 'surface studio',
    'xbox series x', 'xbox series s', 'game pass',
  ],
  
  // Common talent/first names (for pattern matching)
  COMMON_FIRST_NAMES: [
    'john', 'jane', 'michael', 'sarah', 'david', 'emma', 'james', 'laura',
    'robert', 'lisa', 'william', 'jennifer', 'richard', 'maria', 'thomas',
    'susan', 'charles', 'margaret', 'daniel', 'jessica', 'matthew', 'ashley',
    'christopher', 'amanda', 'andrew', 'stephanie', 'joseph', 'nicole',
    'kevin', 'melissa', 'brian', 'rebecca', 'ryan', 'kimberly', 'timothy',
    'emily', 'mark', 'donna', 'jason', 'michelle', 'steven', 'carol',
    'kenneth', 'rachel', 'jeffrey', 'amy', 'justin', 'anna', 'benjamin',
    'katherine', 'samuel', 'lauren', 'alexander', 'joshua', 'megan',
    'gregory', 'samantha', 'frank', 'victoria', 'raymond', 'christine',
    'patrick', 'deborah', 'jacob', 'catherine', 'nicholas', 'heather',
    'tyler', 'marie', 'henry', 'diane', 'stephen', 'julie', 'brandon',
    'joyce', 'douglas', 'christina', 'zachary', 'evelyn', 'peter',
    'olivia', 'kyle', 'kelly', 'ethan', 'hannah', 'walter', 'martha',
    'nathan', 'alice', 'harry', 'grace', 'george', 'janet', 'jack',
    'denise', 'charlie', 'amber', 'adam', 'marilyn', 'oscar', 'beverly',
    'tom', 'arthur', 'fred', 'lily', 'albert', 'bobby', 'eddie',
  ],
  
  // Cities/locations that might identify client
  IDENTIFYING_LOCATIONS: [
    'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'liverpool',
    'newcastle', 'sheffield', 'bristol', 'cardiff', 'belfast', 'nottingham',
    'southampton', 'portsmouth', 'leicester', 'edinburgh', 'aberdeen',
    'dundee', 'inverness', 'stirling', 'perth', 'paisley', 'hamilton',
    'kirkcaldy', 'ayr', 'dumfries', 'oban', 'fort william',
    'oxford', 'cambridge', 'york', 'bath', 'canterbury', 'chester',
    'winchester', 'durham', 'exeter', 'norwich', 'worcester', 'lincoln',
    'hereford', 'chichester', 'lichfield', 'truro', 'carlisle', 'ely',
    'ripon', 'st albans', 'salford', 'wakefield', 'coventry', 'bradford',
    'bournemouth', 'poole', 'swindon', 'reading', 'slough', 'watford',
    'hemel hempstead', 'stevenage', 'welwyn garden city', 'luton',
    'milton keynes', 'northampton', 'derby', 'stoke', 'stafford',
    'shrewsbury', 'telford', 'wolverhampton', 'walsall', 'dudley',
    'west bromwich', 'solihull', 'redditch', 'kidderminster',
    'blackpool', 'preston', 'blackburn', 'burnley', 'bolton', 'bury',
    'rochdale', 'oldham', 'stockport', 'salford', 'wigan', 'warrington',
    'chester', 'crewe', 'stoke-on-trent', 'stafford', 'wolverhampton',
    'telford', 'shrewsbury', 'hereford', 'worcester', 'gloucester',
    'cheltenham', 'bristol', 'bath', 'swindon', 'reading', 'oxford',
    'cambridge', 'norwich', 'ipswich', 'colchester', 'chelmsford',
    'southend', 'basildon', 'maidstone', 'canterbury', 'brighton',
    'hove', 'eastbourne', 'hastings', 'chichester', 'portsmouth',
    'southampton', 'bournemouth', 'poole', 'weymouth', 'exeter',
    'plymouth', 'torquay', 'paignton', 'barnstaple', 'taunton',
    'yeovil', 'weston-super-mare', 'cardiff', 'newport', 'swansea',
    'wrexham', 'bangor', 'aberystwyth', 'llandudno', 'pembroke',
    'tenby', 'st davids', 'llanelli', 'merthyr tydfil', 'bridgend',
    'neath', 'port talbot', 'caerphilly', 'rhondda', 'cynon taff',
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
// TYPES
// ============================================

export interface SanitizationMap {
  original: string;
  token: string;
  type: string;
}

export interface SanitizationResult {
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

// ============================================
// SANITIZATION ENGINE
// ============================================

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
  
  // Track what we've already replaced to avoid double-replacement
  const replacedTokens = new Set<string>();
  
  // Step 1: Redact known brand names (case insensitive, word boundaries)
  SANITIZATION_PATTERNS.BRANDS.forEach((brand) => {
    // Escape special regex characters
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedBrand}\\b`, 'gi');
    
    if (regex.test(sanitizedText)) {
      counters.brand++;
      const token = `${TOKENS.BRAND}_${String(counters.brand).padStart(2, '0')}`;
      mapping.push({ original: brand, token, type: 'BRAND' });
      sanitizedText = sanitizedText.replace(regex, token);
      replacedTokens.add(token);
    }
  });
  
  // Step 2: Redact product names
  SANITIZATION_PATTERNS.PRODUCTS.forEach((product) => {
    const escapedProduct = product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedProduct}\\b`, 'gi');
    
    if (regex.test(sanitizedText)) {
      counters.product++;
      const token = `${TOKENS.PRODUCT}_${String(counters.product).padStart(2, '0')}`;
      mapping.push({ original: product, token, type: 'PRODUCT' });
      sanitizedText = sanitizedText.replace(regex, token);
      replacedTokens.add(token);
    }
  });
  
  // Step 3: Redact specific identifying locations
  SANITIZATION_PATTERNS.IDENTIFYING_LOCATIONS.forEach((location) => {
    const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedLocation}\\b`, 'gi');
    
    if (regex.test(sanitizedText)) {
      counters.location++;
      const token = `${TOKENS.LOCATION}_${String(counters.location).padStart(2, '0')}`;
      mapping.push({ original: location, token, type: 'LOCATION' });
      sanitizedText = sanitizedText.replace(regex, token);
      replacedTokens.add(token);
    }
  });
  
  // Step 4: Redact talent names (Capitalized Words that look like names)
  // Pattern: Capital letter + lowercase, 2+ words or single word
  // Only match if NOT already a token and NOT a screenplay term
  const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = sanitizedText.match(namePattern) || [];
  
  // Filter and deduplicate
  const uniqueNames = [...new Set(matches)];
  
  uniqueNames.forEach((name) => {
    // Skip if already a token
    if (name.startsWith('BRAND_') || name.startsWith('PRODUCT_') || 
        name.startsWith('ACTOR_') || name.startsWith('LOCATION_')) {
      return;
    }
    
    // Skip common screenplay terms and directions
    const skipTerms = [
      'INT', 'EXT', 'INTEXT', 'DAY', 'NIGHT', 'CONTINUOUS', 'LATER', 'SAME',
      'FADE', 'CUT', 'DISSOLVE', 'WIPE', 'SMASH', 'MATCH', 'JUMP',
      'CLOSE', 'WIDE', 'MEDIUM', 'SHOT', 'ANGLE', 'VIEW', 'POV',
      'PAN', 'TILT', 'DOLLY', 'TRACK', 'CRANE', 'ZOOM', 'RACK',
      'SLOW', 'FAST', 'FREEZE', 'REVERSE', 'SPLIT', 'SCREEN',
      'SUPER', 'TITLE', 'CREDIT', 'FADE', 'BLACK', 'WHITE',
      'VOICE', 'O', 'S', 'V', 'OS', 'VO', 'OSD',
      'MOMENTS', 'LATER', 'MORNING', 'EVENING', 'AFTERNOON', 'MIDDAY',
      'DAWN', 'DUSK', 'SUNSET', 'SUNRISE', 'NOON', 'MIDNIGHT',
      'FLASHBACK', 'FLASH', 'FORWARD', 'DREAM', 'SEQUENCE', 'MONTAGE',
      'SERIES', 'OF', 'SHOTS', 'SCENE', 'ACT', 'EPISODE',
      'THE', 'A', 'AN', 'AND', 'OR', 'BUT', 'FOR', 'NOR',
      'YET', 'SO', 'IF', 'THEN', 'THAN', 'AS', 'AT', 'BE',
      'BY', 'DO', 'GO', 'HE', 'IF', 'IN', 'IS', 'IT',
      'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'OX', 'PI',
      'SO', 'TO', 'UP', 'US', 'WE', 'TV', 'UK', 'EU',
    ];
    
    if (skipTerms.includes(name.toUpperCase())) return;
    
    // Skip if it's just a single letter or too short
    if (name.length <= 2) return;
    
    // Skip if all caps (likely an abbreviation)
    if (name === name.toUpperCase()) return;
    
    // Skip if it contains numbers
    if (/\d/.test(name)) return;
    
    // Only replace known first names — don't replace arbitrary Title Case words
    // as this destroys location names, scene descriptions, and other script content
    const lowerName = name.toLowerCase();
    const isKnownName = SANITIZATION_PATTERNS.COMMON_FIRST_NAMES.includes(lowerName);

    // For multi-word Title Case phrases (e.g. "John Smith"), treat as a name
    const isMultiWordName = name.includes(' ') && name.split(' ').length <= 3 && name.length <= 25;

    if (isKnownName || isMultiWordName) {
      counters.talent++;
      const token = `${TOKENS.TALENT}_${String(counters.talent).padStart(2, '0')}`;
      
      // Check if this exact mapping already exists
      const exists = mapping.some(m => m.original.toLowerCase() === name.toLowerCase());
      if (!exists) {
        mapping.push({ original: name, token, type: 'TALENT' });
        // Use word boundary regex to replace only whole words
        const nameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        sanitizedText = sanitizedText.replace(nameRegex, token);
        replacedTokens.add(token);
      }
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
  // e.g., replace BRAND_10 before BRAND_1 to avoid "BRAND_1"0
  const sortedMapping = [...mapping].sort((a, b) => b.token.length - a.token.length);
  
  sortedMapping.forEach(({ original, token }) => {
    // Use global replacement
    const tokenRegex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    originalText = originalText.replace(tokenRegex, original);
  });
  
  return originalText;
}

// ============================================
// USAGE EXAMPLE
// ============================================
/*
Before sending to Anthropic:

import { sanitizeScript, desanitizeText } from '@/lib/sanitization';

const { sanitizedText, mapping, stats } = sanitizeScript(userScript);
console.log(`Privacy: Redacted ${stats.totalRedacted} entities`);

// Send sanitizedText to AI API
const aiResponse = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: sanitizedText }],
});

// Restore original terms for user
const resultForUser = desanitizeText(aiResponse.content[0].text, mapping);
*/
