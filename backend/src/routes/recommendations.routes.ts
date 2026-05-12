import { Router, Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import * as RecController from '../controllers/recommendations.controller';
import { verifyUserToken } from '../services/userAuth.service';

const router = Router();

const attachOptionalUser = (req: any, _res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.substring(7);
    req.user = verifyUserToken(token);
    next();
  } catch {
    next();
  }
};

// Stricter rate limit for write/tracking endpoints — prevent analytics spam
const trackingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    if (user?.userId) return String(user.userId);
    return ipKeyGenerator(req.ip || 'unknown');
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: 'Too many tracking requests' });
  }
});

// Validate recType against allowed values
const ALLOWED_REC_TYPES = new Set(['similar', 'trending', 'personalized', 'complete-the-look', 'wishlist-based', 'new-arrivals']);

function validateRecType(req: Request, res: Response, next: NextFunction) {
  if (!ALLOWED_REC_TYPES.has(req.params.recType)) {
    res.status(400).json({ error: 'Invalid recommendation type' });
    return;
  }
  next();
}

// ========================================
// ACADEMIC RECOMMENDATION API ENDPOINTS
// ========================================

// Content-Based: Similar products (cosine similarity on feature vectors)
router.get('/similar/:productId', RecController.getSimilarProducts);

// Fashion-Aware: Complete the Look (outfit complementarity)
router.get('/complete-the-look/:productId', RecController.getCompleteTheLook);

// Popularity-Based: Trending products (with recency decay)
router.get('/trending', RecController.getTrendingProducts);

// Hybrid Personalization: Full weighted fusion with explainability
router.get('/personalized', attachOptionalUser, RecController.getPersonalizedFeed);

// Enhanced endpoint with full explainability and breakdown
router.get('/personalized/enhanced', attachOptionalUser, RecController.getPersonalizedFeedEnhanced);

// Cold-Start Strategy: Explicit handling for new users
router.get('/discover', attachOptionalUser, RecController.getDiscoverFeed);

// Wishlist-Based: Collaborative from saved items
router.get('/wishlist-based', attachOptionalUser, RecController.getWishlistBasedRecommendations);

// New Arrivals: Time-decay boosted recommendations
router.get('/new-arrivals', attachOptionalUser, RecController.getNewArrivals);

// ========================================
// ANALYTICS & TRACKING ENDPOINTS
// ========================================

// Track user behavior for collaborative filtering
router.post('/track', trackingRateLimit, attachOptionalUser, RecController.trackUserEvent);

// Track recommendation click (for CTR analysis)
router.post('/:recType/click/:productId', trackingRateLimit, validateRecType, attachOptionalUser, RecController.trackRecommendationClick);

// Track recommendation conversion (purchase)
router.post('/:recType/convert/:productId', trackingRateLimit, validateRecType, attachOptionalUser, RecController.trackRecommendationConversion);

// ========================================
// ACADEMIC/EVALUATION ENDPOINTS
// ========================================

// Get explanation for a recommendation (XAI endpoint)
router.get('/explain/:productId', attachOptionalUser, RecController.getRecommendationExplanation);

// Get system architecture information
router.get('/system/architecture', RecController.getSystemArchitecture);

// Get current scoring weights and formulas
router.get('/system/weights', RecController.getScoringWeights);

// Get evaluation metrics (admin only)
router.get('/analytics/metrics', attachOptionalUser, RecController.getEvaluationMetrics);

// Trigger user profile update (for batch processing)
router.post('/system/update-profiles', attachOptionalUser, RecController.updateUserProfiles);

export default router;
