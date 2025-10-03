import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type RefundPaymentRequest = {
  amount?: number | string;
  reason?: string;
  refundToOriginalPaymentMethod?: boolean;
};

type RefundPaymentResponse = {
  id: string;
  orderId: string;
  status: string;
  refundedAmount: string;
  refundedAt: string;
  refundReason: string | null;
};

// Refund a payment
export const POST: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.getSession();
    const paymentId = params.id;

    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para reembolsar el pago'), { status: 401 });
    }

    if (!paymentId) {
      return json(errors.badRequest('Se requiere un ID de pago'), { status: 400 });
    }

    const data: RefundPaymentRequest = await request.json();
    const { 
      amount, 
      reason = 'Solicitado por el vendedor',
      refundToOriginalPaymentMethod = true 
    } = data;

    // Get payment with order information
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: {
            id: true,
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
      return json(errors.forbidden('No tienes permiso para reembolsar este pago'), { status: 403 });
    }

    // Validate payment status
    if (payment.status !== 'PAID' && payment.status !== 'AUTHORIZED') {
      return json(
        errors.badRequest(`No se puede reembolsar un pago con estado ${payment.status}. El pago debe estar autorizado o pagado.`),
        { status: 400 }
      );
    }

    // Calculate refund amount (default to full amount if not specified)
    const refundAmount = amount ? 
      (typeof amount === 'string' ? parseFloat(amount) : amount) : 
      payment.amount.toNumber();

    if (isNaN(refundAmount) || refundAmount <= 0) {
      return json(errors.badRequest('El monto del reembolso debe ser un número positivo'), { status: 400 });
    }

    if (refundAmount > payment.amount.toNumber()) {
      return json(
        errors.badRequest(`El monto del reembolso (${refundAmount}) no puede ser mayor al monto original (${payment.amount})`),
        { status: 400 }
      );
    }

    // Process refund
    const updatedPayment = await prisma.$transaction(async (prisma) => {
      const now = new Date();
      
      // Create a refund record
      const refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: refundAmount,
          reason,
          status: 'PENDING',
          processedBy: session.user.id,
        },
      });

      // Update payment status to REFUNDED if full amount is being refunded
      const isFullRefund = refundAmount === payment.amount.toNumber();
      const newStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      
      // Update payment
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: newStatus,
          updatedAt: now,
        },
      });

      // Update order status to REFUNDED if full refund
      if (isFullRefund) {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { 
            status: 'REFUNDED',
            updatedAt: now,
          },
        });
      }

      // In a real application, you would call the payment provider's API here
      // For example:
      // const refundResult = await paymentProvider.refundPayment(
      //   payment.providerRef, 
      //   refundAmount,
      //   { reason, refundToOriginalPaymentMethod }
      // );
      
      // Update refund with provider reference
      await prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: 'COMPLETED',
          providerRef: `ref_${Date.now()}`, // Replace with actual provider reference
          processedAt: new Date(),
        },
      });

      return {
        ...updatedPayment,
        refundedAmount: refundAmount,
        refundReason: reason,
      };
    });

    const response: RefundPaymentResponse = {
      id: updatedPayment.id,
      orderId: updatedPayment.orderId,
      status: updatedPayment.status,
      refundedAmount: refundAmount.toString(),
      refundedAt: new Date().toISOString(),
      refundReason: reason,
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al procesar el reembolso:', error);
    return json(
      errors.internalServerError('Error al procesar el reembolso. Por favor, inténtelo de nuevo más tarde.'),
      { status: 500 }
    );
  }
};
