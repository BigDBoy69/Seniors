// ========================================
// RECOMMENDATION SYSTEM - PUBLIC API
// Academic-grade hybrid recommender for fashion e-commerce
// ========================================

// Core Engine
export { HybridRecommendationEngine, hybridEngine } from './hybrid-engine';
export { behaviorEngine } from './behavior-engine';

// Modules
export { generateExplanation, formatExplanationForUI, EXPLANATION_TEMPLATES } from './explanation-generator';
export type { ExplanationContext, GeneratedExplanation } from './explanation-generator';

export {
  getColdStartRecommendations,
  determineColdStartStrategy,
  scoreNewProduct,
  type ColdStartStrategy
} from './cold-start-handler';

export {
  precisionAtK,
  recallAtK,
  f1Score,
  ndcg,
  calculateOfflineMetrics,
  calculateOnlineMetrics,
  compareABVariants,
  logRecommendationImpression,
  logRecommendationEvent,
  generateEvaluationReport,
  type OfflineMetrics,
  type OnlineMetrics,
  type ABTestResult
} from './evaluation-metrics';

// Utilities
export { cosineSimilarity, timeDecay, normalizeVector } from './utils';
export { extractProductFeatures, updateAllProductFeatures, updatePopularityScores } from './feature-extractor';
export { isFashionCompatible, calculateColorHarmony, hexToHSL } from './color-theory';

// Types and Constants
export {
  WEIGHTS,
  EVENT_WEIGHTS,
  PRICE_TIERS,
  OUTFIT_POSITION_RULES,
  type RecType,
  type EventType,
  type ScoringWeights,
  type ScoreBreakdown,
  type ScoredProduct,
  type RecommendationContext,
  type ProductFeatures,
  type UserProfile,
  type OutfitPositionRule
} from './types';

/**
 * Recommendation System Overview
 *
 * This is a hybrid recommendation system implementing four paradigms:
 *
 * 1. CONTENT-BASED FILTERING
 *    - 20-dimensional product feature vectors
 *    - Cosine similarity for matching
 *    - Handles cold-start for new products
 *
 * 2. COLLABORATIVE FILTERING (Behavior-Based)
 *    - User-item matrix with time decay
 *    - Item-to-item co-occurrence
 *    - User preference profiles with affinities
 *
 * 3. KNOWLEDGE-BASED (Fashion-Aware)
 *    - Outfit position rules
 *    - Color theory for harmony
 *    - Category complementarity
 *
 * 4. HYBRID FUSION
 *    - Weighted linear combination
 *    - Different weights per recommendation type
 *    - Explainable scoring breakdown
 *
 * Academic Features:
 * - Explicit scoring formulas with documented weights
 * - Cold-start handling with multiple fallback strategies
 * - Explainability (XAI) for every recommendation
 * - Comprehensive evaluation metrics (Precision, Recall, NDCG)
 * - A/B testing framework
 */

// Version
export const RECOMMENDATION_SYSTEM_VERSION = '2.0.0';
export const RECOMMENDATION_SYSTEM_NAME = 'Akwaluzto Hybrid Recommender';
