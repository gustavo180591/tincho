// This file provides type declarations for SvelteKit

// Import SvelteKit types
import { Page } from '@sveltejs/kit';

// Declare the $app/stores module
declare module '$app/stores' {
  import { Readable } from 'svelte/store';
  
  export const page: Readable<Page>;
  export const navigating: Readable<{ from: string; to: string | null; } | null>;
  export const updated: Readable<boolean> & { check: () => Promise<boolean> };
  
  // Add other store exports as needed
}

// Ensure this file is treated as a module
export {};
