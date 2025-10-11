import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSpotifyToken } from '$lib/spotify-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Play/Resume playback
export const PUT: RequestHandler = async ({ cookies, request }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const session = await prisma.session.findUnique({
			where: { sessionToken },
			include: { user: true }
		});

		if (!session?.user) {
			return json({ error: 'No user found' }, { status: 401 });
		}

		const accessToken = await getSpotifyToken(session.user.id);
		if (!accessToken) {
			return json({ error: 'No Spotify account connected' }, { status: 401 });
		}

		const body = await request.json().catch(() => ({}));
		const action = body.action || 'play';

		let spotifyUrl = '';
		let method = 'PUT';
		let requestBody = undefined;

		switch (action) {
			case 'play':
			case 'resume':
				spotifyUrl = 'https://api.spotify.com/v1/me/player/play';
				break;
			case 'pause':
				spotifyUrl = 'https://api.spotify.com/v1/me/player/pause';
				break;
			case 'next':
				spotifyUrl = 'https://api.spotify.com/v1/me/player/next';
				method = 'POST';
				break;
			case 'previous':
				spotifyUrl = 'https://api.spotify.com/v1/me/player/previous';
				method = 'POST';
				break;
			case 'seek':
				const position = body.position_ms || 0;
				spotifyUrl = `https://api.spotify.com/v1/me/player/seek?position_ms=${position}`;
				break;
			default:
				return json({ error: 'Invalid action' }, { status: 400 });
		}

		const response = await fetch(spotifyUrl, {
			method,
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			...(requestBody && { body: JSON.stringify(requestBody) })
		});

		if (response.status === 204) {
			return json({ success: true });
		}

		if (!response.ok) {
			const error = await response.text();
			console.error('Spotify API error:', error);
			return json({ error: 'Failed to control playback' }, { status: response.status });
		}

		return json({ success: true });
	} catch (err: any) {
		console.error('Error controlling playback:', err);
		return json({ error: 'Failed to control playback' }, { status: 500 });
	}
};