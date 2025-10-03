import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type CapturePaymentResponse = {
  id: string;
  orderId: string;
  status: string;
  capturedAmount: string;
  capturedAt: string;
};

// Capture a payment
export const POST: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    const paymentId = params.id;

    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para capturar el pago'), { status: 401 });
    }

    if (!paymentId) {
      return json(errors.badRequest('Se requiere un ID de pago'), { status: 400 });
    }

    // Get payment with order information
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: {
            id: true,
            total: true,
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
      return json(errors.forbidden('No tienes permiso para capturar este pago'), { status: 403 });
    }

    // Validate payment status
    if (payment.status !== 'AUTHORIZED') {
      return json(
        errors.badRequest(`No se puede capturar un pago con estado ${payment.status}. El pago debe estar autorizado.`),
        { status: 400 }
      );
    }

    // Update payment status to PAID and set captured timestamp
    const updatedPayment = await prisma.$transaction(async (prisma) => {
      const now = new Date();
      
      // Update payment
      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          paidAt: now,
          updatedAt: now,
        },
      });

      // Update order status to PAID if not already
      if (payment.order.status !== 'PAID') {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { 
            status: 'PAID',
            updatedAt: now,
          },
        });
      }

      return payment;
    });

    const response: CapturePaymentResponse = {
      id: updatedPayment.id,
      orderId: updatedPayment.orderId,
      status: updatedPayment.status,
      capturedAmount: updatedPayment.amount.toString(),
      capturedAt: new Date().toISOString(),
    };

    // In a real application, you would also call the payment provider's API to capture the payment
    // For example:
    // await paymentProvider.capturePayment(payment.providerRef, payment.amount);

    return json(success(response));
  } catch (error) {
    console.error('Error al capturar el pago:', error);
    return json(
      errors.internalServerError('Error al capturar el pago. Por favor, inténtelo de nuevo más tarde.'),
      { status: 500 }
    );
  }
};
