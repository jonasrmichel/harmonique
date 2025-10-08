interface SpotifyTrack {
	id: string;
	name: string;
	artists: Array<{ name: string }>;
	album: {
		name: string;
		images: Array<{ url: string }>;
	};
	duration_ms: number;
	preview_url: string | null;
}

interface SpotifyPlaylist {
	id: string;
	name: string;
	description: string | null;
	images: Array<{ url: string }>;
	tracks: {
		items: Array<{
			track: SpotifyTrack;
		}>;
	};
}

export class SpotifyAPI {
	private accessToken: string;

	constructor(accessToken: string) {
		this.accessToken = accessToken;
	}

	private async fetch(endpoint: string, options: RequestInit = {}) {
		const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
			...options,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				...options.headers
			}
		});

		if (!response.ok) {
			throw new Error(`Spotify API error: ${response.status}`);
		}

		return response.json();
	}

	async getCurrentUser() {
		return this.fetch('/me');
	}

	async getUserPlaylists(limit = 50) {
		return this.fetch(`/me/playlists?limit=${limit}`);
	}

	async getPlaylist(playlistId: string) {
		return this.fetch(`/playlists/${playlistId}`);
	}

	async createPlaylist(userId: string, name: string, description?: string, isPublic = true) {
		return this.fetch(`/users/${userId}/playlists`, {
			method: 'POST',
			body: JSON.stringify({
				name,
				description,
				public: isPublic
			})
		});
	}

	async addTracksToPlaylist(playlistId: string, trackUris: string[]) {
		return this.fetch(`/playlists/${playlistId}/tracks`, {
			method: 'POST',
			body: JSON.stringify({
				uris: trackUris
			})
		});
	}

	async removeTracksFromPlaylist(playlistId: string, trackUris: string[]) {
		return this.fetch(`/playlists/${playlistId}/tracks`, {
			method: 'DELETE',
			body: JSON.stringify({
				tracks: trackUris.map(uri => ({ uri }))
			})
		});
	}

	async searchTracks(query: string, limit = 20) {
		const params = new URLSearchParams({
			q: query,
			type: 'track',
			limit: limit.toString()
		});
		return this.fetch(`/search?${params}`);
	}

	async getTrack(trackId: string) {
		return this.fetch(`/tracks/${trackId}`);
	}

	async getRecommendations(seedTracks: string[], limit = 20) {
		const params = new URLSearchParams({
			seed_tracks: seedTracks.join(','),
			limit: limit.toString()
		});
		return this.fetch(`/recommendations?${params}`);
	}

	async followUser(userId: string) {
		return this.fetch(`/me/following?type=user&ids=${userId}`, {
			method: 'PUT'
		});
	}

	async unfollowUser(userId: string) {
		return this.fetch(`/me/following?type=user&ids=${userId}`, {
			method: 'DELETE'
		});
	}

	async isFollowing(userId: string) {
		const response = await this.fetch(`/me/following/contains?type=user&ids=${userId}`);
		return response[0];
	}
}