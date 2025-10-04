Te dejo el /search completo, listo para pegar y correr, con filtros por q, categoría, marca, precio, paginación, orden y grid de productos (1 imagen + 1 SKU). Todo usando tus modelos Product, Category, Brand, Sku.

src/routes/search/+page.server.ts
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { prismaListParams, parseRange } from '$lib/utils/paging';

type Filters = {
  q: string | null;
  category: string | null; // Category.slug
  brand: string | null;    // Brand.slug
  priceMin: number | null;
  priceMax: number | null;
};

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  // ---- Filtros desde querystring
  const q = url.searchParams.get('q')?.trim() || null;
  const category = url.searchParams.get('category')?.trim() || null;
  const brand = url.searchParams.get('brand')?.trim() || null;
  const { min: priceMin, max: priceMax } = parseRange(url, 'priceMin', 'priceMax');

  // ---- Paginación y orden
  // Permitimos ordenar por campos indexados; “price” usa el mínimo de SKUs
  const { page, limit, skip, orderBy } = prismaListParams(
    url,
    ['updatedAt', 'soldCount', 'ratingAvg', 'price'],
    { field: 'updatedAt', dir: 'desc' },
    {
      // map “price” ⇒ ordenar por el precio mínimo de las variantes
      price: 'variations._min.priceAmount',
      updatedAt: 'updatedAt',
      soldCount: 'soldCount',
      ratingAvg: 'ratingAvg'
    }
  );

  // ---- where dinámico
  const where: any = {
    active: true,
    ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(brand ? { brand: { slug: brand } } : {}),
    // precio por Sku.priceAmount (sólo variantes activas)
    ...((priceMin != null || priceMax != null)
      ? {
          variations: {
            some: {
              active: true,
              ...(priceMin != null ? { priceAmount: { gte: priceMin } } : {}),
              ...(priceMax != null ? { priceAmount: { lte: priceMax } } : {})
            }
          }
        }
      : {})
  };

  // ---- orderBy seguro (incluye caso especial de price usando agregados)
  const ob =
    orderBy['variations._min.priceAmount']
      ? { variations: { _min: { priceAmount: orderBy['variations._min.priceAmount'] } } }
      : orderBy;

  // ---- Query principal + conteos en paralelo
  const [rows, total, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: ob as any,
      skip, take: limit,
      include: {
        images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
        // Tomamos el SKU más barato para pintar precio
        variations: {
          where: { active: true },
          orderBy: { priceAmount: 'asc' },
          take: 1,
          select: { id: true, priceAmount: true, priceCurrency: true, listPrice: true }
        },
        // (Opcional) traemos slugs para breadcrumbs/links
        brand: { select: { slug: true, name: true } },
        category: { select: { slug: true, name: true } }
      }
    }),
    prisma.product.count({ where }),
    // listados cortos para filtros (pueden cachearse largo)
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
      take: 100
    }),
    prisma.brand.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
      take: 200
    })
  ]);

  // Cache control cortito para permitir cierta frescura sin clavar DB
  setHeaders({ 'Cache-Control': 'public, max-age=15, s-maxage=15' });

  return {
    filters: { q, category, brand, priceMin, priceMax } as Filters,
    products: rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      image: p.images[0] ?? null,
      sku: p.variations[0] ?? null,
      brand: p.brand,
      category: p.category
    })),
    page, limit, total,
    categories,
    brands
  };
};


Nota: El order por precio usa orderBy: { variations: { _min: { priceAmount: 'asc|desc' } } }. Está disponible en Prisma moderno (agregados de relación). Si tu versión no lo soporta, ordená por updatedAt y dejá el sort por precio para una segunda iteración.

src/routes/search/+page.svelte
<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';

  export let data: {
    filters: {
      q: string | null;
      category: string | null;
      brand: string | null;
      priceMin: number | null;
      priceMax: number | null;
    };
    products: Array<{
      id: string;
      slug: string;
      title: string;
      image: { url: string; alt: string | null } | null;
      sku: { id: string; priceAmount: any; priceCurrency: string; listPrice: any | null } | null;
      brand: { slug: string; name: string } | null;
      category: { slug: string; name: string } | null;
    }>;
    page: number;
    limit: number;
    total: number;
    categories: Array<{ slug: string; name: string }>;
    brands: Array<{ slug: string; name: string }>;
  };

  const qp = (key: string, val: string | number | null | undefined) => {
    const url = new URL(location.href);
    if (val === null || val === undefined || String(val) === '') url.searchParams.delete(key);
    else url.searchParams.set(key, String(val));
    url.searchParams.set('page', '1'); // siempre reset page al cambiar filtro
    return url.toString();
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  function goPage(page: number) {
    const url = new URL(location.href);
    url.searchParams.set('page', String(page));
    location.href = url.toString();
  }
</script>

<svelte:head>
  <title>Busqueda — tincho</title>
  <meta name="robots" content="index,follow" />
</svelte:head>

<div class="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
  <!-- Sidebar de filtros -->
  <aside class="space-y-5">
    <form method="GET" class="space-y-4">
      <!-- q -->
      <div>
        <label class="block text-sm font-medium mb-1" for="q">Buscar</label>
        <input
          id="q"
          name="q"
          type="search"
          value={data.filters.q ?? ''}
          placeholder="Buscar productos, marcas y más..."
          class="w-full rounded-xl border px-3 py-2"
        />
      </div>

      <!-- categoría -->
      <div>
        <label class="block text-sm font-medium mb-1" for="category">Categoría</label>
        <select id="category" name="category" class="w-full rounded-xl border px-3 py-2">
          <option value="">Todas</option>
          {#each data.categories as c}
            <option value={c.slug} selected={data.filters.category === c.slug}>{c.name}</option>
          {/each}
        </select>
      </div>

      <!-- marca -->
      <div>
        <label class="block text-sm font-medium mb-1" for="brand">Marca</label>
        <select id="brand" name="brand" class="w-full rounded-xl border px-3 py-2">
          <option value="">Todas</option>
          {#each data.brands as b}
            <option value={b.slug} selected={data.filters.brand === b.slug}>{b.name}</option>
          {/each}
        </select>
      </div>

      <!-- precio -->
      <div>
        <label class="block text-sm font-medium mb-1">Precio</label>
        <div class="flex items-center gap-2">
          <input
            name="priceMin"
            type="number"
            min="0"
            placeholder="Mín"
            value={data.filters.priceMin ?? ''}
            class="w-full rounded-xl border px-3 py-2"
          />
          <span class="text-neutral-500">–</span>
          <input
            name="priceMax"
            type="number"
            min="0"
            placeholder="Máx"
            value={data.filters.priceMax ?? ''}
            class="w-full rounded-xl border px-3 py-2"
          />
        </div>
      </div>

      <!-- orden -->
      <div>
        <label class="block text-sm font-medium mb-1" for="sort">Ordenar por</label>
        <select id="sort" name="sort" class="w-full rounded-xl border px-3 py-2">
          <option value="updatedAt:desc">Más recientes</option>
          <option value="soldCount:desc">Más vendidos</option>
          <option value="ratingAvg:desc">Mejor calificados</option>
          <option value="price:asc">Precio: menor a mayor</option>
          <option value="price:desc">Precio: mayor a menor</option>
        </select>
      </div>

      <button class="w-full rounded-xl border px-3 py-2 hover:bg-neutral-50" type="submit">
        Aplicar filtros
      </button>
    </form>

    <!-- Filtros activos (chips) -->
    <div class="flex flex-wrap gap-2">
      {#if data.filters.q}
        <a class="rounded-full border px-3 py-1 text-sm" href={qp('q', '')}>“{data.filters.q}” ✕</a>
      {/if}
      {#if data.filters.category}
        <a class="rounded-full border px-3 py-1 text-sm" href={qp('category', '')}>Categoría ✕</a>
      {/if}
      {#if data.filters.brand}
        <a class="rounded-full border px-3 py-1 text-sm" href={qp('brand', '')}>Marca ✕</a>
      {/if}
      {#if data.filters.priceMin}
        <a class="rounded-full border px-3 py-1 text-sm" href={qp('priceMin', '')}>Mín: {data.filters.priceMin} ✕</a>
      {/if}
      {#if data.filters.priceMax}
        <a class="rounded-full border px-3 py-1 text-sm" href={qp('priceMax', '')}>Máx: {data.filters.priceMax} ✕</a>
      {/if}
    </div>
  </aside>

  <!-- Resultados -->
  <section>
    <div class="mb-3 text-sm text-neutral-600">
      {#if data.total === 0}
        No encontramos resultados. Probá ajustar los filtros.
      {:else}
        {data.total} resultado{data.total === 1 ? '' : 's'}
      {/if}
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {#each data.products as p}
        <ProductCard id={p.id} slug={p.slug} title={p.title} image={p.image} sku={p.sku} />
      {/each}
    </div>

    <!-- Paginación -->
    {#if data.total > data.limit}
      <nav class="mt-6 flex items-center justify-center gap-2">
        <button class="rounded-xl border px-3 py-2 disabled:opacity-50"
          on:click={() => goPage(data.page - 1)}
          disabled={data.page <= 1}>
          Anterior
        </button>
        <span class="text-sm">
          Página {data.page} / {Math.max(1, Math.ceil(data.total / data.limit))}
        </span>
        <button class="rounded-xl border px-3 py-2 disabled:opacity-50"
          on:click={() => goPage(data.page + 1)}
          disabled={data.page >= totalPages}>
          Siguiente
        </button>
      </nav>
    {/if}
  </section>
</div>

Cómo esto usa tu schema.prisma

Texto (q) → Product.title contains (case-insensitive).

Categoría → Product.category.slug = :category.

Marca → Product.brand.slug = :brand.

Precio → Product.variations.some({ priceAmount gte/lte, active: true }).

Orden: updatedAt, soldCount, ratingAvg (campos indexados).
Para precio, usamos _min(priceAmount) sobre variations (el SKU más barato).

Grid: 1 imagen (ProductImage por position asc) + 1 SKU (Sku barato).