type DurableObjectNamespace = any;
type DurableObjectState = any;
type ExportedHandler<T> = any;
declare class DurableObject {
	constructor(ctx: DurableObjectState, env: unknown);
}

export interface Env {
	TASK_RUNNER: DurableObjectNamespace;
	PORTER_DO_DISPATCH_TOKEN?: string;
}

type DispatchPayload = {
	taskId: string;
	repoOwner: string;
	repoName: string;
	issueNumber: number;
	priority: 'low' | 'normal' | 'high';
	model: string;
	prompt: string;
	baseBranch: string;
	installationId?: number;
};

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' }
	});

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/dispatch') {
			const auth = request.headers.get('authorization') ?? '';
			const expected = env.PORTER_DO_DISPATCH_TOKEN?.trim();
			if (expected && auth !== `Bearer ${expected}`) {
				return json({ error: 'unauthorized' }, 401);
			}

			const payload = (await request.json()) as DispatchPayload;
			if (!payload.taskId || !payload.repoOwner || !payload.repoName || !payload.issueNumber) {
				return json({ error: 'invalid dispatch payload' }, 400);
			}

			const id = env.TASK_RUNNER.idFromName(payload.taskId);
			const stub = env.TASK_RUNNER.get(id);
			await stub.fetch('https://task.internal/run', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});

			return json({ accepted: true, taskId: payload.taskId }, 202);
		}

		return json({ ok: true, service: 'porter-runtime' });
	}
} satisfies ExportedHandler<Env>;

export class TaskRunnerDO extends DurableObject {
	private state: DurableObjectState;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.state = ctx;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (request.method === 'POST' && url.pathname === '/run') {
			const payload = (await request.json()) as DispatchPayload;
			await this.state.storage.put('task', {
				...payload,
				state: 'queued',
				updatedAt: new Date().toISOString()
			});

			this.state.waitUntil(this.run(payload));
			return json({ ok: true, state: 'queued' }, 202);
		}

		if (request.method === 'GET' && url.pathname === '/state') {
			const task = await this.state.storage.get('task');
			return json({ task: task ?? null });
		}

		return json({ error: 'not_found' }, 404);
	}

	private async run(payload: DispatchPayload): Promise<void> {
		const advance = async (state: string) => {
			const existing = ((await this.state.storage.get('task')) as Record<string, unknown> | undefined) ?? {};
			await this.state.storage.put('task', {
				...existing,
				state,
				updatedAt: new Date().toISOString()
			});
		};

		try {
			await advance('reading');
			await advance('running');
			await advance('committing');
			await advance('pr_opened');
			await advance('done');
		} catch {
			await advance('failed');
		}
	}
}
