import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Delete an image
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const imageId = params.id;
    
    if (!imageId) {
      return json(errors.badRequest('ID de imagen no proporcionado'), { status: 400 });
    }

    // Check if image exists
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true },
    });

    if (!image) {
      return json(errors.notFound('Imagen no encontrada'), { status: 404 });
    }

    // Delete the image
    await prisma.productImage.delete({
      where: { id: imageId },
    });

    return json(success({ id: imageId, deleted: true }), { status: 200 });
  } catch (error) {
    console.error('Error al eliminar la imagen:', error);
    return json(errors.internalServerError('Error al eliminar la imagen'), { status: 500 });
  }
};

// Reorder images
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const imageId = params.id;
    
    if (!imageId) {
      return json(errors.badRequest('ID de imagen no proporcionado'), { status: 400 });
    }

    const data = await request.json();
    const { newPosition } = data;

    if (newPosition === undefined || newPosition === null) {
      return json(errors.badRequest('La nueva posición es requerida'), { status: 400 });
    }

    // Check if image exists and get current position
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true, position: true },
    });

    if (!image) {
      return json(errors.notFound('Imagen no encontrada'), { status: 404 });
    }

    const oldPosition = image.position;
    
    // If position hasn't changed, return success
    if (oldPosition === newPosition) {
      return json(success({ id: imageId, position: newPosition }), { status: 200 });
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Update the positions of other images
      if (newPosition > oldPosition) {
        // Moving down in the list (position increasing)
        await prisma.productImage.updateMany({
          where: {
            productId: image.productId,
            position: {
              gt: oldPosition,
              lte: newPosition,
            },
          },
          data: {
            position: { decrement: 1 },
          },
        });
      } else {
        // Moving up in the list (position decreasing)
        await prisma.productImage.updateMany({
          where: {
            productId: image.productId,
            position: {
              gte: newPosition,
              lt: oldPosition,
            },
          },
          data: {
            position: { increment: 1 },
          },
        });
      }

      // Update the image's position
      const updatedImage = await prisma.productImage.update({
        where: { id: imageId },
        data: { position: newPosition },
      });

      return updatedImage;
    });

    return json(
      success({
        id: result.id,
        position: result.position,
        productId: result.productId,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al reordenar las imágenes:', error);
    return json(errors.internalServerError('Error al reordenar las imágenes'), { status: 500 });
  }
};
