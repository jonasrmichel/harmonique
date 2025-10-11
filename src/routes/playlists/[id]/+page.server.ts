import type { PageServerLoad } from './$types';
import { PrismaClient } from '@prisma/client';
import { error } from '@sveltejs/kit';
import { getSpotifyToken } from '$lib/spotify-auth';

const prisma = new PrismaClient();



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
				user: true
			}
		});

		if (!session?.user) {
			throw error(401, 'No Spotify account connected');
		}

		// Get a valid Spotify token (handles refresh automatically)
		const accessToken = await getSpotifyToken(session.user.id);

		if (!accessToken) {
			throw error(401, 'No Spotify account connected or failed to refresh token');
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