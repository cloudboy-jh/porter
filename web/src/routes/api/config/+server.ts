import { json } from '@sveltejs/kit';

import { getConfig, getConfigSecretStatus, getConfigWarnings, updateConfig } from '$lib/server/store';
import { getConfigGistUrl } from '$lib/server/gist';
import { normalizeGitHubError } from '$lib/server/github';
import type { PorterConfig } from '$lib/server/types';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const identity = {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		};
		const config = await getConfig(locals.session.token, identity);
		const secretStatus = await getConfigSecretStatus(locals.session.token, identity);
		const warnings = getConfigWarnings(locals.session.token, identity);
		const gistUrl = await getConfigGistUrl(locals.session.token);
		return json({
			...config,
			flyToken: '',
			credentials: {},
			providerCredentials: {},
			secretStatus,
			warnings,
			gistUrl
		});
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to load config.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		return json(
			{
				error: normalized.error,
				message: normalized.message,
				action: normalized.action,
				actionUrl: normalized.actionUrl
			},
			{ status: normalized.httpStatus }
		);
	}
};

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const payload = (await request.json()) as PorterConfig;
		const updated = await updateConfig(locals.session.token, payload, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		return json(updated);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: error instanceof Error ? error.message : 'Failed to save config.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		return json(
			{
				error: normalized.error,
				message: normalized.message,
				action: normalized.action,
				actionUrl: normalized.actionUrl
			},
			{ status: normalized.httpStatus === 500 ? 503 : normalized.httpStatus }
		);
	}
};
