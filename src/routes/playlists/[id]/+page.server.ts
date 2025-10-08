import type { PageServerLoad } from './$types';
import { PrismaClient } from '@prisma/client';
import { error } from '@sveltejs/kit';

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

export const load: PageServerLoad = async ({ params, cookies }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		throw error(401, 'Not authenticated');
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
			throw error(401, 'No Spotify account connected');
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
					throw error(401, 'Failed to refresh token');
				}
			}
		}

		// Fetch playlist details from Spotify
		const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${params.id}`, {
			headers: {
				'Authorization': `Bearer ${accessToken}`
			}
		});

		if (!playlistResponse.ok) {
			throw error(404, 'Playlist not found');
		}

		const playlist = await playlistResponse.json();

		// Format the tracks
		const tracks = playlist.tracks.items.map((item: any) => ({
			id: item.track?.id,
			name: item.track?.name,
			uri: item.track?.uri,
			duration_ms: item.track?.duration_ms,
			artists: item.track?.artists?.map((artist: any) => ({
				id: artist.id,
				name: artist.name
			})),
			album: {
				id: item.track?.album?.id,
				name: item.track?.album?.name,
				image: item.track?.album?.images?.[0]?.url
			},
			added_at: item.added_at
		}));

		return {
			playlist: {
				id: playlist.id,
				name: playlist.name,
				description: playlist.description,
				image: playlist.images?.[0]?.url,
				owner: playlist.owner.display_name,
				public: playlist.public,
				collaborative: playlist.collaborative,
				tracks: tracks,
				total: playlist.tracks.total
			},
			accessToken
		};
	} catch (err: any) {
		console.error('Error fetching playlist:', err);
		throw error(500, err.message || 'Failed to fetch playlist');
	}
};