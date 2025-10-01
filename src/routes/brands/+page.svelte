<script lang="ts">
  import { page } from '$app/stores';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  // Extract brands from the loaded data
  $: ({ brands } = data);
  
  // Function to get the first letter of a string
  function getFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase();
  }
  
  // Group brands by their first letter
  $: brandGroups = {};
  
  $: if (brands) {
    brandGroups = brands.reduce((groups: Record<string, any[]>, brand) => {
      const letter = getFirstLetter(brand.name);
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(brand);
      return groups;
    }, {});
    
    // Sort the groups alphabetically
    brandGroups = Object.keys(brandGroups)
      .sort()
      .reduce((obj, key) => {
        obj[key] = brandGroups[key].sort((a, b) => a.name.localeCompare(b.name));
        return obj;
      }, {});
  }
</script>

<svelte:head>
  <title>Marcas | Tincho</title>
  <meta name="description" content="Explora nuestras marcas de productos" />
</svelte:head>

<main class="min-h-screen bg-gray-50 py-8">
  <div class="container mx-auto px-4">
    <!-- Page Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Nuestras Marcas</h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        Descubre productos de las mejores marcas del mercado
      </p>
    </div>

    <!-- Brands A-Z Navigation -->
    <div class="flex flex-wrap justify-center gap-2 mb-8">
      {#each Object.keys(brandGroups) as letter}
        <a 
          href={`#letter-${letter}`}
          class="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          {letter}
        </a>
      {/each}
    </div>

    <!-- Brands Grid -->
    <div class="space-y-12">
      {#each Object.entries(brandGroups) as [letter, letterBrands]}
        <div id={`letter-${letter}`} class="scroll-mt-20">
          <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">{letter}</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {#each letterBrands as brand}
              <a 
                href={`/marcas/${brand.slug}`}
                class="group bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center h-full"
              >
                <div class="w-full aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center p-4">
                  <span class="text-2xl font-bold text-gray-400 group-hover:text-blue-600 transition-colors">
                    {brand.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {brand.name}
                </h3>
                <span class="text-sm text-gray-500 mt-1">
                  {brand.productCount} {brand.productCount === 1 ? 'producto' : 'productos'}
                </span>
              </a>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</main>

<style>
  .scroll-mt-20 {
    scroll-margin-top: 5rem;
  }
</style>
