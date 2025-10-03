// Type definitions for @sveltejs/kit

import { Readable } from 'svelte/store';
import { Page } from '@sveltejs/kit';

declare module '$app/stores' {
  export const page: Readable<Page>;
  export const navigating: Readable<{ from: string; to: string | null; } | null>;
  export const updated: Readable<boolean> & { check: () => Promise<boolean> };
  // Add other store exports as needed
}

// Ensure this file is treated as a module
export {};
