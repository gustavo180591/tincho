<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // Types based on Prisma schema
  interface ProductForm {
    name: string;
    slug: string;
    description: string;
    status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
    seoTitle?: string;
    seoDesc?: string;
    variants: ProductVariantForm[];
    images: File[];
  }

  interface ProductVariantForm {
    sku: string;
    price: number;
    stock: number;
    attributes?: any;
    isDefault: boolean;
  }

  // Form state
  let product: ProductForm = {
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
    images: [] // Add images array
  };

  let loading = false;
  let error: string | null = null;
  let success = false;
  let imagePreviews: string[] = []; // Store image preview URLs

  // Generate slug from name
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  // Auto-generate slug when name changes
  $: if (product.name && !product.slug) {
    product.slug = generateSlug(product.name);
  }

  // Handle image upload
  function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files) return;

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (allowedTypes.includes(file.type)) {
        validFiles.push(file);
      } else {
        error = `Tipo de archivo no válido: ${file.name}. Solo se permiten JPG, PNG y WebP.`;
        return;
      }
    }

    // Add valid files to product
    product.images = [...product.images, ...validFiles];

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        imagePreviews = [...imagePreviews, result];
      };
      reader.readAsDataURL(file);
    });

    // Clear the input
    target.value = '';
  }

  // Remove image
  function removeImage(index: number) {
    product.images.splice(index, 1);
    imagePreviews.splice(index, 1);
    product.images = product.images; // Trigger reactivity
    imagePreviews = imagePreviews; // Trigger reactivity
  }

  // Add new variant
  function addVariant() {
    product.variants.push({
      sku: '',
      price: 0,
      stock: 0,
      isDefault: false
    });
    product.variants = product.variants; // Trigger reactivity
  }

  // Remove variant
  function removeVariant(index: number) {
    if (product.variants.length > 1) {
      product.variants.splice(index, 1);
      product.variants = product.variants; // Trigger reactivity
    }
  }

  // Set default variant
  function setDefaultVariant(index: number) {
    product.variants.forEach((variant, i) => {
      variant.isDefault = i === index;
    });
    product.variants = product.variants; // Trigger reactivity
  }

  // Format price for display
  function formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(price);
  }

  // Validate form
  function validateForm(): string | null {
    if (!product.name.trim()) return 'El nombre es requerido';
    if (!product.slug.trim()) return 'El slug es requerido';
    if (product.variants.length === 0) return 'Debe tener al menos una variante';

    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      if (!variant.sku.trim()) return `El SKU de la variante ${i + 1} es requerido`;
      if (variant.price <= 0) return `El precio de la variante ${i + 1} debe ser mayor a 0`;
      if (variant.stock < 0) return `El stock de la variante ${i + 1} no puede ser negativo`;
    }

    return null;
  }

  // Submit form
  async function submitForm() {
    console.log('=== DEBUG: Iniciando submitForm ===');
    const validationError = validateForm();
    if (validationError) {
      error = validationError;
      console.log('Error de validación:', validationError);
      return;
    }

    loading = true;
    error = null;
    console.log('=== DEBUG: Validación exitosa, iniciando creación ===');

    try {
      // Create product data without images (File objects can't be JSON serialized)
      const { images, ...productData } = product;

      const response = await fetch('/api/debug/create-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el producto');
      }

      const createdProduct = await response.json();
      success = true;
      console.log('=== DEBUG: Producto creado exitosamente ===');
      console.log('Redirigiendo a /productos/admin inmediatamente...');

      // Skip image upload for now to test redirection
      // if (images && images.length > 0) {
      //   console.log('Subiendo imágenes...');
      //   await uploadProductImages(createdProduct.id, images);
      // }

      console.log('Iniciando redirección...');
      setTimeout(() => {
        console.log('Ejecutando redirección a /productos/admin');
        goto('/productos/admin');
      }, 1000);

    } catch (err) {
      error = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error creating product:', err);
    } finally {
      loading = false;
    }
  }

  // Upload images after product creation
  async function uploadProductImages(productId: string, images: File[]) {
    try {
      const uploadPromises = images.map(async (image, index) => {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('productId', productId);
        formData.append('position', index.toString());

        const response = await fetch('/api/products/images-debug', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Error uploading image ${index + 1}`);
        }

        return response.json();
      });

      await Promise.all(uploadPromises);
      console.log('All images uploaded successfully');
    } catch (err) {
      console.error('Error uploading images:', err);
      // Don't throw error here, product was created successfully
    }
  }

  // Cancel form
  function cancelForm() {
    goto('/productos/admin');
  }
</script>

<svelte:head>
  <title>Nuevo Producto - Panel de Administración</title>
  <meta name="description" content="Crear un nuevo producto en el panel de administración" />
</svelte:head>

<main class="py-8 bg-gray-50 min-h-screen">
  <div class="container mx-auto px-4 max-w-4xl">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Agregar Producto</h1>
          <p class="text-gray-600">Crear un nuevo producto desde el panel de administración</p>
        </div>
        <button
          on:click={cancelForm}
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Volver al Panel
        </button>
      </div>
    </div>

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
              <p class="text-sm text-green-700">¡Producto creado exitosamente! Redirigiendo...</p>
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
              <p class="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      {/if}

      <form on:submit|preventDefault={submitForm} class="space-y-6">
        <!-- Basic Information -->
        <div class="border-b border-gray-200 pb-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Información Básica</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Product Name -->
            <div class="md:col-span-2">
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                id="name"
                bind:value={product.name}
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                placeholder="Ej: Zapatillas Nike Air Max"
                required
              />
            </div>

            <!-- Slug -->
            <div class="md:col-span-2">
              <label for="slug" class="block text-sm font-medium text-gray-700 mb-1">
                Slug (URL) *
              </label>
              <input
                type="text"
                id="slug"
                bind:value={product.slug}
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                placeholder="zapatillas-nike-air-max"
                required
              />
              <p class="mt-1 text-xs text-gray-500">
                Se genera automáticamente del nombre, pero puedes editarlo
              </p>
            </div>

            <!-- Description -->
            <div class="md:col-span-2">
              <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="description"
                bind:value={product.description}
                rows="4"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                placeholder="Descripción detallada del producto..."
              ></textarea>
            </div>

            <!-- Status -->
            <div>
              <label for="status" class="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                id="status"
                bind:value={product.status}
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="HIDDEN">Oculto</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Product Images -->
        <div class="border-b border-gray-200 pb-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Imágenes del Producto</h2>

          <!-- Image Upload -->
          <div class="mb-4">
            <label for="images" class="block text-sm font-medium text-gray-700 mb-2">
              Subir Imágenes
            </label>
            <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
              <div class="space-y-1 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <div class="flex text-sm text-gray-600">
                  <label for="images" class="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Subir archivos</span>
                    <input
                      id="images"
                      type="file"
                      multiple
                      accept="image/*"
                      on:change={handleImageUpload}
                      class="sr-only"
                    />
                  </label>
                  <p class="pl-1">o arrastrar y soltar</p>
                </div>
                <p class="text-xs text-gray-500">PNG, JPG, WebP hasta 10MB cada una</p>
              </div>
            </div>
          </div>

          <!-- Image Previews -->
          {#if imagePreviews.length > 0}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              {#each imagePreviews as preview, index}
                <div class="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    class="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    on:click={() => removeImage(index)}
                    class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Eliminar imagen"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {product.images[index]?.name || `Imagen ${index + 1}`}
                  </div>
                </div>
              {/each}
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
              class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              Agregar Variante
            </button>
          </div>

          <div class="space-y-4">
            {#each product.variants as variant, index}
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-md font-medium text-gray-900">Variante {index + 1}</h3>
                  {#if product.variants.length > 1}
                    <button
                      type="button"
                      on:click={() => removeVariant(index)}
                      class="text-red-600 hover:text-red-800 text-sm"
                      aria-label="Eliminar variante"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  {/if}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- SKU -->
                  <div>
                    <label for="sku-{index}" class="block text-sm font-medium text-gray-700 mb-1">
                      SKU *
                    </label>
                    <input
                      type="text"
                      id="sku-{index}"
                      bind:value={variant.sku}
                      class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="NIKE-AIR-001"
                      required
                    />
                  </div>

                  <!-- Price -->
                  <div>
                    <label for="price-{index}" class="block text-sm font-medium text-gray-700 mb-1">
                      Precio *
                    </label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="price-{index}"
                        bind:value={variant.price}
                        min="0"
                        step="1"
                        class="w-full pl-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="2500"
                        required
                      />
                    </div>
                    <div class="mt-1 text-xs text-gray-500">
                      💡 Introduce el precio en pesos. Ej: 2500 para $2.500
                    </div>
                  </div>

                  <!-- Stock -->
                  <div>
                    <label for="stock-{index}" class="block text-sm font-medium text-gray-700 mb-1">
                      Stock
                    </label>
                    <input
                      type="number"
                      id="stock-{index}"
                      bind:value={variant.stock}
                      min="0"
                      class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="100"
                    />
                  </div>

                  <!-- Default -->
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      id="default-{index}"
                      bind:checked={variant.isDefault}
                      on:change={() => setDefaultVariant(index)}
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      aria-label="Marcar como variante por defecto"
                    />
                    <label for="default-{index}" class="ml-2 text-sm text-gray-700">
                      Variante por defecto
                    </label>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            on:click={cancelForm}
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if loading}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creando...
            {:else}
              Crear Producto
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</main>

<style>
  input[type="number"] {
    -webkit-appearance: none;
    -moz-appearance: textfield;
    appearance: none;
  }
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>
