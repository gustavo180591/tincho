import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Add item to cart
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;

    const data = await request.json();
    const { skuId, qty = 1, cartId } = data;

    // Validate required fields
    if (!skuId) {
      return json(errors.badRequest('SKU ID es requerido'), { status: 400 });
    }

    if (qty <= 0) {
      return json(errors.badRequest('La cantidad debe ser mayor a 0'), { status: 400 });
    }

    // Find or create cart
    let cart = await prisma.cart.findFirst({
      where: { id: cartId, userId: userId || null },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: userId || null,
          currency: 'USD', // Default currency
        },
      });
    }

    // Get SKU details
    const sku = await prisma.sku.findUnique({
      where: { id: skuId },
      include: {
        product: {
          select: {
            id: true,
            storeId: true,
          },
        },
        inventories: true,
      },
    });

    if (!sku) {
      return json(errors.notFound('SKU no encontrado'), { status: 404 });
    }

    // Check stock
    const totalStock = sku.inventories.reduce((sum, inv) => sum + inv.stock, 0);
    if (totalStock < qty) {
      return json(
        errors.badRequest(`No hay suficiente stock. Disponible: ${totalStock}`),
        { status: 400 }
      );
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_skuId: {
          cartId: cart.id,
          skuId,
        },
      },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity if item already in cart
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          qty: existingItem.qty + qty,
          priceAt: sku.priceAmount, // Update price in case it changed
        },
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
      });
    } else {
      // Add new item to cart
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          skuId,
          qty,
          priceAt: sku.priceAmount,
        },
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
      });
    }

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
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

    if (!updatedCart) {
      throw new Error('Error al actualizar el carrito');
    }

    // Calculate subtotal and total items
    const subtotal = updatedCart.items.reduce(
      (sum, item) => sum + Number(item.priceAt) * item.qty,
      0
    );
    const totalItems = updatedCart.items.reduce((sum, item) => sum + item.qty, 0);

    // Transform the response
    const response = {
      id: updatedCart.id,
      userId: updatedCart.userId,
      currency: updatedCart.currency,
      items: updatedCart.items.map((item) => ({
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
      updatedAt: updatedCart.updatedAt.toISOString(),
    };

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al agregar ítem al carrito:', error);
    return json(errors.internalServerError('Error al agregar ítem al carrito'), { status: 500 });
  }
};
