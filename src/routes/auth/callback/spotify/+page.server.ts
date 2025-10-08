import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

export const load: PageServerLoad = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	// Handle errors from Spotify
	if (error) {
		throw redirect(303, '/auth/error?error=' + error);
	}

	if (!code) {
		throw redirect(303, '/auth/error?error=no_code');
	}

	try {
		// Exchange code for tokens
		const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': 'Basic ' + Buffer.from('69bf2b1658984b20b7fcbe93915814f6:f2523336f86e4ba8b9cc15f293825963').toString('base64')
			},
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code: code,
				redirect_uri: 'https://spocky.ouchwowboing.io/auth/callback/spotify'
			})
		});

		if (!tokenResponse.ok) {
			throw new Error('Failed to exchange code for tokens');
		}

		const tokens = await tokenResponse.json();

		// Get user profile from Spotify
		const profileResponse = await fetch('https://api.spotify.com/v1/me', {
			headers: {
				'Authorization': `Bearer ${tokens.access_token}`
			}
		});

		if (!profileResponse.ok) {
			throw new Error('Failed to get user profile');
		}

		const profile = await profileResponse.json();

		// Create or update user in database
		let user = await prisma.user.findUnique({
			where: { email: profile.email }
		});

		if (!user) {
			user = await prisma.user.create({
				data: {
					email: profile.email,
					name: profile.display_name,
					image: profile.images?.[0]?.url,
					spotifyId: profile.id
				}
			});
		}

		// Store the account tokens
		await prisma.account.upsert({
			where: {
				provider_providerAccountId: {
					provider: 'spotify',
					providerAccountId: profile.id
				}
			},
			update: {
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
				expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
				token_type: tokens.token_type,
				scope: tokens.scope
			},
			create: {
				userId: user.id,
				provider: 'spotify',
				providerAccountId: profile.id,
				type: 'oauth',
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
				expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
				token_type: tokens.token_type,
				scope: tokens.scope
			}
		});

		// Create a session
		const sessionToken = randomBytes(32).toString('hex');
		const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

		await prisma.session.create({
			data: {
				sessionToken,
				userId: user.id,
				expires: sessionExpiry
			}
		});

		// Set session cookie
		cookies.set('session-token', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			expires: sessionExpiry
		});

		// Redirect to home page
		throw redirect(303, '/');
	} catch (err: any) {
		// If it's already a redirect, don't catch it
		if (err?.status === 303 || err?.status === 302) {
			throw err;
		}

		console.error('OAuth callback error:', err);
		throw redirect(303, '/auth/error');
	}
};