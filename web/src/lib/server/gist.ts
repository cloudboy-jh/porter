import type { PorterConfig } from './types';

const GITHUB_API = 'https://api.github.com';

const configFilename = 'porter-config.json';

const getAuthHeaders = () => {
	const token = process.env.GITHUB_TOKEN;
	return token ? { Authorization: `Bearer ${token}` } : {};
};

const getGistId = () => process.env.GITHUB_GIST_ID ?? '';

export const loadConfigFromGist = async (): Promise<PorterConfig | null> => {
	const gistId = getGistId();
	if (!gistId) {
		return null;
	}
	const response = await fetch(`${GITHUB_API}/gists/${gistId}`, {
		headers: {
			Accept: 'application/vnd.github+json',
			...getAuthHeaders()
		}
	});
	if (!response.ok) {
		return null;
	}
	const data = (await response.json()) as { files?: Record<string, { content?: string }> };
	const content = data.files?.[configFilename]?.content;
	if (!content) {
		return null;
	}
	return JSON.parse(content) as PorterConfig;
};

export const saveConfigToGist = async (config: PorterConfig): Promise<boolean> => {
	const gistId = getGistId();
	if (!gistId) {
		return false;
	}
	const response = await fetch(`${GITHUB_API}/gists/${gistId}`, {
		method: 'PATCH',
		headers: {
			Accept: 'application/vnd.github+json',
			'Content-Type': 'application/json',
			...getAuthHeaders()
		},
		body: JSON.stringify({
			files: {
				[configFilename]: {
					content: JSON.stringify(config, null, 2)
				}
			}
		})
	});
	return response.ok;
};
