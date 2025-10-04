# 🛍️ Feed de Productos - Lista de Tareas

## 📁 Estructura de Archivos

### 🗂️ Directorio Base
- [x] `src/`
  - [x] `lib/`
    - [x] `components/`
      - [x] `Navbar.svelte`
      - [x] `ProductCard.svelte`
      - [x] `Money.svelte`
    - [x] `server/`
      - [x] `db.ts`
    - [x] `utils/`
      - [x] `paging.ts`
  - [x] `routes/`
    - [x] `+layout.svelte`
    - [x] `+page.server.ts`
    - [x] `+page.svelte`

src/lib/server/db.ts — Prisma singleton
// src/lib/server/db.ts
import { PrismaClient } from '@prisma/client';

const g = globalThis as any;
export const prisma: PrismaClient = g.prisma ?? new PrismaClient({
  log: ['error', 'warn']
});
if (process.env.NODE_ENV !== 'production') g.prisma = prisma;

src/lib/utils/paging.ts — paginación y orden
// src/lib/utils/paging.ts
export function parsePaging(url: URL, fallbackLimit = 24) {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get('limit') ?? String(fallbackLimit))));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function parseSort(url: URL) {
  // sort=updatedAt:desc | price:asc | soldCount:desc
  const s = url.searchParams.get('sort') ?? 'updatedAt:desc';
  const [field, dir] = s.split(':');
  return { field, dir: (dir === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' };
}

src/lib/utils/format.ts — formato de precio
// src/lib/utils/format.ts
export function formatMoney(value: number, currency: string = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value);
}

src/lib/components/Money.svelte — componente de precio
<script lang="ts">
  export let amount: number;
  export let currency: string = 'ARS';
  export let strike: boolean = false;
  $: formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
</script>

<span class={strike ? 'line-through opacity-60' : ''}>{formatted}</span>

src/lib/components/Navbar.svelte — navbar estilo ML
<script lang="ts">
  export let cartCount: number = 0;
</script>

<header class="w-full border-b bg-white/90 backdrop-blur sticky top-0 z-50">
  <div class="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
    <!-- Logo -->
    <a href="/" class="text-xl font-bold">tincho</a>

    <!-- Buscador -->
    <form action="/search" method="GET" class="flex-1">
      <input
        type="search"
        name="q"
        placeholder="Buscar productos, marcas y más..."
        class="w-full rounded-xl border px-4 py-2"
      />
    </form>

    <!-- Acciones -->
    <nav class="flex items-center gap-4 text-sm">
      <a href="/seller" class="hover:underline">Vender</a>
      <a href="/account" class="hover:underline">Mi cuenta</a>
      <a href="/cart" class="relative hover:underline">
        Carrito
        {#if cartCount > 0}
          <span class="absolute -top-2 -right-3 text-xs bg-black text-white rounded-full px-2 py-0.5">{cartCount}</span>
        {/if}
      </a>
    </nav>
  </div>

  <!-- Categorías rápidas -->
  <div class="mx-auto max-w-7xl px-4 py-2 text-sm flex gap-3 overflow-x-auto">
    <a href="/categories" class="hover:underline whitespace-nowrap">Categorías</a>
    <a href="/brands" class="hover:underline whitespace-nowrap">Marcas</a>
    <a href="/help" class="hover:underline whitespace-nowrap">Ayuda</a>
    <a href="/legal" class="hover:underline whitespace-nowrap">Términos</a>
  </div>
</header>

src/lib/components/ProductCard.svelte — card de producto (1 imagen + 1 SKU)
<script lang="ts">
  import Money from '$lib/components/Money.svelte';

  export type CardImage = { url: string; alt: string | null };
  export type CardSku = { id: string; priceAmount: any; priceCurrency: string; listPrice: any | null };
  export let id: string;
  export let slug: string;
  export let title: string;
  export let image: CardImage | null = null;
  export let sku: CardSku | null = null;

  function numberify(d: any) {
    return typeof d === 'number' ? d : Number(d);
  }
</script>

<a href={`/p/${slug}`} class="group block rounded-2xl border bg-white overflow-hidden hover:shadow-md transition">
  <div class="aspect-square bg-neutral-50 flex items-center justify-center overflow-hidden">
    {#if image?.url}
      <img
        src={image.url}
        alt={image?.alt ?? title}
        loading="lazy"
        class="object-contain w-full h-full group-hover:scale-[1.02] transition"
      />
    {:else}
      <div class="text-neutral-400">Sin imagen</div>
    {/if}
  </div>

  <div class="p-3 space-y-1">
    <h3 class="text-sm line-clamp-2">{title}</h3>

    {#if sku}
      <div class="flex items-baseline gap-2">
        {#if sku.listPrice}
          <Money amount={numberify(sku.listPrice)} currency={sku.priceCurrency} strike />
        {/if}
        <strong class="text-lg">
          <Money amount={numberify(sku.priceAmount)} currency={sku.priceCurrency} />
        </strong>
      </div>
    {/if}
  </div>
</a>

src/routes/+layout.svelte — layout con navbar
<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  // Si querés cartCount real, podés cargarlo desde locals vía +layout.server.ts (opcional)
  let cartCount = 0;
</script>

<Navbar {cartCount} />

<main class="mx-auto max-w-7xl px-4 py-6">
  <slot />
</main>

<footer class="mx-auto max-w-7xl px-4 py-10 text-sm text-neutral-500">
  <div class="border-t pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <p>© {new Date().getFullYear()} tincho</p>
    <nav class="flex gap-4">
      <a href="/help" class="hover:underline">Ayuda</a>
      <a href="/legal" class="hover:underline">Términos</a>
    </nav>
  </div>
</footer>

src/routes/+page.server.ts — feed: últimos activos, 1 imagen y 1 SKU

Usa Product.active, orden por updatedAt desc, images con take:1 (ordenadas por position), variations con take:1 (p.ej. precio más bajo).

// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { parsePaging, parseSort } from '$lib/utils/paging';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const { page, limit, skip } = parsePaging(url, 24);
  const { field, dir } = parseSort(url); // default updatedAt:desc

  // Seguridad: sólo permitir ordenar por campos conocidos
  const orderBy: any =
    field === 'soldCount' ? { soldCount: dir } :
    field === 'ratingAvg' ? { ratingAvg: dir } :
    { updatedAt: dir };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy,
      skip, take: limit,
      include: {
        images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
        variations: { orderBy: { priceAmount: 'asc' }, take: 1, select: { id: true, priceAmount: true, priceCurrency: true, listPrice: true } },
      }
    }),
    prisma.product.count({ where: { active: true } })
  ]);

  // Cache suave de 30s para mejorar TTFB (ajustá a tu gusto)
  setHeaders({ 'Cache-Control': 'public, max-age=30, s-maxage=30' });

  return {
    products: data.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      image: p.images[0] ?? null,
      sku: p.variations[0] ?? null
    })),
    page, limit, total
  };
};

src/routes/+page.svelte — UI del feed
<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';

  export let data: {
    products: Array<{
      id: string;
      slug: string;
      title: string;
      image: { url: string; alt: string | null } | null;
      sku: { id: string; priceAmount: any; priceCurrency: string; listPrice: any | null } | null;
    }>;
    page: number;
    limit: number;
    total: number;
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  function go(page: number) {
    const url = new URL(location.href);
    url.searchParams.set('page', String(page));
    window.location.href = url.toString();
  }
</script>

<!-- Hero / promo simple -->
<section class="mb-6 rounded-2xl bg-gradient-to-r from-yellow-100 to-amber-50 border p-6">
  <h1 class="text-2xl font-semibold mb-1">Bienvenido a tincho</h1>
  <p class="text-sm text-neutral-600">Encontrá ofertas, marcas y lo último publicado.</p>
</section>

<!-- Orden / filtros mínimos (client-side) -->
<div class="mb-4 flex items-center justify-between">
  <div class="text-sm text-neutral-600">
    Mostrando {(data.products?.length ?? 0)} de {data.total} productos
  </div>
  <form method="GET" class="flex items-center gap-2">
    <input name="q" placeholder="Buscar..." class="rounded-xl border px-3 py-2" />
    <select name="sort" class="rounded-xl border px-3 py-2">
      <option value="updatedAt:desc">Más recientes</option>
      <option value="soldCount:desc">Más vendidos</option>
      <option value="ratingAvg:desc">Mejor calificados</option>
    </select>
    <button type="submit" class="rounded-xl border px-3 py-2">Aplicar</button>
  </form>
</div>

<!-- Grid de productos -->
<section class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
  {#each data.products as p}
    <ProductCard id={p.id} slug={p.slug} title={p.title} image={p.image} sku={p.sku} />
  {/each}
</section>

<!-- Paginación -->
{#if data.total > data.limit}
  <nav class="mt-6 flex items-center justify-center gap-2">
    <button class="rounded-xl border px-3 py-2 disabled:opacity-50" on:click={() => go(data.page - 1)} disabled={data.page <= 1}>Anterior</button>
    <span class="text-sm">Página {data.page} / {totalPages}</span>
    <button class="rounded-xl border px-3 py-2 disabled:opacity-50" on:click={() => go(data.page + 1)} disabled={data.page >= totalPages}>Siguiente</button>
  </nav>
{/if}

Cómo esto se relaciona con tu schema.prisma

Selección de productos activos: Product.active = true.

Orden de feed: Product.updatedAt (índice para ordenar rápido).

Imágenes: ProductImage relación 1:N → tomamos la primera por position asc.

Precio visible: Sku relación 1:N (variations) → tomamos la variante más barata por priceAmount asc.

Campos usados en la UI: Product.title, Product.slug, Sku.priceAmount, Sku.priceCurrency, Sku.listPrice.

Paginación eficiente: skip/take + prisma.product.count (usa índices ya definidos).

Cache corto: encabezado HTTP para aliviar carga si hay mucho tráfico en /.

Extras recomendados (plug-and-play)

Skeletons (carga percibida más rápida):

Renderizá placeholders en +page.svelte mientras llega data (SvelteKit SSR ya llega con datos; skeleton útil para navegaciones internas).

SEO

Agregá un +layout.ts con export const csr = true y meta tags en +layout.svelte (<svelte:head>) o en cada página.

Sitemap en /sitemap.xml (fuera de este alcance, pero trivial con Prisma).

Clic a carrito directo

Desde ProductCard, botón rápido “Agregar” que haga POST /cart/items vía acción o endpoint.

Badges de promo

Si usás PromotionOnSku, podés calcular descuento final del SKU y mostrar un badge “-15%”.