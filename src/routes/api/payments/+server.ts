import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { CurrencyCode, PaymentStatus } from '@prisma/client';

// Types
type Payment = {
  id: string;
  orderId: string;
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

type PaymentResponse = {
  items: Payment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

// List all payments (admin only)
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const session = await locals.getSession();
    
    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para ver los pagos'), { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return json(errors.forbidden('No tienes permiso para ver todos los pagos'), { status: 403 });
    }

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    // Filters
    const status = url.searchParams.get('status') as PaymentStatus | null;
    const provider = url.searchParams.get('provider');
    const orderId = url.searchParams.get('orderId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build where clause
    const where: any = {};
    
    if (status) where.status = status;
    if (provider) where.provider = { contains: provider, mode: 'insensitive' };
    if (orderId) where.orderId = orderId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1); // Include the entire end date
        where.createdAt.lte = end;
      }
    }

    // Get payments with pagination
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          orderId: true,
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
      prisma.payment.count({ where }),
    ]);

    // Convert Decimal to string for JSON serialization
    const formattedPayments = payments.map(payment => ({
      ...payment,
      amount: payment.amount.toString(),
    }));

    const response: PaymentResponse = {
      items: formattedPayments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener los pagos:', error);
    return json(errors.internalServerError('Error al obtener los pagos'), { status: 500 });
  }
};

// Create a new payment
type CreatePaymentRequest = {
  orderId: string;
  provider: string;
  providerRef?: string;
  currency: CurrencyCode;
  amount: string | number;
  rawPayload?: any;
};

type CreatePaymentResponse = {
  id: string;
  orderId: string;
  provider: string;
  providerRef: string | null;
  status: PaymentStatus;
  currency: CurrencyCode;
  amount: string;
  createdAt: string;
  updatedAt: string;
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    
    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para crear un pago'), { status: 401 });
    }

    const data: CreatePaymentRequest = await request.json();
    const { orderId, provider, providerRef, currency, amount, rawPayload } = data;

    // Validate required fields
    if (!orderId || !provider || !currency || amount === undefined) {
      return json(errors.badRequest('Faltan campos requeridos'), { status: 400 });
    }

    // Convert amount to Decimal
    const amountDecimal = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(amountDecimal) || amountDecimal <= 0) {
      return json(errors.badRequest('El monto debe ser un número positivo'), { status: 400 });
    }

    // Check if order exists and user has permission
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
      return json(errors.forbidden('No tienes permiso para crear un pago para esta orden'), { status: 403 });
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        orderId,
        provider,
        providerRef,
        status: 'PENDING',
        currency,
        amount: amountDecimal,
        rawPayload,
      },
    });

    // Update order status to PAID if this is a successful payment
    if (payment.status === 'PAID' || payment.status === 'AUTHORIZED') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
    }

    const response: CreatePaymentResponse = {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      providerRef: payment.providerRef,
      status: payment.status,
      currency: payment.currency,
      amount: payment.amount.toString(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear el pago:', error);
    return json(errors.internalServerError('Error al crear el pago'), { status: 500 });
  }
};
