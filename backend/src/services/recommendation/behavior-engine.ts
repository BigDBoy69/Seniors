// ========================================
// BEHAVIOR-BASED RECOMMENDATION ENGINE
// Collaborative filtering and user behavior analysis
// ========================================

import { PrismaClient, UserEvent, Product } from '@prisma/client';
import { EVENT_WEIGHTS, EventType } from './types';
import { cosineSimilarity, timeDecay } from './utils';
import { prisma } from './feature-extractor';

interface UserInteraction {
    productId: string;
    eventType: EventType;
    weight: number;
    timestamp: Date;
    recencyWeight: number;
}

interface UserProfile {
    userId: string;
    interactions: UserInteraction[];
    categoryAffinity: Record<string, number>;
    styleAffinity: Record<string, number>;
    colorAffinity: Record<string, number>;
    priceAffinity: Record<number, number>;
    preferenceVector: number[];
}

class BehaviorBasedEngine {
    /**
     * Track a user event
     */
    async trackEvent(data: {
        userId: string;
        eventType: EventType;
        productId?: string;
        sessionId?: string;
        sourcePage?: string;
        position?: number;
        metadata?: Record<string, any>;
    }): Promise<void> {
        await prisma.userEvent.create({
            data: {
                userId: data.userId,
                eventType: data.eventType,
                productId: data.productId,
                sessionId: data.sessionId,
                sourcePage: data.sourcePage,
                position: data.position,
                metadata: JSON.stringify(data.metadata || {})
            }
        });
    }

    /**
     * Build user profile from behavior history
     */
    async buildUserProfile(userId: string): Promise<UserProfile | null> {
        // Get user's event history (last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const events = await prisma.userEvent.findMany({
            where: {
                userId,
                createdAt: { gte: ninetyDaysAgo }
            },
            include: {
                product: {
                    include: { category: true, productFeature: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (events.length === 0) return null;

        // Build interactions with recency weighting
        const interactions: UserInteraction[] = events.map(event => {
            const daysAgo = (Date.now() - event.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return {
                productId: event.productId || '',
                eventType: event.eventType as EventType,
                weight: EVENT_WEIGHTS[event.eventType as EventType] || 1,
                timestamp: event.createdAt,
                recencyWeight: timeDecay(daysAgo, 30)
            };
        }).filter(i => i.productId);

        // Calculate affinities
        const categoryAffinity: Record<string, number> = {};
        const styleAffinity: Record<string, number> = {};
        const colorAffinity: Record<string, number> = {};
        const priceAffinity: Record<number, number> = {};

        for (const event of events) {
            if (!event.product) continue;

            const baseWeight = (EVENT_WEIGHTS[event.eventType as EventType] || 1) *
                timeDecay((Date.now() - event.createdAt.getTime()) / (1000 * 60 * 60 * 24), 30);

            // Category affinity
            const category = event.product.category?.slug || 'unknown';
            categoryAffinity[category] = (categoryAffinity[category] || 0) + baseWeight;

            // Feature-based affinities
            const features = event.product.productFeature;
            if (features) {
                // Style affinity
                const styles = JSON.parse(features.styleTags || '[]');
                for (const style of styles) {
                    styleAffinity[style] = (styleAffinity[style] || 0) + baseWeight;
                }

                // Color affinity
                if (features.colorFamily) {
                    colorAffinity[features.colorFamily] = (colorAffinity[features.colorFamily] || 0) + baseWeight;
                }

                // Price affinity
                priceAffinity[features.priceTier] = (priceAffinity[features.priceTier] || 0) + baseWeight;
            }
        }

        // Normalize affinities
        this.normalizeAffinities(categoryAffinity);
        this.normalizeAffinities(styleAffinity);
        this.normalizeAffinities(colorAffinity);
        this.normalizeAffinities(priceAffinity);

        // Build preference vector (simplified 10-dim representation)
        const preferenceVector = this.buildPreferenceVector(
            categoryAffinity,
            styleAffinity,
            colorAffinity,
            priceAffinity
        );

        return {
            userId,
            interactions,
            categoryAffinity,
            styleAffinity,
            colorAffinity,
            priceAffinity,
            preferenceVector
        };
    }

    private normalizeAffinities(affinities: Record<string | number, number>): void {
        const values = Object.values(affinities);
        if (values.length === 0) return;

        const max = Math.max(...values);
        if (max === 0) return;

        for (const key of Object.keys(affinities)) {
            affinities[key] = affinities[key] / max;
        }
    }

    private buildPreferenceVector(
        categoryAffinity: Record<string, number>,
        styleAffinity: Record<string, number>,
        colorAffinity: Record<string, number>,
        priceAffinity: Record<number, number>
    ): number[] {
        // Create a 10-dimensional preference vector
        const vector: number[] = new Array(10).fill(0);

        // Dimensions 0-3: Top category preferences (one-hot-ish)
        const topCategories = Object.entries(categoryAffinity)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4);
        topCategories.forEach(([, val], idx) => {
            if (idx < 4) vector[idx] = val;
        });

        // Dimensions 4-6: Style preference intensity
        const styleScore = Object.values(styleAffinity).reduce((a, b) => a + b, 0) /
            Math.max(Object.keys(styleAffinity).length, 1);
        vector[4] = styleScore;
        vector[5] = Object.keys(styleAffinity).length > 3 ? 1 : 0.5; // Style diversity
        vector[6] = Object.keys(styleAffinity).filter(k => styleAffinity[k] > 0.7).length / 3;

        // Dimensions 7-8: Color and price preferences
        vector[7] = Object.values(colorAffinity)[0] || 0;
        vector[8] = Object.values(priceAffinity)[0] || 0;

        // Dimension 9: Overall activity level
        vector[9] = Math.min(Object.values(categoryAffinity).reduce((a, b) => a + b, 0) / 10, 1);

        // Normalize
        const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        return norm > 0 ? vector.map(v => v / norm) : vector;
    }

    /**
     * Find similar users based on preference vectors
     */
    async findSimilarUsers(userId: string, k: number = 20): Promise<Array<{
        userId: string;
        similarity: number;
    }>> {
        const targetProfile = await this.buildUserProfile(userId);
        if (!targetProfile) return [];

        // Find users with at least 5 interactions
        const activeUsers = await prisma.userEvent.groupBy({
            by: ['userId'],
            where: {
                userId: { not: userId },
                createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
            },
            having: { userId: { _count: { gte: 5 } } }
        });

        const similarities: Array<{ userId: string; similarity: number }> = [];

        for (const { userId: otherId } of activeUsers) {
            const otherProfile = await this.buildUserProfile(otherId);
            if (!otherProfile) continue;

            const similarity = cosineSimilarity(
                targetProfile.preferenceVector,
                otherProfile.preferenceVector
            );

            if (similarity > 0.3) { // Minimum threshold
                similarities.push({ userId: otherId, similarity });
            }
        }

        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, k);
    }

    /**
     * Collaborative filtering: What similar users liked
     */
    async collaborativeFilteringRecommendations(
        userId: string,
        options: { limit?: number; excludeIds?: string[] } = {}
    ): Promise<Array<{
        productId: string;
        score: number;
        reason: string;
    }>> {
        const { limit = 10, excludeIds = [] } = options;

        // Find similar users
        const similarUsers = await this.findSimilarUsers(userId, 20);
        if (similarUsers.length === 0) return [];

        // Get what similar users interacted with highly
        const similarUserIds = similarUsers.map(u => u.userId);
        const weights = similarUsers.map(u => u.similarity);

        const events = await prisma.userEvent.findMany({
            where: {
                userId: { in: similarUserIds },
                productId: { not: null, notIn: excludeIds },
                eventType: { in: ['WISHLIST', 'PURCHASE', 'CART_ADD'] }
            },
            include: { product: true }
        });

        // Score products by weighted sum
        const productScores: Record<string, { score: number; count: number }> = {};

        for (const event of events) {
            if (!event.productId) continue;

            const userIdx = similarUserIds.indexOf(event.userId);
            const userWeight = weights[userIdx];
            const eventWeight = EVENT_WEIGHTS[event.eventType as EventType] || 1;

            if (!productScores[event.productId]) {
                productScores[event.productId] = { score: 0, count: 0 };
            }

            productScores[event.productId].score += userWeight * eventWeight;
            productScores[event.productId].count += 1;
        }

        // Filter and rank
        return Object.entries(productScores)
            .filter(([, data]) => data.count >= 2) // Minimum support
            .map(([productId, data]) => ({
                productId,
                score: data.score,
                reason: 'Popular with customers like you'
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Item-to-item collaborative filtering
     * Users who viewed/bought X also viewed/bought Y
     */
    async itemToItemRecommendations(
        productId: string,
        options: { limit?: number; excludeIds?: string[] } = {}
    ): Promise<Array<{
        productId: string;
        score: number;
        coOccurrenceCount: number;
        reason: string;
    }>> {
        const { limit = 10, excludeIds = [] } = options;

        // Find users who interacted with this product
        const userEvents = await prisma.userEvent.findMany({
            where: {
                productId,
                eventType: { in: ['VIEW', 'PURCHASE', 'WISHLIST'] }
            },
            select: { userId: true }
        });

        const userIds = [...new Set(userEvents.map(e => e.userId))];
        if (userIds.length < 3) return []; // Need minimum support

        // Find what else these users interacted with
        const coEvents = await prisma.userEvent.groupBy({
            by: ['productId'],
            where: {
                userId: { in: userIds },
                AND: [
                    { productId: { not: productId } },
                    { productId: { not: null } },
                    { productId: { notIn: excludeIds } }
                ],
                eventType: { in: ['VIEW', 'PURCHASE', 'WISHLIST'] }
            },
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: limit * 2
        });

        // Calculate Jaccard-like similarity
        return coEvents.map(event => {
            const coOccurrence = event._count.userId;
            const score = coOccurrence / userIds.length; // Normalized co-occurrence

            return {
                productId: event.productId!,
                score,
                coOccurrenceCount: coOccurrence,
                reason: coOccurrence > 5 ? 'Frequently bought together' : 'Often viewed together'
            };
        }).slice(0, limit);
    }

    /**
     * Get personalized recommendations for a user
     */
    async getPersonalizedRecommendations(
        userId: string,
        options: { limit?: number; excludeIds?: string[] } = {}
    ): Promise<Array<{
        productId: string;
        score: number;
        reason: string;
        confidence: number;
    }>> {
        const { limit = 12, excludeIds = [] } = options;

        // Get user profile
        const profile = await this.buildUserProfile(userId);
        if (!profile) return [];

        // Get all active products with features
        const products = await prisma.productFeature.findMany({
            where: {
                product: { status: 'ACTIVE' },
                productId: { notIn: excludeIds }
            },
            include: { product: { include: { category: true } } }
        });

        // Score products based on user profile
        const scored = products.map(p => {
            let score = 0;
            const reasons: string[] = [];

            // Category match (35%)
            const category = p.product.category?.slug || 'unknown';
            const categoryScore = profile.categoryAffinity[category] || 0;
            score += categoryScore * 0.35;
            if (categoryScore > 0.5) reasons.push(`Matches your interest in ${category}`);

            // Style match (25%)
            const styles = JSON.parse(p.styleTags || '[]');
            let styleScore = 0;
            for (const style of styles) {
                styleScore += (profile.styleAffinity[style] || 0);
            }
            styleScore = Math.min(styleScore / Math.max(styles.length, 1), 1);
            score += styleScore * 0.25;
            if (styleScore > 0.5) reasons.push('Matches your style preferences');

            // Color match (15%)
            if (p.colorFamily && profile.colorAffinity[p.colorFamily]) {
                score += profile.colorAffinity[p.colorFamily] * 0.15;
                if (profile.colorAffinity[p.colorFamily] > 0.5) {
                    reasons.push(`In your preferred ${p.colorFamily} palette`);
                }
            }

            // Price tier match (15%)
            if (profile.priceAffinity[p.priceTier]) {
                score += profile.priceAffinity[p.priceTier] * 0.15;
            }

            // Popularity boost (10%)
            score += (p.trendingScore || 0) * 0.1;

            return {
                productId: p.productId,
                score: Math.min(score, 1),
                reason: reasons[0] || 'Recommended for you',
                confidence: Math.round(score * 100)
            };
        });

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Update or create user preference profile
     */
    async updateUserPreferenceProfile(userId: string): Promise<void> {
        const profile = await this.buildUserProfile(userId);
        if (!profile) return;

        await prisma.userPreference.upsert({
            where: { userId },
            create: {
                userId,
                categoryAffinity: JSON.stringify(profile.categoryAffinity),
                styleAffinity: JSON.stringify(profile.styleAffinity),
                colorAffinity: JSON.stringify(profile.colorAffinity),
                priceAffinity: JSON.stringify(profile.priceAffinity),
                preferenceVector: JSON.stringify(profile.preferenceVector)
            },
            update: {
                categoryAffinity: JSON.stringify(profile.categoryAffinity),
                styleAffinity: JSON.stringify(profile.styleAffinity),
                colorAffinity: JSON.stringify(profile.colorAffinity),
                priceAffinity: JSON.stringify(profile.priceAffinity),
                preferenceVector: JSON.stringify(profile.preferenceVector)
            }
        });
    }

    /**
     * Batch update all user profiles
     */
    async updateAllUserProfiles(): Promise<void> {
        const users = await prisma.user.findMany({
            where: {
                events: { some: {} }
            },
            select: { id: true }
        });

        for (const user of users) {
            await this.updateUserPreferenceProfile(user.id);
        }

        console.log(`Updated preferences for ${users.length} users`);
    }
}

export const behaviorEngine = new BehaviorBasedEngine();
