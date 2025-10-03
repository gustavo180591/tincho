import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

type UpdateStatusRequest = {
  status: OrderStatus;
  notes?: string;
  notifyCustomer?: boolean;
  trackingNumber?: string;
  trackingUrl?: string;
};

type StatusUpdateResponse = {
  id: string;
  orderId: string;
  status: OrderStatus;
  previousStatus: string | null;
  notes: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

// Update order status
export const POST: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.getSession();
    const orderId = params.orderId;

    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para actualizar el estado de la orden'), { status: 401 });
    }

    if (!orderId) {
      return json(errors.badRequest('Se requiere un ID de orden'), { status: 400 });
    }

    const data: UpdateStatusRequest = await request.json();
    const { status, notes, notifyCustomer = true, trackingNumber, trackingUrl } = data;

    // Validate required fields
    if (!status) {
      return json(errors.badRequest('El estado es requerido'), { status: 400 });
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        storeId: true,
        userId: true,
        orderNumber: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return json(errors.notFound('Orden no encontrada'), { status: 404 });
    }

    // Check if the user has permission to update this order
    const isAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    }).then(user => user?.isAdmin) || false;

    const isOrderOwner = order.userId === session.user.id;
    const isStoreStaff = await prisma.storeUser.findFirst({
      where: {
        storeId: order.storeId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
      },
    }).then(storeUser => !!storeUser);

    if (!isAdmin && !isOrderOwner && !isStoreStaff) {
      return json(errors.forbidden('No tienes permiso para actualizar esta orden'), { status: 403 });
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'RETURNED'],
      DELIVERED: ['RETURNED', 'REFUNDED'],
      CANCELLED: [],
      RETURNED: ['REFUNDED'],
      REFUNDED: [],
    };

    const currentStatus = order.status as string;
    const allowedTransitions = validTransitions[currentStatus] || [];

    if (status !== currentStatus && !allowedTransitions.includes(status)) {
      return json(
        errors.badRequest(`No se puede cambiar el estado de ${currentStatus} a ${status}. Transiciones permitidas: ${allowedTransitions.join(', ') || 'ninguna'}`),
        { status: 400 }
      );
    }

    // Update order status in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update order
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          trackingNumber: trackingNumber !== undefined ? trackingNumber : undefined,
          trackingUrl: trackingUrl !== undefined ? trackingUrl : undefined,
        },
      });

      // Add to order history
      const statusUpdate = await prisma.orderHistory.create({
        data: {
          orderId,
          status,
          notes: notes || `Estado cambiado a ${status}`,
          userId: session.user.id,
          trackingNumber: trackingNumber || null,
          trackingUrl: trackingUrl || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // If order is cancelled or refunded, restock items
      if ((status === 'CANCELLED' || status === 'REFUNDED') && currentStatus !== 'CANCELLED' && currentStatus !== 'REFUNDED') {
        const items = await prisma.orderItem.findMany({
          where: { orderId },
          select: {
            skuId: true,
            quantity: true,
          },
        });

        for (const item of items) {
          // Find the first inventory with the SKU
          const inventory = await prisma.inventory.findFirst({
            where: { skuId: item.skuId },
          });

          if (inventory) {
            // Update inventory
            await prisma.inventory.update({
              where: { id: inventory.id },
              data: { stock: { increment: item.quantity } },
            });

            // Record inventory transaction
            await prisma.inventoryTransaction.create({
              data: {
                inventoryId: inventory.id,
                orderId,
                quantity: item.quantity,
                type: status === 'CANCELLED' ? 'CANCELLATION' : 'RETURN',
                notes: `Orden ${status === 'CANCELLED' ? 'cancelada' : 'reembolsada'} - ${notes || 'Sin notas'}`,
              },
            });
          }
        }
      }

      // In a real app, you would send notifications here
      // e.g., email to customer, notification to store owner, etc.
      if (notifyCustomer && order.user) {
        // This is a placeholder for the notification logic
        console.log(`Notifying customer ${order.user.email} about order ${order.orderNumber} status change to ${status}`);
        
        // Example of what you might do:
        // await sendOrderStatusUpdateEmail({
        //   to: order.user.email,
        //   orderNumber: order.orderNumber,
        //   status: status,
        //   trackingNumber: trackingNumber,
        //   trackingUrl: trackingUrl,
        //   notes: notes,
        // });
      }

      return {
        id: statusUpdate.id,
        orderId: statusUpdate.orderId,
        status: statusUpdate.status as OrderStatus,
        previousStatus: currentStatus,
        notes: statusUpdate.notes,
        userId: statusUpdate.userId,
        userName: statusUpdate.user?.name || null,
        userEmail: statusUpdate.user?.email || null,
        trackingNumber: statusUpdate.trackingNumber,
        trackingUrl: statusUpdate.trackingUrl,
        createdAt: statusUpdate.createdAt.toISOString(),
        updatedAt: statusUpdate.updatedAt.toISOString(),
      };
    });

    return json(success(result));
  } catch (error) {
    console.error('Error al actualizar el estado de la orden:', error);
    return json(errors.internalServerError('Error al actualizar el estado de la orden'), { status: 500 });
  }
};
