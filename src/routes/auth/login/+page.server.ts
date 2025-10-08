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

		// Spotify OAuth URL
		const params = new URLSearchParams({
			client_id: '69bf2b1658984b20b7fcbe93915814f6',
			response_type: 'code',
			redirect_uri: 'https://spocky.ouchwowboing.io/auth/callback/spotify',
			scope: 'user-read-email user-read-private playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-follow-read user-follow-modify user-library-read streaming user-read-playback-state user-modify-playback-state',
			state: state
		});

		throw redirect(303, `https://accounts.spotify.com/authorize?${params}`);
	}
};