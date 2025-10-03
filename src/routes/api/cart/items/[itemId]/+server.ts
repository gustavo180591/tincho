import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Update cart item quantity
export const PUT: RequestHandler = async ({ request, params, locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;
    const itemId = params.itemId;

    if (!itemId) {
      return json(errors.badRequest('ID de ítem no proporcionado'), { status: 400 });
    }

    const data = await request.json();
    const { qty } = data;

    if (qty === undefined || qty === null) {
      return json(errors.badRequest('La cantidad es requerida'), { status: 400 });
    }

    if (qty <= 0) {
      return json(errors.badRequest('La cantidad debe ser mayor a 0'), { status: 400 });
    }

    // Get the cart item with cart and SKU details
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        sku: {
          include: {
            inventories: true,
          },
        },
      },
    });

    if (!cartItem) {
      return json(errors.notFound('Ítem no encontrado en el carrito'), { status: 404 });
    }

    // Verify cart belongs to user (if user is logged in)
    if (userId && cartItem.cart.userId !== userId) {
      return json(errors.forbidden('No tienes permiso para modificar este carrito'), { status: 403 });
    }

    // Check stock
    const totalStock = cartItem.sku.inventories.reduce((sum, inv) => sum + inv.stock, 0);
    if (totalStock < qty) {
      return json(
        errors.badRequest(`No hay suficiente stock. Disponible: ${totalStock}`),
        { status: 400 }
      );
    }

    // Update the cart item
    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { qty },
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

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
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

    return json(success(response));
  } catch (error) {
    console.error('Error al actualizar el ítem del carrito:', error);
    return json(errors.internalServerError('Error al actualizar el ítem del carrito'), { status: 500 });
  }
};

// Remove item from cart
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;
    const itemId = params.itemId;

    if (!itemId) {
      return json(errors.badRequest('ID de ítem no proporcionado'), { status: 400 });
    }

    // Get the cart item with cart details
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      return json(errors.notFound('Ítem no encontrado en el carrito'), { status: 404 });
    }

    // Verify cart belongs to user (if user is logged in)
    if (userId && cartItem.cart.userId !== userId) {
      return json(errors.forbidden('No tienes permiso para modificar este carrito'), { status: 403 });
    }

    // Delete the cart item
    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
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

    return json(success(response));
  } catch (error) {
    console.error('Error al eliminar el ítem del carrito:', error);
    return json(errors.internalServerError('Error al eliminar el ítem del carrito'), { status: 500 });
  }
};
