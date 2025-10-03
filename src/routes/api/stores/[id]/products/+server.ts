import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Get all products for a specific store
export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const storeId = params.id;
    
    if (!storeId) {
      return json(errors.badRequest('ID de tienda no proporcionado'), { status: 400 });
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;
    
    const search = url.searchParams.get('search') || '';
    const categoryId = url.searchParams.get('categoryId');
    const minPrice = url.searchParams.get('minPrice') ? parseFloat(url.searchParams.get('minPrice')!) : null;
    const maxPrice = url.searchParams.get('maxPrice') ? parseFloat(url.searchParams.get('maxPrice')!) : null;
    const inStock = url.searchParams.get('inStock') === 'true';
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      return json(errors.notFound('Tienda no encontrada'), { status: 404 });
    }

    // Build where clause
    const where: any = { storeId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== null || maxPrice !== null) {
      where.price = {};
      if (minPrice !== null) where.price.gte = minPrice;
      if (maxPrice !== null) where.price.lte = maxPrice;
    }

    if (inStock) {
      where.OR = [
        ...(where.OR || []),
        {
          variants: {
            some: {
              stock: { gt: 0 },
            },
          },
        },
      ];
    }

    // Build orderBy clause
    let orderBy: any = {};
    if (sortBy === 'price') {
      orderBy = { price: sortOrder };
    } else if (sortBy === 'name') {
      orderBy = { title: sortOrder };
    } else if (sortBy === 'rating') {
      orderBy = { ratingAvg: sortOrder };
    } else {
      orderBy = { createdAt: 'desc' };
    }

    // Get total count for pagination
    const total = await prisma.product.count({ where });

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          take: 1,
          orderBy: { position: 'asc' },
          select: {
            url: true,
            alt: true,
          },
        },
        variants: {
          select: {
            price: true,
            stock: true,
          },
        },
      },
    });

    // Transform the response
    const response = products.map((product) => {
      // Calculate min/max price and total stock from variants
      const prices = product.variants.map((v) => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);

      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        description: product.description,
        price: minPrice === maxPrice ? minPrice : { min: minPrice, max: maxPrice },
        image: product.images[0] || null,
        brand: product.brand,
        category: product.category,
        inStock: totalStock > 0,
        stock: totalStock,
        rating: product.ratingAvg || 0,
        reviewCount: product.ratingCount || 0,
        condition: product.condition,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    });

    return json(
      success({
        data: response,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener los productos de la tienda:', error);
    return json(
      errors.internalServerError('Error al obtener los productos de la tienda'),
      { status: 500 }
    );
  }
};
