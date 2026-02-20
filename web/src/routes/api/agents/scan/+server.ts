import { json } from '@sveltejs/kit';
import { scanAgentsNow } from '$lib/server/store';
import { normalizeGitHubError } from '$lib/server/github';

export const POST = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const agents = await scanAgentsNow(locals.session.token, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		return json(agents);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to scan agents.',
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
