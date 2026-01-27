import { json } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import { fetchGitHub, isGitHubAuthError } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const { owner, repo, number } = params;
	const issueNumber = Number(number);
	if (!owner || !repo || Number.isNaN(issueNumber)) {
		return json({ error: 'invalid request' }, { status: 400 });
	}

	try {
		const issue = await fetchGitHub<{
			number: number;
			title: string;
			body: string | null;
			state: 'open' | 'closed';
			labels: Array<{ name: string; color: string }>;
			html_url: string;
		}>(`/repos/${owner}/${repo}/issues/${issueNumber}`, session.token);

		return json({
			number: issue.number,
			title: issue.title,
			body: issue.body ?? '',
			state: issue.state,
			labels: issue.labels,
			html_url: issue.html_url
		});
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		console.error('Failed to load GitHub issue:', error);
		return json({ error: 'failed' }, { status: 500 });
	}
};
