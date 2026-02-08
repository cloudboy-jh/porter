import type { Task } from '$lib/types/task';

export const makeMockTask = (overrides: Partial<Task> = {}): Task => ({
	id: 'task-1',
	status: 'running',
	statusLabel: 'RUN',
	title: 'Verify task rendering',
	technicalSummary: 'Added baseline render test',
	repo: 'porter',
	branch: 'main',
	issue: '#101',
	agent: 'opencode',
	progress: 40,
	started: '2m ago',
	expanded: false,
	logs: [],
	git: { add: 2, remove: 1 },
	...overrides
});

export const mockReviewTasks: Task[] = [
	makeMockTask({
		id: 'mock-review-1',
		status: 'success',
		statusLabel: 'DONE',
		title: 'MOCK: Refresh billing copy',
		repo: 'harvest',
		issue: '#201',
		agent: 'amp',
		progress: 100,
		started: '48m ago',
		prUrl: 'https://github.com/jackgolding/harvest/pull/124',
		prNumber: 124,
		git: { add: 8, remove: 3 }
	}),
	makeMockTask({
		id: 'mock-review-2',
		status: 'success',
		statusLabel: 'DONE',
		title: 'MOCK: Update onboarding emails',
		repo: 'onboard',
		issue: '#19',
		agent: 'claude-code',
		progress: 100,
		started: '2h ago',
		prUrl: 'https://github.com/jackgolding/onboard/pull/88',
		prNumber: 88,
		git: { add: 14, remove: 6 }
	})
];
