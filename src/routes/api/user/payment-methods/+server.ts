import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

type PaymentMethodType = 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_ACCOUNT' | 'PAYPAL' | 'MERCADO_PAGO' | 'OTHER';

interface PaymentMethodBase {
  type: PaymentMethodType;
  isDefault?: boolean;
  lastFour?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  cardBrand?: string | null;
  bankName?: string | null;
  accountHolderName?: string | null;
  email?: string | null;
  provider: string;
  providerId?: string | null;
  metadata?: Record<string, any> | null;
}

interface PaymentMethodResponse extends PaymentMethodBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Get all payment methods for the current user
export const GET: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para ver tus métodos de pago'), { status: 401 });
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { 
        userId: session.user.id,
        deletedAt: null
      },
      orderBy: { isDefault: 'desc' },
    });

    const response: PaymentMethodResponse[] = paymentMethods.map(method => ({
      id: method.id,
      type: method.type as PaymentMethodType,
      isDefault: method.isDefault,
      lastFour: method.lastFour,
      expiryMonth: method.expiryMonth,
      expiryYear: method.expiryYear,
      cardBrand: method.cardBrand,
      bankName: method.bankName,
      accountHolderName: method.accountHolderName,
      email: method.email,
      provider: method.provider,
      providerId: method.providerId,
      metadata: method.metadata as Record<string, any> | null,
      createdAt: method.createdAt.toISOString(),
      updatedAt: method.updatedAt.toISOString(),
    }));

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener los métodos de pago:', error);
    return json(errors.internalServerError('Error al obtener los métodos de pago'), { status: 500 });
  }
};

// Create a new payment method
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para agregar un método de pago'), { status: 401 });
    }

    const data = await request.json() as PaymentMethodBase;
    
    // Validate required fields
    if (!data.type || !data.provider) {
      return json(errors.badRequest('Tipo de método de pago y proveedor son requeridos'), { status: 400 });
    }

    // If setting as default, unset any existing default
    if (data.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { 
          userId: session.user.id,
          isDefault: true,
          deletedAt: null
        },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: session.user.id,
        type: data.type,
        isDefault: data.isDefault || false,
        lastFour: data.lastFour,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        cardBrand: data.cardBrand,
        bankName: data.bankName,
        accountHolderName: data.accountHolderName,
        email: data.email,
        provider: data.provider,
        providerId: data.providerId,
        metadata: data.metadata as any,
      },
    });

    const response: PaymentMethodResponse = {
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

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear el método de pago:', error);
    return json(errors.internalServerError('Error al crear el método de pago'), { status: 500 });
  }
};
