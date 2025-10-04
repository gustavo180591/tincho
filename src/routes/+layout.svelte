<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  // For real cart count, load it from locals via +layout.server.ts (optional)
  let cartCount = 0;
</script>

<Navbar {cartCount} />

<main class="mx-auto max-w-7xl px-4 py-6">
  <slot />
</main>

<footer class="mx-auto max-w-7xl px-4 py-10 text-sm text-neutral-500">
  <div class="border-t pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <p>© {new Date().getFullYear()} tincho</p>
    <nav class="flex gap-4">
      <a href="/help" class="hover:underline">Ayuda</a>
      <a href="/legal" class="hover:underline">Términos</a>
    </nav>
  </div>
</footer>