import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Get all items in a shipment
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para ver los ítems del envío'), { status: 401 });
    }

    const shipmentId = params.shipmentId;

    // Check if shipment exists and user has permission
    const shipment = await prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        OR: [
          { order: { buyerId: session.user.id } },
          { order: { store: { sellerId: session.user.id } } },
        ],
      },
      select: { id: true },
    });

    if (!shipment) {
      return json(errors.notFound('Envío no encontrado o no tienes permiso'), { status: 404 });
    }

    // Get all order items for the shipment's order
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          shipments: {
            some: { id: shipmentId }
          }
        }
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: {
              take: 1,
              select: { url: true },
              orderBy: { position: 'asc' },
            },
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            attributes: true,
          },
        },
      },
    });

    // Format response
    const response = orderItems.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price.toString(),
      product: {
        id: item.product.id,
        title: item.product.title,
        slug: item.product.slug,
        image: item.product.images[0]?.url || null,
      },
      variant: item.variant ? {
        id: item.variant.id,
        sku: item.variant.sku,
        attributes: item.variant.attributes,
      } : null,
    }));

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener los ítems del envío:', error);
    return json(errors.internalServerError('Error al obtener los ítems del envío'), { status: 500 });
  }
};
