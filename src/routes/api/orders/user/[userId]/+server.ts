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
  createdAt: string;
  store: {
    id: string;
    name: string;
    logo?: string;
  };
  items: OrderItem[];
};

// Get orders by user ID
export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    const session = await locals.getSession();
    const requestedUserId = params.userId;

    if (!requestedUserId) {
      return json(errors.badRequest('Se requiere un ID de usuario'), { status: 400 });
    }

    // Check if the user is authorized to view these orders
    const isAuthorized = session?.user && (
      session.user.id === requestedUserId || // User is viewing their own orders
      await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      }).then(user => user?.isAdmin) // Or is an admin
    );

    if (!isAuthorized) {
      return json(errors.forbidden('No tienes permiso para ver estas órdenes'), { status: 403 });
    }

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filters
    const status = url.searchParams.get('status') as OrderStatus | null;
    const storeId = url.searchParams.get('storeId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build where clause
    const where: any = { userId: requestedUserId };
    
    if (status) where.status = status;
    if (storeId) where.storeId = storeId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              logo: true,
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

    // Transform the response
    const response = {
      items: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status as OrderStatus,
        total: Number(order.total),
        currency: order.currency,
        itemCount: order._count.items,
        createdAt: order.createdAt.toISOString(),
        store: {
          id: order.store.id,
          name: order.store.name,
          logo: order.store.logo || undefined,
        },
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
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener las órdenes del usuario:', error);
    return json(errors.internalServerError('Error al obtener las órdenes del usuario'), { status: 500 });
  }
};
