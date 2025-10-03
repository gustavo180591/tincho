import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/sellers
export const GET: RequestHandler = async ({ url }) => {
  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const where = {
      role: 'SELLER',
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { sellerProfile: {
            storeName: { contains: search, mode: 'insensitive' }
          }}
        ]
      })
    };

    const [sellers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          sellerProfile: {
            select: {
              storeName: true,
              description: true,
              rating: true,
              totalSales: true,
              isVerified: true
            }
          },
          createdAt: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return success({
      data: sellers.map(seller => ({
        ...seller,
        fullName: `${seller.firstName} ${seller.lastName}`.trim(),
        storeName: seller.sellerProfile?.storeName,
        description: seller.sellerProfile?.description,
        rating: seller.sellerProfile?.rating,
        totalSales: seller.sellerProfile?.totalSales,
        isVerified: seller.sellerProfile?.isVerified
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return errors.internalServerError('Error fetching sellers');
  }
};
