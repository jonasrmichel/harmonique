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

export const POST: RequestHandler = async ({ cookies }) => {
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

		// Get active listen-along session
		const listenAlong = await prisma.listenAlong.findFirst({
			where: {
				listenerId: session.user.id,
				isActive: true
			},
			include: {
				targetUser: {
					include: {
						nowPlaying: true
					}
				}
			}
		});

		if (!listenAlong) {
			return json({ error: 'No active listen-along session' }, { status: 404 });
		}

		const targetNowPlaying = listenAlong.targetUser.nowPlaying;

		if (!targetNowPlaying || !targetNowPlaying.isPlaying) {
			return json({
				success: false,
				message: 'Target user is not currently playing anything'
			}, { status: 200 });
		}

		// Get and refresh Spotify token if needed
		const account = session.user.accounts[0];
		let accessToken = account.access_token;

		if (account.expires_at && account.expires_at < Math.floor(Date.now() / 1000)) {
			if (account.refresh_token) {
				try {
					const tokens = await refreshAccessToken(account.refresh_token);
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

		// Get active device
		const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
			headers: {
				'Authorization': `Bearer ${accessToken}`
			}
		});

		if (!devicesResponse.ok) {
			return json({ error: 'Failed to get devices' }, { status: 500 });
		}

		const devices = await devicesResponse.json();
		let activeDevice = devices.devices.find((d: any) => d.is_active);

		if (!activeDevice && devices.devices.length > 0) {
			activeDevice = devices.devices[0];
			// Transfer playback to this device
			await fetch('https://api.spotify.com/v1/me/player', {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					device_ids: [activeDevice.id],
					play: false
				})
			});
		}

		if (!activeDevice) {
			return json({
				error: 'No Spotify device found. Please open Spotify on one of your devices.'
			}, { status: 400 });
		}

		// Start playback with the target user's track
		const playBody: any = {
			position_ms: targetNowPlaying.progress // Start at the same position
		};

		// If we have context (playlist/album), use it
		if (targetNowPlaying.contextUri) {
			playBody.context_uri = targetNowPlaying.contextUri;
			// If we have trackId, we need to specify the offset to play the right track
			if (targetNowPlaying.trackId) {
				playBody.offset = {
					uri: `spotify:track:${targetNowPlaying.trackId}`
				};
			}
		} else if (targetNowPlaying.trackId) {
			// Play just this track
			playBody.uris = [`spotify:track:${targetNowPlaying.trackId}`];
		}

		// Start playback
		const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${activeDevice.id}`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(playBody)
		});

		if (playResponse.status === 204 || playResponse.status === 200) {
			// Set volume to match target user if specified
			if (targetNowPlaying.volume !== null) {
				await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${targetNowPlaying.volume}`, {
					method: 'PUT',
					headers: {
						'Authorization': `Bearer ${accessToken}`
					}
				});
			}

			return json({
				success: true,
				synced: {
					trackName: targetNowPlaying.trackName,
					artistNames: targetNowPlaying.artistNames,
					progress: targetNowPlaying.progress,
					targetUser: {
						id: listenAlong.targetUser.id,
						name: listenAlong.targetUser.name
					}
				}
			});
		} else {
			const error = await playResponse.text();
			return json({
				error: 'Failed to sync playback',
				details: error
			}, { status: playResponse.status });
		}
	} catch (err: any) {
		console.error('Error syncing playback:', err);
		return json({
			error: 'Failed to sync playback',
			details: err.message
		}, { status: 500 });
	}
};