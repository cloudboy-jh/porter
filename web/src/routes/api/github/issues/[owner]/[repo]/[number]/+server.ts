import { json } from '@sveltejs/kit';
import { fetchGitHub } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const { owner, repo, number } = params;
	const issueNumber = Number(number);
	if (!owner || !repo || Number.isNaN(issueNumber)) {
		return json({ error: 'invalid request' }, { status: 400 });
	}

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
};
