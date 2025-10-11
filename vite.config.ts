import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		hmr: false, // Disable HMR when running behind ngrok/HTTPS proxy
		allowedHosts: ['localhost', 'test.harmonique.io', 'harmonique.io', 'harmonique.ouchwowboing.io']
	}
});