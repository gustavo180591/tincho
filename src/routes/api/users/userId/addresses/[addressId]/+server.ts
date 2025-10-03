import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/users/:id/addresses/:addressId
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { userId, addressId } = params;

    // Verificar si el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return errors.notFound('User not found');
    }

    // Obtener la dirección específica
    const address = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId 
      }
    });

    if (!address) {
      return errors.notFound('Address not found');
    }

    return success(address);
  } catch (error) {
    console.error(`Error fetching address ${params.addressId} for user ${params.userId}:`, error);
    return errors.internalServerError('Error fetching address');
  }
};

// PUT /api/users/:id/addresses/:addressId
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const { userId, addressId } = params;
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

    // Verificar si la dirección existe y pertenece al usuario
    const existingAddress = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId 
      }
    });

    if (!existingAddress) {
      return errors.notFound('Address not found');
    }

    // Si se está estableciendo como predeterminada, quitar el estado de las demás
    if (isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId,
          isDefault: true,
          id: { not: addressId }
        },
        data: { isDefault: false }
      });
    }

    // Actualizar la dirección
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
        street,
        number: String(number),
        city,
        state,
        postalCode,
        country,
        isDefault,
        additionalInfo: additionalInfo || null
      }
    });

    return success(updatedAddress);
  } catch (error) {
    console.error(`Error updating address ${params.addressId} for user ${params.userId}:`, error);
    return errors.internalServerError('Error updating address');
  }
};

// DELETE /api/users/:id/addresses/:addressId
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { userId, addressId } = params;

    // Verificar si el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return errors.notFound('User not found');
    }

    // Verificar si la dirección existe y pertenece al usuario
    const address = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId 
      }
    });

    if (!address) {
      return errors.notFound('Address not found');
    }

    // No permitir eliminar la dirección predeterminada si es la única
    if (address.isDefault) {
      const otherAddresses = await prisma.address.count({
        where: { 
          userId,
          id: { not: addressId },
          isDefault: false
        }
      });

      if (otherAddresses > 0) {
        // Hacer que la siguiente dirección sea la predeterminada
        const nextDefault = await prisma.address.findFirst({
          where: { 
            userId,
            id: { not: addressId }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        });

        if (nextDefault) {
          await prisma.address.update({
            where: { id: nextDefault.id },
            data: { isDefault: true }
          });
        }
      } else if (otherAddresses === 0) {
        return errors.badRequest('Cannot delete the only default address');
      }
    }

    // Eliminar la dirección
    await prisma.address.delete({
      where: { id: addressId }
    });

    return success({ success: true });
  } catch (error) {
    console.error(`Error deleting address ${params.addressId} for user ${params.userId}:`, error);
    return errors.internalServerError('Error deleting address');
  }
};
