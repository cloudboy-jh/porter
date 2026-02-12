const FLY_API_BASE = 'https://api.machines.dev/v1';

type FlyApp = {
	name: string;
	organization?: { slug?: string };
};

type FlyMachineCreateRequest = {
	config: {
		image: string;
		auto_destroy: boolean;
		env?: Record<string, string>;
		guest?: {
			cpu_kind?: 'shared' | 'performance';
			cpus?: number;
			memory_mb?: number;
		};
	};
};

type FlyMachineCreateResponse = {
	id: string;
	state?: string;
};

type FlyApiError = {
	error?: string;
	message?: string;
	details?: unknown;
};

export class FlyRequestError extends Error {
	status: number;
	body: string;

	constructor(status: number, body: string) {
		super(`Fly request failed: ${status}`);
		this.name = 'FlyRequestError';
		this.status = status;
		this.body = body;
	}
}

const flyHeaders = (token: string, extra?: Record<string, string>) => ({
	Authorization: `Bearer ${token}`,
	'Content-Type': 'application/json',
	...(extra ?? {})
});

const parseErrorMessage = (body: string) => {
	try {
		const parsed = JSON.parse(body) as FlyApiError;
		return parsed.message ?? parsed.error ?? body;
	} catch {
		return body;
	}
};

const flyFetch = async <T>(token: string, path: string, init?: RequestInit): Promise<T> => {
	const response = await fetch(`${FLY_API_BASE}${path}`, {
		...init,
		headers: flyHeaders(token, (init?.headers ?? {}) as Record<string, string>)
	});

	if (!response.ok) {
		const body = await response.text();
		throw new FlyRequestError(response.status, body);
	}

	if (response.status === 204) {
		return {} as T;
	}

	return (await response.json()) as T;
};

export const getFlyApp = async (token: string, appName: string): Promise<FlyApp | null> => {
	try {
		return await flyFetch<FlyApp>(token, `/apps/${encodeURIComponent(appName)}`);
	} catch (error) {
		if (error instanceof FlyRequestError && error.status === 404) {
			return null;
		}
		throw error;
	}
};

export const createFlyApp = async (token: string, appName: string): Promise<FlyApp> => {
	return flyFetch<FlyApp>(token, '/apps', {
		method: 'POST',
		body: JSON.stringify({ app_name: appName })
	});
};

export const ensureFlyApp = async (token: string, appName: string) => {
	const existing = await getFlyApp(token, appName);
	if (existing) {
		return { app: existing, created: false };
	}
	const app = await createFlyApp(token, appName);
	return { app, created: true };
};

export const createFlyMachine = async (
	token: string,
	appName: string,
	payload: FlyMachineCreateRequest
): Promise<FlyMachineCreateResponse> => {
	return flyFetch<FlyMachineCreateResponse>(
		token,
		`/apps/${encodeURIComponent(appName)}/machines`,
		{
			method: 'POST',
			body: JSON.stringify(payload)
		}
	);
};

export const destroyFlyMachine = async (token: string, appName: string, machineId: string) => {
	return flyFetch<Record<string, unknown>>(
		token,
		`/apps/${encodeURIComponent(appName)}/machines/${encodeURIComponent(machineId)}`,
		{
			method: 'DELETE'
		}
	);
};

export const validateFlyCredentials = async (token: string, appName: string) => {
	const trimmedToken = token.trim();
	const trimmedApp = appName.trim();
	if (!trimmedToken || !trimmedApp) {
		return {
			ok: false,
			status: 'missing',
			message: 'Fly token and app name are required.',
			appCreated: false
		} as const;
	}

	try {
		const { app, created } = await ensureFlyApp(trimmedToken, trimmedApp);
		return {
			ok: true,
			status: 'ready',
			message: created ? `Fly app ${app.name} created.` : `Fly app ${app.name} is ready.`,
			appCreated: created
		} as const;
	} catch (error) {
		if (error instanceof FlyRequestError) {
			if (error.status === 401 || error.status === 403) {
				return {
					ok: false,
					status: 'invalid_token',
					message: 'Invalid Fly token.',
					appCreated: false
				} as const;
			}
			return {
				ok: false,
				status: 'error',
				message: parseErrorMessage(error.body),
				appCreated: false
			} as const;
		}

		return {
			ok: false,
			status: 'error',
			message: 'Unable to validate Fly credentials.',
			appCreated: false
		} as const;
	}
};
