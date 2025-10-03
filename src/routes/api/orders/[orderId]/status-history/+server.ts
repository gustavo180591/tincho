import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type StatusHistoryItem = {
  id: string;
  status: string;
  notes: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

// Get status history for an order
export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    const session = await locals.getSession();
    const orderId = params.orderId;

    if (!orderId) {
      return json(errors.badRequest('Se requiere un ID de orden'), { status: 400 });
    }

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get the order to check permissions
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        storeId: true,
      },
    });

    if (!order) {
      return json(errors.notFound('Orden no encontrada'), { status: 404 });
    }

    // Check if the user is authorized to view this order's history
    if (session?.user) {
      const isAdmin = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      }).then(user => user?.isAdmin) || false;

      const isOrderOwner = order.userId === session.user.id;
      const isStoreStaff = await prisma.storeUser.findFirst({
        where: {
          storeId: order.storeId,
          userId: session.user.id,
          role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
        },
      }).then(storeUser => !!storeUser);

      if (!isAdmin && !isOrderOwner && !isStoreStaff) {
        return json(errors.forbidden('No tienes permiso para ver el historial de esta orden'), { status: 403 });
      }
    } else {
      return json(errors.unauthorized('Debe iniciar sesión para ver el historial de la orden'), { status: 401 });
    }

    // Get status history with pagination
    const [history, total] = await Promise.all([
      prisma.orderHistory.findMany({
        where: { orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.orderHistory.count({ where: { orderId } }),
    ]);

    // Transform the response
    const response = {
      items: history.map((item) => ({
        id: item.id,
        status: item.status,
        notes: item.notes,
        userId: item.userId,
        userName: item.user?.name || null,
        userEmail: item.user?.email || null,
        trackingNumber: item.trackingNumber,
        trackingUrl: item.trackingUrl,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })) as StatusHistoryItem[],
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener el historial de estados:', error);
    return json(
      errors.internalServerError('Error al obtener el historial de estados de la orden'),
      { status: 500 }
    );
  }
};
