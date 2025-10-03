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
  returnReason?: string;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
};

// Get all items for a specific order
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    const orderId = params.orderId;

    if (!orderId) {
      return json(errors.badRequest('Se requiere un ID de orden'), { status: 400 });
    }

    // Get the order to check permissions
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        storeId: true,
      },
    });

    if (!order) {
      return json(errors.notFound('Orden no encontrada'), { status: 404 });
    }

    // Check if the user is authorized to view these order items
    if (session?.user) {
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
        return json(errors.forbidden('No tienes permiso para ver los ítems de esta orden'), { status: 403 });
      }
    } else {
      return json(errors.unauthorized('Debe iniciar sesión para ver los ítems de la orden'), { status: 401 });
    }

    // Get all order items with product and SKU details
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId },
      include: {
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
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform the response
    const response: OrderItemResponse[] = orderItems.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      skuId: item.skuId,
      productId: item.productId,
      productName: item.sku.product.name,
      productSlug: item.sku.product.slug,
      skuCode: item.sku.code,
      variantValues: item.sku.variantValues,
      quantity: item.quantity,
      price: Number(item.price),
      total: Number(item.total),
      image: item.sku.product.images[0]?.url,
      status: item.status,
      returnReason: item.returns[0]?.reason,
      refundAmount: item.returns[0]?.refundAmount ? Number(item.returns[0].refundAmount) : undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener los ítems de la orden:', error);
    return json(errors.internalServerError('Error al obtener los ítems de la orden'), { status: 500 });
  }
};
