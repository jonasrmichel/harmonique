import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		hmr: {
			protocol: 'ws'
		},
		allowedHosts: ['localhost', 'test.harmonique.io', 'harmonique.io', 'harmonique.ouchwowboing.io']
	}
});