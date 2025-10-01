<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // Type definitions based on Prisma schema
  interface Product {
    id: string;
    slug: string;
    name: string;
    description?: string;
    status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
    seoTitle?: string;
    seoDesc?: string;
    createdAt: string;
    updatedAt: string;
    // Related data from joins
    variants?: ProductVariant[];
    images?: ProductImage[];
    categories?: ProductCategory[];
  }

  interface ProductVariant {
    id: string;
    productId: string;
    sku: string;
    price: number;
    currency: string;
    stock: number;
    attributes?: any;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }

  interface ProductImage {
    id: string;
    productId: string;
    url: string;
    alt?: string;
    position: number;
  }

  interface ProductCategory {
    id: string;
    name: string;
    slug: string;
  }

  interface ProductDisplay {
    id: string;
    name: string;
    price: number;
    price: number;
    category?: string;
    description?: string;
    stock: number;
    status: string;
    images?: string[];
    createdAt?: string | Date;
    sku?: string;
    currency?: string;
    variants?: ProductVariant[];
  }

  // State
  let products: ProductDisplay[] = [];
  let loading = true;
  let error: string | null = null;
  let currentUser: { id: string; email: string; name: string | null; role: string } | null = null;
  let showCreateModal = false;
  let editingProduct: ProductDisplay | null = null;
  let searchTerm = '';
  let selectedStatus = 'all';
  let currentPage = 1;
  const itemsPerPage = 10;

  // Form state
  let formData = {
    name: '',
    description: '',
    price: 0,
    stock: 0,
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'HIDDEN',
    sku: '',
    category: '',
    images: [] as string[]
  };
  // Fetch products from API
  async function fetchProducts() {
    try {
      loading = true;
      error = null;
      const response = await fetch('/api/products/admin-debug');
      if (!response.ok) throw new Error('Failed to load products');
      const data = await response.json();
      products = Array.isArray(data.products) ? data.products : [];
      
      // Debug: Log fetched products
      console.log('=== DEBUG: Productos cargados ===');
      console.log('Total productos recibidos:', products.length);
      console.log('Productos:', products);
      console.log('Filtro actual selectedStatus:', selectedStatus);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching products:', err);
    } finally {
      loading = false;
    }
  }

  // Check current user authentication
  async function checkCurrentUser() {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
        // Redirect non-admin users
        if (currentUser && (currentUser.role !== 'ADMIN' && currentUser.role !== 'OPERATOR')) {
          goto('/unauthorized');
          return;
        }
      } else {
        currentUser = null;
        goto('/login');
        return;
      }
    } catch (err) {
      console.error('Error checking user:', err);
      currentUser = null;
      goto('/login');
      return;
    }
  }

  // Format price
  function formatPrice(price: number): string {
    const price = price / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(price);
  }

  // Format date
  function formatDate(dateString: string | Date | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Filter products
  $: filteredProducts = (() => {
    console.log('=== DEBUG: Aplicando filtros ===');
    console.log('Productos totales:', products.length);
    console.log('Filtro selectedStatus:', selectedStatus);
    
    const filtered = products.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
      
      console.log('Producto:', product.name, 'Status:', product.status, 'matchesStatus:', matchesStatus);
      
      return matchesSearch && matchesStatus;
    });
    
    console.log('Productos filtrados:', filtered.length);
    return filtered;
  })();

  // Paginated products
  $: paginatedProducts = (() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredProducts.slice(start, end);
  })();

  // Reset form
  function resetForm() {
    formData = {
      name: '',
      description: '',
      price: 0,
      stock: 0,
      status: 'DRAFT',
      sku: '',
      category: '',
      images: []
    };
  }

  // Open create modal
  function openCreateModal() {
    resetForm();
    editingProduct = null;
    showCreateModal = true;
  }

  // Open edit modal
  function openEditModal(product: ProductDisplay) {
    formData = {
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      status: product.status as 'DRAFT' | 'PUBLISHED' | 'HIDDEN',
      sku: product.sku || '',
      category: product.category || '',
      images: product.images || []
    };
    editingProduct = product;
    showCreateModal = true;
  }

  // Save product (create or update)
  async function saveProduct() {
    try {
      const isEditing = !!editingProduct;
      const url = isEditing ? `/api/products/admin-debug/${editingProduct!.id}` : '/api/products/admin-debug';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save product');

      showCreateModal = false;
      resetForm();
      await fetchProducts();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error saving product';
      console.error('Error saving product:', err);
    }
  }

  // Delete product
  async function deleteProduct(product: ProductDisplay) {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) return;

    try {
      const response = await fetch(`/api/products/admin-debug/${product.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete product');

      await fetchProducts();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error deleting product';
      console.error('Error deleting product:', err);
    }
  }

  // Initialize
  onMount(() => {
    checkCurrentUser();
    fetchProducts();
  });
</script>

<svelte:head>
  <title>Administración de Productos - Panel Admin</title>
  <meta name="description" content="Panel de administración para gestionar productos" />
</svelte:head>

<main class="py-8 bg-gray-50 min-h-screen">
  <div class="container mx-auto px-4">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Administración de Productos</h1>
          <p class="text-gray-600">Gestiona tu catálogo de productos</p>
        </div>

        <div class="flex gap-3">
          <a
            href="/productos"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Ver Tienda
          </a>

          <button
            on:click={() => goto('/productos/admin/new')}
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
            </svg>
            Nuevo Producto
          </button>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow-sm">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            bind:value={searchTerm}
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div class="flex items-center gap-2">
          <label for="status-filter" class="text-sm font-medium text-gray-700">Estado:</label>
          <select
            id="status-filter"
            bind:value={selectedStatus}
            class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="all">Todos</option>
            <option value="DRAFT">Borrador</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="HIDDEN">Oculto</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Error message -->
    {#if error}
      <div class="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Loading -->
    {#if loading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    {:else}
      <!-- Products table -->
      <div class="bg-white shadow-sm rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creado
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each paginatedProducts as product (product.id)}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        {#if product.images && product.images.length > 0}
                          <img class="h-10 w-10 rounded-full object-cover" src={product.images[0]} alt={product.name} />
                        {:else}
                          <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        {/if}
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">{product.name}</div>
                        {#if product.description}
                          <div class="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                        {/if}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.sku || '-'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPrice(product.price)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      {product.stock}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      {product.status === 'PUBLISHED' ? 'bg-blue-100 text-blue-800' :
                        product.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'}">
                      {product.status === 'PUBLISHED' ? 'Publicado' :
                       product.status === 'DRAFT' ? 'Borrador' : 'Oculto'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(product.createdAt)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                      <a
                        href="/productos/admin/edit/{product.id}"
                        class="text-blue-600 hover:text-blue-900"
                        aria-label="Editar producto {product.name}"
                      >
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </a>
                      <button
                        on:click={() => deleteProduct(product)}
                        class="text-red-600 hover:text-red-900"
                        aria-label="Eliminar producto {product.name}"
                      >
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if paginatedProducts.length === 0}
          <div class="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
            <p class="mt-1 text-sm text-gray-500">Intenta ajustar los filtros de búsqueda.</p>
          </div>
        {/if}
      </div>

      <!-- Pagination -->
      {#if filteredProducts.length > itemsPerPage}
        <div class="mt-6 flex justify-center">
          <nav class="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              disabled={currentPage === 1}
              on:click={() => currentPage > 1 && (currentPage -= 1)}
            >
              <span class="sr-only">Anterior</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>

            {#each Array(Math.ceil(filteredProducts.length / itemsPerPage)).fill(0) as _, i}
              <button
                class={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === i + 1 ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                on:click={() => currentPage = i + 1}
              >
                {i + 1}
              </button>
            {/each}

            <button
              class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              disabled={currentPage * itemsPerPage >= filteredProducts.length}
              on:click={() => currentPage += 1}
            >
              <span class="sr-only">Siguiente</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      {/if}
    {/if}
  </div>
</main>

<!-- Create/Edit Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button
            on:click={() => showCreateModal = false}
            class="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar modal"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form on:submit|preventDefault={saveProduct} class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                id="name"
                bind:value={formData.name}
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label for="sku" class="block text-sm font-medium text-gray-700">SKU</label>
              <input
                type="text"
                id="sku"
                bind:value={formData.sku}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              id="description"
              rows="3"
              bind:value={formData.description}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="price" class="block text-sm font-medium text-gray-700">Precio (centavos)</label>
              <input
                type="number"
                id="price"
                bind:value={formData.price}
                min="0"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
              <p class="mt-1 text-xs text-gray-500">
                Precio en centavos. Ej: $10.50 = 1050 centavos
              </p>
            </div>

            <div>
              <label for="stock" class="block text-sm font-medium text-gray-700">Stock</label>
              <input
                type="number"
                id="stock"
                bind:value={formData.stock}
                min="0"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="category" class="block text-sm font-medium text-gray-700">Categoría</label>
              <input
                type="text"
                id="category"
                bind:value={formData.category}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label for="status" class="block text-sm font-medium text-gray-700">Estado</label>
              <select
                id="status"
                bind:value={formData.status}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="HIDDEN">Oculto</option>
              </select>
            </div>
          </div>

          <div>
            <label for="images" class="block text-sm font-medium text-gray-700">Imágenes (URLs separadas por coma)</label>
            <input
              type="text"
              id="images"
              bind:value={formData.images}
              placeholder="https://ejemplo.com/imagen1.jpg, https://ejemplo.com/imagen2.jpg"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              on:click={() => showCreateModal = false}
              class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {editingProduct ? 'Actualizar' : 'Crear'} Producto
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
