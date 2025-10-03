import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { CurrencyCode, PaymentStatus } from '@prisma/client';

// Types
type PaymentResponse = {
  id: string;
  provider: string;
  providerRef: string | null;
  status: PaymentStatus;
  currency: CurrencyCode;
  amount: string;
  authorizedAt: string | null;
  paidAt: string | null;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderPaymentsResponse = {
  items: PaymentResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

// Get payments for an order
export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    const session = await locals.getSession();
    const orderId = params.orderId;

    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para ver los pagos de la orden'), { status: 401 });
    }

    if (!orderId) {
      return json(errors.badRequest('Se requiere un ID de orden'), { status: 400 });
    }

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;

    // Get order to check permissions
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        store: {
          select: {
            users: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!order) {
      return json(errors.notFound('Orden no encontrada'), { status: 404 });
    }

    // Check if user is admin, order owner, or store staff
    const isAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    }).then(user => user?.isAdmin) || false;

    const isOrderOwner = order.userId === session.user.id;
    const isStoreStaff = order.store?.users?.some(user => 
      ['OWNER', 'ADMIN', 'MANAGER'].includes(user.role)
    ) || false;

    if (!isAdmin && !isOrderOwner && !isStoreStaff) {
      return json(errors.forbidden('No tienes permiso para ver los pagos de esta orden'), { status: 403 });
    }

    // Get payments with pagination
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          provider: true,
          providerRef: true,
          status: true,
          currency: true,
          amount: true,
          authorizedAt: true,
          paidAt: true,
          failureCode: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.payment.count({ where: { orderId } }),
    ]);

    // Format response
    const response: OrderPaymentsResponse = {
      items: payments.map(payment => ({
        ...payment,
        amount: payment.amount.toString(),
        authorizedAt: payment.authorizedAt?.toISOString() || null,
        paidAt: payment.paidAt?.toISOString() || null,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
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
    console.error('Error al obtener los pagos de la orden:', error);
    return json(
      errors.internalServerError('Error al obtener los pagos de la orden'),
      { status: 500 }
    );
  }
};
