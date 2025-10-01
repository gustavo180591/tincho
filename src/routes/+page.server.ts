import { prisma } from '$lib/server/db';
import { parsePaging } from '$lib/server/paging';

export const load = async ({ url }) => {
  const { skip, limit } = parsePaging(url, { page: 1, limit: 12 });
  
  const [featuredProducts, total] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { 
        images: { take: 1 },
        variations: { 
          where: { active: true },
          orderBy: { priceAmount: 'asc' },
          take: 1 
        },
        _count: {
          select: { reviews: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.product.count({ where: { active: true } })
  ]);

  // Mapear los datos para incluir el conteo de reseñas
  const products = featuredProducts.map(product => ({
    ...product,
    ratingCount: product._count?.reviews || 0,
    ratingAvg: 4.5, // Valor temporal, podrías calcularlo desde las reseñas
    _count: undefined // Eliminamos el campo _count ya que no lo necesitamos
  }));

  return { products, total };
};
