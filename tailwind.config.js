/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				spotify: {
					green: '#1DB954',
					black: '#191414',
					white: '#FFFFFF',
					gray: '#535353'
				}
			}
		}
	},
	plugins: []
};