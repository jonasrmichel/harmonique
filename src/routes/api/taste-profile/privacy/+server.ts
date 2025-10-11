import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get privacy settings
export const GET: RequestHandler = async ({ cookies }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const session = await prisma.session.findUnique({
			where: { sessionToken },
			include: {
				user: {
					include: {
						tasteProfile: {
							select: {
								isDiscoverable: true,
								showTopArtists: true,
								showTopTracks: true,
								showGenres: true
							}
						}
					}
				}
			}
		});

		if (!session?.user) {
			return json({ error: 'Invalid session' }, { status: 401 });
		}

		// Default settings if no profile exists
		const settings = session.user.tasteProfile || {
			isDiscoverable: true,
			showTopArtists: true,
			showTopTracks: true,
			showGenres: true
		};

		return json({
			success: true,
			settings
		});
	} catch (err: any) {
		console.error('Error fetching privacy settings:', err);
		return json({ error: 'Failed to fetch settings', details: err.message }, { status: 500 });
	}
};

// Update privacy settings
export const PUT: RequestHandler = async ({ request, cookies }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const {
			isDiscoverable,
			showTopArtists,
			showTopTracks,
			showGenres
		} = body;

		const session = await prisma.session.findUnique({
			where: { sessionToken },
			include: {
				user: true
			}
		});

		if (!session?.user) {
			return json({ error: 'Invalid session' }, { status: 401 });
		}

		// Update or create taste profile with new privacy settings
		const updatedProfile = await prisma.userTasteProfile.upsert({
			where: { userId: session.user.id },
			create: {
				userId: session.user.id,
				isDiscoverable: isDiscoverable ?? true,
				showTopArtists: showTopArtists ?? true,
				showTopTracks: showTopTracks ?? true,
				showGenres: showGenres ?? true
			},
			update: {
				isDiscoverable: isDiscoverable ?? undefined,
				showTopArtists: showTopArtists ?? undefined,
				showTopTracks: showTopTracks ?? undefined,
				showGenres: showGenres ?? undefined
			}
		});

		return json({
			success: true,
			settings: {
				isDiscoverable: updatedProfile.isDiscoverable,
				showTopArtists: updatedProfile.showTopArtists,
				showTopTracks: updatedProfile.showTopTracks,
				showGenres: updatedProfile.showGenres
			}
		});
	} catch (err: any) {
		console.error('Error updating privacy settings:', err);
		return json({ error: 'Failed to update settings', details: err.message }, { status: 500 });
	}
};