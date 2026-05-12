// ========================================
// HYBRID RECOMMENDATION ENGINE
// Academic-grade implementation with explicit scoring formulas
// Implements: Content-Based + Collaborative + Fashion-Aware + Hybrid Fusion
// ========================================

import { Product } from '@prisma/client';
import { OUTFIT_POSITION_RULES, WEIGHTS, RecType, ScoreBreakdown, ScoringWeights } from './types';
import { cosineSimilarity } from './utils';
import { isFashionCompatible } from './color-theory';
import { behaviorEngine } from './behavior-engine';
import { generateExplanation, ExplanationContext, GeneratedExplanation } from './explanation-generator';
import { getColdStartRecommendations, determineColdStartStrategy } from './cold-start-handler';
import { logRecommendationImpression, logRecommendationEvent } from './evaluation-metrics';
import { prisma } from '../../lib/prisma';

export class HybridRecommendationEngine {
  /**
   * Get Similar Products (Content-based + Collaborative)
   */
  async getSimilarProducts(productId: string, limit: number = 4) {
    const targetProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { productFeature: true, category: true, variants: true }
    });

    if (!targetProduct || !targetProduct.productFeature) {
      return this.getTrendingProducts(limit);
    }

    const targetVector = JSON.parse(targetProduct.productFeature.featureVector);

    // Get candidate products in same or related categories
    const candidates = await prisma.product.findMany({
      where: {
        id: { not: productId },
        status: 'ACTIVE',
        productFeature: { isNot: null }
      },
      include: { productFeature: true }
    });

    // Score candidates
    const scored = candidates.map(candidate => {
      const candidateVector = JSON.parse(candidate.productFeature!.featureVector);
      
      // Content similarity (Cosine)
      const contentScore = cosineSimilarity(targetVector, candidateVector);
      
      // Popularity boost
      const popularityScore = candidate.productFeature!.trendingScore || 0;

      // Final hybrid score for 'SIMILAR'
      const finalScore = 
        (contentScore * WEIGHTS.SIMILAR.contentScore) + 
        (popularityScore * WEIGHTS.SIMILAR.popularityScore);

      return {
        product: candidate,
        score: finalScore,
        reason: contentScore > 0.8 ? 'Very similar to what you are viewing' : 'Similar style',
        breakdown: { contentScore, popularityScore }
      };
    });

    const results = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(res => ({
        id: res.product.id,
        name: res.product.name,
        price: res.product.price,
        images: res.product.images,
        slug: res.product.slug,
        score: res.score,
        reason: res.reason
      }));

    if (results.length === 0) {
      return this.getTrendingProducts(limit);
    }

    return results;
  }

  /**
   * Get "Complete the Look" (Fashion-specific cross-selling)
   */
  async getCompleteTheLook(productId: string, limit: number = 3) {
    const targetProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { productFeature: true, category: true, variants: true }
    });

    if (!targetProduct || !targetProduct.category) {
      return this.getTrendingProducts(limit);
    }

    const categorySlug = targetProduct.category.slug;
    const rule = OUTFIT_POSITION_RULES[categorySlug];
    if (!rule) {
      return this.getSimilarProducts(productId, limit);
    }

    // Find complementary categories
    const candidates = await prisma.product.findMany({
      where: {
        id: { not: productId },
        status: 'ACTIVE',
        category: { slug: { in: rule.complements } },
        productFeature: { isNot: null }
      },
      include: { productFeature: true, variants: true, category: true }
    });

    const targetColor = targetProduct.variants[0]?.colorHex || '#000000';
    const targetStyles = JSON.parse(targetProduct.productFeature?.styleTags || '[]');

    const scored = candidates.map(candidate => {
      let fashionScore = 0.5; // Base compatibility
      
      // Color Harmony
      const candidateColor = candidate.variants[0]?.colorHex;
      if (candidateColor && targetColor) {
        if (isFashionCompatible(targetColor, candidateColor)) {
          fashionScore += 0.3;
        }
      }

      // Style Overlap
      const candidateStyles = JSON.parse(candidate.productFeature!.styleTags || '[]');
      const styleOverlap = candidateStyles.filter((s: string) => targetStyles.includes(s)).length;
      if (styleOverlap > 0) {
        fashionScore += 0.2;
      }

      const popularityScore = candidate.productFeature!.trendingScore || 0;

      const finalScore = 
        (fashionScore * WEIGHTS.COMPLEMENTARY.fashionScore) + 
        (popularityScore * WEIGHTS.COMPLEMENTARY.popularityScore);

      return {
        product: candidate,
        score: finalScore,
        reason: 'Perfect pairing for this piece',
      };
    });

    // Deduplicate by category so we get 1 of each complementary item type (e.g. 1 bag, 1 shoe)
    const grouped = new Map<string, typeof scored[0]>();
    for (const item of scored.sort((a, b) => b.score - a.score)) {
      const cat = item.product.category!.slug;
      if (!grouped.has(cat)) grouped.set(cat, item);
      if (grouped.size >= limit) break;
    }

    const results = Array.from(grouped.values()).map(res => ({
      id: res.product.id,
      name: res.product.name,
      price: res.product.price,
      images: res.product.images,
      slug: res.product.slug,
      score: res.score,
      reason: res.reason
    }));

    if (results.length === 0) {
      return this.getSimilarProducts(productId, limit);
    }

    return results;
  }

  /**
   * Get Personalized Feed for Homepage
   */
  async getPersonalizedFeed(userId: string | null, limit: number = 8) {
    if (!userId) {
      // Cold start / Logged out: Return Trending + New Arrivals
      return this.getTrendingProducts(limit);
    }

    // Try behavior engine
    const personalized = await behaviorEngine.getPersonalizedRecommendations(userId, { limit });
    
    // Map to full product data
    const products = await prisma.product.findMany({
      where: { id: { in: personalized.map(p => p.productId) } }
    });

    const mapped = personalized
      .map(p => {
        const product = products.find(prod => prod.id === p.productId);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          images: product.images,
          slug: product.slug,
          score: p.score,
          reason: p.reason
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        name: string;
        price: number;
        images: string;
        slug: string;
        score: number;
        reason: string;
      }>;

    if (mapped.length < limit) {
      const fallback = await this.getTrendingProducts(limit - mapped.length);
      const seen = new Set(mapped.map(item => item.id));
      const appended = fallback.filter(item => !seen.has(item.id));
      return [...mapped, ...appended].slice(0, limit);
    }

    return mapped;
  }

  /**
   * Trending / Cold Start fallback
   */
  async getTrendingProducts(limit: number = 8) {
    const productsWithFeatures = await prisma.product.findMany({
      where: { status: 'ACTIVE', productFeature: { isNot: null } },
      include: { productFeature: true },
      orderBy: { productFeature: { trendingScore: 'desc' } },
      take: limit
    });

    const scored = productsWithFeatures.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      images: p.images,
      slug: p.slug,
      score: p.productFeature!.trendingScore,
      reason: 'Trending right now'
    }));

    if (scored.length >= limit) {
      return scored;
    }

    const fallbackProducts = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { notIn: scored.map(p => p.id) }
      },
      orderBy: { createdAt: 'desc' },
      take: limit - scored.length
    });

    return [
      ...scored,
      ...fallbackProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: p.images,
        slug: p.slug,
        score: 0,
        reason: 'Curated pick'
      }))
    ];
  }

  /**
   * Enhanced Personalized Feed with Academic Rigor
   * Implements full hybrid scoring with explainability
   * 
   * Scoring Formula:
   * S_final = 0.35*S_content + 0.40*S_behavior + 0.15*S_fashion + 0.05*S_pop + 0.05*S_recency
   */
  async getPersonalizedFeedEnhanced(
    userId: string | null,
    options: {
      limit?: number;
      includeExplanations?: boolean;
      trackAnalytics?: boolean;
      sessionData?: { viewedProductIds: string[] };
    } = {}
  ): Promise<Array<{
    id: string;
    name: string;
    price: number;
    images: string;
    slug: string;
    score: number;
    reason: string;
    explanation?: GeneratedExplanation;
    breakdown?: ScoreBreakdown;
  }>> {
    const { limit = 8, includeExplanations = true, trackAnalytics = true, sessionData } = options;

    // Determine strategy based on user state
    const strategy = await determineColdStartStrategy(userId, sessionData);

    // Log strategy for debugging
    console.log(`[HybridEngine] Using strategy: ${strategy.type} - ${strategy.description}`);

    // Handle cold start scenarios
    if (strategy.type === 'NEW_USER' || strategy.type === 'WARM_USER') {
      const coldStartResults = await getColdStartRecommendations(userId, {
        limit,
        sessionData,
        preferredDivision: undefined
      });

      // Log impressions
      if (trackAnalytics) {
        coldStartResults.forEach((result, idx) => {
          logRecommendationImpression(
            userId,
            result.product.id,
            `COLD_START_${strategy.type}`,
            idx + 1,
            'v2'
          ).catch(console.error);
        });
      }

      return coldStartResults.map(result => ({
        id: result.product.id,
        name: result.product.name,
        price: result.product.price,
        images: result.product.images,
        slug: result.product.slug,
        score: result.score,
        reason: result.reason
      }));
    }

    // Active user: Full hybrid recommendation
    if (!userId) {
      return this.getTrendingProducts(limit);
    }

    // Get user profile
    const profile = await behaviorEngine.buildUserProfile(userId);
    if (!profile) {
      return this.getTrendingProducts(limit);
    }

    // Get candidate products
    const candidates = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        productFeature: { isNot: null }
      },
      include: { productFeature: true, category: true, variants: true }
    });

    // Get user's interaction history for collaborative signals
    const userEvents = await prisma.userEvent.findMany({
      where: {
        userId,
        eventType: { in: ['VIEW', 'WISHLIST', 'PURCHASE'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const interactedProductIds = new Set(userEvents.map(e => e.productId).filter(Boolean));

    // Score each candidate
    const scored = await Promise.all(
      candidates
        .filter(p => !interactedProductIds.has(p.id)) // Exclude already interacted
        .map(async candidate => {
          const scores: ScoreBreakdown = {
            contentScore: 0,
            behaviorScore: 0,
            fashionScore: 0,
            popularityScore: 0,
            recencyScore: 0
          };

          // 1. Content Score: Match to user preference vector
          const candidateVector = JSON.parse(candidate.productFeature!.featureVector);
          scores.contentScore = cosineSimilarity(profile.preferenceVector, candidateVector);

          // 2. Behavior Score: Collaborative filtering
          const category = candidate.category?.slug || 'unknown';
          const categoryAffinity = profile.categoryAffinity[category] || 0;
          const styleMatch = this.calculateStyleMatch(profile, candidate);
          scores.behaviorScore = (categoryAffinity * 0.6 + styleMatch * 0.4);

          // 3. Fashion Score: Outfit complementarity
          // Check if this complements any recently viewed item
          if (sessionData?.viewedProductIds.length) {
            const recentViewId = sessionData.viewedProductIds[0];
            const recentProduct = await prisma.product.findUnique({
              where: { id: recentViewId },
              include: { category: true, productFeature: true, variants: true }
            });
            if (recentProduct) {
              scores.fashionScore = this.calculateFashionScore(recentProduct, candidate);
            }
          }

          // 4. Popularity Score
          scores.popularityScore = candidate.productFeature!.trendingScore || 0;

          // 5. Recency Score
          const daysSinceCreated = Math.floor(
            (Date.now() - candidate.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          scores.recencyScore = Math.max(0, 1 - daysSinceCreated / 90); // Decay over 90 days

          // Apply hybrid fusion formula
          const weights = WEIGHTS.PERSONALIZED;
          const finalScore =
            scores.contentScore * weights.contentScore +
            scores.behaviorScore * weights.behaviorScore +
            scores.fashionScore * weights.fashionScore +
            scores.popularityScore * weights.popularityScore +
            scores.recencyScore * weights.recencyScore;

          // Generate explanation
          const explanationContext: ExplanationContext = {
            userProfile: {
              topCategory: Object.entries(profile.categoryAffinity)
                .sort(([, a], [, b]) => b - a)[0]?.[0],
              topStyle: Object.entries(profile.styleAffinity)
                .sort(([, a], [, b]) => b - a)[0]?.[0]
            }
          };

          const explanation = includeExplanations
            ? generateExplanation(candidate.name, scores, 'PERSONALIZED', explanationContext, weights)
            : undefined;

          return {
            product: candidate,
            score: finalScore,
            scores,
            explanation
          };
        })
    );

    // Sort and rank
    const ranked = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Log impressions
    if (trackAnalytics) {
      ranked.forEach((result, idx) => {
        logRecommendationImpression(
          userId,
          result.product.id,
          'PERSONALIZED',
          idx + 1,
          'v2'
        ).catch(console.error);
      });
    }

    return ranked.map(r => ({
      id: r.product.id,
      name: r.product.name,
      price: r.product.price,
      images: r.product.images,
      slug: r.product.slug,
      score: r.score,
      reason: r.explanation?.primary || 'Recommended for you',
      explanation: r.explanation,
      breakdown: r.scores
    }));
  }

  /**
   * Calculate style match between user profile and product
   */
  private calculateStyleMatch(
    profile: { styleAffinity: Record<string, number> },
    product: Product & { productFeature: any }
  ): number {
    const productStyles = JSON.parse(product.productFeature.styleTags || '[]');
    if (productStyles.length === 0) return 0;

    let matchScore = 0;
    for (const style of productStyles) {
      matchScore += profile.styleAffinity[style] || 0;
    }

    return Math.min(matchScore / Math.max(productStyles.length, 1), 1);
  }

  /**
   * Calculate fashion complementarity score between two products
   */
  private calculateFashionScore(
    sourceProduct: Product & { category: any; productFeature: any; variants: any[] },
    candidate: Product & { category: any; productFeature: any; variants: any[] }
  ): number {
    let score = 0.3; // Base compatibility

    // Category complementarity
    const sourceCategory = sourceProduct.category?.slug;
    const candidateCategory = candidate.category?.slug;
    const rule = sourceCategory ? OUTFIT_POSITION_RULES[sourceCategory] : null;

    if (rule && rule.complements.includes(candidateCategory)) {
      score += 0.4;
    }

    // Color harmony
    const sourceColor = sourceProduct.variants[0]?.colorHex;
    const candidateColor = candidate.variants[0]?.colorHex;
    if (sourceColor && candidateColor && isFashionCompatible(sourceColor, candidateColor)) {
      score += 0.2;
    }

    // Style overlap
    const sourceStyles = JSON.parse(sourceProduct.productFeature?.styleTags || '[]');
    const candidateStyles = JSON.parse(candidate.productFeature?.styleTags || '[]');
    const styleOverlap = sourceStyles.filter((s: string) => candidateStyles.includes(s)).length;
    score += (styleOverlap / Math.max(sourceStyles.length, 1)) * 0.1;

    return Math.min(score, 1);
  }

  /**
   * Track user interaction with a recommendation
   */
  async trackRecommendationClick(
    userId: string | null,
    productId: string,
    recType: RecType,
    position: number,
    eventType: 'CLICK' | 'WISHLIST' | 'CART_ADD' | 'PURCHASE' = 'CLICK',
    metadata?: Record<string, any>
  ): Promise<void> {
    await logRecommendationEvent(
      userId,
      productId,
      recType,
      eventType,
      position,
      metadata,
      'v2'
    );
  }
}

export const hybridEngine = new HybridRecommendationEngine();
