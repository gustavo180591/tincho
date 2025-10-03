import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Get all reviews for a specific store
export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const storeId = params.id;
    
    if (!storeId) {
      return json(errors.badRequest('ID de tienda no proporcionado'), { status: 400 });
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      return json(errors.notFound('Tienda no encontrada'), { status: 404 });
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
    const skip = (page - 1) * limit;
    
    const rating = url.searchParams.get('rating') ? parseInt(url.searchParams.get('rating')!) : null;
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = { storeId };

    if (rating && rating >= 1 && rating <= 5) {
      where.rating = rating;
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (['rating', 'createdAt', 'updatedAt'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    // Get total count for pagination and average rating
    const [total, avgRating] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.aggregate({
        where: { storeId },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    // Get reviews with pagination
    const reviews = await prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        orderItem: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Format response
    const response = {
      items: reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        user: review.user,
        orderItem: review.orderItem,
        images: review.images,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      })),
      stats: {
        averageRating: parseFloat((avgRating._avg.rating || 0).toFixed(2)),
        totalReviews: avgRating._count,
        ratingDistribution: await getRatingDistribution(storeId),
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener las reseñas de la tienda:', error);
    return json(errors.internalServerError('Error al obtener las reseñas de la tienda'), { status: 500 });
  }
};

// Helper function to get rating distribution
async function getRatingDistribution(storeId: string) {
  const result = await prisma.review.groupBy({
    by: ['rating'],
    where: { storeId },
    _count: { _all: true },
  });

  // Initialize with all possible ratings (1-5)
  const distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  // Update with actual counts
  result.forEach(({ rating, _count }) => {
    distribution[rating as keyof typeof distribution] = _count._all;
  });

  return distribution;
}

// Types
type ReviewResponse = {
  id: string;
  rating: number;
  comment: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  orderItem: {
    id: string;
    product: {
      id: string;
      title: string;
      slug: string;
    };
  } | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
};

type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
};
