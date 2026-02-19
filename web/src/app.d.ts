// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
	// interface Error {}
	interface Locals {
		session: import('$lib/server/auth').Session | null;
		requestId: string;
	}
	interface Platform {
		env?: {
			DB?: import('$lib/server/d1').D1Database;
		};
	}
	interface PageData {
		session: import('$lib/server/auth').Session | null;
	}
	// interface PageState {}
	}
}

export {};
