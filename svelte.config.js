import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Enable TypeScript
  preprocess: [
    vitePreprocess({
      postcss: true,
    }),
  ],
  kit: {
    adapter: adapter(),
    // Enable type checking in Svelte components
    typescript: {
      config(config) {
        return {
          ...config,
          compilerOptions: {
            ...config.compilerOptions,
            strict: true,
            noImplicitAny: true,
            strictNullChecks: true,
          },
        };
      },
    },
  },
};

export default config;
