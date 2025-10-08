import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		hmr: {
			protocol: 'ws'
		},
		allowedHosts: ['spocky.ouchwowboing.io', 'localhost']
	}
});