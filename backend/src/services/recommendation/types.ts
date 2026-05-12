// ========================================
// RECOMMENDATION SYSTEM TYPES
// ========================================

export type RecType = 
  | 'SIMILAR' 
  | 'PERSONALIZED' 
  | 'COMPLEMENTARY' 
  | 'TRENDING' 
  | 'WISHLIST_BASED' 
  | 'NEW_ARRIVALS';

export type EventType = 
  | 'VIEW' 
  | 'CLICK' 
  | 'WISHLIST' 
  | 'CART_ADD' 
  | 'PURCHASE' 
  | 'SEARCH';

export interface ScoringWeights {
  contentScore: number;
  behaviorScore: number;
  fashionScore: number;
  popularityScore: number;
  recencyScore: number;
  diversityPenalty: number;
}

export interface ScoreBreakdown {
  contentScore: number;
  behaviorScore: number;
  fashionScore: number;
  popularityScore: number;
  recencyScore: number;
}

export interface ScoredProduct {
  productId: string;
  score: number;
  reasons: string[];
  confidence: number;
  breakdown: ScoreBreakdown;
}

export interface RecommendationContext {
  userId?: string;
  sourceProductId?: string;
  viewedProductIds?: string[];
  wishlistIds?: string[];
  cartIds?: string[];
  purchaseIds?: string[];
  contentScores: Record<string, number>;
  behaviorScores: Record<string, number>;
  fashionScores: Record<string, number>;
  sharedAttributes?: string[];
}

export interface ProductFeatures {
  styleTags: string[];
  occasionTags: string[];
  seasonTags: string[];
  colorFamily: string | null;
  materialType: string | null;
  fitType: string | null;
  priceTier: number;
  featureVector: number[];
}

export interface UserProfile {
  categoryAffinity: Record<string, number>;
  styleAffinity: Record<string, number>;
  colorAffinity: Record<string, number>;
  priceAffinity: Record<string, number>;
  divisionAffinity: Record<string, number>;
  preferenceVector: number[];
}

export interface OutfitPositionRule {
  category: string;
  complements: string[];
  position: 'upper' | 'lower' | 'outer' | 'center' | 'foot' | 'accessory';
}

export const WEIGHTS: Record<RecType, ScoringWeights> = {
  SIMILAR: {
    contentScore: 0.6,
    behaviorScore: 0.2,
    fashionScore: 0.1,
    popularityScore: 0.05,
    recencyScore: 0.05,
    diversityPenalty: 0.1
  },
  PERSONALIZED: {
    contentScore: 0.35,
    behaviorScore: 0.4,
    fashionScore: 0.15,
    popularityScore: 0.05,
    recencyScore: 0.05,
    diversityPenalty: 0.1
  },
  COMPLEMENTARY: {
    contentScore: 0.1,
    behaviorScore: 0.1,
    fashionScore: 0.7,
    popularityScore: 0.05,
    recencyScore: 0.05,
    diversityPenalty: 0.05
  },
  TRENDING: {
    contentScore: 0,
    behaviorScore: 0,
    fashionScore: 0,
    popularityScore: 0.7,
    recencyScore: 0.3,
    diversityPenalty: 0.05
  },
  WISHLIST_BASED: {
    contentScore: 0.5,
    behaviorScore: 0.3,
    fashionScore: 0.1,
    popularityScore: 0.05,
    recencyScore: 0.05,
    diversityPenalty: 0.1
  },
  NEW_ARRIVALS: {
    contentScore: 0.3,
    behaviorScore: 0.2,
    fashionScore: 0.1,
    popularityScore: 0.1,
    recencyScore: 0.3,
    diversityPenalty: 0.05
  }
};

export const EVENT_WEIGHTS: Record<EventType, number> = {
  VIEW: 1,
  CLICK: 2,
  WISHLIST: 3,
  CART_ADD: 4,
  PURCHASE: 5,
  SEARCH: 1.5
};

// Price tier boundaries (in currency units)
export const PRICE_TIERS = [
  { max: 50000, tier: 1 },      // Budget
  { max: 150000, tier: 2 },     // Mid
  { max: 400000, tier: 3 },     // Premium
  { max: Infinity, tier: 4 }    // Luxury
];

// Outfit position rules for fashion complementarity
export const OUTFIT_POSITION_RULES: Record<string, OutfitPositionRule> = {
  'dresses': { category: 'dresses', complements: ['outerwear', 'shoes', 'bags', 'jewelry'], position: 'center' },
  'tops': { category: 'tops', complements: ['trousers', 'skirts', 'jackets', 'shoes'], position: 'upper' },
  'trousers': { category: 'trousers', complements: ['tops', 'shoes', 'belts', 'jackets'], position: 'lower' },
  'skirts': { category: 'skirts', complements: ['tops', 'shoes', 'tights', 'bags'], position: 'lower' },
  'jackets': { category: 'jackets', complements: ['dresses', 'tops', 'trousers', 'skirts'], position: 'outer' },
  'outerwear': { category: 'outerwear', complements: ['dresses', 'tops', 'trousers', 'skirts'], position: 'outer' },
  'shoes': { category: 'shoes', complements: ['dresses', 'trousers', 'skirts'], position: 'foot' },
  'bags': { category: 'bags', complements: ['dresses', 'tops', 'trousers', 'skirts'], position: 'accessory' },
  'accessories': { category: 'accessories', complements: ['dresses', 'tops', 'trousers', 'skirts', 'jackets'], position: 'accessory' }
};
