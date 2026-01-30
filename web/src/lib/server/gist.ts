import type { PorterConfig } from './types';
import { githubCache, CACHE_TTL } from './cache';

const GITHUB_API = 'https://api.github.com';
const CONFIG_FILENAME = 'porter-config.json';
const CONFIG_DESCRIPTION = 'Porter Config';

// Track rate limit info for gists
let rateLimitRemaining = 5000;
let rateLimitReset = 0;

const getAuthHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

const updateRateLimitFromResponse = (response: Response) => {
	const remaining = response.headers.get('X-RateLimit-Remaining');
	const reset = response.headers.get('X-RateLimit-Reset');
	if (remaining) rateLimitRemaining = parseInt(remaining, 10);
	if (reset) rateLimitReset = parseInt(reset, 10);
};

type GistSummary = {
	id: string;
	description?: string | null;
	files?: Record<string, { filename?: string }>;
	html_url?: string;
};

const listGists = async (token: string): Promise<GistSummary[]> => {
	const cacheKey = `gists:list:${token.slice(-8)}`;
	
	return githubCache.getOrFetch(cacheKey, async () => {
		console.log('[Fetching] listGists from GitHub');
		const response = await fetch(`${GITHUB_API}/gists?per_page=100`, {
			headers: {
				Accept: 'application/vnd.github+json',
				...getAuthHeaders(token)
			}
		});
		updateRateLimitFromResponse(response);
		if (!response.ok) {
			return [];
		}
		return (await response.json()) as GistSummary[];
	}, CACHE_TTL.INSTALLATIONS); // Use longer TTL for gist list (5 min)
};

const findConfigGist = async (token: string): Promise<GistSummary | null> => {
	const cacheKey = `gists:configId:${token.slice(-8)}`;
	const cached = githubCache.get<string>(cacheKey);
	if (cached) {
		return { id: cached };
	}
	
	const gists = await listGists(token);
	const match = gists.find((gist) => {
		const files = gist.files ?? {};
		if (files[CONFIG_FILENAME]) return true;
		return Object.values(files).some((file) => file.filename === CONFIG_FILENAME);
	});
	if (match?.id) {
		githubCache.set(cacheKey, match.id, CACHE_TTL.INSTALLATIONS);
		return match;
	}
	return null;
};

const createConfigGist = async (token: string, config: PorterConfig): Promise<GistSummary | null> => {
	console.log('[Fetching] createConfigGist');
	const response = await fetch(`${GITHUB_API}/gists`, {
		method: 'POST',
		headers: {
			Accept: 'application/vnd.github+json',
			'Content-Type': 'application/json',
			...getAuthHeaders(token)
		},
		body: JSON.stringify({
			description: CONFIG_DESCRIPTION,
			public: false,
			files: {
				[CONFIG_FILENAME]: {
					content: JSON.stringify(config, null, 2)
				}
			}
		})
	});
	updateRateLimitFromResponse(response);
	if (!response.ok) return null;
	const gist = (await response.json()) as GistSummary;
	if (gist.id) {
		const cacheKey = `gists:configId:${token.slice(-8)}`;
		githubCache.set(cacheKey, gist.id, CACHE_TTL.INSTALLATIONS);
	}
	return gist;
};

const ensureConfigGist = async (token: string, config: PorterConfig): Promise<GistSummary | null> => {
	const existing = await findConfigGist(token);
	if (existing?.id) return existing;
	return createConfigGist(token, config);
};

const fetchGist = async (token: string, gistId: string): Promise<GistSummary | null> => {
	const cacheKey = `gists:${gistId}:${token.slice(-8)}`;
	
	return githubCache.getOrFetch(cacheKey, async () => {
		console.log(`[Fetching] fetchGist: ${gistId}`);
		const response = await fetch(`${GITHUB_API}/gists/${gistId}`, {
			headers: {
				Accept: 'application/vnd.github+json',
				...getAuthHeaders(token)
			}
		});
		updateRateLimitFromResponse(response);
		if (!response.ok) {
			return null;
		}
		return (await response.json()) as GistSummary;
	}, CACHE_TTL.INSTALLATIONS);
};

export const loadConfigFromGist = async (
	token: string,
	fallbackConfig: PorterConfig
): Promise<PorterConfig | null> => {
	const gist = await ensureConfigGist(token, fallbackConfig);
	if (!gist?.id) {
		return null;
	}
	const gistData = await fetchGist(token, gist.id);
	if (!gistData) {
		return null;
	}
	
	const data = gistData as unknown as { files?: Record<string, { content?: string }> };
	const content = data.files?.[CONFIG_FILENAME]?.content;
	if (!content) {
		await saveConfigToGist(token, fallbackConfig);
		return fallbackConfig;
	}
	try {
		return JSON.parse(content) as PorterConfig;
	} catch {
		await saveConfigToGist(token, fallbackConfig);
		return fallbackConfig;
	}
};

export const saveConfigToGist = async (token: string, config: PorterConfig): Promise<boolean> => {
	const gist = await ensureConfigGist(token, config);
	if (!gist?.id) return false;
	console.log(`[Fetching] saveConfigToGist: ${gist.id}`);
	const response = await fetch(`${GITHUB_API}/gists/${gist.id}`, {
		method: 'PATCH',
		headers: {
			Accept: 'application/vnd.github+json',
			'Content-Type': 'application/json',
			...getAuthHeaders(token)
		},
		body: JSON.stringify({
			files: {
				[CONFIG_FILENAME]: {
					content: JSON.stringify(config, null, 2)
				}
			}
		})
	});
	updateRateLimitFromResponse(response);
	
	// Clear the gist cache on save since content changed
	if (response.ok) {
		const cacheKey = `gists:${gist.id}:${token.slice(-8)}`;
		githubCache.delete(cacheKey);
	}
	
	return response.ok;
};

export const clearGistCache = (token: string) => {
	const cacheKey = `gists:configId:${token.slice(-8)}`;
	githubCache.delete(cacheKey);
	githubCache.clearPattern(`gists:list:${token.slice(-8)}`);
};
