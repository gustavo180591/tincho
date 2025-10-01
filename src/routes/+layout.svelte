<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <meta name="description" content="Tienda online con los mejores productos" />
  <title>tincho - Tienda online</title>
</svelte:head>

<nav class="bg-white shadow-sm sticky top-0 z-10">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <div class="flex items-center">
        <a href="/" class="font-bold text-xl text-indigo-600">tincho</a>
        <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
          <a href="/search" class="text-gray-500 hover:border-indigo-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium">
            Buscar
          </a>
          <a href="/categories" class="text-gray-500 hover:border-indigo-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium">
            Categorías
          </a>
          <a href="/brands" class="text-gray-500 hover:border-indigo-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium">
            Marcas
          </a>
        </div>
      </div>
      <div class="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
        <a href="/help" class="text-gray-500 hover:text-gray-700 text-sm font-medium">
          Ayuda
        </a>
        <a href="/auth/login" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          Iniciar sesión
        </a>
      </div>
    </div>
  </div>
</nav>

<main class="min-h-[calc(100vh-160px)]">
  {@render children()}
</main>

<footer class="bg-gray-50 border-t mt-12">
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <div class="flex flex-col md:flex-row justify-between items-center">
      <div class="flex items-center space-x-6">
        <span class="text-gray-500 text-sm">© {new Date().getFullYear()} tincho</span>
        <a href="/legal" class="text-gray-500 hover:text-gray-700 text-sm">
          Términos y políticas
        </a>
      </div>
      <div class="mt-4 md:mt-0">
        <p class="text-gray-500 text-sm">
          Hecho con ❤️ en Argentina
        </p>
      </div>
    </div>
  </div>
</footer>
