// ========================================
// EVALUATION PIPELINE
// Comprehensive offline evaluation for academic validation
// Implements: train/test split, metrics calculation, baseline comparisons
// ========================================

import { PrismaClient } from '@prisma/client';
import { hybridEngine } from './hybrid-engine';
import { behaviorEngine } from './behavior-engine';
import {
  precisionAtK,
  recallAtK,
  ndcg,
  calculateOfflineMetrics,
  OfflineMetrics
} from './evaluation-metrics';

const prisma = new PrismaClient();

// ========================================
// CONFIGURATION
// ========================================

export interface EvaluationConfig {
  k: number[];                    // K values for @K metrics [5, 10]
  minTrainInteractions: number; // Min interactions for training
  minTestRelevant: number;      // Min relevant items in test set
  relevanceEvents: string[];    // Events that count as "relevant"
  trainSplitRatio: number;      // % of data for training (0.8)
  useTimeSplit: boolean;        // Use chronological split vs random
}

const DEFAULT_CONFIG: EvaluationConfig = {
  k: [5, 10],
  minTrainInteractions: 5,
  minTestRelevant: 1,
  relevanceEvents: ['PURCHASE', 'WISHLIST', 'CART_ADD'],
  trainSplitRatio: 0.8,
  useTimeSplit: true
};

// ========================================
// EVALUATION RESULTS STRUCTURE
// ========================================

export interface UserEvaluationResult {
  userId: string;
  trainCount: number;
  testRelevantCount: number;
  recommendations: string[];
  hits: number;
  precisionAtK: Record<number, number>;
  recallAtK: Record<number, number>;
  hitRateAtK: Record<number, boolean>;
  ndcgAtK: Record<number, number>;
}

export interface AggregateMetrics {
  byK: Record<number, {
    precision: { mean: number; std: number; median: number };
    recall: { mean: number; std: number; median: number };
    hitRate: { mean: number; count: number };
    ndcg: { mean: number; std: number; median: number };
  }>;
  coverage: number;
  catalogSize: number;
  recommendationsPerProduct: number;
  giniCoefficient: number; // Popularity bias measure
}

export interface BaselineComparison {
  random: AggregateMetrics;
  popularity: AggregateMetrics;
  hybrid: AggregateMetrics;
  improvements: {
    vsRandom: Record<number, { precision: string; recall: string }>;
    vsPopularity: Record<number, { precision: string; recall: string }>;
  };
}

export interface EvaluationReport {
  summary: string;
  dataset: {
    totalUsers: number;
    evaluatedUsers: number;
    skippedUsers: number;
    totalInteractions: number;
    timeRange: { start: Date; end: Date };
  };
  config: EvaluationConfig;
  metrics: AggregateMetrics;
  baselines: BaselineComparison;
  limitations: string[];
  recommendations: string[];
  rawResults?: UserEvaluationResult[];
}

// ========================================
// MAIN EVALUATION PIPELINE
// ========================================

/**
 * Run full offline evaluation pipeline
 * 
 * Process:
 * 1. Identify eligible users (min interactions)
 * 2. Split data into train/test
 * 3. Generate recommendations for each user
 * 4. Calculate metrics @K
 * 5. Compare against baselines
 * 6. Generate report
 */
export async function runOfflineEvaluation(
  config: Partial<EvaluationConfig> = {}
): Promise<EvaluationReport> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('Starting Offline Evaluation Pipeline...');
  console.log('Configuration:', JSON.stringify(fullConfig, null, 2));

  // Step 1: Gather dataset statistics
  const datasetStats = await gatherDatasetStatistics(fullConfig);

  // Step 2: Find eligible users
  const eligibleUsers = await findEligibleUsers(fullConfig);
  console.log(`Found ${eligibleUsers.length} eligible users for evaluation`);

  if (eligibleUsers.length === 0) {
    return generateEmptyReport(datasetStats, fullConfig);
  }

  // Step 3: Evaluate each user
  const userResults: UserEvaluationResult[] = [];
  const allRecommendations = new Set<string>();
  const recommendationCounts: Record<string, number> = {};

  for (const userId of eligibleUsers) {
    const result = await evaluateUser(userId, fullConfig);
    if (result) {
      userResults.push(result);
      result.recommendations.forEach(id => {
        allRecommendations.add(id);
        recommendationCounts[id] = (recommendationCounts[id] || 0) + 1;
      });
    }
  }

  // Step 4: Calculate aggregate metrics
  const metrics = calculateAggregateMetrics(userResults, fullConfig, allRecommendations.size);

  // Step 5: Calculate baselines
  const baselines = await calculateBaselines(eligibleUsers, fullConfig, allRecommendations.size);

  // Step 6: Calculate improvements
  const improvements = calculateImprovements(metrics, baselines);

  // Step 7: Generate report
  const report = generateEvaluationReport(
    datasetStats,
    eligibleUsers.length,
    userResults,
    fullConfig,
    metrics,
    { ...baselines, hybrid: metrics, improvements }
  );

  return report;
}

// ========================================
// DATASET STATISTICS
// ========================================

async function gatherDatasetStatistics(config: EvaluationConfig): Promise<{
  totalUsers: number;
  totalInteractions: number;
  totalProducts: number;
  timeRange: { start: Date | null; end: Date | null };
  interactionCounts: Record<string, number>;
}> {
  // Total users with any events
  const totalUsers = await prisma.userEvent.groupBy({
    by: ['userId'],
    _count: { id: true }
  });

  // Total interactions
  const totalInteractions = await prisma.userEvent.count();

  // Total products
  const totalProducts = await prisma.product.count({
    where: { status: 'ACTIVE' }
  });

  // Time range
  const [earliest, latest] = await Promise.all([
    prisma.userEvent.findFirst({ orderBy: { createdAt: 'asc' } }),
    prisma.userEvent.findFirst({ orderBy: { createdAt: 'desc' } })
  ]);

  // Event type breakdown
  const byEventType = await prisma.userEvent.groupBy({
    by: ['eventType'],
    _count: { id: true }
  });

  const interactionCounts: Record<string, number> = {};
  byEventType.forEach(e => {
    interactionCounts[e.eventType] = e._count.id;
  });

  return {
    totalUsers: totalUsers.length,
    totalInteractions,
    totalProducts,
    timeRange: {
      start: earliest?.createdAt || null,
      end: latest?.createdAt || null
    },
    interactionCounts
  };
}

// ========================================
// USER ELIGIBILITY
// ========================================

async function findEligibleUsers(config: EvaluationConfig): Promise<string[]> {
  // Users with minimum interactions
  const usersWithMinInteractions = await prisma.userEvent.groupBy({
    by: ['userId'],
    where: {
      eventType: { in: config.relevanceEvents }
    },
    having: {
      userId: {
        _count: {
          gte: config.minTrainInteractions + config.minTestRelevant
        }
      }
    }
  });

  return usersWithMinInteractions.map(u => u.userId);
}

// ========================================
// PER-USER EVALUATION
// ========================================

async function evaluateUser(
  userId: string,
  config: EvaluationConfig
): Promise<UserEvaluationResult | null> {
  // Get all relevant interactions
  const events = await prisma.userEvent.findMany({
    where: {
      userId,
      eventType: { in: config.relevanceEvents },
      productId: { not: null }
    },
    orderBy: config.useTimeSplit
      ? { createdAt: 'asc' }
      : { createdAt: 'desc' }, // Random-ish if not time split
    include: { product: true }
  });

  if (events.length < config.minTrainInteractions + config.minTestRelevant) {
    return null;
  }

  // Split into train/test
  const splitIndex = Math.floor(events.length * config.trainSplitRatio);
  const trainEvents = events.slice(0, splitIndex);
  const testEvents = events.slice(splitIndex);

  const trainProductIds = new Set(trainEvents.map(e => e.productId!));
  const testProductIds = new Set(testEvents.map(e => e.productId!));

  // Remove train items from test (can't recommend what user already has)
  const relevantTestIds = [...testProductIds].filter(id => !trainProductIds.has(id));

  if (relevantTestIds.length === 0) {
    return null;
  }

  // Generate recommendations (max K needed)
  const maxK = Math.max(...config.k);
  const recommendations = await generateRecommendationsForUser(
    userId,
    trainProductIds,
    maxK * 2 // Generate extra for diversity
  );

  // Calculate metrics for each K
  const precisionAtK: Record<number, number> = {};
  const recallAtK: Record<number, number> = {};
  const hitRateAtK: Record<number, boolean> = {};
  const ndcgAtK: Record<number, number> = {};

  const relevantSet = new Set(relevantTestIds);

  for (const k of config.k) {
    const recsAtK = recommendations.slice(0, k);
    const hits = recsAtK.filter(id => relevantSet.has(id));

    precisionAtK[k] = hits.length / k;
    recallAtK[k] = hits.length / relevantTestIds.length;
    hitRateAtK[k] = hits.length > 0;

    // NDCG calculation (binary relevance)
    const relevanceScores = new Map<string, number>();
    relevantTestIds.forEach(id => relevanceScores.set(id, 1));
    recsAtK.forEach(id => {
      if (!relevanceScores.has(id)) relevanceScores.set(id, 0);
    });

    ndcgAtK[k] = ndcg(recsAtK, relevanceScores, k);
  }

  return {
    userId,
    trainCount: trainEvents.length,
    testRelevantCount: relevantTestIds.length,
    recommendations,
    hits: recommendations.filter(id => relevantSet.has(id)).length,
    precisionAtK,
    recallAtK,
    hitRateAtK,
    ndcgAtK
  };
}

/**
 * Generate recommendations for a user
 * Uses hybrid engine with training data as seed
 */
async function generateRecommendationsForUser(
  userId: string,
  trainProductIds: Set<string>,
  limit: number
): Promise<string[]> {
  try {
    // Use personalized feed with training history as context
    const recs = await hybridEngine.getPersonalizedFeedEnhanced(userId, {
      limit,
      includeExplanations: false,
      trackAnalytics: false,
      sessionData: { viewedProductIds: Array.from(trainProductIds) }
    });

    return recs.map(r => r.id);
  } catch (error) {
    // Fallback to trending if personalized fails
    const trending = await hybridEngine.getTrendingProducts(limit);
    return trending.map(r => r.id);
  }
}

// ========================================
// AGGREGATE METRICS CALCULATION
// ========================================

function calculateAggregateMetrics(
  results: UserEvaluationResult[],
  config: EvaluationConfig,
  uniqueRecommendations: number
): AggregateMetrics {
  const metrics: AggregateMetrics = {
    byK: {},
    coverage: 0,
    catalogSize: 0,
    recommendationsPerProduct: 0,
    giniCoefficient: 0
  };

  // Calculate per-K statistics
  for (const k of config.k) {
    const precisions = results.map(r => r.precisionAtK[k]);
    const recalls = results.map(r => r.recallAtK[k]);
    const hitRates = results.map(r => r.hitRateAtK[k] ? 1 : 0);
    const ndcgs = results.map(r => r.ndcgAtK[k]);

    metrics.byK[k] = {
      precision: {
        mean: mean(precisions),
        std: stdDev(precisions),
        median: median(precisions)
      },
      recall: {
        mean: mean(recalls),
        std: stdDev(recalls),
        median: median(recalls)
      },
      hitRate: {
        mean: mean(hitRates),
        count: hitRates.filter(h => h === 1).length
      },
      ndcg: {
        mean: mean(ndcgs),
        std: stdDev(ndcgs),
        median: median(ndcgs)
      }
    };
  }

  return metrics;
}

// ========================================
// BASELINE CALCULATIONS
// ========================================

async function calculateBaselines(
  userIds: string[],
  config: EvaluationConfig,
  uniqueRecommendations: number
): Promise<{ random: AggregateMetrics; popularity: AggregateMetrics }> {
  const maxK = Math.max(...config.k);

  // Random baseline
  const randomResults: UserEvaluationResult[] = [];
  const allProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true }
  });
  const productIds = allProducts.map(p => p.id);

  // Popularity baseline (most interacted products)
  const popularProducts = await prisma.userEvent.groupBy({
    by: ['productId'],
    where: { productId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: maxK * 2
  });
  const popularIds = popularProducts.map(p => p.productId!);

  for (const userId of userIds.slice(0, 50)) { // Sample for speed
    // Get test set for this user
    const events = await prisma.userEvent.findMany({
      where: {
        userId,
        eventType: { in: config.relevanceEvents },
        productId: { not: null }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (events.length < config.minTrainInteractions + config.minTestRelevant) continue;

    const splitIndex = Math.floor(events.length * config.trainSplitRatio);
    const trainIds = new Set(events.slice(0, splitIndex).map(e => e.productId!));
    const testIds = events.slice(splitIndex).map(e => e.productId!)
      .filter(id => !trainIds.has(id));

    if (testIds.length === 0) continue;

    // Random recommendations
    const randomRecs = shuffle([...productIds]).slice(0, maxK);
    const randomResult = calculateMetricsForRecommendations(
      randomRecs, testIds, config
    );
    randomResults.push(randomResult);

    // Popularity recommendations
    const popRecs = popularIds.slice(0, maxK);
    // (We'll calculate popularity metrics inline for efficiency)
  }

  // Calculate popularity metrics separately
  const popularityResults: UserEvaluationResult[] = [];
  for (const userId of userIds.slice(0, 50)) {
    const events = await prisma.userEvent.findMany({
      where: {
        userId,
        eventType: { in: config.relevanceEvents },
        productId: { not: null }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (events.length < config.minTrainInteractions + config.minTestRelevant) continue;

    const splitIndex = Math.floor(events.length * config.trainSplitRatio);
    const trainIds = new Set(events.slice(0, splitIndex).map(e => e.productId!));
    const testIds = events.slice(splitIndex).map(e => e.productId!)
      .filter(id => !trainIds.has(id));

    if (testIds.length === 0) continue;

    const popRecs = popularIds.filter(id => !trainIds.has(id)).slice(0, maxK);
    const popResult = calculateMetricsForRecommendations(popRecs, testIds, config);
    popularityResults.push(popResult);
  }

  return {
    random: calculateAggregateMetrics(randomResults, config, uniqueRecommendations),
    popularity: calculateAggregateMetrics(popularityResults, config, uniqueRecommendations)
  };
}

function calculateMetricsForRecommendations(
  recommendations: string[],
  relevantItems: string[],
  config: EvaluationConfig
): UserEvaluationResult {
  const precisionAtK: Record<number, number> = {};
  const recallAtK: Record<number, number> = {};
  const hitRateAtK: Record<number, boolean> = {};
  const ndcgAtK: Record<number, number> = {};

  const relevantSet = new Set(relevantItems);

  for (const k of config.k) {
    const recsAtK = recommendations.slice(0, k);
    const hits = recsAtK.filter(id => relevantSet.has(id));

    precisionAtK[k] = hits.length / k;
    recallAtK[k] = hits.length / relevantItems.length;
    hitRateAtK[k] = hits.length > 0;

    const relevanceScores = new Map<string, number>();
    relevantItems.forEach(id => relevanceScores.set(id, 1));
    recsAtK.forEach(id => {
      if (!relevanceScores.has(id)) relevanceScores.set(id, 0);
    });

    ndcgAtK[k] = ndcg(recsAtK, relevanceScores, k);
  }

  return {
    userId: 'baseline',
    trainCount: 0,
    testRelevantCount: relevantItems.length,
    recommendations,
    hits: recommendations.filter(id => relevantSet.has(id)).length,
    precisionAtK,
    recallAtK,
    hitRateAtK,
    ndcgAtK
  };
}

// ========================================
// IMPROVEMENT CALCULATIONS
// ========================================

function calculateImprovements(
  hybrid: AggregateMetrics,
  baselines: { random: AggregateMetrics; popularity: AggregateMetrics }
): { vsRandom: Record<number, { precision: string; recall: string }>; vsPopularity: Record<number, { precision: string; recall: string }> } {
  const improvements: {
    vsRandom: Record<number, { precision: string; recall: string }>;
    vsPopularity: Record<number, { precision: string; recall: string }>;
  } = {
    vsRandom: {},
    vsPopularity: {}
  };

  const kValues = Object.keys(hybrid.byK).map(Number);

  for (const k of kValues) {
    // vs Random
    const hybridPrec = hybrid.byK[k].precision.mean;
    const randomPrec = baselines.random.byK[k]?.precision.mean || 0;
    const precImprovement = randomPrec > 0
      ? ((hybridPrec - randomPrec) / randomPrec * 100).toFixed(1)
      : 'N/A';

    const hybridRec = hybrid.byK[k].recall.mean;
    const randomRec = baselines.random.byK[k]?.recall.mean || 0;
    const recImprovement = randomRec > 0
      ? ((hybridRec - randomRec) / randomRec * 100).toFixed(1)
      : 'N/A';

    improvements.vsRandom[k] = {
      precision: precImprovement,
      recall: recImprovement
    };

    // vs Popularity
    const popPrec = baselines.popularity.byK[k]?.precision.mean || 0;
    const precImprovementPop = popPrec > 0
      ? ((hybridPrec - popPrec) / popPrec * 100).toFixed(1)
      : 'N/A';

    const popRec = baselines.popularity.byK[k]?.recall.mean || 0;
    const recImprovementPop = popRec > 0
      ? ((hybridRec - popRec) / popRec * 100).toFixed(1)
      : 'N/A';

    improvements.vsPopularity[k] = {
      precision: precImprovementPop,
      recall: recImprovementPop
    };
  }

  return improvements;
}

// ========================================
// REPORT GENERATION
// ========================================

function generateEvaluationReport(
  datasetStats: any,
  evaluatedUsers: number,
  results: UserEvaluationResult[],
  config: EvaluationConfig,
  metrics: AggregateMetrics,
  baselines: BaselineComparison
): EvaluationReport {
  const limitations: string[] = [];
  const recommendations: string[] = [];

  // Analyze limitations
  if (datasetStats.totalUsers < 50) {
    limitations.push('Small user base limits statistical significance of results');
  }
  if (datasetStats.totalInteractions < 1000) {
    limitations.push('Sparse interaction data may not capture true user preferences');
  }
  const relevantInteractions = config.relevanceEvents.reduce(
    (sum, event) => sum + (datasetStats.interactionCounts[event] || 0), 0
  );
  if (relevantInteractions < 100) {
    limitations.push('Limited strong-signal interactions (purchases/wishlists) for evaluation');
  }

  const daysOfData = datasetStats.timeRange.start && datasetStats.timeRange.end
    ? Math.floor((datasetStats.timeRange.end.getTime() - datasetStats.timeRange.start.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  if (daysOfData < 30) {
    limitations.push('Limited time window may not capture seasonal patterns');
  }

  // Analyze metrics and make recommendations
  const k10Precision = metrics.byK[10]?.precision.mean || 0;
  if (k10Precision < 0.05) {
    recommendations.push('Precision below 5% - consider increasing content-based weight');
  } else if (k10Precision > 0.20) {
    recommendations.push('Strong precision - consider exploring diversity metrics');
  }

  const k10Recall = metrics.byK[10]?.recall.mean || 0;
  if (k10Recall < 0.10) {
    recommendations.push('Recall below 10% - consider increasing recommendation set size');
  }

  const hitRate = metrics.byK[10]?.hitRate.mean || 0;
  if (hitRate < 0.30) {
    recommendations.push('Hit rate below 30% - review cold-start strategy');
  }

  // Generate summary
  const summary = `
OFFLINE EVALUATION RESULTS
==========================

Dataset: ${evaluatedUsers} users evaluated
         ${datasetStats.totalInteractions} total interactions
         ${relevantInteractions} relevant (purchase/wishlist/cart) interactions
         ${daysOfData} days of data

METRICS @K=10:
- Precision:  ${(metrics.byK[10]?.precision.mean * 100).toFixed(2)}% ± ${(metrics.byK[10]?.precision.std * 100).toFixed(2)}%
- Recall:     ${(metrics.byK[10]?.recall.mean * 100).toFixed(2)}% ± ${(metrics.byK[10]?.recall.std * 100).toFixed(2)}%
- Hit Rate:   ${(metrics.byK[10]?.hitRate.mean * 100).toFixed(2)}% (${metrics.byK[10]?.hitRate.count}/${evaluatedUsers} users)
- NDCG:       ${metrics.byK[10]?.ndcg.mean.toFixed(3)} ± ${metrics.byK[10]?.ndcg.std.toFixed(3)}

BASELINE COMPARISON (vs Random):
- Precision improvement: ${baselines.improvements.vsRandom[10]?.precision || 'N/A'}%
- Recall improvement:    ${baselines.improvements.vsRandom[10]?.recall || 'N/A'}%

BASELINE COMPARISON (vs Popularity):
- Precision improvement: ${baselines.improvements.vsPopularity[10]?.precision || 'N/A'}%
- Recall improvement:    ${baselines.improvements.vsPopularity[10]?.recall || 'N/A'}%

LIMITATIONS:
${limitations.map(l => '- ' + l).join('\n')}

RECOMMENDATIONS:
${recommendations.map(r => '- ' + r).join('\n')}
`.trim();

  return {
    summary,
    dataset: {
      totalUsers: datasetStats.totalUsers,
      evaluatedUsers,
      skippedUsers: datasetStats.totalUsers - evaluatedUsers,
      totalInteractions: datasetStats.totalInteractions,
      timeRange: {
        start: datasetStats.timeRange.start || new Date(),
        end: datasetStats.timeRange.end || new Date()
      }
    },
    config,
    metrics,
    baselines,
    limitations,
    recommendations,
    rawResults: results
  };
}

function generateEmptyReport(
  datasetStats: any,
  config: EvaluationConfig
): EvaluationReport {
  return {
    summary: `
OFFLINE EVALUATION NOT POSSIBLE
==============================

Insufficient data for evaluation.

Requirements:
- Users with ${config.minTrainInteractions} train + ${config.minTestRelevant} test interactions
- Current data: ${datasetStats.totalUsers} users, ${datasetStats.totalInteractions} interactions

Recommendations:
1. Collect more user interaction data
2. Lower minTrainInteractions threshold
3. Run evaluation when sufficient data is available
`.trim(),
    dataset: {
      totalUsers: datasetStats.totalUsers,
      evaluatedUsers: 0,
      skippedUsers: datasetStats.totalUsers,
      totalInteractions: datasetStats.totalInteractions,
      timeRange: {
        start: datasetStats.timeRange.start || new Date(),
        end: datasetStats.timeRange.end || new Date()
      }
    },
    config,
    metrics: {
      byK: {},
      coverage: 0,
      catalogSize: 0,
      recommendationsPerProduct: 0,
      giniCoefficient: 0
    },
    baselines: {
      random: { byK: {}, coverage: 0, catalogSize: 0, recommendationsPerProduct: 0, giniCoefficient: 0 },
      popularity: { byK: {}, coverage: 0, catalogSize: 0, recommendationsPerProduct: 0, giniCoefficient: 0 },
      hybrid: { byK: {}, coverage: 0, catalogSize: 0, recommendationsPerProduct: 0, giniCoefficient: 0 },
      improvements: { vsRandom: {}, vsPopularity: {} }
    },
    limitations: [
      'Insufficient user interaction data for train/test split',
      'Need users with both training history and test interactions'
    ],
    recommendations: [
      'Collect at least 10 interactions per user for meaningful evaluation',
      'Consider synthetic data generation for development testing'
    ]
  };
}

// ========================================
// STATISTICAL HELPERS
// ========================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ========================================
// EXPORT FOR CLI SCRIPT
// ========================================

export async function runEvaluationAndPrint(config?: Partial<EvaluationConfig>) {
  const report = await runOfflineEvaluation(config);

  console.log('\n' + '='.repeat(70));
  console.log(report.summary);
  console.log('='.repeat(70) + '\n');

  // Print detailed metrics table
  console.log('\nDETAILED METRICS BY K');
  console.log('-'.repeat(70));
  console.log('K      Precision      Recall         Hit Rate      NDCG');
  console.log('-'.repeat(70));

  for (const [k, m] of Object.entries(report.metrics.byK)) {
    const ki = parseInt(k);
    console.log(
      `${ki.toString().padEnd(4)}   ` +
      `${(m.precision.mean * 100).toFixed(2)}%±${(m.precision.std * 100).toFixed(2)}%   ` +
      `${(m.recall.mean * 100).toFixed(2)}%±${(m.recall.std * 100).toFixed(2)}%   ` +
      `${(m.hitRate.mean * 100).toFixed(2)}%        ` +
      `${m.ndcg.mean.toFixed(3)}±${m.ndcg.std.toFixed(3)}`
    );
  }

  console.log('-'.repeat(70));

  // Print baseline comparison
  console.log('\nBASELINE COMPARISON');
  console.log('-'.repeat(70));
  console.log('Metric              vs Random    vs Popularity');
  console.log('-'.repeat(70));

  for (const k of Object.keys(report.baselines.improvements.vsRandom).map(Number)) {
    const vsRand = report.baselines.improvements.vsRandom[k];
    const vsPop = report.baselines.improvements.vsPopularity[k];
    console.log(
      `Precision@${k.toString().padEnd(2)}        ${vsRand.precision.padStart(8)}%    ${vsPop.precision.padStart(8)}%`
    );
    console.log(
      `Recall@${k.toString().padEnd(5)}           ${vsRand.recall.padStart(8)}%    ${vsPop.recall.padStart(8)}%`
    );
  }

  console.log('-'.repeat(70));

  // Print limitations and recommendations
  console.log('\nLIMITATIONS:');
  report.limitations.forEach(l => console.log('  • ' + l));

  console.log('\nRECOMMENDATIONS:');
  report.recommendations.forEach(r => console.log('  • ' + r));

  console.log('\n' + '='.repeat(70) + '\n');

  return report;
}

// Run if called directly
if (require.main === module) {
  runEvaluationAndPrint()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Evaluation failed:', err);
      process.exit(1);
    });
}
