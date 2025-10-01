<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Types based on Prisma schema
  interface ProductForm {
    id: string;
    name: string;
    slug: string;
    description: string;
    status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
    seoTitle?: string;
    seoDesc?: string;
    variants: ProductVariantForm[];
    images: File[];
    existingImages: string[];
  }

  interface ProductVariantForm {
    id?: string;
    sku: string;
    price: number;
    stock: number;
    attributes?: any;
    isDefault: boolean;
  }

  // Get product ID from URL
  let productId = '';
  $: productId = $page.params.id;

  // Form state
  let product: ProductForm = {
    id: '',
    name: '',
    slug: '',
    description: '',
    status: 'DRAFT',
    variants: [{
      sku: '',
      price: 0,
      stock: 0,
      isDefault: true
    }],
    images: [],
    existingImages: []
  };

  let loading = false;
  let loadingProduct = true;
  let error: string | null = null;
  let success = false;
  let imagePreviews: string[] = [];

  // Load product data
  onMount(async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error('Producto no encontrado');
      
      const data = await response.json();
      
      // Transform the API response to match our form structure
      product = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        status: data.status || 'DRAFT',
        seoTitle: data.seoTitle || '',
        seoDesc: data.seoDesc || '',
        variants: data.variants.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          price: v.price, // Use price directly
          stock: v.stock,
          isDefault: v.isDefault,
          attributes: v.attributes || {}
        })),
        images: [],
        existingImages: data.images || []
      };
      
      // Set image previews
      imagePreviews = [...(data.images || [])];
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al cargar el producto';
      console.error('Error loading product:', err);
    } finally {
      loadingProduct = false;
    }
  });

  // Generate slug from name
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // Handle image upload
  function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const newImages = Array.from(target.files);
    product.images = [...product.images, ...newImages];
    
    // Create preview URLs
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreviews = [...imagePreviews, e.target?.result as string];
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    target.value = '';
  }

  // Remove an image
  function removeImage(index: number) {
    // If it's an existing image, we'll need to track it for deletion
    if (index < product.existingImages.length) {
      // In a real app, you might want to track which existing images to delete
      product.existingImages.splice(index, 1);
      imagePreviews.splice(index, 1);
    } else {
      // For new images that haven't been uploaded yet
      const newIndex = index - product.existingImages.length;
      product.images.splice(newIndex, 1);
      imagePreviews.splice(index, 1);
    }
  }

  // Add a new variant
  function addVariant() {
    product.variants.push({
      sku: '',
      price: 0,
      stock: 0,
      isDefault: product.variants.length === 0
    });
  }

  // Remove a variant
  function removeVariant(index: number) {
    product.variants.splice(index, 1);
  }

  // Set default variant
  function setDefaultVariant(index: number) {
    product.variants.forEach((v, i) => {
      v.isDefault = i === index;
    });
  }

  // Validate form
  function validateForm(): string | null {
    if (!product.name.trim()) return 'El nombre del producto es requerido';
    if (product.variants.length === 0) return 'Debe agregar al menos una variante';
    
    for (const [index, variant] of product.variants.entries()) {
      if (!variant.sku.trim()) return `La SKU de la variante ${index + 1} es requerida`;
      if (variant.price <= 0) return `El precio de la variante ${index + 1} debe ser mayor a 0`;
      if (variant.stock < 0) return `El stock de la variante ${index + 1} no puede ser negativo`;
    }
    
    return null;
  }

  // Submit form
  async function submitForm() {
    const validationError = validateForm();
    if (validationError) {
      error = validationError;
      return;
    }

    loading = true;
    error = null;

    try {
      const formData = new FormData();
      
      // Add product data
      formData.append('name', product.name);
      formData.append('slug', product.slug || generateSlug(product.name));
      formData.append('description', product.description);
      formData.append('status', product.status);
      
      if (product.seoTitle) formData.append('seoTitle', product.seoTitle);
      if (product.seoDesc) formData.append('seoDesc', product.seoDesc);
      
      // Add variants
      formData.append('variants', JSON.stringify(product.variants));
      
      // Add existing images that should be kept
      formData.append('existingImages', JSON.stringify(product.existingImages));
      
      // Add new images
      product.images.forEach((image, index) => {
        formData.append(`image-${index}`, image);
      });

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar el producto');
      }

      success = true;
      setTimeout(() => {
        goto('/productos/admin');
      }, 1500);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al actualizar el producto';
      console.error('Error updating product:', err);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Editar Producto - Panel de Administración</title>
  <meta name="description" content="Editar un producto existente en el panel de administración" />
</svelte:head>

<main class="py-8 bg-gray-50 min-h-screen">
  <div class="container mx-auto px-4 max-w-4xl">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Editar Producto</h1>
          <p class="mt-1 text-sm text-gray-500">Actualiza la información del producto</p>
        </div>
        <button
          type="button"
          on:click={() => goto('/productos/admin')}
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Volver a la lista
        </button>
      </div>
    </div>

    {#if loadingProduct}
      <div class="bg-white rounded-lg shadow-sm p-6 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Cargando producto...</p>
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow-sm p-6">
        {#if success}
          <div class="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-green-700">
                  Producto actualizado exitosamente. Redirigiendo...
                </p>
              </div>
            </div>
          </div>
        {/if}

        {#if error}
          <div class="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        {/if}

        <form on:submit|preventDefault={submitForm} class="space-y-6">
          <!-- Basic Information -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Información Básica</h2>

            <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div class="sm:col-span-4">
                <label for="name" class="block text-sm font-medium text-gray-700">
                  Nombre del producto <span class="text-red-500">*</span>
                </label>
                <div class="mt-1">
                  <input
                    type="text"
                    id="name"
                    bind:value={product.name}
                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div class="sm:col-span-4">
                <label for="slug" class="block text-sm font-medium text-gray-700">
                  URL amigable (slug)
                </label>
                <div class="mt-1 flex rounded-md shadow-sm">
                  <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    /productos/
                  </span>
                  <input
                    type="text"
                    id="slug"
                    bind:value={product.slug}
                    placeholder={generateSlug(product.name) || 'nombre-del-producto'}
                    class="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                  />
                </div>
              </div>

              <div class="sm:col-span-6">
                <label for="description" class="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <div class="mt-1">
                  <textarea
                    id="description"
                    rows={4}
                    bind:value={product.description}
                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div class="sm:col-span-3">
                <label for="status" class="block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  id="status"
                  bind:value={product.status}
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="HIDDEN">Oculto</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Images -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Imágenes del Producto</h2>

            <!-- Image Upload -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Subir imágenes
              </label>
              <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div class="space-y-1 text-center">
                  <svg
                    class="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <div class="flex text-sm text-gray-600">
                    <label
                      for="file-upload"
                      class="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Subir archivos</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        class="sr-only"
                        accept="image/*"
                        multiple
                        on:change={handleImageUpload}
                      />
                    </label>
                    <p class="pl-1">o arrastra y suelta</p>
                  </div>
                  <p class="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                </div>
              </div>
            </div>

            <!-- Image Previews -->
            {#if imagePreviews.length > 0}
              <div class="mt-6">
                <h3 class="text-sm font-medium text-gray-700 mb-2">Vista previa de imágenes</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {#each imagePreviews as image, index}
                    <div class="relative group">
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        class="h-32 w-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        on:click|preventDefault={() => removeImage(index)}
                        class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Eliminar imagen"
                      >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <!-- Variants -->
          <div class="border-b border-gray-200 pb-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-medium text-gray-900">Variantes del Producto</h2>
              <button
                type="button"
                on:click={addVariant}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg class="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Agregar Variante
              </button>
            </div>

            <div class="space-y-4">
              {#each product.variants as variant, index}
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-md font-medium text-gray-900">
                      Variante {index + 1}
                      {#if variant.isDefault}
                        <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Predeterminada
                        </span>
                      {/if}
                    </h3>
                    <div class="flex space-x-2">
                      {#if !variant.isDefault}
                        <button
                          type="button"
                          on:click|preventDefault={() => setDefaultVariant(index)}
                          class="text-sm text-indigo-600 hover:text-indigo-900"
                        >
                          Hacer predeterminada
                        </button>
                      {/if}
                      {#if product.variants.length > 1}
                        <button
                          type="button"
                          on:click|preventDefault={() => removeVariant(index)}
                          class="text-sm text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      {/if}
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label for={`variant-sku-${index}`} class="block text-sm font-medium text-gray-700">
                        SKU <span class="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id={`variant-sku-${index}`}
                        bind:value={variant.sku}
                        class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label for={`variant-price-${index}`} class="block text-sm font-medium text-gray-700">
                        Precio <span class="text-red-500">*</span>
                      </label>
                      <div class="mt-1 relative rounded-md shadow-sm">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span class="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          id={`variant-price-${index}`}
                          bind:value={variant.price}
                          min="0"
                          step="0.01"
                          class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                          placeholder="0.00"
                          required
                        />
                        <div class="absolute inset-y-0 right-0 flex items-center">
                          <span class="text-gray-500 sm:text-sm mr-3">
                            {product.variants[0]?.currency || 'ARS'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label for={`variant-stock-${index}`} class="block text-sm font-medium text-gray-700">
                        Stock <span class="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id={`variant-stock-${index}`}
                        bind:value={variant.stock}
                        min="0"
                        step="1"
                        class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- SEO -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Opciones de SEO</h2>

            <div class="space-y-4">
              <div>
                <label for="seoTitle" class="block text-sm font-medium text-gray-700">
                  Título SEO
                </label>
                <div class="mt-1">
                  <input
                    type="text"
                    id="seoTitle"
                    bind:value={product.seoTitle}
                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Título para motores de búsqueda"
                  />
                </div>
                <p class="mt-1 text-sm text-gray-500">
                  {product.seoTitle ? product.seoTitle.length : 0}/60 caracteres
                </p>
              </div>

              <div>
                <label for="seoDesc" class="block text-sm font-medium text-gray-700">
                  Descripción SEO
                </label>
                <div class="mt-1">
                  <textarea
                    id="seoDesc"
                    rows={3}
                    bind:value={product.seoDesc}
                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Descripción para motores de búsqueda"
                  />
                </div>
                <p class="mt-1 text-sm text-gray-500">
                  {product.seoDesc ? product.seoDesc.length : 0}/160 caracteres
                </p>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              on:click|preventDefault={() => goto('/productos/admin')}
              class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if loading}
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              {:else}
                Guardar cambios
              {/if}
            </button>
          </div>
        </form>
      </div>
    {/if}
  </div>
</main>

<style>
  input[type="number"] {
    -webkit-appearance: none;
    -moz-appearance: textfield;
  }

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>
