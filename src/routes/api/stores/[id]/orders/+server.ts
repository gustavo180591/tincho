import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Get all orders for a specific store
export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    const storeId = params.id;
    const session = await locals.getSession();
    
    if (!storeId) {
      return json(errors.badRequest('ID de tienda no proporcionado'), { status: 400 });
    }

    // Check if store exists and user has permission
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { 
        id: true,
        sellerId: true,
        users: {
          where: { userId: session?.user?.id },
          select: { role: true },
        },
      },
    });

    if (!store) {
      return json(errors.notFound('Tienda no encontrada'), { status: 404 });
    }

    // Check if user is admin, store owner, or store staff
    const isAdmin = await prisma.user.findUnique({
      where: { id: session?.user?.id },
      select: { isAdmin: true },
    }).then(user => user?.isAdmin) || false;

    const isStoreOwner = store.sellerId === session?.user?.id;
    const isStoreStaff = store.users.some(user => 
      ['OWNER', 'ADMIN', 'MANAGER'].includes(user.role)
    );

    if (!isAdmin && !isStoreOwner && !isStoreStaff) {
      return json(errors.forbidden('No tienes permiso para ver los pedidos de esta tienda'), { status: 403 });
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;
    
    const status = url.searchParams.get('status') as OrderStatus | null;
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const search = url.searchParams.get('search') || '';
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = { storeId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1); // Include the entire end date
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (['createdAt', 'total', 'status'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    // Get total count for pagination
    const total = await prisma.order.count({ where });

    // Get orders with pagination
    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                attributes: true,
              },
            },
          },
        },
      },
    });

    // Format response
    const response = {
      items: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total.toString(),
        currency: order.currency,
        user: order.user,
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price.toString(),
          product: item.product,
          variant: item.variant,
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
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
    console.error('Error al obtener los pedidos de la tienda:', error);
    return json(errors.internalServerError('Error al obtener los pedidos de la tienda'), { status: 500 });
  }
};

// Types
type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
