import { json } from '@sveltejs/kit';

import { getConfig, getConfigSecretStatus, getConfigWarnings, updateConfig } from '$lib/server/store';
import { getConfigGistUrl } from '$lib/server/gist';
import { normalizeGitHubError } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';
import type { PorterConfig } from '$lib/server/types';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.config', 'unauthorized', { requestId });
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
		logEvent('info', 'api.config', 'loaded', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			warningCount: warnings.length,
			token: tokenFingerprint(locals.session.token)
		});
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
		logEvent('error', 'api.config', 'load_failed', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			normalized,
			error: serializeError(error)
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
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.config', 'unauthorized_put', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const payload = (await request.json()) as PorterConfig;
		const updated = await updateConfig(locals.session.token, payload, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		logEvent('info', 'api.config', 'updated', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token)
		});
		return json(updated);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: error instanceof Error ? error.message : 'Failed to save config.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		logEvent('error', 'api.config', 'update_failed', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			normalized,
			error: serializeError(error)
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
