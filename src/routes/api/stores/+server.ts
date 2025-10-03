import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type StoreResponse = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  countryId: string | null;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  country?: {
    id: string;
    name: string;
    iso2: string;
  } | null;
  seller?: {
    id: string;
    nickname: string;
  };
  stats?: {
    products: number;
    orders: number;
    rating: number;
  };
};

// Get all stores with pagination and filtering
export const GET: RequestHandler = async ({ url }) => {
  try {
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;
    
    const search = url.searchParams.get('search') || '';
    const countryId = url.searchParams.get('countryId');
    const sellerId = url.searchParams.get('sellerId');
    const includeStats = url.searchParams.get('includeStats') === 'true';

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (countryId) {
      where.countryId = countryId;
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    // Get total count for pagination
    const total = await prisma.store.count({ where });

    // Get stores with pagination
    const stores = await prisma.store.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            iso2: true,
          },
        },
        seller: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    // Get stats if requested
    let storesWithStats = [...stores];
    if (includeStats) {
      const storeIds = stores.map(store => store.id);
      
      // Get product counts
      const productCounts = await prisma.product.groupBy({
        by: ['storeId'],
        where: { storeId: { in: storeIds } },
        _count: { _all: true },
      });

      // Get order counts
      const orderCounts = await prisma.order.groupBy({
        by: ['storeId'],
        where: { storeId: { in: storeIds } },
        _count: { _all: true },
      });

      // Get average ratings (assuming reviews are stored in a Review model)
      const storeRatings = await prisma.review.groupBy({
        by: ['storeId'],
        where: { storeId: { in: storeIds } },
        _avg: { rating: true },
      });

      // Map stats to stores
      storesWithStats = stores.map(store => {
        const productCount = productCounts.find(pc => pc.storeId === store.id)?._count?._all || 0;
        const orderCount = orderCounts.find(oc => oc.storeId === store.id)?._count?._all || 0;
        const avgRating = storeRatings.find(sr => sr.storeId === store.id)?._avg?.rating || 0;

        return {
          ...store,
          stats: {
            products: productCount,
            orders: orderCount,
            rating: parseFloat(avgRating.toFixed(2)),
          },
        };
      });
    }

    // Transform the response
    const response = storesWithStats.map((store): StoreResponse => ({
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      countryId: store.countryId,
      sellerId: store.sellerId,
      country: store.country,
      seller: {
        id: store.seller.id,
        nickname: store.seller.nickname,
      },
      stats: (store as any).stats,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    }));

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
    console.error('Error al obtener las tiendas:', error);
    return json(errors.internalServerError('Error al obtener las tiendas'), { status: 500 });
  }
};

// Create a new store
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, description, countryId, sellerId } = data;

    // Validate required fields
    if (!name || !sellerId) {
      return json(errors.badRequest('Nombre y vendedor son campos requeridos'), { status: 400 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');

    // Check if seller exists
    const seller = await prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return json(errors.badRequest('Vendedor no encontrado'), { status: 400 });
    }

    // Check if store name is already taken
    const existingStore = await prisma.store.findFirst({
      where: { name },
    });

    if (existingStore) {
      return json(errors.conflict('Ya existe una tienda con este nombre'), { status: 409 });
    }

    // Check if country exists if provided
    if (countryId) {
      const country = await prisma.country.findUnique({
        where: { id: countryId },
      });

      if (!country) {
        return json(errors.badRequest('País no encontrado'), { status: 400 });
      }
    }

    // Create the store
    const store = await prisma.store.create({
      data: {
        name,
        slug,
        description: description || null,
        countryId: countryId || null,
        seller: { connect: { id: sellerId } },
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            iso2: true,
          },
        },
        seller: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    const response: StoreResponse = {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      countryId: store.countryId,
      sellerId: store.sellerId,
      country: store.country,
      seller: {
        id: store.seller.id,
        nickname: store.seller.nickname,
      },
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear la tienda:', error);
    return json(errors.internalServerError('Error al crear la tienda'), { status: 500 });
  }
};
