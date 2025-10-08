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

export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const body = await request.json();

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

		// Get active device (we'll play on the active device)
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

		// If no active device, try to activate the first available device
		if (!activeDevice && devices.devices.length > 0) {
			activeDevice = devices.devices[0];
			// Try to transfer playback to this device
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
			return json({ error: 'No Spotify device found. Please open Spotify on one of your devices.' }, { status: 400 });
		}

		// Prepare the request body for Spotify API
		const playBody: any = {};

		if (body.context_uri) {
			// Play a playlist/album
			playBody.context_uri = body.context_uri;
		} else if (body.uri) {
			// Play a specific track
			playBody.uris = [body.uri];
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
			// Wait a moment for playback to start
			await new Promise(resolve => setTimeout(resolve, 500));

			// Get the current playback state to confirm
			const stateResponse = await fetch('https://api.spotify.com/v1/me/player', {
				headers: {
					'Authorization': `Bearer ${accessToken}`
				}
			});

			if (stateResponse.ok) {
				const state = await stateResponse.json();
				return json({
					success: true,
					playing: state.is_playing,
					track: state.item
				});
			}

			return json({ success: true });
		} else {
			const error = await playResponse.text();
			return json({ error: 'Failed to start playback', details: error }, { status: playResponse.status });
		}
	} catch (err: any) {
		console.error('Error playing track:', err);
		return json({ error: 'Failed to play track', details: err.message }, { status: 500 });
	}
};