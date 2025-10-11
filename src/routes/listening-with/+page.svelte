<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	interface Listener {
		id: string;
		startedAt: string;
		lastSync: string;
		user: {
			id: string;
			name: string | null;
			email: string;
			image: string | null;
			spotifyId: string | null;
			nowPlaying: any;
		};
	}

	let listeners: Listener[] = [];
	let currentUserNowPlaying: any = null;
	let loading = true;
	let error = '';
	let interval: NodeJS.Timeout;

	async function fetchListeners() {
		try {
			const response = await fetch('/api/listen-along/listeners');
			if (response.ok) {
				const data = await response.json();
				listeners = data.listeners || [];
				currentUserNowPlaying = data.currentUserNowPlaying;
				error = '';
			} else {
				const errorData = await response.json();
				error = errorData.error || 'Failed to load listeners';
			}
		} catch (err) {
			console.error('Error fetching listeners:', err);
			error = 'Failed to connect to server';
		} finally {
			loading = false;
		}
	}

	function getTimeAgo(date: string) {
		const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
		if (seconds < 60) return 'just now';
		if (seconds < 120) return '1 minute ago';
		if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
		if (seconds < 7200) return '1 hour ago';
		if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
		if (seconds < 172800) return '1 day ago';
		return `${Math.floor(seconds / 86400)} days ago`;
	}

	function formatDuration(startedAt: string) {
		const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
		if (seconds < 60) return `${seconds} seconds`;
		if (seconds < 3600) {
			const minutes = Math.floor(seconds / 60);
			return `${minutes} minute${minutes === 1 ? '' : 's'}`;
		}
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (minutes === 0) {
			return `${hours} hour${hours === 1 ? '' : 's'}`;
		}
		return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
	}

	async function kickListener(listenerId: string) {
		// This would require an endpoint to force stop someone's listen-along session
		// For now, we'll just show a message
		alert('This feature is coming soon!');
	}

	function viewUserProfile(userId: string) {
		goto(`/playlists?user=${userId}`);
	}

	onMount(() => {
		fetchListeners();
		// Poll for updates every 10 seconds
		interval = setInterval(fetchListeners, 10000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Listening With Me - Harmonique</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Who's Listening With Me</h1>
		<p class="text-gray-400">
			See who's currently synced up and listening along with your music
		</p>
	</div>

	{#if loading}
		<div class="flex justify-center items-center py-16">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto mb-4"></div>
				<p class="text-gray-400">Loading listeners...</p>
			</div>
		</div>
	{:else if error}
		<div class="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
			<p class="text-red-400">{error}</p>
			<button
				on:click={fetchListeners}
				class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
			>
				Retry
			</button>
		</div>
	{:else}
		<!-- Current Playing Status -->
		{#if currentUserNowPlaying}
			<div class="bg-gray-900/50 rounded-lg p-6 mb-8 border border-gray-700">
				<div class="flex items-center gap-4">
					{#if currentUserNowPlaying.albumImage}
						<img
							src={currentUserNowPlaying.albumImage}
							alt={currentUserNowPlaying.albumName || 'Album'}
							class="w-20 h-20 rounded-lg"
						/>
					{:else}
						<div class="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
							<span class="text-2xl">🎵</span>
						</div>
					{/if}
					<div class="flex-1">
						<p class="text-sm text-gray-400 mb-1">Currently Playing</p>
						<h2 class="text-xl font-semibold mb-1">{currentUserNowPlaying.trackName}</h2>
						<p class="text-gray-400">{currentUserNowPlaying.artistNames}</p>
					</div>
					<div class="text-right">
						{#if currentUserNowPlaying.isPlaying}
							<div class="flex items-center gap-2 text-spotify-green">
								<div class="w-2 h-2 bg-spotify-green rounded-full animate-pulse"></div>
								<span class="text-sm font-medium">Playing</span>
							</div>
						{:else}
							<div class="flex items-center gap-2 text-gray-500">
								<div class="w-2 h-2 bg-gray-500 rounded-full"></div>
								<span class="text-sm">Paused</span>
							</div>
						{/if}
						{#if listeners.length > 0}
							<p class="text-2xl font-bold text-spotify-green mt-2">
								{listeners.length}
							</p>
							<p class="text-xs text-gray-400">
								{listeners.length === 1 ? 'listener' : 'listeners'}
							</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Listeners Grid -->
		{#if listeners.length === 0}
			<div class="text-center py-16">
				<div class="mb-6">
					<span class="text-6xl">🎧</span>
				</div>
				<h2 class="text-xl font-semibold mb-2">No one is listening with you</h2>
				<p class="text-gray-400 mb-6">
					Share your music with friends and they can sync up with what you're playing!
				</p>
				<button
					on:click={() => goto('/listening-now')}
					class="px-6 py-3 bg-spotify-green hover:bg-spotify-green-dark text-black font-medium rounded-full transition-colors"
				>
					Go to Listening Now
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each listeners as listener}
					<div class="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-all border border-gray-800 hover:border-spotify-green/50 group">
						<!-- User Info -->
						<div class="flex items-start gap-4 mb-4">
							{#if listener.user.image}
								<img
									src={listener.user.image}
									alt={listener.user.name || 'User'}
									class="w-14 h-14 rounded-full ring-2 ring-spotify-green/50"
								/>
							{:else}
								<div class="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center ring-2 ring-spotify-green/50">
									<span class="text-xl">👤</span>
								</div>
							{/if}
							<div class="flex-1">
								<h3 class="font-semibold text-lg group-hover:text-spotify-green transition-colors">
									{listener.user.name || 'Anonymous'}
								</h3>
								<p class="text-sm text-gray-500">{listener.user.email}</p>
							</div>
						</div>

						<!-- Sync Status -->
						<div class="space-y-2 mb-4">
							<div class="flex items-center justify-between text-sm">
								<span class="text-gray-400">Started</span>
								<span class="text-gray-300">{getTimeAgo(listener.startedAt)}</span>
							</div>
							<div class="flex items-center justify-between text-sm">
								<span class="text-gray-400">Duration</span>
								<span class="text-spotify-green">{formatDuration(listener.startedAt)}</span>
							</div>
							<div class="flex items-center justify-between text-sm">
								<span class="text-gray-400">Last Sync</span>
								<span class="text-gray-300">{getTimeAgo(listener.lastSync)}</span>
							</div>
						</div>

						<!-- Sync Indicator -->
						<div class="flex items-center justify-center py-3 mb-4 bg-spotify-green/10 rounded-lg">
							<div class="flex items-center gap-2">
								<div class="w-2 h-2 bg-spotify-green rounded-full animate-pulse"></div>
								<span class="text-sm text-spotify-green font-medium">Actively Synced</span>
							</div>
						</div>

						<!-- Action Buttons -->
						<div class="grid grid-cols-2 gap-2">
							<button
								on:click={() => viewUserProfile(listener.user.id)}
								class="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
							>
								View Profile
							</button>
							{#if listener.user.spotifyId}
								<button
									on:click={() => window.open(`https://open.spotify.com/user/${listener.user.spotifyId}`, '_blank')}
									class="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
								>
									Open Spotify
								</button>
							{:else}
								<button
									disabled
									class="px-3 py-2 bg-gray-800/50 rounded text-sm text-gray-600 cursor-not-allowed"
								>
									No Spotify
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Stats Summary -->
			<div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="bg-gray-900/30 rounded-lg p-6 text-center">
					<p class="text-3xl font-bold text-spotify-green mb-2">{listeners.length}</p>
					<p class="text-gray-400">Active Listeners</p>
				</div>
				<div class="bg-gray-900/30 rounded-lg p-6 text-center">
					<p class="text-3xl font-bold text-blue-400 mb-2">
						{listeners.filter(l => {
							const seconds = (Date.now() - new Date(l.lastSync).getTime()) / 1000;
							return seconds < 60;
						}).length}
					</p>
					<p class="text-gray-400">Synced in Last Minute</p>
				</div>
				<div class="bg-gray-900/30 rounded-lg p-6 text-center">
					<p class="text-3xl font-bold text-purple-400 mb-2">
						{listeners.length > 0 ?
							Math.floor(listeners.reduce((acc, l) =>
								acc + (Date.now() - new Date(l.startedAt).getTime()) / 1000 / 60, 0
							) / listeners.length)
							: 0}
					</p>
					<p class="text-gray-400">Avg Minutes Together</p>
				</div>
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