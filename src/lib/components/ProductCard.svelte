<script lang="ts">
  import Money from '$lib/components/Money.svelte';

  export type CardImage = { url: string; alt: string | null };
  export type CardSku = { 
    id: string; 
    priceAmount: any; 
    priceCurrency: string; 
    listPrice: any | null;
    stock?: number;
  };
  
  export let id: string;
  export let slug: string;
  export let title: string;
  export let image: CardImage | null = null;
  export let sku: CardSku | null = null;
  export let soldCount: number = 0;
  export let ratingAvg: number | null = null;

  function numberify(d: any) {
    return typeof d === 'number' ? d : Number(d);
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat('es-AR').format(value);
  }
</script>

<a 
  href={`/p/${slug}`} 
  class="group block rounded-2xl border bg-white overflow-hidden hover:shadow-md transition h-full flex flex-col"
  aria-label={title}
>
  <div class="aspect-square bg-neutral-50 flex items-center justify-center overflow-hidden relative">
    {#if image?.url}
      <img
        src={image.url}
        alt={image?.alt ?? title}
        loading="lazy"
        class="object-contain w-full h-full group-hover:scale-[1.02] transition"
        width="300"
        height="300"
      />
    {:else}
      <div class="text-neutral-400 p-4 text-center">Sin imagen</div>
    {/if}

    {#if soldCount > 0}
      <div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
        {formatNumber(soldCount)} vendidos
      </div>
    {/if}
  </div>

  <div class="p-3 flex-1 flex flex-col">
    <h3 class="text-sm line-clamp-2 mb-2">{title}</h3>

    {#if ratingAvg !== null}
      <div class="flex items-center mb-2">
        <div class="flex">
          {#each Array(5) as _, i}
            <svg 
              class={`w-3 h-3 ${i < Math.floor(ratingAvg || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          {/each}
        </div>
        <span class="text-xs text-gray-500 ml-1">({ratingAvg?.toFixed(1)})</span>
      </div>
    {/if}

    {#if sku}
      <div class="mt-auto">
        <div class="flex items-baseline gap-2">
          {#if sku.listPrice}
            <Money amount={numberify(sku.listPrice)} currency={sku.priceCurrency} strike />
          {/if}
          <strong class="text-lg">
            <Money amount={numberify(sku.priceAmount)} currency={sku.priceCurrency} />
          </strong>
        </div>
        {#if sku.stock !== undefined && sku.stock < 10}
          <p class="text-xs text-red-600 mt-1">
            {sku.stock > 0 
              ? `¡Últimas ${sku.stock} unidades!` 
              : 'Sin stock'}
          </p>
        {/if}
      </div>
    {/if}
  </div>
</a>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>