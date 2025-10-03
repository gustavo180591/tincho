import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

type OrderItem = {
  id: string;
  skuId: string;
  productId: string;
  productName: string;
  skuCode: string | null;
  quantity: number;
  price: number;
  total: number;
  image?: string;
};

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  itemCount: number;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  items: OrderItem[];
};

// Get orders by store ID
export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    const session = await locals.getSession();
    const storeId = params.storeId;

    if (!storeId) {
      return json(errors.badRequest('Se requiere un ID de tienda'), { status: 400 });
    }

    // Check if the user is authorized to view these orders
    const isAuthorized = session?.user && (
      await prisma.storeUser.findFirst({
        where: {
          storeId,
          userId: session.user.id,
          role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
        },
      }) ||
      await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      }).then(user => user?.isAdmin)
    );

    if (!isAuthorized) {
      return json(errors.forbidden('No tienes permiso para ver las órdenes de esta tienda'), { status: 403 });
    }

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filters
    const status = url.searchParams.get('status') as OrderStatus | null;
    const userId = url.searchParams.get('userId');
    const orderNumber = url.searchParams.get('orderNumber');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const minTotal = url.searchParams.get('minTotal');
    const maxTotal = url.searchParams.get('maxTotal');

    // Build where clause
    const where: any = { storeId };
    
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (orderNumber) where.orderNumber = { contains: orderNumber, mode: 'insensitive' };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (minTotal || maxTotal) {
      where.total = {};
      if (minTotal) where.total.gte = parseFloat(minTotal);
      if (maxTotal) where.total.lte = parseFloat(maxTotal);
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            take: 2, // Only take 2 items for the preview
            include: {
              sku: {
                select: {
                  code: true,
                  product: {
                    select: {
                      name: true,
                      images: {
                        take: 1,
                        orderBy: { position: 'asc' },
                        select: { url: true },
                      },
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Get order statistics
    const stats = await prisma.order.groupBy({
      by: ['status'],
      where: { storeId },
      _count: { id: true },
      _sum: { total: true },
    });

    // Transform the response
    const response = {
      items: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status as OrderStatus,
        total: Number(order.total),
        currency: order.currency,
        itemCount: order._count.items,
        customer: {
          id: order.user.id,
          name: order.user.name || '',
          email: order.user.email || '',
        },
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          skuId: item.skuId,
          productId: item.productId,
          productName: item.sku.product.name,
          skuCode: item.sku.code || null,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
          image: item.sku.product.images[0]?.url,
        })),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalOrders: total,
        totalRevenue: stats.reduce((sum, stat) => sum + Number(stat._sum.total || 0), 0),
        byStatus: stats.map((stat) => ({
          status: stat.status,
          count: stat._count.id,
          total: Number(stat._sum.total || 0),
        })),
      },
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener las órdenes de la tienda:', error);
    return json(errors.internalServerError('Error al obtener las órdenes de la tienda'), { status: 500 });
  }
};
