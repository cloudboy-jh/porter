import { createHmac } from 'crypto';
import { describe, expect, it, vi } from 'vitest';

describe('local webhook/callback smoke', () => {
	it('parses webhook mention and dispatches task', async () => {
		vi.resetModules();
		const dispatchTaskToFly = vi.fn().mockResolvedValue({
			ok: true,
			status: 'running',
			taskId: 'owner/repo#42',
			issueNumber: 42,
			summary: 'Task running on Fly Machine machine-1.'
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
		vi.doMock('$lib/server/task-dispatch', () => ({ dispatchTaskToFly }));
		vi.doMock('$lib/server/cache', () => ({ githubCache: { clearPattern } }));
		vi.doMock('$lib/server/oauth-tokens', () => ({
			getUserOAuthTokenByWebhookUser: vi.fn().mockResolvedValue('oauth-user-token')
		}));
		vi.doMock('$lib/server/store', () => ({
			getConfig: vi.fn().mockResolvedValue({
				flyToken: 'fly-token',
				flyAppName: 'porter-app',
				credentials: { anthropic: 'anthropic-key' },
				agents: { opencode: { enabled: true, priority: 'normal' } }
			})
		}));
		vi.doMock('$lib/server/github', () => ({
			addIssueComment: vi.fn(),
			addIssueCommentReaction: vi.fn().mockResolvedValue({}),
			buildPorterComment: vi.fn(),
			createInstallationAccessToken: vi.fn().mockResolvedValue({ token: 'inst-token' }),
			fetchRepoFileContent: vi.fn().mockResolvedValue(null)
		}));

		const { POST } = await import('../../../routes/api/webhooks/github/+server');

		const payload = {
			action: 'created',
			installation: { id: 999 },
			comment: {
				id: 777,
				body: '@porter opencode --priority=high focus on tests',
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
		expect(dispatchTaskToFly).toHaveBeenCalledWith(
			expect.objectContaining({
				repoOwner: 'owner',
				repoName: 'repo',
				issueNumber: 42,
				agent: 'opencode',
				priority: 'high',
				prompt: 'focus on tests',
				configToken: 'oauth-user-token'
			})
		);
		expect(clearPattern).toHaveBeenCalledWith('issues:owner/repo');
	});

	it('processes callback completion and records telemetry', async () => {
		vi.resetModules();
		const getExecutionContext = vi.fn().mockResolvedValue({
			executionId: 'task_123',
			callbackToken: 'cb-token',
			owner: 'owner',
			repo: 'repo',
			issueNumber: 42,
			agent: 'opencode',
			priority: 'normal',
			prompt: 'prompt',
			branchName: 'porter/task_123',
			baseBranch: 'main',
			githubToken: 'gh-test-token',
			createdAt: new Date().toISOString()
		});
		const consumeExecutionContext = vi.fn().mockResolvedValue(null);
		const verifyCallbackToken = vi.fn().mockReturnValue(true);
		const markExecutionTerminal = vi.fn().mockResolvedValue(null);
		const addIssueComment = vi.fn().mockResolvedValue({});
		const buildPorterComment = vi.fn().mockReturnValue('comment');
		const buildPorterLabels = vi.fn().mockReturnValue(['porter:task', 'porter:success']);
		const updateIssueLabels = vi.fn().mockResolvedValue({});
		const createPullRequest = vi.fn().mockResolvedValue({ html_url: 'https://github.com/owner/repo/pull/7', number: 7 });
		const findOpenPullRequestByHead = vi.fn().mockResolvedValue(null);

		vi.doMock('$lib/server/execution', () => ({
			getExecutionContext,
			consumeExecutionContext,
			markExecutionTerminal,
			verifyCallbackToken
		}));
		vi.doMock('$lib/server/cache', () => ({ githubCache: { clearPattern: vi.fn() } }));
		vi.doMock('$lib/server/github', () => ({
			addIssueComment,
			buildPorterComment,
			buildPorterLabels,
			createPullRequest,
			findOpenPullRequestByHead,
			fetchIssue: vi.fn().mockResolvedValue({ title: 'Fix issue', labels: [] }),
			updateIssueLabels
		}));

		const { POST } = await import('../../../routes/api/callbacks/complete/+server');

		const response = await POST({
			request: new Request('http://localhost/api/callbacks/complete', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-porter-callback-token': 'cb-token'
				},
				body: JSON.stringify({
					execution_id: 'task_123',
					status: 'complete',
					branch_name: 'porter/task_123',
					commit_hash: 'abc1234',
					callback_attempt: 3,
					callback_max_attempts: 5,
					callback_last_http_code: 502
				})
			})
		});

		expect(response.status).toBe(200);
		expect(createPullRequest).toHaveBeenCalled();
		expect(addIssueComment).toHaveBeenCalled();
		expect(buildPorterComment).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				callbackAttempts: 3,
				callbackMaxAttempts: 5,
				callbackLastHttpCode: 502
			})
		);
	});
});
