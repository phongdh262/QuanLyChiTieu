import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
    uniqueTokenPerInterval?: number;
    interval?: number;
};

export class RateLimit {
    tokenCache: LRUCache<string, number[]>;

    constructor(options?: RateLimitOptions) {
        this.tokenCache = new LRUCache({
            max: options?.uniqueTokenPerInterval || 500,
            ttl: options?.interval || 60000,
        });
    }

    check(limit: number, token: string) {
        const tokenCount = this.tokenCache.get(token) || [0];
        if (tokenCount[0] === 0) {
            this.tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage > limit;

        return {
            isRateLimited,
            currentUsage,
            limit,
            remaining: isRateLimited ? 0 : limit - currentUsage,
        };
    }
}

// Global instance for Login route
// Limit: 5 requests per 60 seconds per IP
export const loginRateLimit = new RateLimit({
    uniqueTokenPerInterval: 500,
    interval: 60 * 1000, // 60 seconds
});
