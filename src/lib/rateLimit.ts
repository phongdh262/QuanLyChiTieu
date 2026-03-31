type RateLimitOptions = {
    uniqueTokenPerInterval?: number;
    interval?: number;
};

type TokenEntry = { count: number[]; expiresAt: number };

export class RateLimit {
    private cache: Map<string, TokenEntry>;
    private interval: number;
    private maxTokens: number;

    constructor(options?: RateLimitOptions) {
        this.cache = new Map();
        this.interval = options?.interval || 60000;
        this.maxTokens = options?.uniqueTokenPerInterval || 500;
    }

    check(limit: number, token: string) {
        const now = Date.now();

        // Evict expired entries when cache grows
        if (this.cache.size > this.maxTokens) {
            for (const [key, entry] of this.cache) {
                if (entry.expiresAt < now) this.cache.delete(key);
            }
        }

        let entry = this.cache.get(token);
        if (!entry || entry.expiresAt < now) {
            entry = { count: [0], expiresAt: now + this.interval };
            this.cache.set(token, entry);
        }

        entry.count[0] += 1;
        const currentUsage = entry.count[0];
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
    interval: 60 * 1000,
});

// Global instance for Reset Password route
// Limit: 3 requests per 60 seconds per IP
export const resetPasswordRateLimit = new RateLimit({
    uniqueTokenPerInterval: 500,
    interval: 60 * 1000,
});
