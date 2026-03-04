import { createHmac } from 'crypto';
import { describe, expect, it, vi } from 'vitest';

describe('local webhook smoke', () => {
	it('parses webhook mention and dispatches task', async () => {
		vi.resetModules();
		const dispatchTaskToDo = vi.fn().mockResolvedValue({
			ok: true,
			status: 'running',
			taskId: 'owner/repo#42',
			issueNumber: 42,
			summary: 'Task running in Durable Object.'
		});
		const clearPattern = vi.fn();

		vi.doMock('$env/dynamic/private', () => ({
			env: {
				WEBHOOK_SECRET: 'test-webhook-secret',
				PORTER_PRODUCTION_ALLOWLIST: '',
				GITHUB_APP_ID: '123',
				GITHUB_APP_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\\nabc\\n-----END RSA PRIVATE KEY-----'
			}
		}));
		vi.doMock('$lib/server/task-dispatch', () => ({ dispatchTaskToDo }));
		vi.doMock('$lib/server/cache', () => ({ githubCache: { clearPattern } }));
		vi.doMock('$lib/server/oauth-tokens', () => ({
			getUserOAuthTokenByWebhookUser: vi.fn().mockResolvedValue('oauth-user-token')
		}));
		vi.doMock('$lib/server/store', () => ({
			getConfig: vi.fn().mockResolvedValue({
				credentials: { anthropic: 'anthropic-key' },
				selectedModel: 'anthropic/claude-sonnet-4'
			})
		}));
		vi.doMock('$lib/server/github', () => ({
			addIssueComment: vi.fn(),
			addIssueCommentReaction: vi.fn().mockResolvedValue({}),
			buildPorterComment: vi.fn(),
			createInstallationAccessToken: vi.fn().mockResolvedValue({ token: 'inst-token' }),
			fetchRepoFileContent: vi.fn().mockResolvedValue(null),
			normalizeGitHubError: vi.fn((error: unknown) => ({
				httpStatus: 500,
				error: 'failed',
				message: error instanceof Error ? error.message : 'failed'
			}))
		}));

		const { POST } = await import('../../../routes/api/webhooks/github/+server');

		const payload = {
			action: 'created',
			installation: { id: 999 },
			comment: {
				id: 777,
				body: '@porter --model=openai/gpt-4.1 --priority=high focus on tests',
				user: { id: 1234, login: 'cloudboy-jh', type: 'User' }
			},
			issue: { number: 42, title: 'Fix', body: 'Body' },
			repository: { owner: { login: 'owner' }, name: 'repo', default_branch: 'main' }
		};
		const raw = JSON.stringify(payload);
		const signature = `sha256=${createHmac('sha256', 'test-webhook-secret').update(raw).digest('hex')}`;

		const response = await POST({
			request: new Request('http://localhost/api/webhooks/github', {
				method: 'POST',
				headers: {
					'x-github-event': 'issue_comment',
					'x-hub-signature-256': signature,
					'content-type': 'application/json'
				},
				body: raw
			})
		});

		expect(response.status).toBe(202);
		expect(dispatchTaskToDo).toHaveBeenCalledWith(
			expect.objectContaining({
				repoOwner: 'owner',
				repoName: 'repo',
				issueNumber: 42,
				model: 'openai/gpt-4.1',
				priority: 'high',
				prompt: 'focus on tests',
				configToken: 'oauth-user-token'
			})
		);
		expect(clearPattern).toHaveBeenCalledWith('issues:owner/repo');
	});
});
