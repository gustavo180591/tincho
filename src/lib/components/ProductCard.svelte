<script lang="ts">
  export let product: {
    id: string;
    slug: string;
    title: string;
    ratingAvg: number | null;
    ratingCount: number;
    images?: { url: string }[];
    variations?: { priceAmount: any; priceCurrency: string }[];
  };
  
  const img = product.images?.[0]?.url ?? 'https://picsum.photos/600/600';
  const price = product.variations?.[0];
</script>

<a 
  href={`/p/${product.slug}`} 
  class="block rounded-2xl shadow p-3 hover:shadow-md transition hover:scale-[1.02] duration-200"
>
  <img 
    src={img} 
    alt={product.title} 
    class="w-full aspect-square object-cover rounded-xl mb-3" 
    loading="lazy"
  />
  <div class="space-y-1">
    <h3 class="font-medium text-gray-900 line-clamp-2 h-12 overflow-hidden">
      {product.title}
    </h3>
    {#if price}
      <p class="text-lg font-semibold text-gray-900">
        ${price.priceAmount.toLocaleString('es-AR')} {price.priceCurrency}
      </p>
    {/if}
    <div class="flex items-center text-sm text-gray-500">
      <span class="text-yellow-400">
        ★ {product.ratingAvg?.toFixed(1) || 'Nuevo'}
      </span>
      {#if product.ratingCount > 0}
        <span class="mx-1">•</span>
        <span>{product.ratingCount} {product.ratingCount === 1 ? 'reseña' : 'reseñas'}</span>
      {/if}
    </div>
  </div>
</a>
