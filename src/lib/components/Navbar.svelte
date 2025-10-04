<script lang="ts">
  export let cartCount: number = 0;
</script>

<header class="w-full border-b bg-white/90 backdrop-blur sticky top-0 z-50">
  <div class="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
    <!-- Logo -->
    <a href="/" class="text-xl font-bold">tincho</a>

    <!-- Search -->
    <form action="/search" method="GET" class="flex-1">
      <input
        type="search"
        name="q"
        placeholder="Buscar productos, marcas y más..."
        class="w-full rounded-xl border px-4 py-2"
      />
    </form>

    <!-- Actions -->
    <nav class="flex items-center gap-4 text-sm">
      <a href="/seller" class="hover:underline">Vender</a>
      <a href="/account" class="hover:underline">Mi cuenta</a>
      <a href="/cart" class="relative hover:underline">
        Carrito
        {#if cartCount > 0}
          <span class="absolute -top-2 -right-3 text-xs bg-black text-white rounded-full px-2 py-0.5">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        {/if}
      </a>
    </nav>
  </div>

  <!-- Quick Categories -->
  <div class="mx-auto max-w-7xl px-4 py-2 text-sm flex gap-3 overflow-x-auto">
    <a href="/categories" class="hover:underline whitespace-nowrap">Categorías</a>
    <a href="/brands" class="hover:underline whitespace-nowrap">Marcas</a>
    <a href="/help" class="hover:underline whitespace-nowrap">Ayuda</a>
    <a href="/legal" class="hover:underline whitespace-nowrap">Términos</a>
  </div>
</header>