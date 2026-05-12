// ========================================
// COLOR THEORY FOR FASHION RECOMMENDATIONS
// Implements color harmony and complementarity
// ========================================

export interface HSL {
  h: number; // Hue: 0-360
  s: number; // Saturation: 0-1
  l: number; // Lightness: 0-1
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 */
export function hexToRGB(hex: string): RGB | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Handle 3-character hex
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  // Handle 6-character hex
  if (hex.length !== 6) return null;
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  
  return { r, g, b };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHSL(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100) / 100,
    l: Math.round(l * 100) / 100
  };
}

/**
 * Convert hex to HSL
 */
export function hexToHSL(hex: string): HSL | null {
  const rgb = hexToRGB(hex);
  if (!rgb) return null;
  return rgbToHSL(rgb);
}

/**
 * Check if color is neutral (low saturation)
 */
export function isNeutral(hsl: HSL, threshold: number = 0.15): boolean {
  return hsl.s < threshold;
}

/**
 * Get color family from HSL
 */
export function getColorFamily(hsl: HSL): string {
  if (isNeutral(hsl)) {
    if (hsl.l > 0.8) return 'white';
    if (hsl.l < 0.2) return 'black';
    return 'gray';
  }
  
  const hue = hsl.h;
  
  if (hue >= 0 && hue < 15 || hue >= 345) return 'red';
  if (hue >= 15 && hue < 45) return 'orange';
  if (hue >= 45 && hue < 75) return 'yellow';
  if (hue >= 75 && hue < 155) return 'green';
  if (hue >= 155 && hue < 195) return 'cyan';
  if (hue >= 195 && hue < 255) return 'blue';
  if (hue >= 255 && hue < 285) return 'purple';
  if (hue >= 285 && hue < 345) return 'pink';
  
  return 'unknown';
}

/**
 * Calculate color harmony score
 * Returns 0-1 score where higher = more harmonious
 */
export function calculateColorHarmony(hex1: string, hex2: string): number {
  const hsl1 = hexToHSL(hex1);
  const hsl2 = hexToHSL(hex2);
  
  if (!hsl1 || !hsl2) return 0.3; // Default score for unknown colors
  
  // Neutral colors match with everything
  if (isNeutral(hsl1) || isNeutral(hsl2)) {
    // Both neutral - monochromatic
    if (isNeutral(hsl1) && isNeutral(hsl2)) {
      return 0.9;
    }
    // One neutral - versatile pairing
    return 0.7;
  }
  
  const hueDiff = Math.abs(hsl1.h - hsl2.h);
  const normalizedDiff = Math.min(hueDiff, 360 - hueDiff) / 180;
  
  // Monochromatic (same hue family) - 0.9
  if (normalizedDiff < 0.1) return 0.9;
  
  // Analogous (nearby colors) - 0.8
  if (normalizedDiff < 0.2) return 0.8;
  
  // Complementary (opposite on wheel, ~180) - 0.85
  if (Math.abs(normalizedDiff - 0.5) < 0.1) return 0.85;
  
  // Split complementary (~150-210) - 0.75
  if (Math.abs(normalizedDiff - 0.5) < 0.2) return 0.75;
  
  // Triadic (~120) - 0.7
  if (Math.abs(normalizedDiff - 0.33) < 0.1) return 0.7;
  
  // Tetradic (~90) - 0.6
  if (Math.abs(normalizedDiff - 0.25) < 0.1) return 0.6;
  
  // Clashing colors - lower score
  return 0.3 + (0.2 * (1 - normalizedDiff));
}

/**
 * Get complementary color (opposite on wheel)
 */
export function getComplementaryColor(hsl: HSL): HSL {
  return {
    h: (hsl.h + 180) % 360,
    s: hsl.s,
    l: hsl.l
  };
}

/**
 * Get analogous colors (adjacent on wheel)
 */
export function getAnalogousColors(hsl: HSL): HSL[] {
  return [
    { h: (hsl.h - 30 + 360) % 360, s: hsl.s, l: hsl.l },
    { h: (hsl.h + 30) % 360, s: hsl.s, l: hsl.l }
  ];
}

/**
 * Check if colors are in same family (monochromatic variations)
 */
export function isMonochromatic(hex1: string, hex2: string): boolean {
  const hsl1 = hexToHSL(hex1);
  const hsl2 = hexToHSL(hex2);
  
  if (!hsl1 || !hsl2) return false;
  
  const family1 = getColorFamily(hsl1);
  const family2 = getColorFamily(hsl2);
  
  return family1 === family2;
}

/**
 * Fashion color categories
 */
export const FASHION_COLOR_GROUPS: Record<string, string[]> = {
  'neutrals': ['white', 'black', 'gray', 'beige', 'tan', 'brown', 'navy'],
  'earth_tones': ['brown', 'tan', 'beige', 'olive', 'rust', 'terracotta'],
  'jewel_tones': ['emerald', 'ruby', 'sapphire', 'amethyst', 'gold'],
  'pastels': ['baby_pink', 'lavender', 'mint', 'powder_blue', 'peach'],
  'brights': ['red', 'orange', 'yellow', 'bright_blue', 'hot_pink'],
  'metallics': ['gold', 'silver', 'bronze', 'copper', 'rose_gold']
};

/**
 * Determine if colors work together in fashion context
 */
export function isFashionCompatible(hex1: string, hex2: string): boolean {
  const score = calculateColorHarmony(hex1, hex2);
  return score > 0.5; // Threshold for fashion compatibility
}

/**
 * Get warm or cool classification
 */
export function getTemperature(hsl: HSL): 'warm' | 'cool' | 'neutral' {
  if (isNeutral(hsl)) return 'neutral';
  
  // Warm hues: red, orange, yellow, yellow-green
  if (hsl.h >= 0 && hsl.h < 90) return 'warm';
  
  // Cool hues: green, cyan, blue, purple, pink
  if (hsl.h >= 150 && hsl.h < 345) return 'cool';
  
  // Transition zones - check saturation
  return hsl.s > 0.3 ? 'warm' : 'neutral';
}

/**
 * Calculate seasonal color compatibility
 * Checks if colors work for given season
 */
export function getSeasonalCompatibility(
  hex: string,
  season: 'spring' | 'summer' | 'autumn' | 'winter'
): number {
  const hsl = hexToHSL(hex);
  if (!hsl) return 0.5;
  
  const family = getColorFamily(hsl);
  const temp = getTemperature(hsl);
  
  switch (season) {
    case 'spring':
      // Bright, warm colors
      if (temp === 'warm' && hsl.s > 0.4) return 0.9;
      if (['pink', 'yellow', 'green'].includes(family)) return 0.8;
      return 0.5;
      
    case 'summer':
      // Cool, light colors
      if (temp === 'cool' && hsl.l > 0.5) return 0.9;
      if (['blue', 'cyan', 'white'].includes(family)) return 0.8;
      return 0.5;
      
    case 'autumn':
      // Warm, muted, earthy
      if (temp === 'warm' && hsl.s < 0.7) return 0.9;
      if (['orange', 'brown', 'olive'].includes(family)) return 0.8;
      return 0.5;
      
    case 'winter':
      // Cool, dark, jewel tones
      if (temp === 'cool' && hsl.s > 0.5) return 0.9;
      if (['blue', 'purple', 'black'].includes(family)) return 0.8;
      return 0.5;
  }
}

/**
 * Normalize color hex to standard format
 */
export function normalizeColorHex(hex: string): string | null {
  const rgb = hexToRGB(hex);
  if (!rgb) return null;
  
  return `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
}

/**
 * Get approximate color name from hex
 */
export function getApproximateColorName(hex: string): string {
  const hsl = hexToHSL(hex);
  if (!hsl) return 'unknown';
  
  if (isNeutral(hsl)) {
    if (hsl.l > 0.9) return 'white';
    if (hsl.l < 0.1) return 'black';
    if (hsl.l > 0.5) return 'light gray';
    return 'gray';
  }
  
  return getColorFamily(hsl);
}
