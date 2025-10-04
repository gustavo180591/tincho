import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { parsePaging, parseSort } from '$lib/utils/paging';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const { page, limit, skip } = parsePaging(url, 24);
  const { field, dir } = parseSort(url); // default updatedAt:desc

  // Security: only allow sorting by known fields
  const orderBy: any =
    field === 'soldCount' ? { soldCount: dir } :
    field === 'ratingAvg' ? { ratingAvg: dir } :
    { updatedAt: dir };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        soldCount: true,
        ratingAvg: true,
        updatedAt: true,
        images: {
          orderBy: { position: 'asc' },
          take: 1,
          select: {
            url: true,
            alt: true
          }
        },
        variations: {
          orderBy: { price: 'asc' }, // Get the cheapest variation
          take: 1,
          select: {
            id: true,
            price: true,
            listPrice: true,
            stock: true
          }
        }
      }
    }),
    prisma.product.count({ where: { active: true } })
  ]);

  // Cache for 5 minutes
  setHeaders({
    'Cache-Control': 'public, max-age=300'
  });

  return {
    products: products.map(product => ({
      id: product.id,
      slug: product.slug,
      title: product.title,
      soldCount: product.soldCount,
      ratingAvg: product.ratingAvg,
      updatedAt: product.updatedAt,
      image: product.images[0] || null,
      sku: product.variations[0] ? {
        id: product.variations[0].id,
        priceAmount: product.variations[0].price,
        priceCurrency: 'ARS',
        listPrice: product.variations[0].listPrice || null,
        stock: product.variations[0].stock
      } : null
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};