import type { PorterConfig } from './types';

const GITHUB_API = 'https://api.github.com';
const CONFIG_FILENAME = 'porter-config.json';
const CONFIG_DESCRIPTION = 'Porter Config';

const gistIdCache = new Map<string, string>();

const getAuthHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

type GistSummary = {
	id: string;
	description?: string | null;
	files?: Record<string, { filename?: string }>;
	html_url?: string;
};

const listGists = async (token: string): Promise<GistSummary[]> => {
	const response = await fetch(`${GITHUB_API}/gists?per_page=100`, {
		headers: {
			Accept: 'application/vnd.github+json',
			...getAuthHeaders(token)
		}
	});
	if (!response.ok) {
		return [];
	}
	return (await response.json()) as GistSummary[];
};

const findConfigGist = async (token: string): Promise<GistSummary | null> => {
	const cached = gistIdCache.get(token);
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
		gistIdCache.set(token, match.id);
		return match;
	}
	return null;
};

const createConfigGist = async (token: string, config: PorterConfig): Promise<GistSummary | null> => {
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
	if (!response.ok) return null;
	const gist = (await response.json()) as GistSummary;
	if (gist.id) {
		gistIdCache.set(token, gist.id);
	}
	return gist;
};

const ensureConfigGist = async (token: string, config: PorterConfig): Promise<GistSummary | null> => {
	const existing = await findConfigGist(token);
	if (existing?.id) return existing;
	return createConfigGist(token, config);
};

export const loadConfigFromGist = async (
	token: string,
	fallbackConfig: PorterConfig
): Promise<PorterConfig | null> => {
	const gist = await ensureConfigGist(token, fallbackConfig);
	if (!gist?.id) {
		return null;
	}
	const response = await fetch(`${GITHUB_API}/gists/${gist.id}`, {
		headers: {
			Accept: 'application/vnd.github+json',
			...getAuthHeaders(token)
		}
	});
	if (!response.ok) {
		return null;
	}
	const data = (await response.json()) as { files?: Record<string, { content?: string }> };
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
	return response.ok;
};
