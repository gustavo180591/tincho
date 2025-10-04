<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
  $: ({ products, pagination } = data);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-AR');
  }
</script>

<div class="mb-4 flex items-center justify-between">
  <div class="text-sm text-neutral-600">
    Mostrando {products.length} de {pagination.total} productos
  </div>
  <form method="GET" class="flex items-center gap-2">
    <label for="sort" class="text-sm text-neutral-600">Ordenar por:</label>
    <select
      id="sort"
      name="sort"
      class="rounded-md border border-gray-300 py-1 pl-2 pr-8 text-sm"
      onchange="this.form.submit()"
    >
      <option value="updatedAt:desc" selected>Más recientes</option>
      <option value="price:asc">Menor precio</option>
      <option value="soldCount:desc">Más vendidos</option>
      <option value="ratingAvg:desc">Mejor valorados</option>
    </select>
  </form>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {#each products as product}
    <ProductCard
      id={product.id}
      slug={product.slug}
      title={product.title}
      image={product.image}
      sku={product.sku}
    />
  {/each}
</div>

{#if pagination.totalPages > 1}
  <div class="mt-8 flex justify-center gap-2">
    {#if pagination.page > 1}
      <a
        href={`?page=${pagination.page - 1}`}
        class="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
      >
        Anterior
      </a>
    {/if}

    {#each Array(pagination.totalPages) as _, i}
      {#if i + 1 === pagination.page}
        <span class="px-4 py-2 rounded-md bg-blue-600 text-white">
          {i + 1}
        </span>
      {:else if Math.abs(i + 1 - pagination.page) < 3 || i === 0 || i === pagination.totalPages - 1}
        <a
          href={`?page=${i + 1}`}
          class="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
        >
          {i + 1}
        </a>
      {:else if (i === 1 && pagination.page > 3) || (i === pagination.totalPages - 2 && pagination.page < pagination.totalPages - 2)}
        <span class="px-2 py-2">...</span>
      {/if}
    {/each}

    {#if pagination.page < pagination.totalPages}
      <a
        href={`?page=${pagination.page + 1}`}
        class="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
      >
        Siguiente
      </a>
    {/if}
  </div>
{/if}