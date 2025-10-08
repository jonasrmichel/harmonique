<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface ActivityItem {
		id: string;
		trackId: string;
		trackName: string;
		artistNames: string;
		albumName: string | null;
		albumImage: string | null;
		duration: number;
		progress: number;
		isPlaying: boolean;
		contextType: string | null;
		contextUri: string | null;
		contextName: string | null;
		updatedAt: string;
		user: {
			id: string;
			name: string | null;
			image: string | null;
			spotifyId: string | null;
		};
	}

	let activityList: ActivityItem[] = [];
	let loading = true;
	let interval: NodeJS.Timeout;

	async function fetchActivity() {
		try {
			const response = await fetch('/api/now-playing/update?limit=30');
			if (response.ok) {
				const data = await response.json();
				activityList = data.nowPlayingList || [];
				loading = false;
			}
		} catch (error) {
			console.error('Failed to fetch activity:', error);
			loading = false;
		}
	}

	function formatTime(ms: number) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	function getTimeAgo(date: string) {
		const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
		if (seconds < 60) return 'just now';
		if (seconds < 120) return '1 minute ago';
		if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
		if (seconds < 7200) return '1 hour ago';
		return `${Math.floor(seconds / 3600)} hours ago`;
	}

	function getProgressPercentage(progress: number, duration: number) {
		if (duration === 0) return 0;
		return Math.min((progress / duration) * 100, 100);
	}

	onMount(() => {
		// Initial fetch
		fetchActivity();
		// Poll every 10 seconds
		interval = setInterval(fetchActivity, 10000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

<div class="listening-activity">
	{#if loading}
		<div class="text-center py-8">
			<p class="text-gray-400">Loading activity...</p>
		</div>
	{:else if activityList.length === 0}
		<div class="text-center py-8">
			<p class="text-gray-400">No one is listening right now</p>
			<p class="text-sm text-gray-500 mt-2">Start playing music to appear here!</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each activityList as activity}
				<div class="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-900/70 transition-colors">
					<div class="flex items-start gap-4">
						<!-- User Avatar -->
						<div class="flex-shrink-0">
							{#if activity.user.image}
								<img
									src={activity.user.image}
									alt={activity.user.name || 'User'}
									class="w-12 h-12 rounded-full"
								/>
							{:else}
								<div class="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
									<span class="text-xl">👤</span>
								</div>
							{/if}
						</div>

						<!-- Activity Details -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="font-semibold">{activity.user.name || 'Anonymous'}</span>
								{#if activity.isPlaying}
									<span class="text-spotify-green text-xs">● Now Playing</span>
								{:else}
									<span class="text-gray-500 text-xs">● Paused</span>
								{/if}
								<span class="text-gray-500 text-xs ml-auto">{getTimeAgo(activity.updatedAt)}</span>
							</div>

							<div class="flex items-center gap-3">
								<!-- Album Art -->
								{#if activity.albumImage}
									<img
										src={activity.albumImage}
										alt={activity.albumName || 'Album'}
										class="w-10 h-10 rounded"
									/>
								{:else}
									<div class="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
										<span class="text-xs">🎵</span>
									</div>
								{/if}

								<!-- Track Info -->
								<div class="flex-1 min-w-0">
									<p class="font-medium truncate">{activity.trackName}</p>
									<p class="text-sm text-gray-400 truncate">
										{activity.artistNames}
										{#if activity.albumName}
											• {activity.albumName}
										{/if}
									</p>
								</div>
							</div>

							<!-- Progress Bar -->
							{#if activity.duration > 0}
								<div class="mt-2">
									<div class="flex items-center gap-2 text-xs text-gray-500">
										<span>{formatTime(activity.progress)}</span>
										<div class="flex-1 bg-gray-700 rounded-full h-1 overflow-hidden">
											<div
												class="bg-spotify-green h-full transition-all duration-300"
												style="width: {getProgressPercentage(activity.progress, activity.duration)}%"
											></div>
										</div>
										<span>{formatTime(activity.duration)}</span>
									</div>
								</div>
							{/if}

							<!-- Context Info -->
							{#if activity.contextType && activity.contextName}
								<p class="text-xs text-gray-500 mt-1">
									Playing from {activity.contextType}: {activity.contextName}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.listening-activity {
		max-width: 800px;
		margin: 0 auto;
	}
</style>