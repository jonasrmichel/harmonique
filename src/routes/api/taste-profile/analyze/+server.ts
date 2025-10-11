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

// Analyze and update user's taste profile
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

		const account = session.user.accounts[0];
		let accessToken = account.access_token;

		// Refresh token if needed
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

		// Fetch user's top artists (medium term = last 6 months)
		const topArtistsResponse = await fetch(
			'https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term',
			{
				headers: { 'Authorization': `Bearer ${accessToken}` }
			}
		);

		if (!topArtistsResponse.ok) {
			return json({ error: 'Failed to fetch top artists' }, { status: 500 });
		}

		const topArtists = await topArtistsResponse.json();

		// Fetch user's top tracks
		const topTracksResponse = await fetch(
			'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term',
			{
				headers: { 'Authorization': `Bearer ${accessToken}` }
			}
		);

		if (!topTracksResponse.ok) {
			return json({ error: 'Failed to fetch top tracks' }, { status: 500 });
		}

		const topTracks = await topTracksResponse.json();

		// Fetch followed artists
		const followedArtistsResponse = await fetch(
			'https://api.spotify.com/v1/me/following?type=artist&limit=50',
			{
				headers: { 'Authorization': `Bearer ${accessToken}` }
			}
		);

		let followedArtists = [];
		if (followedArtistsResponse.ok) {
			const followedData = await followedArtistsResponse.json();
			followedArtists = followedData.artists?.items || [];
		}

		// Extract and count genres from artists
		const genreMap = new Map<string, number>();
		topArtists.items.forEach((artist: any) => {
			artist.genres?.forEach((genre: string) => {
				genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
			});
		});

		// Sort genres by frequency
		const topGenres = Array.from(genreMap.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([genre, count]) => ({ genre, count }));

		// Get audio features for top tracks
		let avgAudioFeatures = {
			danceability: 0,
			energy: 0,
			valence: 0,
			acousticness: 0,
			tempo: 0,
			loudness: 0
		};

		if (topTracks.items.length > 0) {
			const trackIds = topTracks.items.map((track: any) => track.id).join(',');
			const audioFeaturesResponse = await fetch(
				`https://api.spotify.com/v1/audio-features?ids=${trackIds}`,
				{
					headers: { 'Authorization': `Bearer ${accessToken}` }
				}
			);

			if (audioFeaturesResponse.ok) {
				const audioFeatures = await audioFeaturesResponse.json();
				const validFeatures = audioFeatures.audio_features.filter((f: any) => f !== null);

				if (validFeatures.length > 0) {
					// Calculate averages
					validFeatures.forEach((features: any) => {
						avgAudioFeatures.danceability += features.danceability;
						avgAudioFeatures.energy += features.energy;
						avgAudioFeatures.valence += features.valence;
						avgAudioFeatures.acousticness += features.acousticness;
						avgAudioFeatures.tempo += features.tempo;
						avgAudioFeatures.loudness += features.loudness;
					});

					const count = validFeatures.length;
					avgAudioFeatures.danceability /= count;
					avgAudioFeatures.energy /= count;
					avgAudioFeatures.valence /= count;
					avgAudioFeatures.acousticness /= count;
					avgAudioFeatures.tempo /= count;
					avgAudioFeatures.loudness /= count;
				}
			}
		}

		// Prepare data for storage (simplify for JSON)
		const simplifiedArtists = topArtists.items.map((artist: any) => ({
			id: artist.id,
			name: artist.name,
			genres: artist.genres,
			popularity: artist.popularity,
			image: artist.images?.[0]?.url
		}));

		const simplifiedTracks = topTracks.items.map((track: any) => ({
			id: track.id,
			name: track.name,
			artists: track.artists.map((a: any) => a.name).join(', '),
			album: track.album.name,
			popularity: track.popularity
		}));

		const followedArtistIds = followedArtists.map((artist: any) => artist.id);

		// Store or update user's taste profile
		const tasteProfile = await prisma.userTasteProfile.upsert({
			where: { userId: session.user.id },
			create: {
				userId: session.user.id,
				topArtists: JSON.stringify(simplifiedArtists),
				topTracks: JSON.stringify(simplifiedTracks),
				topGenres: JSON.stringify(topGenres),
				followedArtists: JSON.stringify(followedArtistIds),
				avgDanceability: avgAudioFeatures.danceability,
				avgEnergy: avgAudioFeatures.energy,
				avgValence: avgAudioFeatures.valence,
				avgAcousticness: avgAudioFeatures.acousticness,
				avgTempo: avgAudioFeatures.tempo,
				avgLoudness: avgAudioFeatures.loudness,
				lastAnalyzed: new Date()
			},
			update: {
				topArtists: JSON.stringify(simplifiedArtists),
				topTracks: JSON.stringify(simplifiedTracks),
				topGenres: JSON.stringify(topGenres),
				followedArtists: JSON.stringify(followedArtistIds),
				avgDanceability: avgAudioFeatures.danceability,
				avgEnergy: avgAudioFeatures.energy,
				avgValence: avgAudioFeatures.valence,
				avgAcousticness: avgAudioFeatures.acousticness,
				avgTempo: avgAudioFeatures.tempo,
				avgLoudness: avgAudioFeatures.loudness,
				lastAnalyzed: new Date()
			}
		});

		return json({
			success: true,
			profile: {
				id: tasteProfile.id,
				topArtistsCount: simplifiedArtists.length,
				topTracksCount: simplifiedTracks.length,
				topGenresCount: topGenres.length,
				followedArtistsCount: followedArtistIds.length,
				audioProfile: avgAudioFeatures,
				lastAnalyzed: tasteProfile.lastAnalyzed
			}
		});
	} catch (err: any) {
		console.error('Error analyzing taste profile:', err);
		return json({ error: 'Failed to analyze taste profile', details: err.message }, { status: 500 });
	}
};