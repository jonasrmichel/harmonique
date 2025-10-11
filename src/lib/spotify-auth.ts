import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Refreshes the Spotify access token for a user
 * @param userId - The user's database ID
 * @returns The new access token or null if refresh failed
 */
export async function refreshSpotifyToken(userId: string): Promise<string | null> {
	// Get required environment variables
	const clientId = process.env.AUTH_SPOTIFY_ID;
	const clientSecret = process.env.AUTH_SPOTIFY_SECRET;

	if (!clientId || !clientSecret) {
		console.error('Missing required Spotify credentials in environment variables');
		return null;
	}

	// Get the user's account with refresh token
	const account = await prisma.account.findFirst({
		where: {
			userId: userId,
			provider: 'spotify'
		}
	});

	if (!account || !account.refresh_token) {
		console.error('No Spotify account or refresh token found for user');
		return null;
	}

	try {
		// Refresh the token
		const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: account.refresh_token
			})
		});

		if (!tokenResponse.ok) {
			console.error('Failed to refresh Spotify token');
			return null;
		}

		const tokens = await tokenResponse.json();

		// Update the account with new tokens
		await prisma.account.update({
			where: { id: account.id },
			data: {
				access_token: tokens.access_token,
				expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
				// Only update refresh token if a new one was provided
				...(tokens.refresh_token && { refresh_token: tokens.refresh_token })
			}
		});

		return tokens.access_token;
	} catch (error) {
		console.error('Error refreshing Spotify token:', error);
		return null;
	}
}

/**
 * Gets a valid Spotify access token for a user, refreshing if necessary
 * @param userId - The user's database ID
 * @returns The access token or null if unable to get one
 */
export async function getSpotifyToken(userId: string): Promise<string | null> {
	const account = await prisma.account.findFirst({
		where: {
			userId: userId,
			provider: 'spotify'
		}
	});

	if (!account || !account.access_token) {
		return null;
	}

	// Check if token is expired (with 5 minute buffer)
	const now = Math.floor(Date.now() / 1000);
	if (account.expires_at && account.expires_at < now + 300) {
		// Token is expired or will expire soon, refresh it
		return await refreshSpotifyToken(userId);
	}

	return account.access_token;
}