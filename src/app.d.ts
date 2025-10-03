// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// Import SvelteKit types
/// <reference types="@sveltejs/kit" />

declare global {
  // In-memory session store (in production, use a proper session store like Redis)
  var userSessions: Map<string, { userId: string; expires: number }>;

  namespace App {
    // interface Error {}
    interface Locals {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
      } | null;
    }
    
    // Uncomment and customize these as needed
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
