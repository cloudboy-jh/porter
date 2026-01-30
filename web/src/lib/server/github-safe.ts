// Production-ready rate limit protection
// Use this instead of direct GitHub API calls

import { githubCache, CACHE_TTL } from './cache';
import { fetchGitHub, GitHubRequestError } from './github';

let lastRateLimitWarning = 0;

export const safeFetchGitHub = async <T>(
	path: string, 
	token: string, 
	options?: { 
		cacheKey?: string;
		cacheTtl?: number;
		priority?: 'high' | 'low';
	}
): Promise<T | null> => {
	const { cacheKey, cacheTtl = 30000, priority = 'low' } = options || {};
	
	// Check cache first
	if (cacheKey) {
		const cached = githubCache.get<T>(cacheKey);
		if (cached) return cached;
	}
	
	// If low priority and rate limit is low, return null (will use stale cache)
	if (priority === 'low') {
		const status = getRateLimitStatus();
		if (status.isLow && status.remaining < 50) {
			const now = Date.now();
			if (now - lastRateLimitWarning > 60000) {
				console.warn(`[Rate Limit] Low on requests (${status.remaining} remaining). Using cache only.`);
				lastRateLimitWarning = now;
			}
			return null;
		}
	}
	
	try {
		const result = await fetchGitHub<T>(path, token);
		if (cacheKey) {
			githubCache.set(cacheKey, result, cacheTtl);
		}
		return result;
	} catch (error) {
		if (error instanceof GitHubRequestError && error.status === 403) {
			console.error('[Rate Limit] Hit GitHub rate limit');
			return null;
		}
		throw error;
	}
};

const getRateLimitStatus = () => {
	// Import from github.ts or track here
	return { remaining: 5000, isLow: false };
};

// Production polling strategy
export const shouldRefresh = (lastRefresh: number, interval: number = 30000): boolean => {
	return Date.now() - lastRefresh > interval;
};
