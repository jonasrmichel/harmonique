import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
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

export const GET: RequestHandler = async ({ cookies }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
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
			return json({ error: 'No Spotify account connected' }, { status: 401 });
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
					return json({ error: 'Failed to refresh token' }, { status: 401 });
				}
			}
		}

		// Fetch full player state (includes volume and device info)
		const response = await fetch('https://api.spotify.com/v1/me/player', {
			headers: {
				'Authorization': `Bearer ${accessToken}`
			}
		});

		if (response.status === 204) {
			return json({ playing: false });
		}

		if (!response.ok) {
			return json({ error: 'Failed to fetch playback state' }, { status: 500 });
		}

		const data = await response.json();

		// Format the response
		return json({
			playing: true,
			is_playing: data.is_playing,
			volume: data.device?.volume_percent || 50, // Default to 50% if unavailable
			track: {
				id: data.item?.id,
				name: data.item?.name,
				artists: data.item?.artists?.map((artist: any) => ({
					id: artist.id,
					name: artist.name
				})),
				album: {
					id: data.item?.album?.id,
					name: data.item?.album?.name,
					image: data.item?.album?.images?.[0]?.url
				},
				duration_ms: data.item?.duration_ms,
				progress_ms: data.progress_ms
			},
			context: {
				type: data.context?.type, // playlist, album, artist, etc.
				uri: data.context?.uri,
				href: data.context?.href
			},
			device: {
				id: data.device?.id,
				name: data.device?.name,
				type: data.device?.type,
				volume_percent: data.device?.volume_percent
			}
		});
	} catch (err) {
		console.error('Error fetching now playing:', err);
		return json({ error: 'Failed to fetch playback state' }, { status: 500 });
	}
};