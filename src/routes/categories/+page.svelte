<script lang="ts">
  import { page } from '$app/stores';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  // Extract categories from the loaded data
  $: ({ categories } = data);
  
  // Function to get the category image URL or a placeholder
  function getCategoryImage(category) {
    return category.image || 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(category.name);
  }
</script>

<svelte:head>
  <title>Categorías | Tincho</title>
  <meta name="description" content="Explora nuestras categorías de productos" />
</svelte:head>

<main class="min-h-screen bg-gray-50 py-8">
  <div class="container mx-auto px-4">
    <!-- Page Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Nuestras Categorías</h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        Explora nuestra amplia gama de productos organizados por categorías para encontrar exactamente lo que necesitas.
      </p>
    </div>

    <!-- Categories Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each categories as category}
        <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <!-- Category Image -->
          <div class="relative h-48 bg-gray-100 overflow-hidden">
            <img 
              src={getCategoryImage(category)} 
              alt={category.name}
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
              <h2 class="text-2xl font-bold text-white">{category.name}</h2>
              <span class="ml-auto bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full">
                {category.productCount} {category.productCount === 1 ? 'producto' : 'productos'}
              </span>
            </div>
          </div>
          
          <!-- Subcategories -->
          {#if category.children?.length > 0}
            <div class="p-4 border-t border-gray-100">
              <h3 class="text-sm font-medium text-gray-500 mb-2">Subcategorías</h3>
              <div class="space-y-1">
                {#each category.children as subcategory}
                  <a 
                    href="/categorias/{category.slug}/{subcategory.slug}" 
                    class="flex items-center justify-between text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded"
                  >
                    <span>{subcategory.name}</span>
                    <span class="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                      {subcategory.productCount}
                    </span>
                  </a>
                {/each}
              </div>
            </div>
          {/if}
          
          <!-- View All Button -->
          <div class="p-4 border-t border-gray-100">
            <a 
              href="/categorias/{category.slug}" 
              class="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Ver todos los productos
            </a>
          </div>
        </div>
      {/each}
    </div>
  </div>
</main>

<style>
  /* Custom styles can be added here */
</style>
