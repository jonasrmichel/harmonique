<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	let name = '';
	let description = '';
	let isPublic = true;
	let tags = '';
	let loading = false;
	let error = '';

	async function createPlaylist() {
		if (!name.trim()) {
			error = 'Playlist name is required';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/playlists', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim(),
					isPublic,
					tags: tags.split(',').map(t => t.trim()).filter(Boolean)
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to create playlist');
			}

			const playlist = await response.json();
			goto(`/playlists/${playlist.id}`);
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Create Playlist - Harmonique</title>
</svelte:head>

<section class="container mx-auto px-4 py-8 max-w-2xl">
	<h1 class="text-3xl font-bold mb-8">Create New Playlist</h1>

	{#if !data.user}
		<div class="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
			<p class="text-yellow-400">You need to be logged in to create playlists.</p>
			<a href="/auth/login" class="btn-primary inline-block mt-4">
				Login with Spotify
			</a>
		</div>
	{:else}
		<form on:submit|preventDefault={createPlaylist} class="space-y-6">
			{#if error}
				<div class="bg-red-900/20 border border-red-700 rounded-lg p-4">
					<p class="text-red-400">{error}</p>
				</div>
			{/if}

			<div>
				<label for="name" class="block mb-2 font-medium">
					Playlist Name *
				</label>
				<input
					id="name"
					bind:value={name}
					type="text"
					required
					placeholder="My Awesome Playlist"
					class="w-full bg-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-spotify-green"
				/>
			</div>

			<div>
				<label for="description" class="block mb-2 font-medium">
					Description
				</label>
				<textarea
					id="description"
					bind:value={description}
					rows="4"
					placeholder="Tell us about your playlist..."
					class="w-full bg-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-spotify-green"
				/>
			</div>

			<div>
				<label for="tags" class="block mb-2 font-medium">
					Tags
				</label>
				<input
					id="tags"
					bind:value={tags}
					type="text"
					placeholder="pop, summer, party (comma-separated)"
					class="w-full bg-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-spotify-green"
				/>
				<p class="text-sm text-gray-400 mt-1">
					Add tags to help others discover your playlist
				</p>
			</div>

			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={isPublic}
						class="w-5 h-5 rounded text-spotify-green focus:ring-spotify-green"
					/>
					<span>Make this playlist public</span>
				</label>
				<p class="text-sm text-gray-400 mt-1 ml-8">
					Public playlists can be discovered and followed by other users
				</p>
			</div>

			<div class="flex gap-4">
				<button
					type="submit"
					disabled={loading}
					class="btn-primary disabled:opacity-50"
				>
					{loading ? 'Creating...' : 'Create Playlist'}
				</button>
				<a href="/playlists" class="btn-secondary">
					Cancel
				</a>
			</div>
		</form>
	{/if}
</section>