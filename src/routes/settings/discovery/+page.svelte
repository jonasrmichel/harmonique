<script lang="ts">
	import { onMount } from 'svelte';

	interface PrivacySettings {
		isDiscoverable: boolean;
		showTopArtists: boolean;
		showTopTracks: boolean;
		showGenres: boolean;
	}

	let settings: PrivacySettings = {
		isDiscoverable: true,
		showTopArtists: true,
		showTopTracks: true,
		showGenres: true
	};

	let loading = true;
	let saving = false;
	let message = '';

	async function fetchSettings() {
		try {
			const response = await fetch('/api/taste-profile/privacy');
			if (response.ok) {
				const data = await response.json();
				settings = data.settings || settings;
			}
		} catch (error) {
			console.error('Failed to fetch settings:', error);
		} finally {
			loading = false;
		}
	}

	async function saveSettings() {
		saving = true;
		message = '';

		try {
			const response = await fetch('/api/taste-profile/privacy', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(settings)
			});

			if (response.ok) {
				message = 'Settings saved successfully!';
				setTimeout(() => message = '', 3000);
			} else {
				message = 'Failed to save settings';
			}
		} catch (error) {
			console.error('Failed to save settings:', error);
			message = 'Error saving settings';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		fetchSettings();
	});
</script>

<svelte:head>
	<title>Discovery Settings - Harmonique</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-3xl">
	<h1 class="text-3xl font-bold mb-8">Discovery Privacy Settings</h1>

	{#if loading}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
		</div>
	{:else}
		<div class="bg-gray-900/50 rounded-lg p-8">
			<div class="space-y-6">
				<!-- Main Discovery Toggle -->
				<div class="border-b border-gray-800 pb-6">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-semibold mb-1">Make me discoverable</h3>
							<p class="text-sm text-gray-400">
								Allow other users to find you based on music taste similarity
							</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								bind:checked={settings.isDiscoverable}
								class="sr-only peer"
							/>
							<div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-spotify-green"></div>
						</label>
					</div>
				</div>

				<!-- What to Share -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold">What others can see about me</h3>
					<p class="text-sm text-gray-400 -mt-2">
						Control what information is visible when you appear in discovery results
					</p>

					<div class="space-y-4 pl-4">
						<!-- Show Top Artists -->
						<div class="flex items-center justify-between">
							<div>
								<h4 class="font-medium mb-1">Top Artists</h4>
								<p class="text-sm text-gray-400">
									Display your favorite artists in discovery matches
								</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									bind:checked={settings.showTopArtists}
									disabled={!settings.isDiscoverable}
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-spotify-green peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
							</label>
						</div>

						<!-- Show Top Tracks -->
						<div class="flex items-center justify-between">
							<div>
								<h4 class="font-medium mb-1">Top Tracks</h4>
								<p class="text-sm text-gray-400">
									Display your favorite tracks in discovery matches
								</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									bind:checked={settings.showTopTracks}
									disabled={!settings.isDiscoverable}
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-spotify-green peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
							</label>
						</div>

						<!-- Show Genres -->
						<div class="flex items-center justify-between">
							<div>
								<h4 class="font-medium mb-1">Music Genres</h4>
								<p class="text-sm text-gray-400">
									Display your favorite genres in discovery matches
								</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									bind:checked={settings.showGenres}
									disabled={!settings.isDiscoverable}
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-spotify-green peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
							</label>
						</div>
					</div>
				</div>

				<!-- Privacy Info -->
				<div class="bg-gray-800/50 rounded-lg p-4 mt-6">
					<h4 class="font-medium mb-2 flex items-center gap-2">
						<span>🔒</span>
						Privacy Information
					</h4>
					<ul class="text-sm text-gray-400 space-y-1">
						<li>• Your email address is never shared</li>
						<li>• Similarity scores are calculated locally</li>
						<li>• You can opt out of discovery at any time</li>
						<li>• Your listening history remains private</li>
					</ul>
				</div>

				<!-- Save Button -->
				<div class="flex items-center justify-between pt-6">
					{#if message}
						<p class="text-sm {message.includes('success') ? 'text-green-400' : 'text-red-400'}">
							{message}
						</p>
					{:else}
						<div></div>
					{/if}
					<button
						on:click={saveSettings}
						disabled={saving}
						class="px-6 py-3 bg-spotify-green hover:bg-spotify-green-dark text-black font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{saving ? 'Saving...' : 'Save Settings'}
					</button>
				</div>
			</div>
		</div>

		<!-- Additional Info -->
		<div class="mt-8 text-center text-sm text-gray-500">
			<p>
				Changes to your privacy settings take effect immediately.
				<br />
				To update your taste profile, visit <a href="/discover/people" class="text-spotify-green hover:underline">Discovery</a>
			</p>
		</div>
	{/if}
</div>

<style>
	/* Custom toggle styles handled via Tailwind peer classes */
</style>