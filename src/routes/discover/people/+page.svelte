<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	interface SimilarUser {
		user: {
			id: string;
			name: string | null;
			email: string;
			image: string | null;
			spotifyId: string | null;
		};
		profile: {
			showTopArtists: boolean;
			showTopTracks: boolean;
			showGenres: boolean;
		};
		similarity: {
			overall: number;
			artists: number;
			tracks: number;
			genres: number;
			audio: number;
		};
		commonElements: {
			artists: any[];
			tracks: any[];
			genres: string[];
		};
	}

	let loading = true;
	let analyzing = false;
	let error = '';
	let hasProfile = false;
	let profileAnalyzedAt: string | null = null;
	let similarUsers: SimilarUser[] = [];
	let selectedView: 'grid' | 'list' = 'grid';

	// Analyze user's music taste
	async function analyzeTaste() {
		analyzing = true;
		error = '';

		try {
			const response = await fetch('/api/taste-profile/analyze', {
				method: 'POST'
			});

			if (response.ok) {
				const data = await response.json();
				hasProfile = true;
				profileAnalyzedAt = data.profile.lastAnalyzed;
				// Refresh similar users after analysis
				await fetchSimilarUsers();
			} else {
				const errorData = await response.json();
				error = errorData.error || 'Failed to analyze music taste';
			}
		} catch (err) {
			console.error('Error analyzing taste:', err);
			error = 'Failed to connect to server';
		} finally {
			analyzing = false;
		}
	}

	// Fetch similar users
	async function fetchSimilarUsers() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/discover/similar-users?limit=30');

			if (response.ok) {
				const data = await response.json();
				similarUsers = data.matches || [];
				hasProfile = true;
				profileAnalyzedAt = data.profileAnalyzedAt;
			} else {
				const errorData = await response.json();
				if (errorData.message === 'Please analyze your music taste first') {
					hasProfile = false;
				} else {
					error = errorData.error || 'Failed to fetch similar users';
				}
			}
		} catch (err) {
			console.error('Error fetching similar users:', err);
			error = 'Failed to connect to server';
		} finally {
			loading = false;
		}
	}

	async function startListenAlong(userId: string) {
		try {
			const response = await fetch('/api/listen-along/start', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ targetUserId: userId })
			});

			if (response.ok) {
				goto('/listening-now');
			} else {
				alert('Failed to start listening along');
			}
		} catch (error) {
			console.error('Failed to start listen along:', error);
		}
	}

	function getMatchColor(score: number) {
		if (score >= 80) return 'text-green-400';
		if (score >= 60) return 'text-yellow-400';
		if (score >= 40) return 'text-orange-400';
		return 'text-red-400';
	}

	function getMatchLabel(score: number) {
		if (score >= 80) return 'Excellent Match';
		if (score >= 60) return 'Great Match';
		if (score >= 40) return 'Good Match';
		if (score >= 20) return 'Some Overlap';
		return 'Few Similarities';
	}

	onMount(() => {
		fetchSimilarUsers();
	});
</script>

<svelte:head>
	<title>Taste Finder - Harmonique</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-7xl">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-4xl font-bold mb-3">Taste Finder</h1>
		<p class="text-gray-400 text-lg">
			Discover people with similar music taste based on your listening history
		</p>
	</div>

	{#if loading}
		<!-- Loading State -->
		<div class="flex justify-center items-center py-16">
			<div class="text-center">
				<div class="animate-spin rounded-full h-16 w-16 border-b-2 border-spotify-green mx-auto mb-4"></div>
				<p class="text-gray-400">Finding your music matches...</p>
			</div>
		</div>
	{:else if !hasProfile}
		<!-- No Profile State -->
		<div class="max-w-2xl mx-auto">
			<div class="bg-gradient-to-br from-spotify-green/20 to-transparent rounded-xl p-12 text-center border border-spotify-green/30">
				<div class="mb-6">
					<span class="text-6xl">🎵</span>
				</div>
				<h2 class="text-2xl font-bold mb-4">Let's Analyze Your Music Taste</h2>
				<p class="text-gray-300 mb-8">
					We'll analyze your top artists, tracks, and listening patterns to find users with similar musical preferences.
					This typically takes a few seconds.
				</p>
				<button
					on:click={analyzeTaste}
					disabled={analyzing}
					class="px-8 py-4 bg-spotify-green hover:bg-spotify-green-dark text-black font-bold rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if analyzing}
						<span class="flex items-center gap-2">
							<span class="animate-spin h-5 w-5 border-2 border-black/30 border-t-black rounded-full"></span>
							Analyzing Your Taste...
						</span>
					{:else}
						Analyze My Music Taste
					{/if}
				</button>
				<p class="text-xs text-gray-500 mt-4">
					We'll use your Spotify listening history to create your taste profile
				</p>
			</div>
		</div>
	{:else}
		<!-- Profile Actions Bar -->
		<div class="bg-gray-900/50 rounded-lg p-4 mb-8 flex items-center justify-between">
			<div>
				{#if profileAnalyzedAt}
					<p class="text-sm text-gray-400">
						Profile analyzed: {new Date(profileAnalyzedAt).toLocaleString()}
					</p>
				{/if}
				<p class="text-spotify-green font-medium">
					Found {similarUsers.length} similar users
				</p>
			</div>
			<div class="flex gap-4">
				<!-- View Toggle -->
				<div class="flex gap-2 bg-gray-800 rounded-lg p-1">
					<button
						on:click={() => selectedView = 'grid'}
						class="px-3 py-1 rounded {selectedView === 'grid' ? 'bg-spotify-green text-black' : 'text-gray-400 hover:text-white'} transition-colors"
					>
						Grid
					</button>
					<button
						on:click={() => selectedView = 'list'}
						class="px-3 py-1 rounded {selectedView === 'list' ? 'bg-spotify-green text-black' : 'text-gray-400 hover:text-white'} transition-colors"
					>
						List
					</button>
				</div>
				<button
					on:click={analyzeTaste}
					disabled={analyzing}
					class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
				>
					{analyzing ? 'Updating...' : 'Update Profile'}
				</button>
			</div>
		</div>

		<!-- Error State -->
		{#if error}
			<div class="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-8">
				<p class="text-red-400">{error}</p>
			</div>
		{/if}

		<!-- Similar Users Grid/List -->
		{#if similarUsers.length === 0}
			<div class="text-center py-16">
				<p class="text-gray-400 text-xl">No similar users found yet</p>
				<p class="text-gray-500 mt-2">As more users join, you'll see matches here</p>
			</div>
		{:else if selectedView === 'grid'}
			<!-- Grid View -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each similarUsers as match}
					<div class="bg-gray-900/50 rounded-xl p-6 hover:bg-gray-900/70 transition-all border border-gray-800 hover:border-spotify-green/50 group">
						<!-- Match Score -->
						<div class="flex justify-between items-start mb-4">
							<div class="flex items-center gap-3">
								{#if match.user.image}
									<img
										src={match.user.image}
										alt={match.user.name || 'User'}
										class="w-16 h-16 rounded-full ring-2 ring-spotify-green/30"
									/>
								{:else}
									<div class="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center ring-2 ring-spotify-green/30">
										<span class="text-2xl">👤</span>
									</div>
								{/if}
								<div>
									<h3 class="font-bold text-lg group-hover:text-spotify-green transition-colors">
										{match.user.name || 'Anonymous'}
									</h3>
									<p class="text-sm {getMatchColor(match.similarity.overall)}">
										{match.similarity.overall}% Match
									</p>
								</div>
							</div>
							<span class="text-xs px-2 py-1 bg-gray-800 rounded {getMatchColor(match.similarity.overall)}">
								{getMatchLabel(match.similarity.overall)}
							</span>
						</div>

						<!-- Similarity Breakdown -->
						<div class="space-y-2 mb-4">
							<div class="flex justify-between text-sm">
								<span class="text-gray-500">Artists</span>
								<span class="text-gray-300">{match.similarity.artists}%</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-500">Tracks</span>
								<span class="text-gray-300">{match.similarity.tracks}%</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-500">Genres</span>
								<span class="text-gray-300">{match.similarity.genres}%</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-500">Audio Features</span>
								<span class="text-gray-300">{match.similarity.audio}%</span>
							</div>
						</div>

						<!-- Common Elements -->
						{#if match.commonElements.artists.length > 0}
							<div class="mb-3">
								<p class="text-xs text-gray-500 mb-1">Common Artists</p>
								<div class="flex flex-wrap gap-1">
									{#each match.commonElements.artists.slice(0, 3) as artist}
										<span class="text-xs px-2 py-1 bg-gray-800 rounded">
											{artist.name}
										</span>
									{/each}
									{#if match.commonElements.artists.length > 3}
										<span class="text-xs px-2 py-1 text-gray-500">
											+{match.commonElements.artists.length - 3}
										</span>
									{/if}
								</div>
							</div>
						{/if}

						{#if match.commonElements.genres.length > 0}
							<div class="mb-4">
								<p class="text-xs text-gray-500 mb-1">Common Genres</p>
								<div class="flex flex-wrap gap-1">
									{#each match.commonElements.genres.slice(0, 4) as genre}
										<span class="text-xs px-2 py-1 bg-gray-800 rounded text-spotify-green">
											{genre}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Actions -->
						<div class="grid grid-cols-2 gap-2">
							<button
								on:click={() => goto(`/playlists?user=${match.user.id}`)}
								class="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
							>
								View Profile
							</button>
							<button
								on:click={() => startListenAlong(match.user.id)}
								class="px-3 py-2 bg-spotify-green/20 hover:bg-spotify-green/30 text-spotify-green rounded text-sm transition-colors"
							>
								Listen Along
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- List View -->
			<div class="space-y-4">
				{#each similarUsers as match}
					<div class="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-all border border-gray-800 hover:border-spotify-green/50">
						<div class="flex items-center justify-between">
							<!-- User Info -->
							<div class="flex items-center gap-4">
								{#if match.user.image}
									<img
										src={match.user.image}
										alt={match.user.name || 'User'}
										class="w-14 h-14 rounded-full"
									/>
								{:else}
									<div class="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center">
										<span class="text-xl">👤</span>
									</div>
								{/if}
								<div>
									<h3 class="font-bold text-lg">{match.user.name || 'Anonymous'}</h3>
									<div class="flex items-center gap-4 mt-1">
										<span class="{getMatchColor(match.similarity.overall)} font-medium">
											{match.similarity.overall}% Overall Match
										</span>
										<span class="text-xs text-gray-500">
											Artists: {match.similarity.artists}% • Tracks: {match.similarity.tracks}% • Genres: {match.similarity.genres}%
										</span>
									</div>
								</div>
							</div>

							<!-- Actions -->
							<div class="flex gap-2">
								<button
									on:click={() => goto(`/playlists?user=${match.user.id}`)}
									class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
								>
									View Profile
								</button>
								<button
									on:click={() => startListenAlong(match.user.id)}
									class="px-4 py-2 bg-spotify-green hover:bg-spotify-green-dark text-black font-medium rounded transition-colors"
								>
									Listen Along
								</button>
							</div>
						</div>

						<!-- Common Elements (List View) -->
						{#if match.commonElements.artists.length > 0 || match.commonElements.genres.length > 0}
							<div class="mt-4 pt-4 border-t border-gray-800 flex gap-8">
								{#if match.commonElements.artists.length > 0}
									<div>
										<p class="text-xs text-gray-500 mb-2">Common Artists</p>
										<div class="flex flex-wrap gap-2">
											{#each match.commonElements.artists as artist}
												<span class="text-xs px-2 py-1 bg-gray-800 rounded">
													{artist.name}
												</span>
											{/each}
										</div>
									</div>
								{/if}
								{#if match.commonElements.genres.length > 0}
									<div>
										<p class="text-xs text-gray-500 mb-2">Shared Genres</p>
										<div class="flex flex-wrap gap-2">
											{#each match.commonElements.genres.slice(0, 6) as genre}
												<span class="text-xs px-2 py-1 bg-gray-800 rounded text-spotify-green">
													{genre}
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	:global(body) {
		background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
		min-height: 100vh;
	}
</style>