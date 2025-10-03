import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type OrderItemResponse = {
  id: string;
  orderId: string;
  skuId: string;
  productId: string;
  productName: string;
  productSlug: string;
  skuCode: string | null;
  variantValues: any;
  quantity: number;
  price: number;
  total: number;
  image?: string;
  status: string;
  returnStatus?: string;
  returnReason?: string;
  refundAmount?: number;
  returnNotes?: string;
  returnCreatedAt?: string;
  orderStatus: string;
  orderNumber: string;
  orderCreatedAt: string;
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
  createdAt: string;
  updatedAt: string;
};

// Get a specific order item by ID
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    const orderItemId = params.id;

    if (!orderItemId) {
      return json(errors.badRequest('Se requiere un ID de ítem de orden'), { status: 400 });
    }

    // Get the order item with related data
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
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
          },
        },
        sku: {
          select: {
            id: true,
            code: true,
            variantValues: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  take: 1,
                  orderBy: { position: 'asc' },
                  select: { url: true },
                },
              },
            },
          },
        },
        returns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!orderItem) {
      return json(errors.notFound('Ítem de orden no encontrado'), { status: 404 });
    }

    // Check if the user is authorized to view this order item
    if (session?.user) {
      const isAdmin = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      }).then(user => user?.isAdmin) || false;

      const isOrderOwner = orderItem.order.user.id === session.user.id;
      const isStoreStaff = await prisma.storeUser.findFirst({
        where: {
          storeId: orderItem.order.store.id,
          userId: session.user.id,
          role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
        },
      }).then(storeUser => !!storeUser);

      if (!isAdmin && !isOrderOwner && !isStoreStaff) {
        return json(errors.forbidden('No tienes permiso para ver este ítem de orden'), { status: 403 });
      }
    } else {
      return json(errors.unauthorized('Debe iniciar sesión para ver este ítem de orden'), { status: 401 });
    }

    const latestReturn = orderItem.returns[0];

    // Transform the response
    const response: OrderItemResponse = {
      id: orderItem.id,
      orderId: orderItem.orderId,
      skuId: orderItem.skuId,
      productId: orderItem.productId,
      productName: orderItem.sku.product.name,
      productSlug: orderItem.sku.product.slug,
      skuCode: orderItem.sku.code,
      variantValues: orderItem.sku.variantValues,
      quantity: orderItem.quantity,
      price: Number(orderItem.price),
      total: Number(orderItem.total),
      image: orderItem.sku.product.images[0]?.url,
      status: orderItem.status,
      returnStatus: latestReturn?.status,
      returnReason: latestReturn?.reason,
      refundAmount: latestReturn?.refundAmount ? Number(latestReturn.refundAmount) : undefined,
      returnNotes: latestReturn?.notes,
      returnCreatedAt: latestReturn?.createdAt.toISOString(),
      orderStatus: orderItem.order.status,
      orderNumber: orderItem.order.orderNumber,
      orderCreatedAt: orderItem.order.createdAt.toISOString(),
      customer: {
        id: orderItem.order.user.id,
        name: orderItem.order.user.name || '',
        email: orderItem.order.user.email || '',
      },
      store: {
        id: orderItem.order.store.id,
        name: orderItem.order.store.name,
        logo: orderItem.order.store.logo || undefined,
      },
      createdAt: orderItem.createdAt.toISOString(),
      updatedAt: orderItem.updatedAt.toISOString(),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener el ítem de orden:', error);
    return json(errors.internalServerError('Error al obtener el ítem de orden'), { status: 500 });
  }
};
