import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

type ReturnStatus = 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

interface ReturnResponse {
  id: string;
  orderItemId: string;
  status: ReturnStatus;
  reason?: string;
  notes?: string;
  refundAmount?: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  orderItem: {
    id: string;
    price: string;
    quantity: number;
    product: {
      id: string;
      title: string;
      slug: string;
      images: Array<{ url: string }>;
    };
    variant?: {
      id: string;
      sku: string;
      attributes: any;
    } | null;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
  };
}

// Get all returns with filtering and pagination
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para ver las devoluciones'), { status: 401 });
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;
    
    const status = url.searchParams.get('status') as ReturnStatus | null;
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const orderBy = url.searchParams.get('orderBy') || 'createdAt';
    const order = url.searchParams.get('order') || 'desc';

    // Build where clause
    const where: any = {
      OR: [
        { orderItem: { order: { buyerId: session.user.id } } },
        { orderItem: { order: { store: { sellerId: session.user.id } } },
      ]
    };

    if (status) where.status = status;
    
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
    const total = await prisma.returnRequest.count({ where });

    // Get returns with pagination
    const returns = await prisma.returnRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderBy]: order },
      include: {
        orderItem: {
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
        },
      },
    });

    // Format response
    const response = {
      items: returns.map(ret => ({
        id: ret.id,
        orderItemId: ret.orderItemId,
        status: ret.status as ReturnStatus,
        reason: ret.reason || null,
        notes: ret.notes || null,
        refundAmount: ret.orderItem.price.toString(),
        quantity: ret.quantity || ret.orderItem.quantity,
        createdAt: ret.createdAt.toISOString(),
        updatedAt: ret.updatedAt.toISOString(),
        orderItem: {
          id: ret.orderItem.id,
          price: ret.orderItem.price.toString(),
          quantity: ret.orderItem.quantity,
          product: {
            id: ret.orderItem.product.id,
            title: ret.orderItem.product.title,
            slug: ret.orderItem.product.slug,
            image: ret.orderItem.product.images[0]?.url || null,
          },
          variant: ret.orderItem.variant ? {
            id: ret.orderItem.variant.id,
            sku: ret.orderItem.variant.sku,
            attributes: ret.orderItem.variant.attributes,
          } : null,
        },
        order: {
          id: ret.orderItem.order.id,
          orderNumber: ret.orderItem.order.orderNumber,
          status: ret.orderItem.order.status,
          store: ret.orderItem.order.store,
        },
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
    console.error('Error al obtener las devoluciones:', error);
    return json(errors.internalServerError('Error al obtener las devoluciones'), { status: 500 });
  }
};

// Create a new return request
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para crear una devolución'), { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.orderItemId) {
      return json(errors.badRequest('El ID del ítem de la orden es requerido'), { status: 400 });
    }

    // Check if order item exists and belongs to user
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: data.orderItemId,
        order: { buyerId: session.user.id },
      },
      include: {
        product: {
          select: {
            id: true,
            returnPolicy: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!orderItem) {
      return json(errors.notFound('Ítem de orden no encontrado o no tienes permiso'), { status: 404 });
    }

    // Check if return is allowed based on order status and return policy
    const returnWindowDays = orderItem.product.returnPolicy?.returnWindowDays || 30;
    const returnDeadline = new Date(orderItem.order.createdAt);
    returnDeadline.setDate(returnDeadline.getDate() + returnWindowDays);

    if (new Date() > returnDeadline) {
      return json(errors.badRequest('El período de devolución ha expirado'), { status: 400 });
    }

    // Check if return already exists for this order item
    const existingReturn = await prisma.returnRequest.findFirst({
      where: { orderItemId: data.orderItemId },
    });

    if (existingReturn) {
      return json(errors.badRequest('Ya existe una solicitud de devolución para este ítem'), { status: 400 });
    }

    // Create return request
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderItemId: data.orderItemId,
        status: 'REQUESTED',
        reason: data.reason || null,
        notes: data.notes || null,
        quantity: data.quantity || orderItem.quantity,
      },
      include: {
        orderItem: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                images: {
                  take: 1,
                  select: { url: true },
                  orderBy: { position: 'asc' },
                },
              },
            },
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
    });

    // Format response
    const response: ReturnResponse = {
      id: returnRequest.id,
      orderItemId: returnRequest.orderItemId,
      status: returnRequest.status as ReturnStatus,
      reason: returnRequest.reason || undefined,
      notes: returnRequest.notes || undefined,
      refundAmount: returnRequest.orderItem.price.toString(),
      quantity: returnRequest.quantity || returnRequest.orderItem.quantity,
      createdAt: returnRequest.createdAt.toISOString(),
      updatedAt: returnRequest.updatedAt.toISOString(),
      orderItem: {
        id: returnRequest.orderItem.id,
        price: returnRequest.orderItem.price.toString(),
        quantity: returnRequest.orderItem.quantity,
        product: {
          id: returnRequest.orderItem.product.id,
          title: returnRequest.orderItem.product.title,
          slug: returnRequest.orderItem.product.slug || '',
          images: returnRequest.orderItem.product.images.map(img => ({ url: img.url })),
        },
        variant: null, // Will be populated if needed
      },
      order: {
        id: returnRequest.orderItem.order.id,
        orderNumber: returnRequest.orderItem.order.orderNumber,
        status: returnRequest.orderItem.order.status,
      },
    };

    // TODO: Send notification to seller

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear la solicitud de devolución:', error);
    return json(errors.internalServerError('Error al crear la solicitud de devolución'), { status: 500 });
  }
};
