import type { PageServerLoad } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function refreshAccessToken(refreshToken: string) {
	const response = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': 'Basic ' + Buffer.from('69bf2b1658984b20b7fcbe93915814f6:f2523336f86e4ba8b9cc15f293825963').toString('base64')
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken
		})
	});

	if (!response.ok) {
		throw new Error('Failed to refresh token');
	}

	return response.json();
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	// Get user from session
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return {
			spotifyPlaylists: [],
			error: null
		};
	}

	try {
		// Get session with user
		const session = await prisma.session.findUnique({
			where: { sessionToken },
			include: {
				user: {
					include: {
						accounts: {
							where: { provider: 'spotify' }
						}
					}
				}
			}
		});

		if (!session?.user?.accounts?.[0]) {
			return {
				spotifyPlaylists: [],
				error: null
			};
		}

		const account = session.user.accounts[0];
		let accessToken = account.access_token;

		// Check if token is expired
		if (account.expires_at && account.expires_at < Math.floor(Date.now() / 1000)) {
			// Refresh the token
			if (account.refresh_token) {
				try {
					const tokens = await refreshAccessToken(account.refresh_token);

					// Update the account with new tokens
					await prisma.account.update({
						where: { id: account.id },
						data: {
							access_token: tokens.access_token,
							expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in
						}
					});

					accessToken = tokens.access_token;
				} catch (err) {
					console.error('Failed to refresh token:', err);
					return {
						spotifyPlaylists: [],
						error: 'Your session has expired. Please sign in again.'
					};
				}
			}
		}

		// Fetch playlists from Spotify
		const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
			headers: {
				'Authorization': `Bearer ${accessToken}`
			}
		});

		if (!playlistsResponse.ok) {
			if (playlistsResponse.status === 401) {
				return {
					spotifyPlaylists: [],
					error: 'Your session has expired. Please sign in again.'
				};
			}
			throw new Error('Failed to fetch playlists');
		}

		const playlistsData = await playlistsResponse.json();

		return {
			spotifyPlaylists: playlistsData.items || [],
			error: null
		};
	} catch (err) {
		console.error('Error fetching playlists:', err);
		return {
			spotifyPlaylists: [],
			error: 'Failed to load playlists. Please try again.'
		};
	}
};