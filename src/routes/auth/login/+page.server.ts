import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	spotify: async ({ cookies }) => {
		// Clear any existing Auth.js cookies
		const allCookies = cookies.getAll();
		for (const cookie of allCookies) {
			if (cookie.name.includes('authjs') || cookie.name.includes('__Secure-authjs')) {
				cookies.delete(cookie.name, { path: '/' });
			}
		}

		// Generate a random state for security
		const state = Math.random().toString(36).substring(7);

		// Get configuration from environment variables (required)
		const baseUrl = process.env.PUBLIC_BASE_URL;
		const clientId = process.env.AUTH_SPOTIFY_ID;

		if (!baseUrl || !clientId) {
			throw new Error('Missing required environment variables: PUBLIC_BASE_URL or AUTH_SPOTIFY_ID');
		}

		// Spotify OAuth URL
		const params = new URLSearchParams({
			client_id: clientId,
			response_type: 'code',
			redirect_uri: `${baseUrl}/auth/callback/spotify`,
			scope: 'user-read-email user-read-private playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-follow-read user-follow-modify user-library-read streaming user-read-playback-state user-modify-playback-state',
			state: state
		});

		throw redirect(303, `https://accounts.spotify.com/authorize?${params}`);
	}
};