<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Authentication Error - Harmonique</title>
</svelte:head>

<div class="container mx-auto px-4 py-16">
	<div class="max-w-md mx-auto">
		<div class="bg-red-900/20 border border-red-800 rounded-lg p-8 text-center">
			<div class="text-6xl mb-4">⚠️</div>
			<h1 class="text-2xl font-bold mb-4">Authentication Error</h1>

			<p class="text-gray-400 mb-6">
				{#if $page.url.searchParams.get('error') === 'AccessDenied'}
					You denied access to your Spotify account. Please authorize access to use Harmonique.
				{:else if $page.url.searchParams.get('error') === 'Configuration'}
					There's a configuration issue with the authentication. Please contact support.
				{:else}
					An error occurred during authentication. Please try again.
				{/if}
			</p>

			<div class="flex gap-4 justify-center">
				<a href="/auth/login" class="btn-primary">
					Try Again
				</a>
				<a href="/" class="btn-secondary">
					Go Home
				</a>
			</div>
		</div>
	</div>
</div>