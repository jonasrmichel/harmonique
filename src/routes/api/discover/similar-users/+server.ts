import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Calculate Jaccard similarity between two sets
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
	const intersection = new Set([...setA].filter(x => setB.has(x)));
	const union = new Set([...setA, ...setB]);
	return union.size > 0 ? intersection.size / union.size : 0;
}

// Calculate Tanimoto coefficient for sets (binary data)
function tanimotoSimilarity(setA: Set<string>, setB: Set<string>): number {
	const intersection = new Set([...setA].filter(x => setB.has(x)));
	const sizeA = setA.size;
	const sizeB = setB.size;
	const intersectionSize = intersection.size;

	// Tanimoto coefficient: |A ∩ B| / (|A| + |B| - |A ∩ B|)
	const denominator = sizeA + sizeB - intersectionSize;
	return denominator > 0 ? intersectionSize / denominator : 0;
}

// Extended Tanimoto coefficient for continuous vectors
function tanimotoDistance(vecA: number[], vecB: number[]): number {
	if (vecA.length !== vecB.length) return 0;

	let dotProduct = 0;
	let magnitudeA = 0;
	let magnitudeB = 0;

	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i];
		magnitudeA += vecA[i] * vecA[i];
		magnitudeB += vecB[i] * vecB[i];
	}

	// Extended Tanimoto: A·B / (||A||² + ||B||² - A·B)
	const denominator = magnitudeA + magnitudeB - dotProduct;
	return denominator > 0 ? dotProduct / denominator : 0;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
	if (vecA.length !== vecB.length) return 0;

	let dotProduct = 0;
	let magnitudeA = 0;
	let magnitudeB = 0;

	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i];
		magnitudeA += vecA[i] * vecA[i];
		magnitudeB += vecB[i] * vecB[i];
	}

	magnitudeA = Math.sqrt(magnitudeA);
	magnitudeB = Math.sqrt(magnitudeB);

	if (magnitudeA === 0 || magnitudeB === 0) return 0;

	return dotProduct / (magnitudeA * magnitudeB);
}

// Calculate similarity between two user profiles
function calculateSimilarity(profileA: any, profileB: any) {
	// Parse JSON data
	const artistsA = profileA.topArtists ? JSON.parse(profileA.topArtists) : [];
	const artistsB = profileB.topArtists ? JSON.parse(profileB.topArtists) : [];
	const tracksA = profileA.topTracks ? JSON.parse(profileA.topTracks) : [];
	const tracksB = profileB.topTracks ? JSON.parse(profileB.topTracks) : [];
	const genresA = profileA.topGenres ? JSON.parse(profileA.topGenres) : [];
	const genresB = profileB.topGenres ? JSON.parse(profileB.topGenres) : [];

	// Extract IDs for comparison
	const artistIdsA = new Set(artistsA.map((a: any) => a.id));
	const artistIdsB = new Set(artistsB.map((a: any) => a.id));
	const trackIdsA = new Set(tracksA.map((t: any) => t.id));
	const trackIdsB = new Set(tracksB.map((t: any) => t.id));
	const genreNamesA = new Set(genresA.map((g: any) => g.genre));
	const genreNamesB = new Set(genresB.map((g: any) => g.genre));

	// Calculate individual similarities using Tanimoto coefficient for better accuracy
	const artistSimilarity = tanimotoSimilarity(artistIdsA, artistIdsB);
	const trackSimilarity = tanimotoSimilarity(trackIdsA, trackIdsB);
	const genreSimilarity = tanimotoSimilarity(genreNamesA, genreNamesB);

	// Calculate audio feature similarity using extended Tanimoto
	let audioSimilarity = 0;
	let tempoSimilarity = 0;
	if (profileA.avgDanceability !== null && profileB.avgDanceability !== null) {
		const audioVecA = [
			profileA.avgDanceability || 0,
			profileA.avgEnergy || 0,
			profileA.avgValence || 0,
			profileA.avgAcousticness || 0
		];
		const audioVecB = [
			profileB.avgDanceability || 0,
			profileB.avgEnergy || 0,
			profileB.avgValence || 0,
			profileB.avgAcousticness || 0
		];
		// Use extended Tanimoto for continuous audio features
		audioSimilarity = tanimotoDistance(audioVecA, audioVecB);

		// Calculate tempo similarity separately (normalize BPM difference)
		if (profileA.avgTempo && profileB.avgTempo) {
			const tempoDiff = Math.abs(profileA.avgTempo - profileB.avgTempo);
			// Similarity decreases as tempo difference increases (max diff ~100 BPM)
			tempoSimilarity = Math.max(0, 1 - tempoDiff / 100);
		}
	}

	// Hybrid weighted overall score combining Tanimoto distances
	const overallScore = (
		artistSimilarity * 0.35 +  // 35% weight on shared artists
		trackSimilarity * 0.25 +   // 25% weight on shared tracks
		genreSimilarity * 0.20 +   // 20% weight on shared genres
		audioSimilarity * 0.15 +   // 15% weight on audio features
		tempoSimilarity * 0.05     // 5% weight on tempo similarity
	);

	// Find common elements for display
	const commonArtists = artistsA.filter((a: any) => artistIdsB.has(a.id));
	const commonTracks = tracksA.filter((t: any) => trackIdsB.has(t.id));
	const commonGenres = Array.from(genreNamesA).filter(g => genreNamesB.has(g));

	return {
		overallScore,
		artistScore: artistSimilarity,
		trackScore: trackSimilarity,
		genreScore: genreSimilarity,
		audioScore: audioSimilarity,
		commonArtists: commonArtists.slice(0, 5), // Top 5 common artists
		commonTracks: commonTracks.slice(0, 5),   // Top 5 common tracks
		commonGenres: commonGenres.slice(0, 10)   // Top 10 common genres
	};
}

// Get similar users based on taste profile
export const GET: RequestHandler = async ({ cookies, url }) => {
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
						tasteProfile: true
					}
				}
			}
		});

		if (!session?.user) {
			return json({ error: 'Invalid session' }, { status: 401 });
		}

		// Check if user has a taste profile
		if (!session.user.tasteProfile) {
			return json({
				error: 'No taste profile found',
				message: 'Please analyze your music taste first'
			}, { status: 404 });
		}

		const userProfile = session.user.tasteProfile;

		// Get other users with taste profiles who are discoverable
		const otherProfiles = await prisma.userTasteProfile.findMany({
			where: {
				userId: { not: session.user.id },
				isDiscoverable: true,
				topArtists: { not: null }
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						spotifyId: true
					}
				}
			}
		});

		// Calculate similarities with all other users
		const similarities = [];

		for (const otherProfile of otherProfiles) {
			const similarity = calculateSimilarity(userProfile, otherProfile);

			// Only include users with minimum similarity threshold
			if (similarity.overallScore > 0.05) {
				similarities.push({
					user: otherProfile.user,
					profile: {
						showTopArtists: otherProfile.showTopArtists,
						showTopTracks: otherProfile.showTopTracks,
						showGenres: otherProfile.showGenres
					},
					similarity: {
						overall: Math.round(similarity.overallScore * 100),
						artists: Math.round(similarity.artistScore * 100),
						tracks: Math.round(similarity.trackScore * 100),
						genres: Math.round(similarity.genreScore * 100),
						audio: Math.round(similarity.audioScore * 100)
					},
					commonElements: {
						artists: otherProfile.showTopArtists ? similarity.commonArtists : [],
						tracks: otherProfile.showTopTracks ? similarity.commonTracks : [],
						genres: otherProfile.showGenres ? similarity.commonGenres : []
					}
				});

				// Store similarity in database for future reference
				await prisma.userSimilarity.upsert({
					where: {
						userAId_userBId: {
							userAId: session.user.id < otherProfile.userId ? session.user.id : otherProfile.userId,
							userBId: session.user.id > otherProfile.userId ? session.user.id : otherProfile.userId
						}
					},
					create: {
						userAId: session.user.id < otherProfile.userId ? session.user.id : otherProfile.userId,
						userBId: session.user.id > otherProfile.userId ? session.user.id : otherProfile.userId,
						overallScore: similarity.overallScore,
						artistScore: similarity.artistScore,
						trackScore: similarity.trackScore,
						genreScore: similarity.genreScore,
						audioScore: similarity.audioScore,
						commonArtists: JSON.stringify(similarity.commonArtists),
						commonTracks: JSON.stringify(similarity.commonTracks),
						commonGenres: JSON.stringify(similarity.commonGenres)
					},
					update: {
						overallScore: similarity.overallScore,
						artistScore: similarity.artistScore,
						trackScore: similarity.trackScore,
						genreScore: similarity.genreScore,
						audioScore: similarity.audioScore,
						commonArtists: JSON.stringify(similarity.commonArtists),
						commonTracks: JSON.stringify(similarity.commonTracks),
						commonGenres: JSON.stringify(similarity.commonGenres),
						calculatedAt: new Date()
					}
				});
			}
		}

		// Sort by overall similarity score
		similarities.sort((a, b) => b.similarity.overall - a.similarity.overall);

		// Get limit from query params (default 20)
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const topMatches = similarities.slice(0, limit);

		return json({
			success: true,
			matches: topMatches,
			totalFound: similarities.length,
			profileAnalyzedAt: userProfile.lastAnalyzed
		});
	} catch (err: any) {
		console.error('Error finding similar users:', err);
		return json({ error: 'Failed to find similar users', details: err.message }, { status: 500 });
	}
};