import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

type OrderItem = {
  id: string;
  skuId: string;
  productId: string;
  productName: string;
  skuCode: string | null;
  quantity: number;
  price: number;
  total: number;
  image?: string;
  variantValues?: any;
};

type OrderResponse = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
    logo?: string;
  };
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  items: OrderItem[];
  payment: {
    id: string;
    status: string;
    method: string;
    transactionId?: string;
    paidAt?: string;
  };
  history: Array<{
    status: OrderStatus;
    timestamp: string;
    notes?: string;
    userId?: string;
  }>;
};

// Get order by ID
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    const orderId = params.id;

    if (!orderId) {
      return json(errors.badRequest('Se requiere un ID de orden'), { status: 400 });
    }

    // Get the order with all relations
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        items: {
          include: {
            sku: {
              include: {
                product: {
                  select: {
                    name: true,
                    images: {
                      take: 1,
                      orderBy: { position: 'asc' },
                      select: { url: true },
                    },
                  },
                },
              },
            },
          },
        },
        payment: true,
        shippingCity: {
          include: {
            state: {
              include: {
                country: true,
              },
            },
          },
        },
        billingCity: {
          include: {
            state: {
              include: {
                country: true,
              },
            },
          },
        },
        history: {
          orderBy: { createdAt: 'asc' },
          select: {
            status: true,
            notes: true,
            createdAt: true,
            userId: true,
          },
        },
      },
    });

    if (!order) {
      return json(errors.notFound('Orden no encontrada'), { status: 404 });
    }

    // Check if the user has permission to view this order
    const isAdmin = session?.user ? await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    }).then(user => user?.isAdmin) : false;

    const isOrderOwner = order.userId === session?.user?.id;
    const isStoreOwner = session?.user ? await prisma.storeUser.findFirst({
      where: {
        storeId: order.storeId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
      },
    }).then(storeUser => !!storeUser) : false;

    if (!isAdmin && !isOrderOwner && !isStoreOwner) {
      return json(errors.forbidden('No tienes permiso para ver esta orden'), { status: 403 });
    }

    // Transform the response
    const response: OrderResponse = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status as OrderStatus,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      estimatedDelivery: order.estimatedDelivery || undefined,
      trackingNumber: order.trackingNumber || undefined,
      trackingUrl: order.trackingUrl || undefined,
      notes: order.notes || undefined,
      customer: {
        id: order.user.id,
        name: order.user.name || '',
        email: order.user.email || '',
      },
      store: {
        id: order.store.id,
        name: order.store.name,
        logo: order.store.logo || undefined,
      },
      shippingAddress: {
        firstName: order.shippingFirstName || '',
        lastName: order.shippingLastName || '',
        address: order.shippingAddress,
        city: order.shippingCity?.name || '',
        state: order.shippingCity?.state?.name || '',
        country: order.shippingCity?.state?.country?.name || '',
        postalCode: order.shippingPostalCode || '',
        phone: order.shippingPhone || undefined,
      },
      billingAddress: {
        firstName: order.billingFirstName || order.shippingFirstName || '',
        lastName: order.billingLastName || order.shippingLastName || '',
        address: order.billingAddress || order.shippingAddress,
        city: order.billingCity?.name || order.shippingCity?.name || '',
        state: order.billingCity?.state?.name || order.shippingCity?.state?.name || '',
        country: order.billingCity?.state?.country?.name || order.shippingCity?.state?.country?.name || '',
        postalCode: order.billingPostalCode || order.shippingPostalCode || '',
        phone: order.billingPhone || order.shippingPhone || undefined,
      },
      items: order.items.map((item) => ({
        id: item.id,
        skuId: item.skuId,
        productId: item.productId,
        productName: item.sku.product.name,
        skuCode: item.sku.code || null,
        quantity: item.quantity,
        price: Number(item.price),
        total: Number(item.total),
        image: item.sku.product.images[0]?.url,
        variantValues: item.sku.variantValues,
      })),
      payment: {
        id: order.payment?.id || '',
        status: order.payment?.status || 'PENDING',
        method: order.payment?.paymentMethodType || 'unknown',
        transactionId: order.payment?.transactionId || undefined,
        paidAt: order.payment?.paidAt?.toISOString() || undefined,
      },
      history: order.history.map((h) => ({
        status: h.status as OrderStatus,
        timestamp: h.createdAt.toISOString(),
        notes: h.notes || undefined,
        userId: h.userId || undefined,
      })),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener la orden:', error);
    return json(errors.internalServerError('Error al obtener la orden'), { status: 500 });
  }
};

// Update order status
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.getSession();
    const orderId = params.id;

    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para actualizar una orden'), { status: 401 });
    }

    if (!orderId) {
      return json(errors.badRequest('Se requiere un ID de orden'), { status: 400 });
    }

    const data = await request.json();
    const { status, notes, trackingNumber, trackingUrl } = data;

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
    const isStoreOwner = await prisma.storeUser.findFirst({
      where: {
        storeId: order.storeId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
      },
    }).then(storeUser => !!storeUser);

    if (!isAdmin && !isOrderOwner && !isStoreOwner) {
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
    const updatedOrder = await prisma.$transaction(async (prisma) => {
      // Update order
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          trackingNumber: trackingNumber !== undefined ? trackingNumber : undefined,
          trackingUrl: trackingUrl !== undefined ? trackingUrl : undefined,
        },
      });

      // Add to order history
      await prisma.orderHistory.create({
        data: {
          orderId,
          status,
          notes: notes || `Estado cambiado a ${status}`,
          userId: session.user.id,
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

      return updated;
    });

    // In a real app, you would send notifications here
    // e.g., email to customer, notification to store owner, etc.

    return json(success({ 
      id: updatedOrder.id,
      status: updatedOrder.status,
      updatedAt: updatedOrder.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error al actualizar el estado de la orden:', error);
    return json(errors.internalServerError('Error al actualizar el estado de la orden'), { status: 500 });
  }
};
