import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

type PaymentMethodType = 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_ACCOUNT' | 'PAYPAL' | 'MERCADO_PAGO' | 'OTHER';

interface PaymentMethodUpdate {
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

// Get a specific payment method
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para ver este método de pago'), { status: 401 });
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id,
        deletedAt: null
      },
    });

    if (!paymentMethod) {
      return json(errors.notFound('Método de pago no encontrado'), { status: 404 });
    }

    const response = {
      id: paymentMethod.id,
      type: paymentMethod.type as PaymentMethodType,
      isDefault: paymentMethod.isDefault,
      lastFour: paymentMethod.lastFour,
      expiryMonth: paymentMethod.expiryMonth,
      expiryYear: paymentMethod.expiryYear,
      cardBrand: paymentMethod.cardBrand,
      bankName: paymentMethod.bankName,
      accountHolderName: paymentMethod.accountHolderName,
      email: paymentMethod.email,
      provider: paymentMethod.provider,
      providerId: paymentMethod.providerId,
      metadata: paymentMethod.metadata as Record<string, any> | null,
      createdAt: paymentMethod.createdAt.toISOString(),
      updatedAt: paymentMethod.updatedAt.toISOString(),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener el método de pago:', error);
    return json(errors.internalServerError('Error al obtener el método de pago'), { status: 500 });
  }
};

// Update a payment method
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para actualizar este método de pago'), { status: 401 });
    }

    const data = await request.json() as PaymentMethodUpdate;
    
    // Check if payment method exists and belongs to user
    const existingMethod = await prisma.paymentMethod.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id,
        deletedAt: null
      },
    });

    if (!existingMethod) {
      return json(errors.notFound('Método de pago no encontrado'), { status: 404 });
    }

    // If setting as default, unset any existing default
    if (data.isDefault && !existingMethod.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { 
          userId: session.user.id,
          isDefault: true,
          deletedAt: null,
          NOT: { id: params.id }
        },
        data: { isDefault: false },
      });
    }

    const updatedMethod = await prisma.paymentMethod.update({
      where: { id: params.id },
      data: {
        isDefault: data.isDefault !== undefined ? data.isDefault : existingMethod.isDefault,
        metadata: data.metadata !== undefined ? data.metadata : existingMethod.metadata,
      },
    });

    const response = {
      id: updatedMethod.id,
      type: updatedMethod.type as PaymentMethodType,
      isDefault: updatedMethod.isDefault,
      lastFour: updatedMethod.lastFour,
      expiryMonth: updatedMethod.expiryMonth,
      expiryYear: updatedMethod.expiryYear,
      cardBrand: updatedMethod.cardBrand,
      bankName: updatedMethod.bankName,
      accountHolderName: updatedMethod.accountHolderName,
      email: updatedMethod.email,
      provider: updatedMethod.provider,
      providerId: updatedMethod.providerId,
      metadata: updatedMethod.metadata as Record<string, any> | null,
      createdAt: updatedMethod.createdAt.toISOString(),
      updatedAt: updatedMethod.updatedAt.toISOString(),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al actualizar el método de pago:', error);
    return json(errors.internalServerError('Error al actualizar el método de pago'), { status: 500 });
  }
};

// Delete a payment method
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para eliminar este método de pago'), { status: 401 });
    }

    // Check if payment method exists and belongs to user
    const existingMethod = await prisma.paymentMethod.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id,
        deletedAt: null
      },
    });

    if (!existingMethod) {
      return json(errors.notFound('Método de pago no encontrado'), { status: 404 });
    }

    // Don't allow deleting the default payment method if it's the last one
    if (existingMethod.isDefault) {
      const otherMethods = await prisma.paymentMethod.count({
        where: { 
          userId: session.user.id,
          deletedAt: null,
          NOT: { id: params.id }
        },
      });

      if (otherMethods > 0) {
        return json(errors.badRequest('No puedes eliminar el método de pago predeterminado. Establece otro como predeterminado primero.'), { status: 400 });
      }
    }

    // Soft delete
    await prisma.paymentMethod.update({
      where: { id: params.id },
      data: { 
        deletedAt: new Date(),
        // Clear sensitive data
        lastFour: null,
        expiryMonth: null,
        expiryYear: null,
        cardBrand: null,
        bankName: null,
        accountHolderName: null,
        providerId: null,
        metadata: null,
      },
    });

    return json(success({ success: true }));
  } catch (error) {
    console.error('Error al eliminar el método de pago:', error);
    return json(errors.internalServerError('Error al eliminar el método de pago'), { status: 500 });
  }
};
