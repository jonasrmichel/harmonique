import { writable } from 'svelte/store';

export const playerVisible = writable(false);
export const currentTrack = writable<any>(null);
export const isPlayerExpanded = writable(false);