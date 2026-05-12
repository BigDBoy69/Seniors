// ========================================
// EVALUATION METRICS MODULE
// Implements offline and online metrics for recommendation quality
// Used for academic validation and A/B testing
// ========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OfflineMetrics {
  precisionAtK: number;
  recallAtK: number;
  f1Score: number;
  ndcg: number;
  diversity: number;
  coverage: number;
}

export interface OnlineMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  wishlists: number;
  cartAdds: number;
  purchases: number;
  conversionRate: number;
  revenue: number;
  averagePosition: number;
}

/**
 * Calculate Precision@K
 * Fraction of recommended items that are relevant
 * 
 * Formula: |{relevant items} ∩ {recommended items}| / K
 */
export function precisionAtK(
  recommendations: string[],
  relevantItems: Set<string>,
  k: number
): number {
  const topK = recommendations.slice(0, k);
  const relevant = topK.filter(id => relevantItems.has(id));
  return relevant.length / k;
}

/**
 * Calculate Recall@K
 * Fraction of relevant items that were recommended
 * 
 * Formula: |{relevant items} ∩ {recommended items}| / |{relevant items}|
 */
export function recallAtK(
  recommendations: string[],
  relevantItems: Set<string>,
  k: number
): number {
  if (relevantItems.size === 0) return 0;

  const topK = new Set(recommendations.slice(0, k));
  const relevant = [...relevantItems].filter(id => topK.has(id));
  return relevant.length / relevantItems.size;
}

/**
 * Calculate F1 Score
 * Harmonic mean of precision and recall
 */
export function f1Score(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * Calculate DCG (Discounted Cumulative Gain)
 * Rewards highly relevant items appearing earlier in the list
 * 
 * Formula: Σ (2^rel(i) - 1) / log2(i + 2)
 */
export function dcg(
  recommendations: string[],
  relevanceScores: Map<string, number>
): number {
  let score = 0;

  for (let i = 0; i < recommendations.length; i++) {
    const rel = relevanceScores.get(recommendations[i]) || 0;
    // Using log2(i + 2) because positions are 0-indexed
    score += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
  }

  return score;
}

/**
 * Calculate Ideal DCG (perfect ranking)
 */
export function idealDcg(relevanceScores: Map<string, number>, k: number): number {
  const sortedRelevance = [...relevanceScores.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, k)
    .map(([, score]) => score);

  let score = 0;
  for (let i = 0; i < sortedRelevance.length; i++) {
    score += (Math.pow(2, sortedRelevance[i]) - 1) / Math.log2(i + 2);
  }

  return score;
}

/**
 * Calculate NDCG (Normalized DCG)
 * DCG normalized by ideal DCG
 * 
 * Formula: DCG / IDCG
 */
export function ndcg(
  recommendations: string[],
  relevanceScores: Map<string, number>,
  k: number
): number {
  const actualDcg = dcg(recommendations.slice(0, k), relevanceScores);
  const ideal = idealDcg(relevanceScores, k);

  if (ideal === 0) return 0;
  return actualDcg / ideal;
}

/**
 * Calculate Diversity
 * Average pairwise distance between recommendations
 * Higher diversity means less similar items
 */
export function diversity(
  recommendations: Array<{ id: string; featureVector: number[] }>
): number {
  if (recommendations.length < 2) return 0;

  let totalDistance = 0;
  let pairs = 0;

  for (let i = 0; i < recommendations.length; i++) {
    for (let j = i + 1; j < recommendations.length; j++) {
      const dist = euclideanDistance(
        recommendations[i].featureVector,
        recommendations[j].featureVector
      );
      totalDistance += dist;
      pairs++;
    }
  }

  return pairs > 0 ? totalDistance / pairs : 0;
}

/**
 * Calculate Coverage
 * Percentage of catalog that can be recommended
 */
export async function coverage(
  recommendationAlgorithm: () => Promise<string[]>,
  totalProducts: number,
  samples: number = 100
): Promise<number> {
  const recommendedItems = new Set<string>();

  for (let i = 0; i < samples; i++) {
    const recs = await recommendationAlgorithm();
    recs.forEach(id => recommendedItems.add(id));
  }

  return recommendedItems.size / totalProducts;
}

/**
 * Calculate all offline metrics in one call
 */
export function calculateOfflineMetrics(
  recommendations: string[],
  relevantItems: Set<string>,
  relevanceScores: Map<string, number>,
  recommendationFeatures: Array<{ id: string; featureVector: number[] }>,
  k: number = 10
): OfflineMetrics {
  const precision = precisionAtK(recommendations, relevantItems, k);
  const recall = recallAtK(recommendations, relevantItems, k);

  return {
    precisionAtK: precision,
    recallAtK: recall,
    f1Score: f1Score(precision, recall),
    ndcg: ndcg(recommendations, relevanceScores, k),
    diversity: diversity(recommendationFeatures),
    coverage: 0 // Calculated separately
  };
}

/**
 * Calculate online metrics from analytics data
 */
export async function calculateOnlineMetrics(
  recType: string,
  startDate: Date,
  endDate: Date
): Promise<OnlineMetrics> {
  // Get all analytics events for this recommendation type
  const events = await prisma.recAnalytics.groupBy({
    by: ['eventType'],
    where: {
      recType,
      timestamp: { gte: startDate, lte: endDate }
    },
    _count: { id: true }
  });

  const counts: Record<string, number> = {};
  events.forEach(e => {
    counts[e.eventType] = e._count.id;
  });

  const impressions = counts['IMPRESSION'] || 0;
  const clicks = counts['CLICK'] || 0;
  const wishlists = counts['WISHLIST'] || 0;
  const cartAdds = counts['CART_ADD'] || 0;
  const purchases = counts['PURCHASE'] || 0;

  // Get revenue data
  const purchaseEvents = await prisma.recAnalytics.findMany({
    where: {
      recType,
      eventType: 'PURCHASE',
      timestamp: { gte: startDate, lte: endDate }
    },
    select: { id: true }
  });

  // metadata field not in schema; revenue tracking requires schema migration
  const revenue = 0;

  // Get average position of clicks
  const clickPositions = await prisma.recAnalytics.aggregate({
    where: {
      recType,
      eventType: 'CLICK',
      timestamp: { gte: startDate, lte: endDate }
    },
    _avg: { position: true }
  });

  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    wishlists,
    cartAdds,
    purchases,
    conversionRate: clicks > 0 ? purchases / clicks : 0,
    revenue,
    averagePosition: clickPositions._avg.position || 0
  };
}

/**
 * A/B Test comparison between two recommendation strategies
 */
export interface ABTestResult {
  variantA: string;
  variantB: string;
  metrics: {
    ctr: { a: number; b: number; improvement: number };
    conversion: { a: number; b: number; improvement: number };
    revenue: { a: number; b: number; improvement: number };
  };
  statisticalSignificance: boolean;
  winner: 'A' | 'B' | 'TIE';
}

export async function compareABVariants(
  variantA: string,
  variantB: string,
  startDate: Date,
  endDate: Date
): Promise<ABTestResult> {
  const metricsA = await calculateOnlineMetrics(variantA, startDate, endDate);
  const metricsB = await calculateOnlineMetrics(variantB, startDate, endDate);

  const ctrImprovement = metricsB.ctr > 0
    ? (metricsB.ctr - metricsA.ctr) / metricsA.ctr
    : 0;

  const conversionImprovement = metricsB.conversionRate > 0
    ? (metricsB.conversionRate - metricsA.conversionRate) / metricsA.conversionRate
    : 0;

  const revenueImprovement = metricsA.revenue > 0
    ? (metricsB.revenue - metricsA.revenue) / metricsA.revenue
    : 0;

  // Simple significance check (would use proper statistical test in production)
  const sampleSizeA = metricsA.impressions;
  const sampleSizeB = metricsB.impressions;
  const minSampleSize = 1000;
  const isSignificant = sampleSizeA >= minSampleSize && sampleSizeB >= minSampleSize;

  // Determine winner
  let winner: 'A' | 'B' | 'TIE' = 'TIE';
  if (isSignificant) {
    const scoreA = metricsA.ctr * 0.4 + metricsA.conversionRate * 0.4 + (metricsA.revenue > 0 ? 0.2 : 0);
    const scoreB = metricsB.ctr * 0.4 + metricsB.conversionRate * 0.4 + (metricsB.revenue > 0 ? 0.2 : 0);

    if (scoreB > scoreA * 1.05) winner = 'B';
    else if (scoreA > scoreB * 1.05) winner = 'A';
  }

  return {
    variantA,
    variantB,
    metrics: {
      ctr: {
        a: metricsA.ctr,
        b: metricsB.ctr,
        improvement: ctrImprovement
      },
      conversion: {
        a: metricsA.conversionRate,
        b: metricsB.conversionRate,
        improvement: conversionImprovement
      },
      revenue: {
        a: metricsA.revenue,
        b: metricsB.revenue,
        improvement: revenueImprovement
      }
    },
    statisticalSignificance: isSignificant,
    winner
  };
}

/**
 * Log recommendation impression for analytics
 */
export async function logRecommendationImpression(
  userId: string | null,
  productId: string,
  recType: string,
  position: number,
  algorithmVersion: string = 'v1',
  sessionId?: string
): Promise<void> {
  await prisma.recAnalytics.create({
    data: {
      userId,
      productId,
      recType,
      position,
      eventType: 'IMPRESSION',
      algorithmVersion,
      sessionId
    }
  });
}

/**
 * Log recommendation click/conversion
 */
export async function logRecommendationEvent(
  userId: string | null,
  productId: string,
  recType: string,
  eventType: 'CLICK' | 'WISHLIST' | 'CART_ADD' | 'PURCHASE',
  position: number,
  metadata?: Record<string, any>,
  algorithmVersion: string = 'v1',
  sessionId?: string
): Promise<void> {
  await prisma.recAnalytics.create({
    data: {
      userId,
      productId,
      recType,
      position,
      eventType,
      algorithmVersion,
      sessionId
    }
  });
}

/**
 * Generate evaluation report
 */
export async function generateEvaluationReport(
  startDate: Date,
  endDate: Date
): Promise<{
  summary: string;
  byRecType: Record<string, OnlineMetrics>;
  topPerformingProducts: Array<{ productId: string; clicks: number; purchases: number }>;
  recommendations: string[];
}> {
  // Get metrics by recommendation type
  const recTypes = ['SIMILAR', 'PERSONALIZED', 'COMPLEMENTARY', 'TRENDING', 'WISHLIST'];
  const byRecType: Record<string, OnlineMetrics> = {};

  for (const recType of recTypes) {
    byRecType[recType] = await calculateOnlineMetrics(recType, startDate, endDate);
  }

  // Get top performing products
  const topProducts = await prisma.recAnalytics.groupBy({
    by: ['productId'],
    where: {
      timestamp: { gte: startDate, lte: endDate },
      eventType: { in: ['CLICK', 'PURCHASE'] }
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  // Calculate summary stats
  const totalImpressions = Object.values(byRecType).reduce((sum, m) => sum + m.impressions, 0);
  const totalClicks = Object.values(byRecType).reduce((sum, m) => sum + m.clicks, 0);
  const totalRevenue = Object.values(byRecType).reduce((sum, m) => sum + m.revenue, 0);

  const overallCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  const summary = `
Evaluation Report (${startDate.toDateString()} - ${endDate.toDateString()})
========================================================================

Overall CTR: ${(overallCtr * 100).toFixed(2)}%
Total Revenue: $${totalRevenue.toFixed(2)}

Performance by Recommendation Type:
${Object.entries(byRecType)
    .map(([type, metrics]) =>
      `  ${type}: CTR ${(metrics.ctr * 100).toFixed(2)}%, Conv ${(metrics.conversionRate * 100).toFixed(2)}%`
    )
    .join('\n')}

Recommendations:
${overallCtr < 0.02 ? '  - CTR below target (2%), consider adjusting weights' : '  - CTR meeting targets'}
${totalRevenue < 1000 ? '  - Revenue below target, focus on conversion optimization' : '  - Revenue on track'}
  `.trim();

  return {
    summary,
    byRecType,
    topPerformingProducts: topProducts.map(p => ({
      productId: p.productId,
      clicks: p._count.id,
      purchases: 0 // Would need separate query
    })),
    recommendations: overallCtr < 0.02
      ? ['Increase content-based weight', 'Improve cold-start handling', 'Add more diversity']
      : ['Maintain current strategy', 'Consider A/B testing new weights']
  };
}

// Helper functions
function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += Math.pow(vecA[i] - vecB[i], 2);
  }

  return Math.sqrt(sum);
}
