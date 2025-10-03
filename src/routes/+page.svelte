<script lang="ts">
  import { onMount } from 'svelte';
  // Use dynamic import for better compatibility
let page;
import('$app/stores').then(({ page: pageStore }) => {
  page = pageStore;
});
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  // Tipos basados en el esquema de Prisma
  interface Product {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    brand: { name: string; slug: string } | null;
    category: { name: string; slug: string } | null;
    images: Array<{ url: string }>;
    skus: Array<{
      id: string;
      priceAmount: number;
      priceCurrency: string;
      stock: number;
      variantValues: Record<string, string>;
    }>;
    ratingAvg: number;
    ratingCount: number;
    condition: 'NEW' | 'USED' | 'REFURBISHED';
    createdAt?: string;
    updatedAt?: string;
  }

  export let data: {
    products: Product[];
    total: number;
    categories?: Array<{ id: string; name: string; slug: string }>;
    brands?: Array<{ id: string; name: string; slug: string }>;
  };

  // Estados
  let isLoading = false;
  let searchQuery = '';
  let selectedCategories: string[] = [];
  let selectedBrands: string[] = [];
  let priceRange = { min: 0, max: 10000 };
  let sortBy = 'relevance';
  let showFilters = false;
  let viewMode: 'grid' | 'list' = 'grid';

  // Obtener productos únicos para filtros
  $: categories = [...new Set(data.products?.map(p => p.category?.name).filter(Boolean))] as string[];
  $: brands = [...new Set(data.products?.map(p => p.brand?.name).filter(Boolean))] as string[];

  // Filtrar productos
  $: filteredProducts = data.products ? data.products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategories.length === 0 || 
      (product.category && selectedCategories.includes(product.category.name));
      
    const matchesBrand = selectedBrands.length === 0 || 
      (product.brand && selectedBrands.includes(product.brand.name));
      
    const matchesPrice = product.skus.some(sku => 
      sku.priceAmount >= priceRange.min && sku.priceAmount <= priceRange.max
    );
    
    return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
  }) : [];

  // Ordenar productos
  $: sortedProducts = [...filteredProducts].sort((a, b) => {
    switch(sortBy) {
      case 'price-asc':
        return (a.skus[0]?.priceAmount || 0) - (b.skus[0]?.priceAmount || 0);
      case 'price-desc':
        return (b.skus[0]?.priceAmount || 0) - (a.skus[0]?.priceAmount || 0);
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'rating':
        return (b.ratingAvg || 0) - (a.ratingAvg || 0);
      default: // 'relevance'
        return 0;
    }
  });

  // Formatear precio
  function formatPrice(amount: number, currency: string = 'ARS'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount / 100); // Asumiendo que los precios se almacenan en centavos
  }

  // Obtener el precio mínimo de un producto
  function getMinPrice(product: typeof data.featuredProducts[0]): string {
    if (!product.skus.length) return 'Consultar';
    const minPrice = Math.min(...product.skus.map(sku => sku.priceAmount));
    return formatPrice(minPrice, product.skus[0].priceCurrency);
  }
</script>

<svelte:head>
  <title>Tienda Online - Inicio</title>
  <meta name="description" content="Bienvenido a nuestra tienda online. Descubre nuestras ofertas y productos destacados." />
</svelte:head>

<main class="min-h-screen bg-gray-50">
  <!-- Hero Section -->
  <section class="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
    <div class="container mx-auto px-4">
      <div class="max-w-3xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-6">Bienvenido a Tincho</h1>
        <p class="text-xl mb-8">Tu destino para compras en línea seguras y fáciles</p>
        
        <!-- Barra de búsqueda -->
        <div class="relative max-w-xl mx-auto mb-8">
          <div class="relative flex items-center">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Buscar productos..."
              class="w-full px-6 py-4 rounded-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button class="absolute right-2 bg-blue-700 hover:bg-blue-800 text-white p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="flex flex-wrap justify-center gap-4 mt-6">
          <a 
            href="/productos" 
            class="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-full text-lg transition duration-300 inline-block"
          >
            Ver Catálogo
          </a>
          <a 
            href="/ofertas" 
            class="bg-transparent border-2 border-white hover:bg-white hover:bg-opacity-10 font-semibold py-3 px-8 rounded-full text-lg transition duration-300 inline-block"
          >
            Ofertas del Día
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Filtros -->
  <section class="py-8 bg-white shadow-sm">
    <div class="container mx-auto px-4">
      <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-800">Productos Destacados</h2>
        
        <div class="flex flex-wrap gap-4">
          <!-- Filtro por categoría -->
          <div class="relative">
            <select 
              bind:value={selectedCategory}
              class="appearance-none bg-white border border-gray-300 rounded-md pl-4 pr-10 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las categorías</option>
              {#each data.categories as category}
                <option value={category.slug}>{category.name}</option>
              {/each}
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
          
          <!-- Filtro por marca -->
          <div class="relative">
            <select 
              bind:value={selectedBrand}
              class="appearance-none bg-white border border-gray-300 rounded-md pl-4 pr-10 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las marcas</option>
              {#each data.brands as brand}
                <option value={brand.slug}>{brand.name}</option>
              {/each}
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Productos Destacados -->
  <section class="py-12 bg-gray-50">
    <div class="container mx-auto px-4">
      {#if isLoading}
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p class="mt-4 text-gray-600">Cargando productos...</p>
        </div>
      {:else if filteredProducts.length > 0}
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {#each filteredProducts as product (product.id)}
            <a 
              href="/productos/{product.slug}" 
              class="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full"
            >
              <!-- Imagen del producto -->
              <div class="relative pt-[100%] bg-gray-100 overflow-hidden">
                {#if product.images[0]}
                  <img 
                    src={product.images[0].url} 
                    alt={product.title}
                    class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                {:else}
                  <div class="absolute inset-0 flex items-center justify-center bg-gray-200">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                {/if}
                
                <!-- Badge de condición -->
                {#if product.condition === 'NEW'}
                  <span class="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    Nuevo
                  </span>
                {:else if product.condition === 'REFURBISHED'}
                  <span class="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    Reacondicionado
                  </span>
                {/if}
              </div>
              
              <!-- Contenido de la tarjeta -->
              <div class="p-4 flex flex-col flex-grow">
                {#if product.brand}
                  <p class="text-sm text-gray-500 mb-1">{product.brand.name}</p>
                {/if}
                
                <h3 class="font-medium text-gray-900 mb-2 line-clamp-2">
                  {product.title}
                </h3>
                
                <div class="mt-auto">
                  <div class="flex items-center justify-between mt-2">
                    <div class="text-lg font-bold text-gray-900">
                      {getMinPrice(product)}
                    </div>
                    
                    {#if product.skus.some(sku => sku.stock > 0)}
                      <span class="text-xs text-green-600 font-medium">
                        {product.skus.some(sku => sku.stock > 10) ? 'Disponible' : 'Últimas unidades'}
                      </span>
                    {:else}
                      <span class="text-xs text-red-600 font-medium">
                        Sin stock
                      </span>
                    {/if}
                  </div>
                  
                  <!-- Rating -->
                  {#if product.ratingCount > 0}
                    <div class="flex items-center mt-2">
                      <div class="flex">
                        {#each Array(5) as _, i}
                          {#if i < Math.floor(product.ratingAvg)}
                            <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          {:else}
                            <svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          {/if}
                        {/each}
                      </div>
                      <span class="text-xs text-gray-500 ml-1">
                        ({product.ratingCount})
                      </span>
                    </div>
                  {/if}
                </div>
              </div>
            </a>
          {/each}
        </div>
        
        <div class="text-center mt-12">
          <a 
            href="/productos" 
            class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full transition-colors"
          >
            Ver todos los productos
            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </a>
        </div>
      {:else}
        <div class="text-center py-16">
          <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">No se encontraron productos</h3>
          <p class="mt-1 text-gray-500">Intenta con otros filtros o vuelve más tarde.</p>
          <div class="mt-6">
            <button 
              on:click={() => {
                selectedCategory = '';
                selectedBrand = '';
                searchQuery = '';
              }}
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
              </svg>
              Limpiar filtros
            </button>
          </div>
        </div>
      {/if}
    </div>
  </section>

  <!-- Categorías destacadas -->
  <section class="py-16 bg-white">
    <div class="container mx-auto px-4">
      <h2 class="text-2xl font-bold text-center mb-10">Explorar por Categoría</h2>
      
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {#each data.categories.slice(0, 6) as category}
          <a 
            href="/categoria/{category.slug}" 
            class="group flex flex-col items-center p-6 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <span class="text-center font-medium text-gray-800 group-hover:text-blue-600">{category.name}</span>
          </a>
        {/each}
      </div>
      
      {#if data.categories.length > 6}
        <div class="text-center mt-10">
          <a 
            href="/categorias" 
            class="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            Ver todas las categorías
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      {/if}
    </div>
  </section>

  <!-- Características -->
  <section class="py-16 bg-gradient-to-b from-gray-50 to-white">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">¿Por qué comprar con nosotros?</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">Ofrecemos la mejor experiencia de compra online con envíos rápidos y atención personalizada.</p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Compra Segura</h3>
            <p class="text-gray-600">Protegemos tus datos con encriptación de última generación.</p>
          </div>

          <div class="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div class="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Envío Gratis</h3>
            <p class="text-gray-600">En compras superiores a $20.000 a todo el país.</p>
          </div>

          <div class="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div class="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Garantía</h3>
            <p class="text-gray-600">Todos nuestros productos tienen garantía oficial.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Newsletter -->
  <section class="py-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
    <div class="container mx-auto px-4 text-center">
      <div class="max-w-4xl mx-auto bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">¡No te pierdas nuestras ofertas!</h2>
        <p class="text-lg text-blue-100 max-w-2xl mx-auto mb-8">Suscríbete a nuestro boletín y recibe descuentos exclusivos, novedades y ofertas especiales directamente en tu correo.</p>
        
        <form class="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
          <div class="flex-grow">
            <label for="email" class="sr-only">Correo electrónico</label>
            <input 
              id="email"
              name="email"
              type="email" 
              placeholder="tucorreo@ejemplo.com" 
              class="w-full px-5 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-blue-700"
              required
            />
          </div>
          <button 
            type="submit" 
            class="bg-white text-blue-700 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-colors whitespace-nowrap"
          >
            Suscribirse
          </button>
        </form>
        
        <p class="text-sm text-blue-100 mt-4">
          Al suscribirte aceptas nuestra <a href="/politica-privacidad" class="underline hover:text-white">Política de Privacidad</a>.
        </p>
      </div>
    </div>
  </section>
  
  <!-- Marcas destacadas -->
  <section class="py-12 bg-white">
    <div class="container mx-auto px-4">
      <h2 class="text-2xl font-bold text-center mb-8">Nuestras Marcas</h2>
      
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {#each data.brands.slice(0, 6) as brand}
          <a 
            href="/marca/{brand.slug}" 
            class="flex items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
          >
            <span class="text-lg font-medium text-gray-800">{brand.name}</span>
          </a>
        {/each}
      </div>
      
      {#if data.brands.length > 6}
        <div class="text-center mt-8">
          <a 
            href="/marcas" 
            class="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            Ver todas las marcas
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      {/if}
    </div>
  </section>
</main>

<style>
  /* Custom styles can be added here */
</style>
