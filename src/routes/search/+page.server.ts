import { prisma } from '$lib/server/db';
import { parsePaging } from '$lib/server/paging';

export const load = async ({ url }) => {
  const { skip, limit } = parsePaging(url);
  const q = url.searchParams.get('q') ?? '';
  const category = url.searchParams.get('category') ?? undefined;
  const brand = url.searchParams.get('brand') ?? undefined;
  const priceMin = Number(url.searchParams.get('priceMin') ?? '');
  const priceMax = Number(url.searchParams.get('priceMax') ?? '');
  const sort = (url.searchParams.get('sort') ?? 'updatedAt:desc').split(':');
  
  // Build the where clause
  const where: any = { active: true };
  
  // Text search
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } }
    ];
  }
  
  // Category filter
  if (category) {
    where.category = { slug: category };
  }
  
  // Brand filter
  if (brand) {
    where.brand = { slug: brand };
  }
  
  // Price range filter
  const priceFilter: any = {};
  if (!isNaN(priceMin) && priceMin > 0) priceFilter.gte = priceMin;
  if (!isNaN(priceMax) && priceMax > 0) priceFilter.lte = priceMax;
  
  // If we have price filters, we need to filter by the first variation's price
  if (Object.keys(priceFilter).length > 0) {
    where.variations = {
      some: {
        priceAmount: priceFilter,
        active: true
      }
    };
  }
  
  // Sorting
  const orderBy = [
    { [sort[0] as string]: sort[1] === 'asc' ? 'asc' : 'desc' },
    { id: 'asc' } // Secondary sort for consistent pagination
  ];
  
  // Get products with their first image and first variation
  const [products, total, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { take: 1 },
        variations: {
          where: { active: true },
          orderBy: { priceAmount: 'asc' },
          take: 1
        },
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        _count: {
          select: { reviews: true }
        }
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { name: 'asc' }
    }),
    prisma.brand.findMany({
      orderBy: { name: 'asc' }
    })
  ]);
  
  // Map the results to include rating info
  const results = products.map(product => ({
    ...product,
    ratingCount: product._count?.reviews || 0,
    ratingAvg: 4.5, // This would be calculated from reviews in a real app
    _count: undefined // Remove the _count field
  }));
  
  return {
    q,
    results,
    total,
    categories,
    brands,
    filters: {
      category,
      brand,
      priceMin: isNaN(priceMin) ? '' : priceMin,
      priceMax: isNaN(priceMax) ? '' : priceMax,
      sort: sort.join(':')
    },
    pagination: {
      page: Math.floor(skip / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};
