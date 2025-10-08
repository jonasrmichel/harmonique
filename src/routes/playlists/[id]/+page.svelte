<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	function formatDuration(ms: number) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	let playingTrackId: string | null = null;

	async function playTrack(uri: string) {
		const trackId = uri.split(':').pop();
		playingTrackId = trackId || null;

		try {
			const response = await fetch('/api/player/play', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ uri })
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to play track:', error);
				alert(error.error || 'Failed to play track. Please make sure Spotify is open.');
				playingTrackId = null;
			} else {
				const data = await response.json();

				// Successfully started playing - update the now playing component with the track data
				if (data.track) {
					// Dispatch event with full track data
					window.dispatchEvent(new CustomEvent('track-started', {
						detail: {
							uri,
							track: data.track,
							playing: data.playing
						}
					}));
				} else {
					// Fallback to simple event
					window.dispatchEvent(new CustomEvent('track-started', { detail: { uri } }));
				}

				setTimeout(() => {
					playingTrackId = null;
				}, 3000);
			}
		} catch (error) {
			console.error('Error playing track:', error);
			alert('Error playing track. Please make sure Spotify is open.');
			playingTrackId = null;
		}
	}

	async function playPlaylist() {
		try {
			const response = await fetch('/api/player/play', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					context_uri: `spotify:playlist:${data.playlist.id}`
				})
			});

			if (!response.ok) {
				console.error('Failed to play playlist');
			}
		} catch (error) {
			console.error('Error playing playlist:', error);
		}
	}
</script>

<svelte:head>
	<title>{data.playlist.name} - Harmonique</title>
</svelte:head>

<section class="container mx-auto px-4 py-8">
	<!-- Playlist Header -->
	<div class="flex items-start gap-6 mb-8">
		{#if data.playlist.image}
			<img
				src={data.playlist.image}
				alt={data.playlist.name}
				class="w-48 h-48 rounded-lg shadow-xl"
			/>
		{:else}
			<div class="w-48 h-48 bg-gray-800 rounded-lg flex items-center justify-center">
				<span class="text-6xl">🎵</span>
			</div>
		{/if}

		<div class="flex-1">
			<p class="text-sm text-gray-400 uppercase">Playlist</p>
			<h1 class="text-4xl font-bold mb-2">{data.playlist.name}</h1>
			{#if data.playlist.description}
				<p class="text-gray-400 mb-4">{data.playlist.description}</p>
			{/if}
			<div class="flex items-center gap-4 text-sm text-gray-400">
				<span>{data.playlist.owner}</span>
				<span>•</span>
				<span>{data.playlist.total} tracks</span>
				{#if data.playlist.public}
					<span>•</span>
					<span class="text-spotify-green">Public</span>
				{/if}
				{#if data.playlist.collaborative}
					<span>•</span>
					<span class="text-blue-400">Collaborative</span>
				{/if}
			</div>

			<button
				on:click={playPlaylist}
				class="mt-4 px-6 py-2 bg-spotify-green hover:bg-spotify-green/80 text-black font-semibold rounded-full transition-colors"
			>
				▶ Play All
			</button>
		</div>
	</div>

	<!-- Tracks Table -->
	<div class="bg-gray-900/50 rounded-lg overflow-hidden">
		<table class="w-full">
			<thead class="border-b border-gray-800">
				<tr class="text-left text-sm text-gray-400">
					<th class="p-4 w-12">#</th>
					<th class="p-4">Title</th>
					<th class="p-4">Album</th>
					<th class="p-4">Date Added</th>
					<th class="p-4 w-20">Duration</th>
					<th class="p-4 w-12"></th>
				</tr>
			</thead>
			<tbody>
				{#each data.playlist.tracks as track, index}
					<tr class="hover:bg-gray-800/50 transition-colors group">
						<td class="p-4 text-gray-400">{index + 1}</td>
						<td class="p-4">
							<div class="flex items-center gap-3">
								{#if track.album.image}
									<img
										src={track.album.image}
										alt={track.album.name}
										class="w-10 h-10 rounded"
									/>
								{:else}
									<div class="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
										<span class="text-xs">🎵</span>
									</div>
								{/if}
								<div>
									<p class="font-medium">{track.name}</p>
									<p class="text-sm text-gray-400">
										{track.artists.map(a => a.name).join(', ')}
									</p>
								</div>
							</div>
						</td>
						<td class="p-4 text-gray-400">{track.album.name}</td>
						<td class="p-4 text-gray-400">
							{new Date(track.added_at).toLocaleDateString()}
						</td>
						<td class="p-4 text-gray-400">{formatDuration(track.duration_ms)}</td>
						<td class="p-4">
							<button
								on:click={() => playTrack(track.uri)}
								class="opacity-0 group-hover:opacity-100 transition-opacity text-spotify-green hover:scale-110 transform disabled:opacity-50 disabled:cursor-not-allowed"
								title="Play"
								disabled={playingTrackId === track.id}
							>
								{#if playingTrackId === track.id}
									<span class="inline-block animate-spin">⟳</span>
								{:else}
									▶
								{/if}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>