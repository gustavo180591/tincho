import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/brands/:id/products
export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const { id } = params;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const sortBy = url.searchParams.get('sortBy') || 'name';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';
    const minPrice = parseFloat(url.searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '1000000');
    const inStock = url.searchParams.get('inStock') === 'true';
    const skip = (page - 1) * limit;

    // Verificar si la marca existe
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!brand) {
      return errors.notFound('Brand not found');
    }

    // Construir el objeto de ordenamiento
    const orderBy = [];
    if (sortBy === 'price') {
      orderBy.push({ price: sortOrder.toLowerCase() });
    } else if (sortBy === 'name') {
      orderBy.push({ name: sortOrder.toLowerCase() });
    } else if (sortBy === 'createdAt') {
      orderBy.push({ createdAt: sortOrder.toLowerCase() });
    } else if (sortBy === 'rating') {
      orderBy.push({ averageRating: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' });
    }
    orderBy.push({ id: 'asc' });

    // Construir el objeto where
    const where = {
      brandId: id,
      isActive: true,
      price: {
        gte: minPrice,
        lte: maxPrice
      },
      ...(inStock && {
        OR: [
          { trackQuantity: false },
          { 
            trackQuantity: true,
            stock: { gt: 0 }
          }
        ]
      })
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          compareAtPrice: true,
          sku: true,
          barcode: true,
          trackQuantity: true,
          stock: true,
          isActive: true,
          images: true,
          averageRating: true,
          totalReviews: true,
          seoTitle: true,
          seoDescription: true,
          createdAt: true,
          updatedAt: true,
          categories: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          variants: {
            select: {
              id: true,
              sku: true,
              price: true,
              compareAtPrice: true,
              stock: true,
              isActive: true,
              options: true,
              images: true
            },
            where: { isActive: true }
          }
        },
        skip,
        take: limit,
        orderBy
      }),
      prisma.product.count({ where })
    ]);

    return success({
      brand: {
        id: brand.id,
        name: brand.name
      },
      products: products.map(product => ({
        ...product,
        inStock: product.trackQuantity ? (product.stock || 0) > 0 : true,
        variants: product.variants.map(variant => ({
          ...variant,
          inStock: variant.stock > 0
        }))
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(`Error fetching products for brand ${params.id}:`, error);
    return errors.internalServerError('Error fetching products');
  }
};
