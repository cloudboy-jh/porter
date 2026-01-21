export type Task = {
	id: string;
	status: 'queued' | 'running' | 'success' | 'failed';
	statusLabel: string;
	title: string;
	technicalSummary?: string;
	repo: string;
	branch?: string;
	issue: string;
	agent: string;
	progress: number;
	started: string;
	expanded: boolean;
	logs: Array<{ time: string; level: string; message: string }>;
	prUrl?: string;
	prNumber?: number;
	commitHash?: string;
	git?: { add: number; remove: number };
};
