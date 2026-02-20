import { json } from '@sveltejs/kit';

import { getConfigSecretStatus, updateCredentials } from '$lib/server/store';
import { normalizeGitHubError } from '$lib/server/github';
import type { PorterConfig } from '$lib/server/types';

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const payload = (await request.json()) as PorterConfig['credentials'];
		const identity = {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		};
		await updateCredentials(locals.session.token, payload ?? {}, identity);
		const status = await getConfigSecretStatus(locals.session.token, identity);
		return json({ ok: true, secretStatus: status });
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: error instanceof Error ? error.message : 'Failed to save credentials.',
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
