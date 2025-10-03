import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { CurrencyCode, PaymentStatus } from '@prisma/client';

// Types
type PaymentResponse = {
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
  rawPayload: any;
  createdAt: string;
  updatedAt: string;
};

// Get payment by ID
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    const paymentId = params.id;

    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para ver el pago'), { status: 401 });
    }

    if (!paymentId) {
      return json(errors.badRequest('Se requiere un ID de pago'), { status: 400 });
    }

    // Get payment with order and store information
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
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
        },
      },
    });

    if (!payment) {
      return json(errors.notFound('Pago no encontrado'), { status: 404 });
    }

    // Check if user is admin, order owner, or store staff
    const isAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    }).then(user => user?.isAdmin) || false;

    const isOrderOwner = payment.order.userId === session.user.id;
    const isStoreStaff = payment.order.store?.users?.some(user => 
      ['OWNER', 'ADMIN', 'MANAGER'].includes(user.role)
    ) || false;

    if (!isAdmin && !isOrderOwner && !isStoreStaff) {
      return json(errors.forbidden('No tienes permiso para ver este pago'), { status: 403 });
    }

    const response: PaymentResponse = {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      providerRef: payment.providerRef,
      status: payment.status,
      currency: payment.currency,
      amount: payment.amount.toString(),
      authorizedAt: payment.authorizedAt?.toISOString() || null,
      paidAt: payment.paidAt?.toISOString() || null,
      failureCode: payment.failureCode,
      rawPayload: payment.rawPayload || {},
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener el pago:', error);
    return json(errors.internalServerError('Error al obtener el pago'), { status: 500 });
  }
};

// Update payment status
type UpdatePaymentRequest = {
  status: PaymentStatus;
  providerRef?: string;
  failureCode?: string;
  rawPayload?: any;
};

type UpdatePaymentResponse = PaymentResponse;

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.getSession();
    const paymentId = params.id;

    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para actualizar el pago'), { status: 401 });
    }

    if (!paymentId) {
      return json(errors.badRequest('Se requiere un ID de pago'), { status: 400 });
    }

    const data: UpdatePaymentRequest = await request.json();
    const { status, providerRef, failureCode, rawPayload } = data;

    // Get payment with order information
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true,
            store: {
              select: {
                users: {
                  where: { userId: session.user.id },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return json(errors.notFound('Pago no encontrado'), { status: 404 });
    }

    // Check if user is admin or store staff
    const isAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    }).then(user => user?.isAdmin) || false;

    const isStoreStaff = payment.order.store?.users?.some(user => 
      ['OWNER', 'ADMIN', 'MANAGER'].includes(user.role)
    ) || false;

    if (!isAdmin && !isStoreStaff) {
      return json(errors.forbidden('No tienes permiso para actualizar este pago'), { status: 403 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (providerRef !== undefined) updateData.providerRef = providerRef;
    if (failureCode !== undefined) updateData.failureCode = failureCode;
    if (rawPayload !== undefined) updateData.rawPayload = rawPayload;

    // Set timestamps based on status
    if (status === 'AUTHORIZED' && payment.status !== 'AUTHORIZED') {
      updateData.authorizedAt = new Date();
    }

    if (status === 'PAID' && payment.status !== 'PAID') {
      updateData.paidAt = new Date();
      // If payment is marked as PAID, ensure it's also AUTHORIZED
      if (payment.status !== 'AUTHORIZED') {
        updateData.authorizedAt = updateData.authorizedAt || new Date();
      }
    }

    // Update payment
    const updatedPayment = await prisma.$transaction(async (prisma) => {
      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: updateData,
      });

      // Update order status if payment is completed
      if (status === 'PAID' && payment.order.status !== 'PAID') {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'PAID' },
        });
      }

      return payment;
    });

    const response: UpdatePaymentResponse = {
      id: updatedPayment.id,
      orderId: updatedPayment.orderId,
      provider: updatedPayment.provider,
      providerRef: updatedPayment.providerRef,
      status: updatedPayment.status,
      currency: updatedPayment.currency,
      amount: updatedPayment.amount.toString(),
      authorizedAt: updatedPayment.authorizedAt?.toISOString() || null,
      paidAt: updatedPayment.paidAt?.toISOString() || null,
      failureCode: updatedPayment.failureCode,
      rawPayload: updatedPayment.rawPayload || {},
      createdAt: updatedPayment.createdAt.toISOString(),
      updatedAt: updatedPayment.updatedAt.toISOString(),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al actualizar el pago:', error);
    return json(errors.internalServerError('Error al actualizar el pago'), { status: 500 });
  }
};
