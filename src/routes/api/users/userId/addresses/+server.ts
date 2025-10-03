import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/users/:id/addresses
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { userId } = params;

    // Verificar si el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return errors.notFound('User not found');
    }

    // Obtener las direcciones del usuario
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' }
    });

    return success({
      data: addresses
    });
  } catch (error) {
    console.error(`Error fetching addresses for user ${params.userId}:`, error);
    return errors.internalServerError('Error fetching addresses');
  }
};

// POST /api/users/:id/addresses
export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const { userId } = params;
    const data = await request.json();
    
    // Validar datos de entrada
    const { 
      street, 
      number, 
      city, 
      state, 
      postalCode, 
      country, 
      isDefault = false,
      additionalInfo 
    } = data;
    
    if (!street || !number || !city || !state || !postalCode || !country) {
      return errors.badRequest('Missing required address fields');
    }

    // Verificar si el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return errors.notFound('User not found');
    }

    // Si es la dirección por defecto, quitar el estado de las demás
    if (isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId,
          isDefault: true 
        },
        data: { isDefault: false }
      });
    }

    // Crear la nueva dirección
    const newAddress = await prisma.address.create({
      data: {
        street,
        number: String(number),
        city,
        state,
        postalCode,
        country,
        isDefault,
        additionalInfo: additionalInfo || null,
        user: {
          connect: { id: userId }
        }
      }
    });

    return success(newAddress, {}, 201);
  } catch (error) {
    console.error(`Error creating address for user ${params.userId}:`, error);
    return errors.internalServerError('Error creating address');
  }
};
