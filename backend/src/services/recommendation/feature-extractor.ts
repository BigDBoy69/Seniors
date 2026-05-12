// ========================================
// FEATURE EXTRACTION SERVICE
// Converts products into ML-compatible feature vectors
// ========================================

import { PrismaClient, Product, Category, Division } from '@prisma/client';
import { hexToHSL, getColorFamily, isNeutral } from './color-theory';
import { PRICE_TIERS, ProductFeatures } from './types';
import { normalizeVector } from './utils';

const prisma = new PrismaClient();

// Style keyword extraction patterns
const STYLE_PATTERNS: Record<string, RegExp[]> = {
  'minimalist': [/minimal/i, /clean/i, /simple/i, /understated/i],
  'elegant': [/elegant/i, /sophisticated/i, /refined/i, /graceful/i],
  'vintage': [/vintage/i, /retro/i, /classic/i, /timeless/i],
  'modern': [/modern/i, /contemporary/i, /current/i, /trendy/i],
  'bohemian': [/boho/i, /bohemian/i, /free-spirited/i, /artisanal/i],
  'romantic': [/romantic/i, /feminine/i, /delicate/i, /soft/i],
  'edgy': [/edgy/i, /bold/i, /statement/i, /daring/i],
  'casual': [/casual/i, /relaxed/i, /easygoing/i, /laid-back/i],
  'formal': [/formal/i, /dressy/i, /evening/i, /sophisticated/i],
  'athletic': [/sporty/i, /athletic/i, /active/i, /performance/i]
};

// Occasion patterns
const OCCASION_PATTERNS: Record<string, RegExp[]> = {
  'casual': [/casual/i, /everyday/i, /day/i, /weekend/i],
  'work': [/work/i, /office/i, /professional/i, /business/i],
  'evening': [/evening/i, /night/i, /dinner/i, /cocktail/i],
  'formal': [/formal/i, /gala/i, /black-tie/i, /ceremony/i],
  'party': [/party/i, /celebration/i, /festive/i, /fun/i],
  'vacation': [/vacation/i, /resort/i, /beach/i, /holiday/i]
};

// Season patterns
const SEASON_PATTERNS: Record<string, RegExp[]> = {
  'spring': [/spring/i, /march/i, /april/i, /may/i],
  'summer': [/summer/i, /june/i, /july/i, /august/i, /warm/i],
  'autumn': [/autumn/i, /fall/i, /september/i, /october/i, /november/i],
  'winter': [/winter/i, /december/i, /january/i, /february/i, /cold/i],
  'all_season': [/all.?season/i, /year.?round/i, /transitional/i, /versatile/i]
};

// Material/fabric patterns
const MATERIAL_PATTERNS: Record<string, RegExp[]> = {
  'silk': [/silk/i, /satin/i, /charmeuse/i],
  'cotton': [/cotton/i, /jersey/i, /knit/i],
  'wool': [/wool/i, /cashmere/i, /merino/i, /tweed/i],
  'linen': [/linen/i, /flax/i],
  'leather': [/leather/i, /suede/i],
  'denim': [/denim/i, /jeans/i],
  'lace': [/lace/i, /crochet/i],
  'velvet': [/velvet/i, /velour/i],
  'synthetic': [/polyester/i, /nylon/i, /acrylic/i, /spandex/i]
};

// Fit patterns
const FIT_PATTERNS: Record<string, RegExp[]> = {
  'slim': [/slim/i, /fitted/i, /tailored/i, /close/i],
  'regular': [/regular/i, /standard/i, /classic/i],
  'oversized': [/oversized/i, /relaxed/i, /loose/i, /boxy/i],
  'cropped': [/cropped/i, /short/i, /above.?waist/i]
};

/**
 * Extract style tags from product description and name
 */
export function extractStyleTags(product: Product): string[] {
  const text = `${product.name} ${product.description || ''} ${product.fitNotes || ''}`;
  const tags: string[] = [];
  
  for (const [style, patterns] of Object.entries(STYLE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        tags.push(style);
        break;
      }
    }
  }
  
  return [...new Set(tags)];
}

/**
 * Extract occasion tags
 */
export function extractOccasionTags(product: Product): string[] {
  const text = `${product.name} ${product.description || ''}`;
  const tags: string[] = [];
  
  for (const [occasion, patterns] of Object.entries(OCCASION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        tags.push(occasion);
        break;
      }
    }
  }
  
  // Default to casual if no match
  if (tags.length === 0) tags.push('casual');
  
  return [...new Set(tags)];
}

/**
 * Extract season tags
 */
export function extractSeasonTags(product: Product): string[] {
  const text = `${product.name} ${product.description || ''}`;
  const tags: string[] = [];
  
  for (const [season, patterns] of Object.entries(SEASON_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        tags.push(season === 'all_season' ? 'spring' : season);
        if (season === 'all_season') {
          tags.push('summer', 'autumn', 'winter');
        }
        break;
      }
    }
  }
  
  // Infer from category
  const categoryName = (product as any).category?.name?.toLowerCase() || '';
  if (categoryName.includes('coat') || categoryName.includes('jacket') || categoryName.includes('sweater')) {
    if (!tags.includes('winter') && !tags.includes('autumn')) {
      tags.push('autumn', 'winter');
    }
  }
  
  if (tags.length === 0) {
    tags.push('spring', 'summer', 'autumn', 'winter');
  }
  
  return [...new Set(tags)];
}

/**
 * Extract material type
 */
export function extractMaterialType(product: Product): string | null {
  const text = `${product.name} ${product.description || ''} ${product.fabric || ''}`;
  
  for (const [material, patterns] of Object.entries(MATERIAL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return material;
      }
    }
  }
  
  return null;
}

/**
 * Extract fit type
 */
export function extractFitType(product: Product): string | null {
  const text = `${product.name} ${product.description || ''} ${product.fitNotes || ''}`;
  
  for (const [fit, patterns] of Object.entries(FIT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return fit;
      }
    }
  }
  
  return 'regular';
}

/**
 * Determine color family from variants
 */
export function extractColorFamily(product: Product & { variants: any[] }): string | null {
  const colors = product.variants
    .map(v => v.colorHex)
    .filter(Boolean);
  
  if (colors.length === 0) return null;
  
  // Get the most common color family
  const families = colors.map(c => {
    const hsl = hexToHSL(c);
    if (!hsl) return null;
    if (isNeutral(hsl)) return 'neutral';
    return getColorFamily(hsl);
  }).filter(Boolean);
  
  if (families.length === 0) return null;
  
  // Return most frequent
  const counts: Record<string, number> = {};
  for (const f of families) {
    counts[f!] = (counts[f!] || 0) + 1;
  }
  
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)[0][0];
}

/**
 * Calculate price tier
 */
export function calculatePriceTier(price: number): number {
  for (const tier of PRICE_TIERS) {
    if (price <= tier.max) return tier.tier;
  }
  return 4;
}

/**
 * Build 20-dimensional feature vector
 * 
 * Vector structure:
 * [0-4]:   Category encoding (one-hot-ish, normalized)
 * [5-7]:   Color encoding (HSL space, normalized)
 * [8]:     Price tier (normalized)
 * [9-13]:  Style tags (5-dim bag of styles)
 * [14-17]: Season encoding (4 seasons)
 * [18-19]: Occasion encoding (casual vs formal spectrum)
 */
export function buildFeatureVector(
  product: Product & { category?: Category; variants: any[] }
): number[] {
  const vector: number[] = new Array(20).fill(0);
  
  // 0-4: Category encoding (5 dimensions)
  const categorySlug = product.category?.slug || 'unknown';
  const categoryIndex = CATEGORY_ENCODING[categorySlug] ?? 0;
  vector[categoryIndex] = 1.0;
  
  // 5-7: Color encoding (HSL normalized)
  const colorHex = product.variants[0]?.colorHex || '#808080';
  const hsl = hexToHSL(colorHex);
  if (hsl) {
    vector[5] = hsl.h / 360; // Hue normalized
    vector[6] = hsl.s; // Saturation already 0-1
    vector[7] = hsl.l; // Lightness already 0-1
  }
  
  // 8: Price tier
  vector[8] = calculatePriceTier(product.price) / 4;
  
  // 9-13: Style tags (5 most common styles)
  const styles = extractStyleTags(product);
  const styleIndices = styles.map(s => STYLE_ENCODING[s]).filter(i => i !== undefined);
  for (let i = 0; i < 5 && i < styleIndices.length; i++) {
    vector[9 + i] = 0.5 + (0.5 / (i + 1)); // Decaying weights
  }
  
  // 14-17: Season encoding
  const seasons = extractSeasonTags(product);
  const seasonMap: Record<string, number> = { 'spring': 14, 'summer': 15, 'autumn': 16, 'winter': 17 };
  for (const season of seasons) {
    if (seasonMap[season] !== undefined) {
      vector[seasonMap[season]] = 1;
    }
  }
  
  // 18-19: Occasion spectrum (casual to formal)
  const occasions = extractOccasionTags(product);
  if (occasions.includes('casual')) vector[18] = 1;
  if (occasions.includes('formal') || occasions.includes('evening')) vector[19] = 1;
  
  return normalizeVector(vector);
}

// Category encoding (5 main categories)
const CATEGORY_ENCODING: Record<string, number> = {
  'dresses': 0,
  'tops': 1,
  'trousers': 2,
  'outerwear': 3,
  'jackets': 3,
  'shoes': 4,
  'bags': 4,
  'accessories': 4,
  'skirts': 2,
  'unknown': 0
};

// Style encoding (5 dimensions)
const STYLE_ENCODING: Record<string, number> = {
  'minimalist': 0,
  'elegant': 1,
  'vintage': 2,
  'modern': 3,
  'casual': 4
};

/**
 * Extract all features for a product
 */
export async function extractProductFeatures(
  product: Product & { category?: Category; variants: any[] }
): Promise<ProductFeatures> {
  return {
    styleTags: extractStyleTags(product),
    occasionTags: extractOccasionTags(product),
    seasonTags: extractSeasonTags(product),
    colorFamily: extractColorFamily(product),
    materialType: extractMaterialType(product),
    fitType: extractFitType(product),
    priceTier: calculatePriceTier(product.price),
    featureVector: buildFeatureVector(product)
  };
}

/**
 * Batch update features for all products
 */
export async function updateAllProductFeatures(): Promise<void> {
  const products = await prisma.product.findMany({
    include: { category: true, variants: true }
  });
  
  for (const product of products) {
    const features = await extractProductFeatures(product as any);
    
    await prisma.productFeature.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        styleTags: JSON.stringify(features.styleTags),
        occasionTags: JSON.stringify(features.occasionTags),
        seasonTags: JSON.stringify(features.seasonTags),
        colorFamily: features.colorFamily,
        materialType: features.materialType,
        fitType: features.fitType,
        priceTier: features.priceTier,
        featureVector: JSON.stringify(features.featureVector)
      },
      update: {
        styleTags: JSON.stringify(features.styleTags),
        occasionTags: JSON.stringify(features.occasionTags),
        seasonTags: JSON.stringify(features.seasonTags),
        colorFamily: features.colorFamily,
        materialType: features.materialType,
        fitType: features.fitType,
        priceTier: features.priceTier,
        featureVector: JSON.stringify(features.featureVector)
      }
    });
  }
  
  console.log(`Updated features for ${products.length} products`);
}

/**
 * Update popularity scores
 */
export async function updatePopularityScores(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Get event counts per product
  const events = await prisma.userEvent.groupBy({
    by: ['productId', 'eventType'],
    where: {
      createdAt: { gte: thirtyDaysAgo },
      productId: { not: null }
    },
    _count: { id: true }
  });
  
  // Aggregate by product
  const productStats: Record<string, {
    views: number;
    clicks: number;
    wishlists: number;
    cartAdds: number;
    purchases: number;
  }> = {};
  
  for (const event of events) {
    if (!event.productId) continue;
    
    if (!productStats[event.productId]) {
      productStats[event.productId] = { views: 0, clicks: 0, wishlists: 0, cartAdds: 0, purchases: 0 };
    }
    
    const count = event._count.id;
    switch (event.eventType) {
      case 'VIEW': productStats[event.productId].views = count; break;
      case 'CLICK': productStats[event.productId].clicks = count; break;
      case 'WISHLIST': productStats[event.productId].wishlists = count; break;
      case 'CART_ADD': productStats[event.productId].cartAdds = count; break;
      case 'PURCHASE': productStats[event.productId].purchases = count; break;
    }
  }
  
  // Calculate trending scores (weighted combination)
  for (const [productId, stats] of Object.entries(productStats)) {
    const trendingScore = 
      stats.views * 1 +
      stats.clicks * 2 +
      stats.wishlists * 3 +
      stats.cartAdds * 4 +
      stats.purchases * 5;
    
    await prisma.productFeature.update({
      where: { productId },
      data: {
        viewCount: stats.views,
        clickCount: stats.clicks,
        wishlistCount: stats.wishlists,
        cartAddCount: stats.cartAdds,
        purchaseCount: stats.purchases,
        trendingScore: Math.min(trendingScore / 100, 1) // Normalize to 0-1
      }
    });
  }
  
  console.log(`Updated popularity scores for ${Object.keys(productStats).length} products`);
}

export { prisma };
