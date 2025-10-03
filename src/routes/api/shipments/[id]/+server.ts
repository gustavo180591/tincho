import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

type ShipStatus = 'PENDING' | 'LABEL_CREATED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED_ATTEMPT' | 'AVAILABLE_FOR_PICKUP' | 'RETURN_TO_SENDER' | 'EXCEPTION' | 'CANCELED';

// Get shipment by ID
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para ver este envío'), { status: 401 });
    }

    const shipment = await prisma.shipment.findFirst({
      where: {
        id: params.id,
        OR: [
          { order: { buyerId: session.user.id } },
          { order: { store: { sellerId: session.user.id } } },
        ],
      },
      include: {
        fromAddress: true,
        toAddress: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            store: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      return json(errors.notFound('Envío no encontrado o no tienes permiso'), { status: 404 });
    }

    // Format response
    const response = {
      id: shipment.id,
      orderId: shipment.orderId,
      orderNumber: shipment.order.orderNumber,
      status: shipment.status as ShipStatus,
      carrier: shipment.carrier,
      trackingCode: shipment.trackingCode,
      shippedAt: shipment.shippedAt?.toISOString() || null,
      deliveredAt: shipment.deliveredAt?.toISOString() || null,
      fromAddress: shipment.fromAddress,
      toAddress: shipment.toAddress,
      store: shipment.order.store,
      orderStatus: shipment.order.status,
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString(),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener el envío:', error);
    return json(errors.internalServerError('Error al obtener el envío'), { status: 500 });
  }
};

// Update shipment
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para actualizar este envío'), { status: 401 });
    }

    const data = await request.json();
    
    // Check if shipment exists and user has permission
    const existingShipment = await prisma.shipment.findFirst({
      where: {
        id: params.id,
        OR: [
          { order: { buyerId: session.user.id } },
          { order: { store: { sellerId: session.user.id } } },
        ],
      },
      include: {
        order: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!existingShipment) {
      return json(errors.notFound('Envío no encontrado o no tienes permiso'), { status: 404 });
    }

    // Only allow certain fields to be updated
    const updateData: any = {};
    if (data.carrier !== undefined) updateData.carrier = data.carrier;
    if (data.trackingCode !== undefined) updateData.trackingCode = data.trackingCode;
    if (data.fromAddressId !== undefined) updateData.fromAddressId = data.fromAddressId;
    if (data.toAddressId !== undefined) updateData.toAddressId = data.toAddressId;

    // Update shipment
    const updatedShipment = await prisma.shipment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        fromAddress: true,
        toAddress: true,
      },
    });

    // Format response
    const response = {
      id: updatedShipment.id,
      orderId: updatedShipment.orderId,
      status: updatedShipment.status as ShipStatus,
      carrier: updatedShipment.carrier,
      trackingCode: updatedShipment.trackingCode,
      shippedAt: updatedShipment.shippedAt?.toISOString() || null,
      deliveredAt: updatedShipment.deliveredAt?.toISOString() || null,
      fromAddress: updatedShipment.fromAddress,
      toAddress: updatedShipment.toAddress,
      createdAt: updatedShipment.createdAt.toISOString(),
      updatedAt: updatedShipment.updatedAt.toISOString(),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al actualizar el envío:', error);
    return json(errors.internalServerError('Error al actualizar el envío'), { status: 500 });
  }
};
