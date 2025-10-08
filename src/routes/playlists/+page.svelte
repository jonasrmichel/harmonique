<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let searchQuery = '';

	$: filteredPlaylists = data.spotifyPlaylists?.filter(playlist => {
		if (!searchQuery) return true;
		return playlist.name.toLowerCase().includes(searchQuery.toLowerCase());
	}) || [];
</script>

<svelte:head>
	<title>My Playlists - Harmonique</title>
</svelte:head>

<section class="container mx-auto px-4 py-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-3xl font-bold">My Spotify Playlists</h1>
	</div>

	{#if data.error}
		<div class="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
			<p class="text-red-400">{data.error}</p>
			<a href="/auth/login" class="text-spotify-green hover:underline">Sign in with Spotify</a>
		</div>
	{/if}

	{#if data.spotifyPlaylists?.length > 0}
		<!-- Search -->
		<div class="mb-8">
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Search your playlists..."
				class="w-full md:w-96 bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-spotify-green"
			/>
		</div>

		<!-- Playlists Grid -->
		<div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each filteredPlaylists as playlist}
				<a
					href="/playlists/{playlist.id}"
					class="card hover:scale-105 transition-transform"
				>
					{#if playlist.images?.[0]}
						<img
							src={playlist.images[0].url}
							alt={playlist.name}
							class="w-full aspect-square object-cover rounded-lg mb-3"
						/>
					{:else}
						<div class="w-full aspect-square bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
							<span class="text-4xl">🎵</span>
						</div>
					{/if}

					<h3 class="font-semibold text-lg mb-1 line-clamp-1">{playlist.name}</h3>

					<p class="text-sm text-gray-400 mb-2">
						{playlist.tracks?.total || 0} tracks
					</p>

					{#if playlist.description}
						<p class="text-sm text-gray-300 line-clamp-2">
							{playlist.description}
						</p>
					{/if}

					<div class="mt-3 flex items-center gap-2 text-xs">
						{#if playlist.public}
							<span class="bg-spotify-green/20 text-spotify-green px-2 py-1 rounded">
								Public
							</span>
						{:else}
							<span class="bg-gray-700 text-gray-400 px-2 py-1 rounded">
								Private
							</span>
						{/if}

						{#if playlist.collaborative}
							<span class="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
								Collaborative
							</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{:else if !data.error}
		<div class="text-center py-12">
			<p class="text-gray-400 text-lg mb-4">No playlists found</p>
			<p class="text-gray-500">Sign in with Spotify to see your playlists</p>
			<a href="/auth/login" class="btn-primary mt-4 inline-block">
				Connect with Spotify
			</a>
		</div>
	{/if}
</section>