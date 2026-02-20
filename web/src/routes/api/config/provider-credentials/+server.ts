import { json } from '@sveltejs/kit';

import { getConfigSecretStatus, updateProviderCredentials } from '$lib/server/store';
import { normalizeGitHubError } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';
import type { PorterConfig } from '$lib/server/types';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.config.provider_credentials', 'unauthorized_get', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const status = await getConfigSecretStatus(locals.session.token, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		logEvent('info', 'api.config.provider_credentials', 'loaded', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token)
		});
		return json(status.providerCredentials ?? {});
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to load provider credentials.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		logEvent('error', 'api.config.provider_credentials', 'load_failed', {
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
		logEvent('warn', 'api.config.provider_credentials', 'unauthorized_put', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const payload = (await request.json()) as PorterConfig['providerCredentials'];
		const identity = {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		};
		await updateProviderCredentials(locals.session.token, payload ?? {}, identity);
		const status = await getConfigSecretStatus(locals.session.token, identity);
		logEvent('info', 'api.config.provider_credentials', 'updated', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token)
		});
		return json(status.providerCredentials ?? {});
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to save provider credentials.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		logEvent('error', 'api.config.provider_credentials', 'update_failed', {
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
