// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			auth: () => Promise<Session | null>;
			user?: {
				id: string;
				email: string;
				name: string;
				image?: string;
				spotifyId?: string;
			};
			session?: any;
		}
		interface PageData {
			user?: App.Locals['user'];
		}
		// interface PageState {}
		// interface Platform {}
	}
}

interface Session {
	user?: {
		id: string;
		email?: string | null;
		name?: string | null;
		image?: string | null;
	};
	expires: string;
	accessToken?: string;
	refreshToken?: string;
}

export {};