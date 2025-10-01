<script lang="ts">
  export let title = '';
</script>

<section class="max-w-7xl mx-auto p-4 space-y-4">
  {#if title}<h1 class="text-2xl font-semibold">{title}</h1>{/if}
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <slot />
  </div>
</section>
