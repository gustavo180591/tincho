import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type CartResponse = {
  id: string;
  userId: string | null;
  currency: string;
  items: Array<{
    id: string;
    skuId: string;
    qty: number;
    priceAt: number;
    sku: {
      id: string;
      code: string | null;
      product: {
        id: string;
        name: string;
        slug: string;
        images: Array<{
          url: string;
          alt: string | null;
        }>;
      };
      variantValues: any;
      price: number;
    };
  }>;
  subtotal: number;
  totalItems: number;
  updatedAt: string;
};

// Get or create cart
export const GET: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;

    // Find or create cart
    let cart = await prisma.cart.findFirst({
      where: { userId: userId || null },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    images: {
                      take: 1,
                      orderBy: { position: 'asc' },
                      select: {
                        url: true,
                        alt: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Create new cart if none exists
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: userId || null,
          currency: 'USD', // Default currency, can be changed based on user's location
        },
        include: {
          items: {
            include: {
              sku: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      images: {
                        take: 1,
                        orderBy: { position: 'asc' },
                        select: {
                          url: true,
                          alt: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Calculate subtotal and total items
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.priceAt) * item.qty,
      0
    );
    const totalItems = cart.items.reduce((sum, item) => sum + item.qty, 0);

    // Transform the response
    const response: CartResponse = {
      id: cart.id,
      userId: cart.userId,
      currency: cart.currency,
      items: cart.items.map((item) => ({
        id: item.id,
        skuId: item.skuId,
        qty: item.qty,
        priceAt: Number(item.priceAt),
        sku: {
          id: item.sku.id,
          code: item.sku.code,
          variantValues: item.sku.variantValues,
          price: Number(item.sku.priceAmount),
          product: {
            id: item.sku.product.id,
            name: item.sku.product.name,
            slug: item.sku.product.slug,
            images: item.sku.product.images,
          },
        },
      })),
      subtotal,
      totalItems,
      updatedAt: cart.updatedAt.toISOString(),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener el carrito:', error);
    return json(errors.internalServerError('Error al obtener el carrito'), { status: 500 });
  }
};

// Checkout
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return json(errors.unauthorized('Debe iniciar sesión para realizar el checkout'), { status: 401 });
    }

    const data = await request.json();
    const { cartId, shippingAddressId, billingAddressId, paymentMethod } = data;

    // Validate required fields
    if (!cartId || !shippingAddressId || !billingAddressId || !paymentMethod) {
      return json(errors.badRequest('Faltan campos requeridos'), { status: 400 });
    }

    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            sku: true,
          },
        },
      },
    });

    if (!cart) {
      return json(errors.notFound('Carrito no encontrado'), { status: 404 });
    }

    if (cart.items.length === 0) {
      return json(errors.badRequest('El carrito está vacío'), { status: 400 });
    }

    // Verify addresses belong to user
    const [shippingAddress, billingAddress] = await Promise.all([
      prisma.address.findUnique({
        where: { id: shippingAddressId, userId },
      }),
      prisma.address.findUnique({
        where: { id: billingAddressId, userId },
      }),
    ]);

    if (!shippingAddress || !billingAddress) {
      return json(errors.badRequest('Dirección no válida'), { status: 400 });
    }

    // Check stock and calculate totals
    let subtotal = 0;
    let totalItems = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const sku = await prisma.sku.findUnique({
        where: { id: item.skuId },
        include: {
          inventories: true,
        },
      });

      if (!sku) {
        return json(errors.badRequest(`SKU ${item.skuId} no encontrado`), { status: 400 });
      }

      const totalStock = sku.inventories.reduce((sum, inv) => sum + inv.stock, 0);
      if (totalStock < item.qty) {
        return json(
          errors.badRequest(`No hay suficiente stock para el producto ${sku.code || sku.id}`),
          { status: 400 }
        );
      }

      const itemTotal = Number(item.priceAt) * item.qty;
      subtotal += itemTotal;
      totalItems += item.qty;

      orderItems.push({
        skuId: item.skuId,
        productId: item.sku.productId,
        qty: item.qty,
        unitPrice: item.priceAt,
        lineTotal: itemTotal,
      });
    }

    // Calculate shipping and taxes (simplified)
    const shippingCost = 10; // This would be calculated based on address, weight, etc.
    const taxRate = 0.1; // 10% tax rate (simplified)
    const taxAmount = subtotal * taxRate;
    const total = subtotal + shippingCost + taxAmount;

    // Create order in a transaction
    const order = await prisma.$transaction(async (prisma) => {
      // Create order
      const newOrder = await prisma.order.create({
        data: {
          userId,
          storeId: cart.items[0].sku.product.storeId, // Assuming all items are from the same store
          status: 'PENDING',
          subtotal: subtotal,
          shippingCost: shippingCost,
          taxAmount: taxAmount,
          total: total,
          shippingAddress: shippingAddress.street,
          shippingCityId: shippingAddress.cityId,
          billingAddress: billingAddress.street,
          billingCityId: billingAddress.cityId,
          items: {
            create: orderItems,
          },
        },
      });

      // Update inventory
      for (const item of cart.items) {
        // This is a simplified version - in a real app, you'd need to handle
        // inventory locations, backorders, etc.
        await prisma.inventory.updateMany({
          where: {
            skuId: item.skuId,
            stock: { gte: item.qty },
          },
          data: {
            stock: { decrement: item.qty },
          },
        });
      }

      // Clear the cart
      await prisma.cartItem.deleteMany({
        where: { cartId },
      });

      return newOrder;
    });

    // Process payment (simplified)
    // In a real app, you'd integrate with a payment provider here
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        currency: cart.currency,
        method: paymentMethod,
        status: 'PENDING',
      },
    });

    // In a real app, you'd redirect to a payment provider or process the payment
    // For now, we'll just return the order and payment details
    return json(
      success({
        orderId: order.id,
        paymentId: payment.id,
        amount: total,
        currency: cart.currency,
        status: 'PENDING_PAYMENT',
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en el proceso de checkout:', error);
    return json(errors.internalServerError('Error en el proceso de checkout'), { status: 500 });
  }
};
