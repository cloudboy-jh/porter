type CacheEntry<T> = {
	data: T;
	timestamp: number;
	ttl: number;
};

type InFlightRequest<T> = {
	promise: Promise<T>;
	timestamp: number;
};

class SimpleCache {
	private cache = new Map<string, CacheEntry<unknown>>();
	private inFlight = new Map<string, InFlightRequest<unknown>>();

	get<T>(key: string): T | null {
		const entry = this.cache.get(key) as CacheEntry<T> | undefined;
		if (!entry) return null;
		
		const now = Date.now();
		if (now - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}
		
		return entry.data;
	}

	set<T>(key: string, data: T, ttlMs: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttlMs
		});
	}

	clear(): void {
		this.cache.clear();
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clearPattern(pattern: string): void {
		for (const key of this.cache.keys()) {
			if (key.includes(pattern)) {
				this.cache.delete(key);
			}
		}
	}

	// Request coalescing - prevents duplicate in-flight requests
	async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T> {
		// Check cache first
		const cached = this.get<T>(key);
		if (cached) return cached;

		// Check if there's already an in-flight request
		const inFlight = this.inFlight.get(key) as InFlightRequest<T> | undefined;
		if (inFlight) {
			console.log(`[Coalescing] Waiting for in-flight request: ${key}`);
			return inFlight.promise;
		}

		// Create new request
		const promise = fetcher().then(result => {
			this.set(key, result, ttlMs);
			this.inFlight.delete(key);
			return result;
		}).catch(error => {
			this.inFlight.delete(key);
			throw error;
		});

		this.inFlight.set(key, { promise, timestamp: Date.now() });
		return promise;
	}
}

export const githubCache = new SimpleCache();

// Cache TTLs
export const CACHE_TTL = {
	REPOS: 60000,      // 1 minute for repository list
	ISSUES: 30000,     // 30 seconds for issues list
	COMMENTS: 30000,   // 30 seconds for comments
	INSTALLATIONS: 300000  // 5 minutes for installations (rarely changes)
};
