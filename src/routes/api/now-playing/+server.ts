import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSpotifyToken } from '$lib/spotify-auth';

const prisma = new PrismaClient();

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
				user: true
			}
		});

		if (!session?.user) {
			return json({ error: 'No user found' }, { status: 401 });
		}

		// Get a valid Spotify token (handles refresh automatically)
		const accessToken = await getSpotifyToken(session.user.id);

		if (!accessToken) {
			return json({ error: 'No Spotify account connected' }, { status: 401 });
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
			const errorText = await response.text();
			console.error('Spotify API error:', response.status, errorText);
			return json({ error: 'Failed to fetch playback state' }, { status: 500 });
		}

		const data = await response.json();

		// Format the response
		return json({
			playing: true,
			is_playing: data.is_playing,
			volume: data.device?.volume_percent || 50, // Default to 50% if unavailable
			user: {
				id: session.user.id,
				name: session.user.name,
				email: session.user.email
			},
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