<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import CustomPlayer from './CustomPlayer.svelte';
	import { isPlayerExpanded, currentTrack } from '$lib/stores/player';

	export let user: any = null;

	let showPlayer = false;
	let lastTrackId: string | null = null; // Track the last played track ID

	// Subscribe to store
	isPlayerExpanded.subscribe(value => {
		showPlayer = value;
	});

	interface NowPlaying {
		playing: boolean;
		is_playing?: boolean;
		volume?: number;
		track?: {
			id: string;
			name: string;
			artists: Array<{
				id: string;
				name: string;
			}>;
			album: {
				id: string;
				name: string;
				image: string;
			};
			duration_ms: number;
			progress_ms: number;
		};
		context?: {
			type: string;
			uri: string;
			href: string;
		};
	}

	// Track playback progress
	let currentProgress = 0;
	let trackDuration = 0;
	let lastUpdateTime = Date.now();
	let progressInterval: NodeJS.Timeout;

	let nowPlaying: NowPlaying | null = null;
	let loading = false;
	let interval: NodeJS.Timeout;

	async function fetchNowPlaying() {
		// Check if user is authenticated
		if (!user) {
			nowPlaying = null;
			return;
		}

		try {
			const response = await fetch('/api/now-playing');
			if (response.ok) {
				nowPlaying = await response.json();
				// Update the store
				currentTrack.set(nowPlaying);

				// Check if the track has changed
				if (nowPlaying?.track?.id && nowPlaying.track.id !== lastTrackId) {
					console.log('Track changed from', lastTrackId, 'to', nowPlaying.track.id);
					lastTrackId = nowPlaying.track.id;
					// Auto-expand player when track changes
					if (nowPlaying.playing) {
						isPlayerExpanded.set(true);
					}
				}

				// Update progress tracking
				if (nowPlaying?.track) {
					currentProgress = nowPlaying.track.progress_ms || 0;
					trackDuration = nowPlaying.track.duration_ms || 0;
					lastUpdateTime = Date.now();

					// Start or stop progress timer
					if (nowPlaying.is_playing && !progressInterval) {
						startProgressTimer();
					} else if (!nowPlaying.is_playing && progressInterval) {
						stopProgressTimer();
					}
				} else {
					stopProgressTimer();
				}

				// Save to database for activity tracking including volume
				if (nowPlaying) {
					await fetch('/api/now-playing/update', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(nowPlaying)
					});
				}
			}
		} catch (error) {
			console.error('Failed to fetch now playing:', error);
		}
	}

	function formatTime(ms: number) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	function startProgressTimer() {
		if (progressInterval) clearInterval(progressInterval);
		progressInterval = setInterval(() => {
			// Increment progress by 100ms
			if (nowPlaying?.is_playing && currentProgress < trackDuration) {
				currentProgress = Math.min(currentProgress + 100, trackDuration);
			}
		}, 100);
	}

	function stopProgressTimer() {
		if (progressInterval) {
			clearInterval(progressInterval);
			progressInterval = null;
		}
	}

	onMount(() => {
		// Initial fetch
		fetchNowPlaying();

		// Poll every 5 seconds for track updates (position updates locally)
		interval = setInterval(fetchNowPlaying, 5000);

		// Listen for player control events to update immediately
		const handlePlayerControl = (e: CustomEvent) => {
			// Fetch updated state after a short delay
			setTimeout(() => {
				fetchNowPlaying();
			}, 500);
		};

		// Listen for track-started events to update immediately
		const handleTrackStarted = () => {
			// Immediately fetch and show the player
			fetchNowPlaying();
			// Expand the player to show the new track
			isPlayerExpanded.set(true);
			// Fetch again after a short delay to ensure we get the updated state
			setTimeout(() => {
				fetchNowPlaying();
			}, 1500);
		};

		window.addEventListener('player-control', handlePlayerControl);
		window.addEventListener('track-started', handleTrackStarted);

		return () => {
			window.removeEventListener('player-control', handlePlayerControl);
			window.removeEventListener('track-started', handleTrackStarted);
		};
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (progressInterval) clearInterval(progressInterval);
	});
</script>

<div class="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-gray-800">
	<div class="container mx-auto relative">
		<!-- Controls when player is expanded -->
		{#if showPlayer}
			<div class="absolute top-2 right-2 z-10 flex gap-2">
				{#if nowPlaying?.playing && nowPlaying?.track}
					<a
						href="/listening-now"
						class="px-3 py-1 bg-spotify-green/20 hover:bg-spotify-green/30 text-spotify-green rounded text-xs transition-colors"
						title="View Visualization"
					>
						🎵 Listening now
					</a>
				{/if}
				<button
					on:click={() => isPlayerExpanded.set(false)}
					class="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded text-xs transition-colors"
					title="Hide Player"
				>
					✕
				</button>
			</div>
		{/if}

		<!-- Custom Player -->
		{#if showPlayer}
			{#if nowPlaying?.playing && nowPlaying?.track}
				<CustomPlayer
					track={nowPlaying.track}
					isPlaying={nowPlaying.is_playing || false}
					progress={currentProgress}
					duration={trackDuration}
					volume={nowPlaying.volume || 50}
				/>
			{:else}
				<!-- Default player when nothing is playing -->
				<div class="flex items-center justify-center py-4">
					<p class="text-gray-400 text-sm">
						{#if user}
							No track currently playing - Play something on Spotify to see it here
						{:else}
							Sign in with Spotify to see your currently playing track
						{/if}
					</p>
				</div>
			{/if}
		{:else}
			<!-- Minimized view with toggle button -->
			<div class="flex items-center justify-center gap-2 py-2">
				<button
					on:click={() => isPlayerExpanded.update(v => !v)}
					class="px-4 py-1 bg-spotify-green/20 hover:bg-spotify-green/30 text-spotify-green rounded-full text-sm transition-colors"
				>
					Show Player
				</button>
				{#if nowPlaying?.playing && nowPlaying?.track}
					<a
						href="/listening-now"
						class="px-4 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-full text-sm transition-colors"
						title="View Visualization"
					>
						🎵 Listening now
					</a>
				{/if}
			</div>
		{/if}
	</div>
</div>