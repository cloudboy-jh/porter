import { render, screen } from '@testing-library/svelte/svelte5';
import { describe, expect, it } from 'vitest';
import TaskFeed from '$lib/components/TaskFeed.svelte';
import { makeMockTask } from '$lib/test/mocks/tasks';

const baseTask = makeMockTask();

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
