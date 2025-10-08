<script lang="ts">
	export let playlist: any;
</script>

<a href="/playlists/{playlist.id}" class="card block hover:scale-105 transition-transform">
	<div class="aspect-square bg-gray-700 rounded-lg mb-4 overflow-hidden">
		{#if playlist.coverImage}
			<img
				src={playlist.coverImage}
				alt={playlist.name}
				class="w-full h-full object-cover"
			/>
		{:else}
			<div class="w-full h-full flex items-center justify-center text-6xl">
				🎵
			</div>
		{/if}
	</div>

	<h3 class="font-semibold mb-1 truncate">{playlist.name}</h3>

	<p class="text-sm text-gray-400 mb-2 truncate">
		by {playlist.user.name || 'Unknown'}
	</p>

	<div class="flex items-center gap-4 text-xs text-gray-500">
		<span>{playlist._count.tracks} tracks</span>
		<span>{playlist._count.likes} likes</span>
	</div>

	{#if playlist.tags?.length}
		<div class="flex gap-1 mt-2 flex-wrap">
			{#each playlist.tags.slice(0, 3) as tag}
				<span class="text-xs bg-gray-700 px-2 py-1 rounded">
					{tag.name}
				</span>
			{/each}
		</div>
	{/if}
</a>