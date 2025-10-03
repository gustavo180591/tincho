import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Get a specific store by ID
export const GET: RequestHandler = async ({ params }) => {
  try {
    const storeId = params.id;
    
    if (!storeId) {
      return json(errors.badRequest('ID de tienda no proporcionado'), { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            iso2: true,
          },
        },
        seller: {
          select: {
            id: true,
            nickname: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
      },
    });

    if (!store) {
      return json(errors.notFound('Tienda no encontrada'), { status: 404 });
    }

    // Get store statistics
    const [productCount, orderCount, avgRating] = await Promise.all([
      prisma.product.count({ where: { storeId } }),
      prisma.order.count({ where: { storeId } }),
      prisma.review.aggregate({
        where: { storeId },
        _avg: { rating: true },
      }),
    ]);

    const response = {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      countryId: store.countryId,
      sellerId: store.sellerId,
      country: store.country,
      seller: {
        id: store.seller.id,
        nickname: store.seller.nickname,
        rating: store.seller.ratingAvg,
        ratingCount: store.seller.ratingCount,
      },
      stats: {
        products: productCount,
        orders: orderCount,
        rating: parseFloat((avgRating._avg.rating || 0).toFixed(2)),
      },
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };

    return json(success(response), { status: 200 });
  } catch (error) {
    console.error('Error al obtener la tienda:', error);
    return json(errors.internalServerError('Error al obtener la tienda'), { status: 500 });
  }
};

// Update a store
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const storeId = params.id;
    
    if (!storeId) {
      return json(errors.badRequest('ID de tienda no proporcionado'), { status: 400 });
    }

    const data = await request.json();
    const { name, description, countryId } = data;

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!existingStore) {
      return json(errors.notFound('Tienda no encontrada'), { status: 404 });
    }

    // Check if new name is already taken
    if (name && name !== existingStore.name) {
      const nameTaken = await prisma.store.findFirst({
        where: {
          name,
          NOT: { id: storeId },
        },
      });

      if (nameTaken) {
        return json(errors.conflict('Ya existe una tienda con este nombre'), { status: 409 });
      }
    }

    // Check if country exists if provided
    if (countryId && countryId !== existingStore.countryId) {
      const country = await prisma.country.findUnique({
        where: { id: countryId },
      });

      if (!country) {
        return json(errors.badRequest('País no encontrado'), { status: 400 });
      }
    }

    // Generate new slug if name changed
    let slug = existingStore.slug;
    if (name && name !== existingStore.name) {
      slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-');
    }

    // Update the store
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        name: name || existingStore.name,
        slug,
        description: description !== undefined ? description : existingStore.description,
        countryId: countryId !== undefined ? countryId : existingStore.countryId,
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            iso2: true,
          },
        },
        seller: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    const response = {
      id: updatedStore.id,
      name: updatedStore.name,
      slug: updatedStore.slug,
      description: updatedStore.description,
      countryId: updatedStore.countryId,
      sellerId: updatedStore.sellerId,
      country: updatedStore.country,
      seller: {
        id: updatedStore.seller.id,
        nickname: updatedStore.seller.nickname,
      },
      createdAt: updatedStore.createdAt.toISOString(),
      updatedAt: updatedStore.updatedAt.toISOString(),
    };

    return json(success(response), { status: 200 });
  } catch (error) {
    console.error('Error al actualizar la tienda:', error);
    return json(errors.internalServerError('Error al actualizar la tienda'), { status: 500 });
  }
};

// Delete a store
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const storeId = params.id;
    
    if (!storeId) {
      return json(errors.badRequest('ID de tienda no proporcionado'), { status: 400 });
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    if (!store) {
      return json(errors.notFound('Tienda no encontrada'), { status: 404 });
    }

    // Prevent deletion if store has products or orders
    if (store._count.products > 0 || store._count.orders > 0) {
      return json(
        errors.conflict('No se puede eliminar una tienda con productos u órdenes asociadas'),
        { status: 409 }
      );
    }

    // Delete the store
    await prisma.store.delete({
      where: { id: storeId },
    });

    return json(success({ id: storeId, deleted: true }), { status: 200 });
  } catch (error) {
    console.error('Error al eliminar la tienda:', error);
    return json(errors.internalServerError('Error al eliminar la tienda'), { status: 500 });
  }
};
