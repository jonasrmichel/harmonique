import type { PageServerLoad } from './$types';
import { prisma } from '$lib/db';

export const load: PageServerLoad = async () => {
	// Get trending playlists (most liked in the past 7 days)
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const trending = await prisma.playlist.findMany({
		where: {
			isPublic: true,
			createdAt: {
				gte: sevenDaysAgo
			}
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					image: true
				}
			},
			_count: {
				select: {
					tracks: true,
					likes: true,
					comments: true
				}
			},
			tags: true
		},
		orderBy: {
			likes: {
				_count: 'desc'
			}
		},
		take: 8
	});

	// Get recently added playlists
	const recent = await prisma.playlist.findMany({
		where: {
			isPublic: true
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					image: true
				}
			},
			_count: {
				select: {
					tracks: true,
					likes: true,
					comments: true
				}
			},
			tags: true
		},
		orderBy: {
			createdAt: 'desc'
		},
		take: 8
	});

	return {
		trending,
		recent
	};
};