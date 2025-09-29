<script lang="ts">
  // Featured products data - in a real app, this would come from your API
  const featuredProducts = [
    {
      id: 1,
      name: 'Producto Destacado 1',
      price: 9999,
      image: 'https://via.placeholder.com/300x300',
      category: 'Categoría',
      rating: 4.5
    },
    {
      id: 2,
      name: 'Producto Destacado 2',
      price: 12999,
      image: 'https://via.placeholder.com/300x300',
      category: 'Categoría',
      rating: 4.8
    },
    {
      id: 3,
      name: 'Producto Destacado 3',
      price: 15999,
      image: 'https://via.placeholder.com/300x300',
      category: 'Categoría',
      rating: 4.2
    },
    {
      id: 4,
      name: 'Producto Destacado 4',
      price: 8999,
      image: 'https://via.placeholder.com/300x300',
      category: 'Categoría',
      rating: 4.7
    }
  ];

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(cents / 100);
  };
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
        <h1 class="text-4xl md:text-5xl font-bold mb-6">Bienvenido a Nuestra Tienda</h1>
        <p class="text-xl mb-8">Descubre las mejores ofertas y productos exclusivos</p>
        <a href="/productos" class="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-full text-lg transition duration-300 inline-block">
          Ver Productos
        </a>
      </div>
    </div>
  </section>

  <!-- Featured Products -->
  <section class="py-16 bg-white">
    <div class="container mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-12">Productos Destacados</h2>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {#each featuredProducts as product}
          <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div class="relative pb-[100%] bg-gray-100">
              <img 
                src={product.image} 
                alt={product.name}
                class="absolute h-full w-full object-cover"
                loading="lazy"
              />
              <div class="absolute top-2 right-2 bg-yellow-400 text-yellow-800 text-sm font-semibold px-2 py-1 rounded">
                {product.rating} ★
              </div>
            </div>
            <div class="p-4">
              <span class="text-sm text-gray-500">{product.category}</span>
              <h3 class="text-lg font-semibold mb-2">{product.name}</h3>
              <div class="flex justify-between items-center">
                <span class="text-xl font-bold text-blue-600">{formatPrice(product.price)}</span>
                <button 
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  on:click={() => console.log('Add to cart', product.id)}
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <div class="text-center mt-12">
        <a href="/productos" class="inline-block bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-8 rounded-full transition-colors">
          Ver Todos los Productos
        </a>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="py-16 bg-gray-50">
    <div class="container mx-auto px-4">
      <div class="grid md:grid-cols-3 gap-8">
        <div class="text-center p-6 bg-white rounded-lg shadow-sm">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Envío Gratis</h3>
          <p class="text-gray-600">En compras superiores a $20.000</p>
        </div>

        <div class="text-center p-6 bg-white rounded-lg shadow-sm">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Envío Rápido</h3>
          <p class="text-gray-600">Recibe tu pedido en 24-48hs</p>
        </div>

        <div class="text-center p-6 bg-white rounded-lg shadow-sm">
          <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Garantía</h3>
          <p class="text-gray-600">Productos con garantía oficial</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Newsletter -->
  <section class="py-16 bg-blue-600 text-white">
    <div class="container mx-auto px-4 text-center">
      <h2 class="text-3xl font-bold mb-4">Suscríbete a Nuestro Boletín</h2>
      <p class="max-w-2xl mx-auto mb-8">Recibe las últimas ofertas y novedades directamente en tu correo electrónico.</p>
      
      <form class="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
        <input 
          type="email" 
          placeholder="Tu correo electrónico" 
          class="flex-grow px-4 py-3 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        >
        <button 
          type="submit" 
          class="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 px-6 rounded-md transition-colors"
        >
          Suscribirse
        </button>
      </form>
    </div>
  </section>
</main>

<style>
  /* Custom styles can be added here */
</style>
