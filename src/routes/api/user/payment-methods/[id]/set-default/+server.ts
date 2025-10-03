import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Set a payment method as default
export const POST: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para actualizar este método de pago'), { status: 401 });
    }

    // Start a transaction
    const [existingMethod, _] = await prisma.$transaction([
      // Get the payment method and verify it belongs to the user
      prisma.paymentMethod.findFirst({
        where: { 
          id: params.id,
          userId: session.user.id,
          deletedAt: null
        },
      }),
      
      // Unset any existing default payment method
      prisma.paymentMethod.updateMany({
        where: { 
          userId: session.user.id,
          isDefault: true,
          deletedAt: null,
          NOT: { id: params.id }
        },
        data: { isDefault: false },
      })
    ]);

    if (!existingMethod) {
      return json(errors.notFound('Método de pago no encontrado'), { status: 404 });
    }

    // If it's not already the default, update it
    if (!existingMethod.isDefault) {
      await prisma.paymentMethod.update({
        where: { id: params.id },
        data: { isDefault: true },
      });
    }

    return json(success({ success: true }));
  } catch (error) {
    console.error('Error al establecer el método de pago como predeterminado:', error);
    return json(errors.internalServerError('Error al actualizar el método de pago'), { status: 500 });
  }
};
