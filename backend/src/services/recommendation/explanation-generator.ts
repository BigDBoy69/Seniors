// ========================================
// EXPLANATION GENERATOR MODULE
// Generates human-readable justifications for recommendations
// Implements XAI (Explainable AI) principles for academic rigor
// ========================================

import { ScoreBreakdown, RecType, ScoringWeights, WEIGHTS } from './types';

export interface ExplanationContext {
  sourceProduct?: {
    id: string;
    name: string;
    category: string;
  };
  userProfile?: {
    topCategory?: string;
    topStyle?: string;
    topColor?: string;
    priceTier?: number;
  };
  sharedAttributes?: string[];
  similarUsersCount?: number;
  coOccurrenceCount?: number;
}

export interface GeneratedExplanation {
  primary: string;
  secondary?: string;
  detailed?: string;
  confidence: number;
}

/**
 * Generate explanation for a recommendation based on score breakdown
 * 
 * Algorithm:
 * 1. Identify dominant scoring component (highest weighted score)
 * 2. Generate primary explanation from dominant component
 * 3. Add secondary explanation if secondary score is significant (>0.3)
 * 4. Include confidence based on score magnitude
 */
export function generateExplanation(
  productName: string,
  scores: ScoreBreakdown,
  recType: RecType,
  context: ExplanationContext,
  weights: ScoringWeights = WEIGHTS[recType]
): GeneratedExplanation {
  // Calculate weighted scores
  const weightedScores = {
    contentScore: scores.contentScore * weights.contentScore,
    behaviorScore: scores.behaviorScore * weights.behaviorScore,
    fashionScore: scores.fashionScore * weights.fashionScore,
    popularityScore: scores.popularityScore * weights.popularityScore,
    recencyScore: scores.recencyScore * weights.recencyScore
  };

  // Find dominant factor
  const dominant = Object.entries(weightedScores)
    .sort(([, a], [, b]) => b - a)[0][0] as keyof typeof weightedScores;

  // Generate primary explanation
  const primary = generatePrimaryExplanation(
    dominant,
    scores,
    context,
    productName
  );

  // Generate secondary explanation (if significant)
  const secondaryScores = Object.entries(weightedScores)
    .filter(([key]) => key !== dominant)
    .sort(([, a], [, b]) => b - a);

  let secondary: string | undefined;
  if (secondaryScores.length > 0 && secondaryScores[0][1] > 0.15) {
    secondary = generateSecondaryExplanation(
      secondaryScores[0][0] as keyof typeof weightedScores,
      context
    );
  }

  // Calculate confidence
  const confidence = calculateConfidence(scores, weights);

  // Generate detailed explanation
  const detailed = generateDetailedExplanation(
    productName,
    scores,
    weightedScores,
    dominant,
    context
  );

  return {
    primary,
    secondary,
    detailed,
    confidence
  };
}

/**
 * Generate primary explanation based on dominant scoring factor
 */
function generatePrimaryExplanation(
  dominant: keyof ScoreBreakdown,
  scores: ScoreBreakdown,
  context: ExplanationContext,
  productName: string
): string {
  switch (dominant) {
    case 'contentScore':
      if (context.sourceProduct) {
        if (scores.contentScore > 0.85) {
          return `Very similar to ${context.sourceProduct.name}`;
        } else if (scores.contentScore > 0.7) {
          return `Similar style to ${context.sourceProduct.name}`;
        } else {
          return `You might like this style`;
        }
      }
      if (context.sharedAttributes && context.sharedAttributes.length > 0) {
        return `Matches your interest in ${context.sharedAttributes[0]}`;
      }
      return 'Similar to items you viewed';

    case 'behaviorScore':
      if (context.similarUsersCount && context.similarUsersCount > 10) {
        return 'Popular with customers like you';
      }
      if (context.coOccurrenceCount && context.coOccurrenceCount > 5) {
        return 'Frequently bought together';
      }
      if (context.coOccurrenceCount && context.coOccurrenceCount > 0) {
        return 'Often viewed together';
      }
      return 'Recommended based on your activity';

    case 'fashionScore':
      if (context.sourceProduct) {
        return `Perfect pairing with ${context.sourceProduct.name}`;
      }
      return 'Complements your style';

    case 'popularityScore':
      if (scores.popularityScore > 0.8) {
        return 'Trending right now';
      }
      return 'Popular choice';

    case 'recencyScore':
      if (scores.recencyScore > 0.8) {
        return 'Just arrived this week';
      }
      return 'New arrival';

    default:
      return 'Recommended for you';
  }
}

/**
 * Generate secondary explanation
 */
function generateSecondaryExplanation(
  factor: keyof ScoreBreakdown,
  context: ExplanationContext
): string | undefined {
  switch (factor) {
    case 'contentScore':
      if (context.userProfile?.topStyle) {
        return `Matches your ${context.userProfile.topStyle} preference`;
      }
      if (context.sharedAttributes && context.sharedAttributes.length > 1) {
        return `Also shares: ${context.sharedAttributes.slice(1).join(', ')}`;
      }
      break;

    case 'behaviorScore':
      if (context.similarUsersCount) {
        return `Liked by ${context.similarUsersCount} similar shoppers`;
      }
      break;

    case 'fashionScore':
      return 'Great for completing your look';

    case 'popularityScore':
      return 'Trending in this category';

    case 'recencyScore':
      return 'New this season';
  }
  return undefined;
}

/**
 * Calculate confidence score based on component scores
 */
function calculateConfidence(
  scores: ScoreBreakdown,
  weights: ScoringWeights
): number {
  // Weighted sum of all scores
  const totalScore =
    scores.contentScore * weights.contentScore +
    scores.behaviorScore * weights.behaviorScore +
    scores.fashionScore * weights.fashionScore +
    scores.popularityScore * weights.popularityScore +
    scores.recencyScore * weights.recencyScore;

  // Normalize to 0-100
  return Math.round(Math.min(totalScore * 100, 100));
}

/**
 * Generate detailed explanation for debugging/academic purposes
 */
function generateDetailedExplanation(
  productName: string,
  scores: ScoreBreakdown,
  weightedScores: Record<keyof ScoreBreakdown, number>,
  dominant: keyof ScoreBreakdown,
  context: ExplanationContext
): string {
  const parts: string[] = [
    `Recommendation for "${productName}":`,
    '',
    'Score Breakdown:'
  ];

  // Add all score components
  Object.entries(scores).forEach(([key, value]) => {
    const weighted = weightedScores[key as keyof ScoreBreakdown];
    parts.push(`  ${key}: ${(value * 100).toFixed(1)}% (weighted: ${(weighted * 100).toFixed(1)}%)`);
  });

  parts.push('');
  parts.push(`Dominant factor: ${dominant}`);

  if (context.sourceProduct) {
    parts.push(`Source product: ${context.sourceProduct.name} (${context.sourceProduct.category})`);
  }

  if (context.userProfile) {
    parts.push(`User preferences:`);
    if (context.userProfile.topCategory) {
      parts.push(`  - Category: ${context.userProfile.topCategory}`);
    }
    if (context.userProfile.topStyle) {
      parts.push(`  - Style: ${context.userProfile.topStyle}`);
    }
    if (context.userProfile.topColor) {
      parts.push(`  - Color: ${context.userProfile.topColor}`);
    }
  }

  if (context.sharedAttributes && context.sharedAttributes.length > 0) {
    parts.push(`Shared attributes: ${context.sharedAttributes.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Get explanation templates for different scenarios
 */
export const EXPLANATION_TEMPLATES = {
  // Content-based explanations
  similar: {
    high: 'Very similar to what you are viewing',
    medium: 'Similar style and category',
    low: 'You might like this'
  },

  // Collaborative filtering explanations
  collaborative: {
    high: 'Customers who viewed this also loved',
    medium: 'Popular with similar shoppers',
    low: 'Recommended based on shopping patterns'
  },

  // Category affinity
  category: (category: string) => `Based on your interest in ${category}`,

  // Style affinity
  style: (style: string) => `Matches your ${style} preference`,

  // Color affinity
  color: (color: string) => `In your preferred ${color} palette`,

  // Price affinity
  price: (tier: string) => `Within your preferred ${tier} price range`,

  // Fashion/outfit
  outfit: (piece: string) => `Perfect pairing with your ${piece}`,

  // Trending
  trending: {
    high: 'Trending right now',
    medium: 'Popular this week',
    low: 'Getting noticed'
  },

  // New arrivals
  newArrival: {
    high: 'Just arrived this week',
    medium: 'New this season',
    low: 'Fresh arrival'
  },

  // Cold start
  coldStart: {
    trending: 'Trending among our customers',
    featured: 'Featured by our editors',
    category: (cat: string) => `Popular in ${cat}`
  }
};

/**
 * Format explanation for UI display
 */
export function formatExplanationForUI(
  explanation: GeneratedExplanation,
  options: { detailed?: boolean } = {}
): {
  main: string;
  sub?: string;
  badge?: string;
  tooltip?: string;
} {
  const result: {
    main: string;
    sub?: string;
    badge?: string;
    tooltip?: string;
  } = {
    main: explanation.primary
  };

  if (explanation.secondary) {
    result.sub = explanation.secondary;
  }

  // Add confidence badge
  if (explanation.confidence > 80) {
    result.badge = 'Highly Recommended';
  } else if (explanation.confidence > 60) {
    result.badge = 'Recommended';
  }

  if (options.detailed && explanation.detailed) {
    result.tooltip = explanation.detailed;
  }

  return result;
}
