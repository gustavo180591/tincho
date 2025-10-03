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
};

// List all orders (admin only)
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para ver las órdenes'), { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return json(errors.forbidden('No tienes permiso para ver todas las órdenes'), { status: 403 });
    }

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filters
    const status = url.searchParams.get('status') as OrderStatus | null;
    const storeId = url.searchParams.get('storeId');
    const userId = url.searchParams.get('userId');
    const orderNumber = url.searchParams.get('orderNumber');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build where clause
    const where: any = {};
    
    if (status) where.status = status;
    if (storeId) where.storeId = storeId;
    if (userId) where.userId = userId;
    if (orderNumber) where.orderNumber = { contains: orderNumber, mode: 'insensitive' };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
                select: {
                  code: true,
                  variantValues: true,
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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Transform the response
    const response = {
      items: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
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
        items: order.items.map((item) => ({
          id: item.id,
          skuId: item.skuId,
          productId: item.productId,
          productName: item.sku.product.name,
          skuCode: item.sku.code,
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
    console.error('Error al obtener las órdenes:', error);
    return json(errors.internalServerError('Error al obtener las órdenes'), { status: 500 });
  }
};

// Create a new order (used by admins or for manual order creation)
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user) {
      return json(errors.unauthorized('Debe iniciar sesión para crear una orden'), { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return json(errors.forbidden('No tienes permiso para crear órdenes manualmente'), { status: 403 });
    }

    const data = await request.json();
    const {
      userId,
      storeId,
      items,
      shippingAddress,
      billingAddress,
      shippingMethod = 'standard',
      paymentMethod = 'manual',
      notes,
    } = data;

    // Validate required fields
    if (!userId || !storeId || !items || !Array.isArray(items) || items.length === 0) {
      return json(errors.badRequest('Se requieren userId, storeId y al menos un ítem'), { status: 400 });
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!userExists) {
      return json(errors.badRequest('El usuario especificado no existe'), { status: 400 });
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true },
    });

    if (!store) {
      return json(errors.badRequest('La tienda especificada no existe'), { status: 400 });
    }

    // Process items and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const { skuId, quantity } = item;

      if (!skuId || !quantity || quantity <= 0) {
        return json(errors.badRequest('Cada ítem debe tener un skuId y una cantidad válida'), { status: 400 });
      }

      // Get SKU details
      const sku = await prisma.sku.findUnique({
        where: { id: skuId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              priceAmount: true,
            },
          },
          inventories: true,
        },
      });

      if (!sku) {
        return json(errors.badRequest(`SKU ${skuId} no encontrado`), { status: 400 });
      }

      // Check stock
      const totalStock = sku.inventories.reduce((sum, inv) => sum + inv.stock, 0);
      if (totalStock < quantity) {
        return json(
          errors.badRequest(`No hay suficiente stock para el producto ${sku.product.name}. Disponible: ${totalStock}`),
          { status: 400 }
        );
      }

      const price = Number(sku.priceAmount);
      const itemTotal = price * quantity;
      subtotal += itemTotal;

      orderItems.push({
        skuId,
        productId: sku.productId,
        quantity,
        price,
        total: itemTotal,
      });
    }

    // Calculate shipping cost and tax
    const shippingCost = 0; // Calculate based on shipping method
    const taxRate = 0.1; // 10% tax rate
    const taxAmount = subtotal * taxRate;
    const total = subtotal + shippingCost + taxAmount;

    // Generate order number
    const now = new Date();
    const orderNumber = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Create order in a transaction
    const order = await prisma.$transaction(async (prisma) => {
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount: total,
          currency: 'USD',
          status: 'COMPLETED',
          paymentMethod: paymentMethod,
          paymentMethodType: paymentMethod,
        },
      });

      // Create order
      const newOrder = await prisma.order.create({
        data: {
          userId,
          storeId,
          orderNumber,
          status: 'PROCESSING',
          subtotal,
          shippingCost,
          taxAmount,
          total,
          currency: 'USD',
          shippingMethod,
          notes,
          paymentId: payment.id,
          // Shipping address
          shippingFirstName: shippingAddress?.firstName || '',
          shippingLastName: shippingAddress?.lastName || '',
          shippingAddress: shippingAddress?.address || '',
          shippingCity: shippingAddress?.city ? { connect: { name: shippingAddress.city } } : undefined,
          shippingPostalCode: shippingAddress?.postalCode || '',
          shippingPhone: shippingAddress?.phone || '',
          // Billing address (default to shipping address if not provided)
          billingFirstName: billingAddress?.firstName || shippingAddress?.firstName || '',
          billingLastName: billingAddress?.lastName || shippingAddress?.lastName || '',
          billingAddress: billingAddress?.address || shippingAddress?.address || '',
          billingCity: billingAddress?.city ? { connect: { name: billingAddress.city } } : 
                     (shippingAddress?.city ? { connect: { name: shippingAddress.city } } : undefined),
          billingPostalCode: billingAddress?.postalCode || shippingAddress?.postalCode || '',
          billingPhone: billingAddress?.phone || shippingAddress?.phone || '',
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              sku: {
                include: {
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Update inventory
      for (const item of orderItems) {
        // Find inventory with enough stock
        const inventory = await prisma.inventory.findFirst({
          where: {
            skuId: item.skuId,
            stock: { gte: item.quantity },
          },
          orderBy: { stock: 'desc' },
        });

        if (!inventory) {
          throw new Error(`No hay suficiente stock para el SKU ${item.skuId}`);
        }

        // Update inventory
        await prisma.inventory.update({
          where: { id: inventory.id },
          data: { stock: { decrement: item.quantity } },
        });

        // Record inventory transaction
        await prisma.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            orderId: newOrder.id,
            quantity: -item.quantity,
            type: 'SALE',
            notes: `Vendido en orden ${newOrder.orderNumber}`,
          },
        });
      }

      return newOrder;
    });

    // Get the full order with relations for the response
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
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
      },
    });

    if (!fullOrder) {
      throw new Error('Error al recuperar la orden recién creada');
    }

    // Prepare response
    const response: OrderResponse = {
      id: fullOrder.id,
      orderNumber: fullOrder.orderNumber,
      status: fullOrder.status as OrderStatus,
      subtotal: Number(fullOrder.subtotal),
      shippingCost: Number(fullOrder.shippingCost),
      taxAmount: Number(fullOrder.taxAmount),
      total: Number(fullOrder.total),
      currency: fullOrder.currency,
      createdAt: fullOrder.createdAt.toISOString(),
      updatedAt: fullOrder.updatedAt.toISOString(),
      estimatedDelivery: fullOrder.estimatedDelivery || undefined,
      trackingNumber: fullOrder.trackingNumber || undefined,
      trackingUrl: fullOrder.trackingUrl || undefined,
      notes: fullOrder.notes || undefined,
      customer: {
        id: fullOrder.user.id,
        name: fullOrder.user.name || '',
        email: fullOrder.user.email || '',
      },
      store: {
        id: fullOrder.store.id,
        name: fullOrder.store.name,
        logo: fullOrder.store.logo || undefined,
      },
      shippingAddress: {
        firstName: fullOrder.shippingFirstName || '',
        lastName: fullOrder.shippingLastName || '',
        address: fullOrder.shippingAddress,
        city: fullOrder.shippingCity?.name || '',
        state: fullOrder.shippingCity?.state?.name || '',
        country: fullOrder.shippingCity?.state?.country?.name || '',
        postalCode: fullOrder.shippingPostalCode || '',
        phone: fullOrder.shippingPhone || undefined,
      },
      billingAddress: {
        firstName: fullOrder.billingFirstName || '',
        lastName: fullOrder.billingLastName || '',
        address: fullOrder.billingAddress,
        city: fullOrder.billingCity?.name || '',
        state: fullOrder.billingCity?.state?.name || '',
        country: fullOrder.billingCity?.state?.country?.name || '',
        postalCode: fullOrder.billingPostalCode || '',
        phone: fullOrder.billingPhone || undefined,
      },
      items: fullOrder.items.map((item) => ({
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
        id: fullOrder.payment?.id || '',
        status: fullOrder.payment?.status || 'PENDING',
        method: fullOrder.payment?.paymentMethodType || 'unknown',
        transactionId: fullOrder.payment?.transactionId || undefined,
        paidAt: fullOrder.payment?.paidAt?.toISOString() || undefined,
      },
    };

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear la orden:', error);
    return json(errors.internalServerError('Error al crear la orden'), { status: 500 });
  }
};
