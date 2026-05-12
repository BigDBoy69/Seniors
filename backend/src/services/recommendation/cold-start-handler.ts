// ========================================
// COLD-START HANDLER MODULE
// Handles recommendation scenarios with limited data
// Implements fallback strategies for new users and new products
// ========================================

import { PrismaClient, Product } from '@prisma/client';
import { RecType, EVENT_WEIGHTS } from './types';
import { generateExplanation, ExplanationContext } from './explanation-generator';

const prisma = new PrismaClient();

export interface ColdStartStrategy {
  type: 'NEW_USER' | 'WARM_USER' | 'ACTIVE_USER';
  description: string;
  mixRatio: {
    trending: number;
    contentBased: number;
    popularByCategory: number;
    newArrivals: number;
    editorial: number;
  };
}

/**
 * Determine cold-start strategy based on user interaction history
 */
export async function determineColdStartStrategy(
  userId: string | null,
  sessionData?: { viewedProductIds: string[] }
): Promise<ColdStartStrategy> {
  // Complete cold start - no user ID
  if (!userId) {
    return {
      type: 'NEW_USER',
      description: 'Anonymous user - trending + editorial mix',
      mixRatio: {
        trending: 0.4,
        contentBased: 0.0,
        popularByCategory: 0.2,
        newArrivals: 0.3,
        editorial: 0.1
      }
    };
  }

  // Count user interactions in last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const interactionCount = await prisma.userEvent.count({
    where: {
      userId,
      createdAt: { gte: ninetyDaysAgo }
    }
  });

  // Check for viewed products in session
  const hasSessionViews = sessionData && sessionData.viewedProductIds.length > 0;

  // New user: 0 interactions
  if (interactionCount === 0 && !hasSessionViews) {
    return {
      type: 'NEW_USER',
      description: 'New user - explore mode with trending fallback',
      mixRatio: {
        trending: 0.5,
        contentBased: 0.0,
        popularByCategory: 0.3,
        newArrivals: 0.15,
        editorial: 0.05
      }
    };
  }

  // Warm user: 1-5 interactions OR session views only
  if (interactionCount < 5 || (interactionCount === 0 && hasSessionViews)) {
    return {
      type: 'WARM_USER',
      description: 'Warm user - content-based with exploration',
      mixRatio: {
        trending: 0.2,
        contentBased: 0.5,
        popularByCategory: 0.15,
        newArrivals: 0.1,
        editorial: 0.05
      }
    };
  }

  // Active user: 5+ interactions
  return {
    type: 'ACTIVE_USER',
    description: 'Active user - full hybrid recommendation',
    mixRatio: {
      trending: 0.05,
      contentBased: 0.4,
      popularByCategory: 0.1,
      newArrivals: 0.05,
      editorial: 0.0
    }
  };
}

/**
 * Get recommendations for cold-start scenarios
 */
export async function getColdStartRecommendations(
  userId: string | null,
  options: {
    limit?: number;
    sessionData?: { viewedProductIds: string[] };
    preferredDivision?: string;
  } = {}
): Promise<Array<{
  product: Product;
  score: number;
  reason: string;
  source: string;
}>> {
  const { limit = 12, sessionData, preferredDivision } = options;
  const strategy = await determineColdStartStrategy(userId, sessionData);

  const results: Array<{
    product: Product;
    score: number;
    reason: string;
    source: string;
  }> = [];

  // 1. Content-based from session views (Warm user strategy)
  if (strategy.mixRatio.contentBased > 0 && sessionData?.viewedProductIds.length) {
    const contentBased = await getContentBasedFromSession(
      sessionData.viewedProductIds,
      Math.ceil(limit * strategy.mixRatio.contentBased),
      preferredDivision
    );
    results.push(...contentBased.map(r => ({ ...r, source: 'content-based' })));
  }

  // 2. Trending products
  if (strategy.mixRatio.trending > 0) {
    const trending = await getTrendingProducts(
      Math.ceil(limit * strategy.mixRatio.trending),
      preferredDivision,
      results.map(r => r.product.id)
    );
    results.push(...trending.map(r => ({ ...r, source: 'trending' })));
  }

  // 3. Popular by category (diverse)
  if (strategy.mixRatio.popularByCategory > 0) {
    const popularByCategory = await getPopularByCategory(
      Math.ceil(limit * strategy.mixRatio.popularByCategory),
      results.map(r => r.product.id)
    );
    results.push(...popularByCategory.map(r => ({ ...r, source: 'category-popular' })));
  }

  // 4. New arrivals
  if (strategy.mixRatio.newArrivals > 0) {
    const newArrivals = await getNewArrivals(
      Math.ceil(limit * strategy.mixRatio.newArrivals),
      results.map(r => r.product.id)
    );
    results.push(...newArrivals.map(r => ({ ...r, source: 'new-arrival' })));
  }

  // 5. Editorial/Featured picks
  if (strategy.mixRatio.editorial > 0) {
    const editorial = await getEditorialPicks(
      Math.ceil(limit * strategy.mixRatio.editorial),
      results.map(r => r.product.id)
    );
    results.push(...editorial.map(r => ({ ...r, source: 'editorial' })));
  }

  // Sort by score and return top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get content-based recommendations from session views
 */
async function getContentBasedFromSession(
  viewedProductIds: string[],
  limit: number,
  preferredDivision?: string
): Promise<Array<{ product: Product; score: number; reason: string }>> {
  if (viewedProductIds.length === 0) return [];

  // Get features of viewed products
  const viewedProducts = await prisma.product.findMany({
    where: { id: { in: viewedProductIds } },
    include: { productFeature: true, category: true }
  });

  const validViewed = viewedProducts.filter(p => p.productFeature);
  if (validViewed.length === 0) return [];

  // Get candidate products
  const candidates = await prisma.product.findMany({
    where: {
      id: { notIn: viewedProductIds },
      status: 'ACTIVE',
      productFeature: { isNot: null },
      ...(preferredDivision && { divisionId: preferredDivision })
    },
    include: { productFeature: true, category: true }
  });

  // Score based on similarity to any viewed product
  const scored = candidates.map(candidate => {
    let maxSimilarity = 0;
    let bestMatch: typeof viewedProducts[0] | null = null;

    for (const viewed of validViewed) {
      const viewedVector = JSON.parse(viewed.productFeature!.featureVector);
      const candidateVector = JSON.parse(candidate.productFeature!.featureVector);

      // Simple dot product similarity
      const similarity = cosineSimilarity(viewedVector, candidateVector);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatch = viewed;
      }
    }

    return {
      product: candidate,
      score: maxSimilarity * 0.8 + (candidate.productFeature!.trendingScore || 0) * 0.2,
      reason: maxSimilarity > 0.7
        ? `Similar to ${bestMatch!.name}`
        : 'Based on what you viewed'
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get trending products
 */
async function getTrendingProducts(
  limit: number,
  preferredDivision?: string,
  excludeIds: string[] = []
): Promise<Array<{ product: Product; score: number; reason: string }>> {
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: excludeIds },
      productFeature: { isNot: null },
      ...(preferredDivision && { divisionId: preferredDivision })
    },
    include: { productFeature: true },
    orderBy: { productFeature: { trendingScore: 'desc' } },
    take: limit * 2
  });

  return products
    .filter(p => p.productFeature!.trendingScore > 0)
    .slice(0, limit)
    .map(p => ({
      product: p,
      score: p.productFeature!.trendingScore,
      reason: p.productFeature!.trendingScore > 0.7
        ? 'Trending right now'
        : 'Popular this week'
    }));
}

/**
 * Get popular products by category (diverse selection)
 */
async function getPopularByCategory(
  limit: number,
  excludeIds: string[] = []
): Promise<Array<{ product: Product; score: number; reason: string }>> {
  // Get top product from each major category
  const categories = ['dresses', 'tops', 'trousers', 'outerwear', 'shoes', 'bags'];
  const results: Array<{ product: Product; score: number; reason: string }> = [];

  for (const categorySlug of categories) {
    const product = await prisma.product.findFirst({
      where: {
        status: 'ACTIVE',
        id: { notIn: excludeIds.concat(results.map(r => r.product.id)) },
        productFeature: { isNot: null },
        category: { slug: categorySlug }
      },
      include: { productFeature: true, category: true },
      orderBy: { productFeature: { trendingScore: 'desc' } }
    });

    if (product) {
      results.push({
        product,
        score: (product.productFeature!.trendingScore || 0) * 0.8,
        reason: `Popular in ${product.category?.name || categorySlug}`
      });
    }

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Get new arrivals
 */
async function getNewArrivals(
  limit: number,
  excludeIds: string[] = []
): Promise<Array<{ product: Product; score: number; reason: string }>> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: excludeIds },
      OR: [
        { isNewArrival: true },
        { createdAt: { gte: oneWeekAgo } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return products.map(p => {
    const daysAgo = Math.floor((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return {
      product: p,
      score: Math.max(0.5, 1 - daysAgo / 30), // Score decays over 30 days
      reason: daysAgo <= 7
        ? 'Just arrived this week'
        : 'New this season'
    };
  });
}

/**
 * Get editorial/featured picks
 */
async function getEditorialPicks(
  limit: number,
  excludeIds: string[] = []
): Promise<Array<{ product: Product; score: number; reason: string }>> {
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: excludeIds },
      featured: true
    },
    include: { productFeature: true },
    orderBy: { sortOrder: 'asc' },
    take: limit
  });

  return products.map(p => ({
    product: p,
    score: 0.6 + (p.productFeature?.trendingScore || 0) * 0.4,
    reason: 'Featured by our editors'
  }));
}

/**
 * Handle new product cold-start
 * Inherit score from similar popular products
 */
export async function scoreNewProduct(
  productId: string,
  similarProductCount: number = 5
): Promise<{
  inheritedScore: number;
  editorialBoost: number;
  recencyBoost: number;
  finalScore: number;
  similarProducts: Array<{ id: string; name: string; similarity: number }>;
}> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { productFeature: true }
  });

  if (!product || !product.productFeature) {
    return {
      inheritedScore: 0.3,
      editorialBoost: 0,
      recencyBoost: 0.1,
      finalScore: 0.4,
      similarProducts: []
    };
  }

  const productVector = JSON.parse(product.productFeature.featureVector);

  // Find similar products
  const candidates = await prisma.product.findMany({
    where: {
      id: { not: productId },
      status: 'ACTIVE',
      productFeature: { isNot: null }
    },
    include: { productFeature: true },
    take: 100
  });

  const similarProducts = candidates
    .map(p => {
      const candidateVector = JSON.parse(p.productFeature!.featureVector);
      const similarity = cosineSimilarity(productVector, candidateVector);
      return {
        id: p.id,
        name: p.name,
        similarity,
        popularity: p.productFeature!.trendingScore || 0
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, similarProductCount);

  // Calculate inherited score from similar products
  const inheritedScore = similarProducts.length > 0
    ? similarProducts.reduce((sum, p) => sum + p.similarity * p.popularity, 0) /
      similarProducts.reduce((sum, p) => sum + p.similarity, 0)
    : 0.3;

  // Editorial boost
  const editorialBoost = product.featured ? 0.2 : 0;

  // Recency boost (new products get slight boost)
  const daysSinceCreated = Math.floor(
    (Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const recencyBoost = daysSinceCreated <= 7 ? 0.15 : daysSinceCreated <= 30 ? 0.08 : 0;

  const finalScore = Math.min(inheritedScore + editorialBoost + recencyBoost, 1);

  return {
    inheritedScore,
    editorialBoost,
    recencyBoost,
    finalScore,
    similarProducts: similarProducts.map(p => ({
      id: p.id,
      name: p.name,
      similarity: p.similarity
    }))
  };
}

/**
 * Simple cosine similarity
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
