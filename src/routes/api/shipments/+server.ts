import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

type ShipStatus = 'PENDING' | 'LABEL_CREATED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED_ATTEMPT' | 'AVAILABLE_FOR_PICKUP' | 'RETURN_TO_SENDER' | 'EXCEPTION' | 'CANCELED';

interface ShipmentResponse {
  id: string;
  orderId: string;
  status: ShipStatus;
  carrier?: string | null;
  trackingCode?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  fromAddress?: any | null;
  toAddress?: any | null;
  createdAt: string;
  updatedAt: string;
}

// Get all shipments with filtering and pagination
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para ver los envíos'), { status: 401 });
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;
    
    const status = url.searchParams.get('status') as ShipStatus | null;
    const carrier = url.searchParams.get('carrier');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const orderBy = url.searchParams.get('orderBy') || 'createdAt';
    const order = url.searchParams.get('order') || 'desc';

    // Build where clause
    const where: any = {
      order: {
        OR: [
          { buyerId: session.user.id },
          { store: { sellerId: session.user.id } },
        ]
      }
    };

    if (status) where.status = status;
    if (carrier) where.carrier = { contains: carrier, mode: 'insensitive' };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1); // Include the entire end date
        where.createdAt.lte = end;
      }
    }

    // Get total count for pagination
    const total = await prisma.shipment.count({ where });

    // Get shipments with pagination
    const shipments = await prisma.shipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderBy]: order },
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

    // Format response
    const response = {
      items: shipments.map(shipment => ({
        id: shipment.id,
        orderId: shipment.orderId,
        orderNumber: shipment.order.orderNumber,
        status: shipment.status,
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
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener los envíos:', error);
    return json(errors.internalServerError('Error al obtener los envíos'), { status: 500 });
  }
};

// Create a new shipment
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para crear un envío'), { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.orderId) {
      return json(errors.badRequest('El ID de la orden es requerido'), { status: 400 });
    }

    // Check if order exists and user has permission
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        OR: [
          { buyerId: session.user.id },
          { store: { sellerId: session.user.id } },
        ],
      },
      select: { id: true, status: true },
    });

    if (!order) {
      return json(errors.notFound('Orden no encontrada o no tienes permiso'), { status: 404 });
    }

    // Check if shipment already exists for this order
    const existingShipment = await prisma.shipment.findUnique({
      where: { orderId: data.orderId },
    });

    if (existingShipment) {
      return json(errors.badRequest('Ya existe un envío para esta orden'), { status: 400 });
    }

    // Create shipment
    const shipment = await prisma.shipment.create({
      data: {
        orderId: data.orderId,
        status: data.status || 'PENDING',
        carrier: data.carrier || null,
        trackingCode: data.trackingCode || null,
        fromAddressId: data.fromAddressId || null,
        toAddressId: data.toAddressId || null,
      },
      include: {
        fromAddress: true,
        toAddress: true,
      },
    });

    // Update order status if this is the first shipment
    if (order.status === 'PAID') {
      await prisma.order.update({
        where: { id: data.orderId },
        data: { status: 'PROCESSING' },
      });
    }

    // Format response
    const response: ShipmentResponse = {
      id: shipment.id,
      orderId: shipment.orderId,
      status: shipment.status as ShipStatus,
      carrier: shipment.carrier,
      trackingCode: shipment.trackingCode,
      shippedAt: shipment.shippedAt?.toISOString() || null,
      deliveredAt: shipment.deliveredAt?.toISOString() || null,
      fromAddress: shipment.fromAddress,
      toAddress: shipment.toAddress,
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString(),
    };

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear el envío:', error);
    return json(errors.internalServerError('Error al crear el envío'), { status: 500 });
  }
};
