import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hybridEngine } from '../services/recommendation/hybrid-engine';
import { behaviorEngine } from '../services/recommendation/behavior-engine';
import { getColdStartRecommendations, determineColdStartStrategy } from '../services/recommendation/cold-start-handler';
import { generateExplanation } from '../services/recommendation/explanation-generator';
import { generateEvaluationReport, calculateOfflineMetrics, precisionAtK, recallAtK, ndcg } from '../services/recommendation/evaluation-metrics';
import { WEIGHTS, EVENT_WEIGHTS, PRICE_TIERS, OUTFIT_POSITION_RULES } from '../services/recommendation/types';

const ALLOWED_EVENT_TYPES = ['VIEW', 'CLICK', 'CART_ADD', 'PURCHASE', 'WISHLIST', 'SEARCH'] as const;

const trackEventSchema = z.object({
  eventType: z.enum(ALLOWED_EVENT_TYPES),
  productId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid productId format'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function boundedLimit(raw: unknown, defaultVal: number, max = 50): number {
  const n = parseInt(raw as string);
  if (!n || isNaN(n) || n < 1) return defaultVal;
  return Math.min(n, max);
}

const ALLOWED_REC_TYPES = ['similar', 'trending', 'personalized', 'complete-the-look', 'wishlist-based', 'new-arrivals'] as const;

function getUserIdFromRequest(req: Request): string | null {
  const user = (req as any).user;
  return user?.userId || null;
}

export async function getSimilarProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const limit = boundedLimit(req.query.limit, 4, 20);
    
    // Log view event asynchronously if userId is present
    const userId = getUserIdFromRequest(req);
    if (userId) {
      behaviorEngine.trackEvent({
        userId,
        eventType: 'VIEW',
        productId
      }).catch(console.error);
    }

    const recommendations = await hybridEngine.getSimilarProducts(productId, limit);
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
}

export async function getCompleteTheLook(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const limit = boundedLimit(req.query.limit, 3, 10);
    const recommendations = await hybridEngine.getCompleteTheLook(productId, limit);
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
}

export async function getPersonalizedFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserIdFromRequest(req);
    const limit = boundedLimit(req.query.limit, 8, 50);
    
    const recommendations = await hybridEngine.getPersonalizedFeed(userId, limit);
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
}

export async function getTrendingProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = boundedLimit(req.query.limit, 8, 50);
    const recommendations = await hybridEngine.getTrendingProducts(limit);
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
}

export async function trackUserEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = trackEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid tracking data', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { eventType, productId, metadata } = parsed.data;
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Must be logged in to track personalized events' });
    }

    await behaviorEngine.trackEvent({
      userId,
      eventType,
      productId,
      metadata
    });

    // Update preferences in background
    behaviorEngine.updateUserPreferenceProfile(userId).catch(console.error);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ========================================
// ENHANCED ACADEMIC ENDPOINTS
// ========================================

export async function getPersonalizedFeedEnhanced(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserIdFromRequest(req);
    const limit = boundedLimit(req.query.limit, 8, 50);
    const includeExplanations = req.query.explain !== 'false';
    const rawViewed = typeof req.query.viewed === 'string' ? req.query.viewed : '';
    const sessionData = rawViewed
      ? { viewedProductIds: rawViewed.split(',').slice(0, 50).filter(id => /^[a-zA-Z0-9_-]+$/.test(id)) }
      : undefined;

    const recommendations = await hybridEngine.getPersonalizedFeedEnhanced(userId, {
      limit,
      includeExplanations,
      trackAnalytics: true,
      sessionData
    });

    res.json({
      recommendations,
      meta: {
        strategy: userId ? 'HYBRID_PERSONALIZATION' : 'COLD_START_FALLBACK',
        algorithm: 'v2.0_hybrid_fusion',
        formula: 'S_final = 0.35*S_content + 0.40*S_behavior + 0.15*S_fashion + 0.05*S_pop + 0.05*S_recency',
        includeExplanations
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getDiscoverFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserIdFromRequest(req);
    const limit = boundedLimit(req.query.limit, 12, 50);
    const rawViewed = typeof req.query.viewed === 'string' ? req.query.viewed : '';
    const sessionData = rawViewed
      ? { viewedProductIds: rawViewed.split(',').slice(0, 50).filter(id => /^[a-zA-Z0-9_-]+$/.test(id)) }
      : { viewedProductIds: [] };

    // Determine and return the cold-start strategy
    const strategy = await determineColdStartStrategy(userId, sessionData);

    const recommendations = await getColdStartRecommendations(userId, {
      limit,
      sessionData,
      preferredDivision: req.query.division as string | undefined
    });

    res.json({
      recommendations: recommendations.map(r => ({
        id: r.product.id,
        name: r.product.name,
        price: r.product.price,
        images: r.product.images,
        slug: r.product.slug,
        score: r.score,
        reason: r.reason,
        source: r.source
      })),
      strategy: {
        type: strategy.type,
        description: strategy.description,
        mixRatio: strategy.mixRatio
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getWishlistBasedRecommendations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserIdFromRequest(req);
    const limit = boundedLimit(req.query.limit, 6, 50);

    if (!userId) {
      return res.status(401).json({ error: 'Must be logged in for wishlist-based recommendations' });
    }

    // Get user's wishlist items
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true }
    });

    if (wishlistItems.length === 0) {
      return res.json({
        recommendations: [],
        message: 'Your wishlist is empty. Add items to get personalized recommendations.'
      });
    }

    // Get recommendations based on wishlist items
    const wishlistProductIds = wishlistItems.map(w => w.productId);
    const recommendations = await hybridEngine.getPersonalizedFeedEnhanced(userId, {
      limit,
      sessionData: { viewedProductIds: wishlistProductIds }
    });

    res.json({
      recommendations,
      basedOn: wishlistItems.map(w => ({
        id: w.product.id,
        name: w.product.name
      })),
      formula: 'Collaborative filtering from wishlist items'
    });
  } catch (err) {
    next(err);
  }
}

export async function getNewArrivals(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserIdFromRequest(req);
    const limit = boundedLimit(req.query.limit, 8, 50);

    // Get user profile for personalization
    let recommendations;
    if (userId) {
      const profile = await behaviorEngine.buildUserProfile(userId);
      if (profile) {
        // Get new arrivals with content-based filtering
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const newProducts = await prisma.product.findMany({
          where: {
            status: 'ACTIVE',
            OR: [
              { isNewArrival: true },
              { createdAt: { gte: oneWeekAgo } }
            ]
          },
          include: { productFeature: true, category: true }
        });

        // Score by user preference match
        recommendations = newProducts.map(p => {
          const categoryScore = profile.categoryAffinity[p.category?.slug || ''] || 0;
          const daysAgo = Math.floor((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          const recencyScore = Math.max(0, 1 - daysAgo / 30);

          return {
            id: p.id,
            name: p.name,
            price: p.price,
            images: p.images,
            slug: p.slug,
            score: categoryScore * 0.6 + recencyScore * 0.4,
            reason: categoryScore > 0.5
              ? 'New arrival in your preferred category'
              : 'Just arrived this week'
          };
        }).sort((a, b) => b.score - a.score).slice(0, limit);
      }
    }

    // Fallback to pure new arrivals
    if (!recommendations || recommendations.length === 0) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const newProducts = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { isNewArrival: true },
            { createdAt: { gte: oneWeekAgo } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      recommendations = newProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: p.images,
        slug: p.slug,
        score: 1,
        reason: 'New arrival'
      }));
    }

    res.json({
      recommendations,
      formula: 'S = 0.6*CategoryAffinity + 0.4*RecencyBoost'
    });
  } catch (err) {
    next(err);
  }
}

export async function trackRecommendationClick(req: Request, res: Response, next: NextFunction) {
  try {
    const { recType, productId } = req.params;
    const userId = getUserIdFromRequest(req);
    const position = parseInt(req.body.position as string) || 1;
    const metadata = req.body.metadata;

    await hybridEngine.trackRecommendationClick(
      userId,
      productId,
      recType.toUpperCase() as any,
      position,
      'CLICK',
      metadata
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function trackRecommendationConversion(req: Request, res: Response, next: NextFunction) {
  try {
    const { recType, productId } = req.params;
    const userId = getUserIdFromRequest(req);
    const position = parseInt(req.body.position as string) || 1;
    const { price, quantity, orderId } = req.body;

    await hybridEngine.trackRecommendationClick(
      userId,
      productId,
      recType.toUpperCase() as any,
      position,
      'PURCHASE',
      { price, quantity, orderId }
    );

    res.json({ success: true, tracked: true });
  } catch (err) {
    next(err);
  }
}

export async function getRecommendationExplanation(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const userId = getUserIdFromRequest(req);

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { productFeature: true, category: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Build mock scores for demonstration
    const scores = {
      contentScore: 0.75,
      behaviorScore: 0.60,
      fashionScore: 0.45,
      popularityScore: 0.80,
      recencyScore: 0.30
    };

    // Generate explanation
    const context: any = {
      userProfile: undefined,
      sharedAttributes: [product.category?.name || 'this category']
    };

    if (userId) {
      const profile = await behaviorEngine.buildUserProfile(userId);
      if (profile) {
        context.userProfile = {
          topCategory: Object.entries(profile.categoryAffinity).sort(([, a], [, b]) => b - a)[0]?.[0],
          topStyle: Object.entries(profile.styleAffinity).sort(([, a], [, b]) => b - a)[0]?.[0]
        };
      }
    }

    const explanation = generateExplanation(product.name, scores, 'PERSONALIZED', context);

    res.json({
      product: {
        id: product.id,
        name: product.name,
        category: product.category?.name
      },
      explanation,
      scores,
      weights: WEIGHTS.PERSONALIZED,
      formula: 'S_final = Σ(w_i × s_i) where w_i are strategy weights'
    });
  } catch (err) {
    next(err);
  }
}

export async function getSystemArchitecture(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({
      name: 'Akwaluzto Hybrid Recommendation Engine',
      version: '2.0.0',
      architecture: 'Multi-Paradigm Hybrid Recommender',
      components: [
        {
          name: 'Content-Based Module',
          algorithm: 'Cosine Similarity on 20-dimensional feature vectors',
          inputs: ['Product features', 'Category', 'Color', 'Style tags', 'Price tier'],
          formula: 'S_content = cos(v_product, v_user_preferences)'
        },
        {
          name: 'Behavior-Based Module',
          algorithm: 'Collaborative Filtering with User-Item Matrix',
          inputs: ['User events', 'Co-occurrence patterns', 'Time decay'],
          formula: 'S_behavior = Σ(event_weight × time_decay)'
        },
        {
          name: 'Fashion-Aware Module',
          algorithm: 'Rule-based complementarity with color theory',
          inputs: ['Outfit position rules', 'Category compatibility', 'Color harmony'],
          formula: 'S_fashion = w_cat·C(cat) + w_style·O(style) + w_color·H(color)'
        },
        {
          name: 'Hybrid Fusion Layer',
          algorithm: 'Weighted linear combination',
          formula: 'S_final = Σ(w_i × S_i) for i in {content, behavior, fashion, popularity, recency}'
        }
      ],
      eventWeights: EVENT_WEIGHTS,
      coldStartStrategies: [
        'NEW_USER: Trending + Editorial + New Arrivals mix',
        'WARM_USER: Content-based from session views',
        'ACTIVE_USER: Full hybrid with all components'
      ],
      explainability: 'Every recommendation includes primary and secondary explanation',
      evaluation: 'Precision@K, Recall@K, NDCG, Diversity, CTR, Conversion Rate'
    });
  } catch (err) {
    next(err);
  }
}

export async function getScoringWeights(req: Request, res: Response, next: NextFunction) {
  try {
    const recType = (req.query.type as string)?.toUpperCase() || 'ALL';

    if (recType === 'ALL') {
      res.json({
        weights: WEIGHTS,
        eventWeights: EVENT_WEIGHTS,
        priceTiers: PRICE_TIERS,
        outfitRules: Object.keys(OUTFIT_POSITION_RULES).length,
        formulas: {
          PERSONALIZED: 'S = 0.35*Content + 0.40*Behavior + 0.15*Fashion + 0.05*Pop + 0.05*Recency',
          SIMILAR: 'S = 0.60*Content + 0.20*Collab + 0.10*Fashion + 0.05*Pop + 0.05*Recency',
          COMPLEMENTARY: 'S = 0.10*Content + 0.10*Behavior + 0.70*Fashion + 0.05*Pop + 0.05*Recency',
          TRENDING: 'S = 0.70*Popularity + 0.30*Recency'
        }
      });
    } else if (WEIGHTS[recType as keyof typeof WEIGHTS]) {
      res.json({
        type: recType,
        weights: WEIGHTS[recType as keyof typeof WEIGHTS],
        formula: getFormulaForType(recType)
      });
    } else {
      res.status(400).json({ error: 'Invalid recommendation type' });
    }
  } catch (err) {
    next(err);
  }
}

function getFormulaForType(type: string): string {
  switch (type) {
    case 'PERSONALIZED':
      return 'S = 0.35*Content + 0.40*Behavior + 0.15*Fashion + 0.05*Pop + 0.05*Recency';
    case 'SIMILAR':
      return 'S = 0.60*Content + 0.20*Collab + 0.10*Fashion + 0.05*Pop + 0.05*Recency';
    case 'COMPLEMENTARY':
      return 'S = 0.10*Content + 0.10*Behavior + 0.70*Fashion + 0.05*Pop + 0.05*Recency';
    case 'TRENDING':
      return 'S = 0.70*Popularity + 0.30*Recency';
    default:
      return 'S = Σ(w_i × S_i)';
  }
}

export async function getEvaluationMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end ? new Date(req.query.end as string) : new Date();

    const report = await generateEvaluationReport(startDate, endDate);

    res.json({
      report,
      period: { start: startDate, end: endDate },
      metrics: {
        precision: 'Precision@K: |relevant ∩ recommended| / K',
        recall: 'Recall@K: |relevant ∩ recommended| / |relevant|',
        ndcg: 'NDCG: DCG / IDCG (rank-aware relevance)',
        diversity: 'Average pairwise distance between recommendations'
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserProfiles(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Run batch update
    await behaviorEngine.updateAllUserProfiles();

    res.json({
      success: true,
      message: 'User preference profiles updated successfully',
      note: 'This updates category/style/color/price affinities for all users'
    });
  } catch (err) {
    next(err);
  }
}
