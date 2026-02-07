import { render, screen } from '@testing-library/svelte/svelte5';
import { describe, expect, it } from 'vitest';
import TaskFeed from '$lib/components/TaskFeed.svelte';
import type { Task } from '$lib/types/task';

const baseTask: Task = {
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
	git: { add: 2, remove: 1 }
};

	describe('TaskFeed', () => {
	it('shows empty state when no tasks', () => {
		render(TaskFeed, { props: { title: 'Tasks', tasks: [] } });
		expect(screen.getByText('No active tasks yet')).toBeInTheDocument();
	});

	it('renders a task card', () => {
		render(TaskFeed, { props: { title: 'Tasks', tasks: [baseTask] } });
		expect(screen.getByText('Verify task rendering')).toBeInTheDocument();
		expect(screen.getByText('Running')).toBeInTheDocument();
		expect(screen.getByText('#101')).toBeInTheDocument();
	});
});
