<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';
  import { page } from '$app/stores';
  
  export let data: {
    q: string;
    results: Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      images: Array<{ url: string }>;
      variations: Array<{ priceAmount: number; priceCurrency: string }>;
      brand?: { name: string; slug: string };
      category?: { name: string; slug: string };
      ratingAvg: number;
      ratingCount: number;
    }>;
    total: number;
    categories: Array<{
      id: string;
      name: string;
      slug: string;
      children: Array<{ id: string; name: string; slug: string }>;
    }>;
    brands: Array<{ id: string; name: string; slug: string }>;
    filters: {
      category: string | null;
      brand: string | null;
      priceMin: number | string;
      priceMax: number | string;
      sort: string;
    };
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  
  let searchQuery = data.q;
  let priceMin = data.filters.priceMin;
  let priceMax = data.filters.priceMax;
  let selectedCategory = data.filters.category;
  let selectedBrand = data.filters.brand;
  let sortBy = data.filters.sort;
  
  // Generate URL with updated query parameters
  function updateUrl() {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedBrand) params.set('brand', selectedBrand);
    if (priceMin) params.set('priceMin', String(priceMin));
    if (priceMax) params.set('priceMax', String(priceMax));
    if (sortBy) params.set('sort', sortBy);
    
    // Reset to first page when filters change
    params.set('page', '1');
    
    return `?${params.toString()}`;
  }
  
  // Reset all filters
  function resetFilters() {
    searchQuery = '';
    selectedCategory = '';
    selectedBrand = '';
    priceMin = '';
    priceMax = '';
    sortBy = 'updatedAt:desc';
  }
</script>

<svelte:head>
  <title>Buscar productos - {data.q ? `${data.q} | ` : ''}tincho</title>
  <meta name="description" content="Busca entre nuestra amplia variedad de productos" />
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="flex flex-col md:flex-row gap-8">
    <!-- Filters Sidebar -->
    <aside class="w-full md:w-64 flex-shrink-0">
      <form method="GET" action="/search" class="space-y-6">
        <!-- Search Box -->
        <div>
          <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <div class="relative">
            <input
              type="text"
              id="search"
              name="q"
              bind:value={searchQuery}
              placeholder="Buscar productos..."
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <!-- Categories -->
        <div>
          <h3 class="font-medium text-gray-900 mb-2">Categorías</h3>
          <div class="space-y-2">
            {#each data.categories as category}
              <div>
                <label class="flex items-center">
                  <input
                    type="radio"
                    name="category"
                    value={category.slug}
                    bind:group={selectedCategory}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  >
                  <span class="ml-2 text-sm text-gray-700">{category.name}</span>
                </label>
                
                {#if category.children.length > 0}
                  <div class="ml-6 mt-1 space-y-1">
                    {#each category.children as child}
                      <label class="flex items-center">
                        <input
                          type="radio"
                          name="category"
                          value={child.slug}
                          bind:group={selectedCategory}
                          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        >
                        <span class="ml-2 text-sm text-gray-600">{child.name}</span>
                      </label>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Brands -->
        <div>
          <h3 class="font-medium text-gray-900 mb-2">Marcas</h3>
          <div class="space-y-2">
            {#each data.brands as brand}
              <label class="flex items-center">
                <input
                  type="radio"
                  name="brand"
                  value={brand.slug}
                  bind:group={selectedBrand}
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                >
                <span class="ml-2 text-sm text-gray-700">{brand.name}</span>
              </label>
            {/each}
          </div>
        </div>
        
        <!-- Price Range -->
        <div>
          <h3 class="font-medium text-gray-900 mb-2">Rango de precios</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="priceMin" class="block text-xs text-gray-500">Mínimo</label>
              <input
                type="number"
                id="priceMin"
                name="priceMin"
                bind:value={priceMin}
                placeholder="$"
                min="0"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              >
            </div>
            <div>
              <label for="priceMax" class="block text-xs text-gray-500">Máximo</label>
              <input
                type="number"
                id="priceMax"
                name="priceMax"
                bind:value={priceMax}
                placeholder="$"
                min="0"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              >
            </div>
          </div>
        </div>
        
        <!-- Sort -->
        <div>
          <label for="sort" class="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
          <select
            id="sort"
            name="sort"
            bind:value={sortBy}
            class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          >
            <option value="updatedAt:desc">Más recientes</option>
            <option value="title:asc">Nombre (A-Z)</option>
            <option value="title:desc">Nombre (Z-A)</option>
            <option value="variations.priceAmount:asc">Precio: menor a mayor</option>
            <option value="variations.priceAmount:desc">Precio: mayor a menor</option>
          </select>
        </div>
        
        <!-- Buttons -->
        <div class="flex space-x-3">
          <a
            href="?"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Limpiar
          </a>
          <button
            type="submit"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Aplicar filtros
          </button>
        </div>
      </form>
    </aside>
    
    <!-- Main Content -->
    <div class="flex-1">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">
          {#if data.q}
            Resultados para "{data.q}"
          {:else}
            Todos los productos
          {/if}
        </h1>
        
        {#if data.total > 0}
          <p class="mt-1 text-sm text-gray-500">
            Mostrando {(data.pagination.page - 1) * data.pagination.limit + 1}-{Math.min(data.pagination.page * data.pagination.limit, data.total)} de {data.total} resultados
          </p>
        {/if}
      </div>
      
      {#if data.total > 0}
        <!-- Product Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {#each data.results as product (product.id)}
            <ProductCard {product} />
          {/each}
        </div>
        
        <!-- Pagination -->
        {#if data.pagination.totalPages > 1}
          <nav class="mt-8 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0">
            <div class="-mt-px flex w-0 flex-1">
              {#if data.pagination.page > 1}
                <a
                  href={`?page=${data.pagination.page - 1}`}
                  class="inline-flex items-center border-t-2 border-transparent pt-4 pr-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  <svg class="mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M18 10a.75.75 0 01-.75.75H4.66l2.1 1.95a.75.75 0 11-1.02 1.1l-3.5-3.25a.75.75 0 010-1.1l3.5-3.25a.75.75 0 111.02 1.1l-2.1 1.95h12.59A.75.75 0 0118 10z" clip-rule="evenodd" />
                  </svg>
                  Anterior
                </a>
              {/if}
            </div>
            
            <div class="hidden md:-mt-px md:flex">
              {#each Array(data.pagination.totalPages).fill(0) as _, i}
                {#if i + 1 === data.pagination.page}
                  <a
                    href="#"
                    class="inline-flex items-center border-t-2 border-indigo-500 px-4 pt-4 text-sm font-medium text-indigo-600"
                    aria-current="page"
                  >
                    {i + 1}
                  </a>
                {:else}
                  <a
                    href={`?page=${i + 1}`}
                    class="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  >
                    {i + 1}
                  </a>
                {/if}
              {/each}
            </div>
            
            <div class="-mt-px flex w-0 flex-1 justify-end">
              {#if data.pagination.page < data.pagination.totalPages}
                <a
                  href={`?page=${data.pagination.page + 1}`}
                  class="inline-flex items-center border-t-2 border-transparent pt-4 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  Siguiente
                  <svg class="ml-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" clip-rule="evenodd" />
                  </svg>
                </a>
              {/if}
            </div>
          </nav>
        {/if}
      {:else}
        <div class="text-center py-12">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
          <p class="mt-1 text-sm text-gray-500">
            No hay productos que coincidan con tu búsqueda. Intenta con otros filtros.
          </p>
          <div class="mt-6">
            <a
              href="?"
              class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Limpiar filtros
            </a>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
