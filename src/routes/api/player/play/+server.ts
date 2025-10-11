import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSpotifyToken } from '$lib/spotify-auth';

const prisma = new PrismaClient();

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
				user: true
			}
		});

		if (!session?.user) {
			return json({ error: 'No user found' }, { status: 401 });
		}

		// Get a valid Spotify token (handles refresh automatically)
		const accessToken = await getSpotifyToken(session.user.id);

		if (!accessToken) {
			return json({ error: 'No Spotify account connected or failed to refresh token' }, { status: 401 });
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