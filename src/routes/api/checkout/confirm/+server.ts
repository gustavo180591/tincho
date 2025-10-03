import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type ConfirmCheckoutRequest = {
  cartId: string;
  shippingAddressId: string;
  billingAddressId: string;
  paymentId: string;
  shippingMethod: string;
  notes?: string;
  acceptTerms: boolean;
};

type ConfirmCheckoutResponse = {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  estimatedDelivery?: string;
  paymentStatus: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    image?: string;
  }>;
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
  paymentMethod: {
    id: string;
    type: string;
    last4?: string;
    brand?: string;
  };
  createdAt: string;
};

// Confirm checkout and create order
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return json(errors.unauthorized('Debe iniciar sesión para confirmar la compra'), { status: 401 });
    }

    const data: ConfirmCheckoutRequest = await request.json();
    const {
      cartId,
      shippingAddressId,
      billingAddressId,
      paymentId,
      shippingMethod,
      notes,
      acceptTerms,
    } = data;

    // Validate required fields
    if (!cartId || !shippingAddressId || !billingAddressId || !paymentId || !shippingMethod) {
      return json(errors.badRequest('Faltan campos requeridos'), { status: 400 });
    }

    if (!acceptTerms) {
      return json(errors.badRequest('Debe aceptar los términos y condiciones'), { status: 400 });
    }

    // Start a transaction
    return await prisma.$transaction(async (prisma) => {
      // Get the cart with items
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
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
                      storeId: true,
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

      if (!cart) {
        return json(errors.notFound('Carrito no encontrado'), { status: 404 });
      }

      if (cart.items.length === 0) {
        return json(errors.badRequest('El carrito está vacío'), { status: 400 });
      }

      // Verify the cart belongs to the user
      if (cart.userId !== userId) {
        return json(errors.forbidden('No tienes permiso para ver este carrito'), { status: 403 });
      }

      // Get addresses
      const [shippingAddress, billingAddress] = await Promise.all([
        prisma.address.findUnique({
          where: { id: shippingAddressId },
          include: {
            city: { include: { state: { include: { country: true } } } },
          },
        }),
        prisma.address.findUnique({
          where: { id: billingAddressId },
          include: {
            city: { include: { state: { include: { country: true } } } },
          },
        }),
      ]);

      if (!shippingAddress || !billingAddress) {
        return json(errors.badRequest('Dirección no encontrada'), { status: 400 });
      }

      // Get payment
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        return json(errors.notFound('Pago no encontrado'), { status: 404 });
      }

      // Verify payment belongs to user
      if (payment.userId !== userId) {
        return json(errors.forbidden('No tienes permiso para ver este pago'), { status: 403 });
      }

      // Check if payment is completed
      if (payment.status !== 'COMPLETED' && payment.status !== 'PENDING') {
        return json(errors.badRequest('El pago no se ha completado correctamente'), { status: 400 });
      }

      // Calculate totals
      const subtotal = cart.items.reduce(
        (sum, item) => sum + Number(item.priceAt) * item.qty,
        0
      );

      // Calculate shipping cost based on method (simplified)
      let shippingCost = 0;
      let estimatedDelivery = '';

      switch (shippingMethod) {
        case 'standard':
          shippingCost = 5.99;
          estimatedDelivery = '3-5 días hábiles';
          break;
        case 'express':
          shippingCost = 12.99;
          estimatedDelivery = '1-2 días hábiles';
          break;
        case 'pickup':
          shippingCost = 0;
          estimatedDelivery = 'Disponible en 1 hora';
          break;
        default:
          shippingCost = 5.99;
          estimatedDelivery = '3-5 días hábiles';
      }

      const taxRate = 0.1; // 10% tax rate
      const taxAmount = subtotal * taxRate;
      const total = subtotal + shippingCost + taxAmount;

      // Generate order number (format: ORD-YYYYMMDD-XXXXX)
      const now = new Date();
      const orderNumber = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`;

      // Create order
      const order = await prisma.order.create({
        data: {
          userId,
          storeId: cart.items[0].sku.product.storeId, // Assuming all items are from the same store
          orderNumber,
          status: 'PROCESSING',
          subtotal,
          shippingCost,
          taxAmount,
          total,
          shippingAddress: shippingAddress.street,
          shippingCityId: shippingAddress.cityId,
          billingAddress: billingAddress.street,
          billingCityId: billingAddress.cityId,
          paymentId,
          shippingMethod,
          estimatedDelivery,
          notes,
          items: {
            create: cart.items.map((item) => ({
              skuId: item.skuId,
              productId: item.sku.productId,
              quantity: item.qty,
              price: item.priceAt,
              total: Number(item.priceAt) * item.qty,
            })),
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
                      images: {
                        take: 1,
                        orderBy: { position: 'asc' },
                        select: {
                          url: true,
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

      // Update inventory
      for (const item of cart.items) {
        // Find inventory with enough stock
        const inventory = await prisma.inventory.findFirst({
          where: {
            skuId: item.skuId,
            stock: { gte: item.qty },
          },
          orderBy: { stock: 'desc' },
        });

        if (!inventory) {
          // This should not happen as we checked stock earlier
          throw new Error(`No hay suficiente stock para el SKU ${item.skuId}`);
        }

        // Update inventory
        await prisma.inventory.update({
          where: { id: inventory.id },
          data: { stock: { decrement: item.qty } },
        });

        // Record inventory transaction
        await prisma.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            orderId: order.id,
            quantity: -item.qty,
            type: 'SALE',
            notes: `Vendido en orden ${order.orderNumber}`,
          },
        });
      }

      // Clear the cart
      await prisma.cartItem.deleteMany({
        where: { cartId },
      });

      // Update payment with order ID
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          orderId: order.id,
          status: 'COMPLETED',
        },
      });

      // Get payment method details
      const paymentMethod = await prisma.paymentMethod.findUnique({
        where: { id: payment.paymentMethod },
      });

      // Prepare response
      const response: ConfirmCheckoutResponse = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: Number(order.total),
        currency: 'USD',
        estimatedDelivery: order.estimatedDelivery || undefined,
        paymentStatus: payment.status,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.sku.product.name,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
          image: item.sku.product.images[0]?.url,
        })),
        shippingAddress: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address: shippingAddress.street,
          address2: shippingAddress.street2 || undefined,
          city: shippingAddress.city?.name || '',
          state: shippingAddress.city?.state?.name || '',
          country: shippingAddress.city?.state?.country?.name || '',
          postalCode: shippingAddress.postalCode || '',
          phone: shippingAddress.phone || undefined,
        },
        billingAddress: {
          firstName: billingAddress.firstName,
          lastName: billingAddress.lastName,
          address: billingAddress.street,
          address2: billingAddress.street2 || undefined,
          city: billingAddress.city?.name || '',
          state: billingAddress.city?.state?.name || '',
          country: billingAddress.city?.state?.country?.name || '',
          postalCode: billingAddress.postalCode || '',
          phone: billingAddress.phone || undefined,
        },
        paymentMethod: {
          id: paymentMethod?.id || payment.paymentMethod,
          type: paymentMethod?.type || payment.paymentMethodType,
          last4: paymentMethod?.lastFourDigits || undefined,
          brand: paymentMethod?.brand || undefined,
        },
        createdAt: order.createdAt.toISOString(),
      };

      // In a real app, you would also:
      // 1. Send order confirmation email
      // 2. Send order notification to store admin
      // 3. Update any loyalty points or rewards
      // 4. Trigger any post-purchase flows

      return json(success(response), { status: 201 });
    });
  } catch (error) {
    console.error('Error al confirmar la compra:', error);
    return json(errors.internalServerError('Error al confirmar la compra'), { status: 500 });
  }
};
