import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Get a specific SKU by ID
export const GET: RequestHandler = async ({ params }) => {
  try {
    const skuId = params.id;
    
    if (!skuId) {
      return json(errors.badRequest('ID de SKU no proporcionado'), { status: 400 });
    }

    const sku = await prisma.sku.findUnique({
      where: { id: skuId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        inventories: true,
      },
    });

    if (!sku) {
      return json(errors.notFound('SKU no encontrado'), { status: 404 });
    }

    // Calculate total available stock across all inventories
    const totalStock = sku.inventories.reduce((sum, inv) => sum + inv.stock, 0);

    const response = {
      ...sku,
      totalStock,
      createdAt: sku.createdAt.toISOString(),
      updatedAt: sku.updatedAt.toISOString(),
    };

    return json(success(response), { status: 200 });
  } catch (error) {
    console.error('Error al obtener el SKU:', error);
    return json(errors.internalServerError('Error al obtener el SKU'), { status: 500 });
  }
};

// Update a specific SKU
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const skuId = params.id;
    
    if (!skuId) {
      return json(errors.badRequest('ID de SKU no proporcionado'), { status: 400 });
    }

    const data = await request.json();
    const {
      code,
      variantValues,
      priceAmount,
      priceCurrency,
      listPrice,
      stock,
      gtin,
      active,
    } = data;

    // Validate required fields
    if (priceAmount === undefined || priceAmount === null) {
      return json(errors.badRequest('El precio es requerido'), { status: 400 });
    }

    // Check if SKU exists
    const existingSku = await prisma.sku.findUnique({
      where: { id: skuId },
      include: { product: true },
    });

    if (!existingSku) {
      return json(errors.notFound('SKU no encontrado'), { status: 404 });
    }

    // Check if code is already taken by another SKU
    if (code && code !== existingSku.code) {
      const codeExists = await prisma.sku.findFirst({
        where: {
          code,
          NOT: { id: skuId },
        },
      });

      if (codeExists) {
        return json(errors.conflict('El código de SKU ya está en uso'), { status: 409 });
      }
    }

    // Update the SKU
    const updatedSku = await prisma.sku.update({
      where: { id: skuId },
      data: {
        code,
        variantValues,
        priceAmount,
        priceCurrency: priceCurrency || existingSku.priceCurrency,
        listPrice: listPrice !== undefined ? listPrice : existingSku.listPrice,
        gtin,
        active: active !== undefined ? active : existingSku.active,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        inventories: true,
      },
    });

    // Calculate total available stock
    const totalStock = updatedSku.inventories.reduce((sum, inv) => sum + inv.stock, 0);

    const response = {
      ...updatedSku,
      totalStock,
      createdAt: updatedSku.createdAt.toISOString(),
      updatedAt: updatedSku.updatedAt.toISOString(),
    };

    return json(success(response), { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el SKU:', error);
    return json(errors.internalServerError('Error al actualizar el SKU'), { status: 500 });
  }
};
