
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/agents" | "/api/agents/[name]" | "/api/agents/[name]/status" | "/api/config" | "/api/tasks" | "/api/tasks/[id]" | "/api/tasks/[id]/retry" | "/api/tasks/[id]/stop" | "/api/webhooks" | "/api/webhooks/github" | "/history" | "/settings";
		RouteParams(): {
			"/api/agents/[name]": { name: string };
			"/api/agents/[name]/status": { name: string };
			"/api/tasks/[id]": { id: string };
			"/api/tasks/[id]/retry": { id: string };
			"/api/tasks/[id]/stop": { id: string }
		};
		LayoutParams(): {
			"/": { name?: string; id?: string };
			"/api": { name?: string; id?: string };
			"/api/agents": { name?: string };
			"/api/agents/[name]": { name: string };
			"/api/agents/[name]/status": { name: string };
			"/api/config": Record<string, never>;
			"/api/tasks": { id?: string };
			"/api/tasks/[id]": { id: string };
			"/api/tasks/[id]/retry": { id: string };
			"/api/tasks/[id]/stop": { id: string };
			"/api/webhooks": Record<string, never>;
			"/api/webhooks/github": Record<string, never>;
			"/history": Record<string, never>;
			"/settings": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/agents" | "/api/agents/" | `/api/agents/${string}` & {} | `/api/agents/${string}/` & {} | `/api/agents/${string}/status` & {} | `/api/agents/${string}/status/` & {} | "/api/config" | "/api/config/" | "/api/tasks" | "/api/tasks/" | `/api/tasks/${string}` & {} | `/api/tasks/${string}/` & {} | `/api/tasks/${string}/retry` & {} | `/api/tasks/${string}/retry/` & {} | `/api/tasks/${string}/stop` & {} | `/api/tasks/${string}/stop/` & {} | "/api/webhooks" | "/api/webhooks/" | "/api/webhooks/github" | "/api/webhooks/github/" | "/history" | "/history/" | "/settings" | "/settings/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}