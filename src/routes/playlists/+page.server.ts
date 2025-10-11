import type { PageServerLoad } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSpotifyToken } from '$lib/spotify-auth';

const prisma = new PrismaClient();



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
				user: true
			}
		});

		if (!session?.user) {
			return {
				spotifyPlaylists: [],
				error: null
			};
		}

		// Get a valid Spotify token (handles refresh automatically)
		const accessToken = await getSpotifyToken(session.user.id);

		if (!accessToken) {
			return {
				spotifyPlaylists: [],
				error: 'No Spotify account connected or failed to refresh token'
			};
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