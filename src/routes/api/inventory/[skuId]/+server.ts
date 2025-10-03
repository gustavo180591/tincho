import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Get inventory for a specific SKU
export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const skuId = params.skuId;
    
    if (!skuId) {
      return json(errors.badRequest('ID de SKU no proporcionado'), { status: 400 });
    }

    // Parse query parameters
    const location = url.searchParams.get('location');

    // Build where clause
    const where: any = { skuId };
    
    if (location) {
      where.location = location;
    }

    // Get inventory items for the SKU
    const inventoryItems = await prisma.inventory.findMany({
      where,
      orderBy: { location: 'asc' },
      include: {
        sku: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                brand: {
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

    // Calculate total stock across all locations
    const totalStock = inventoryItems.reduce((sum, item) => sum + item.stock, 0);

    // Transform the response
    const response = {
      skuId,
      totalStock,
      locations: inventoryItems.map((item) => ({
        id: item.id,
        location: item.location,
        stock: item.stock,
        updatedAt: item.updatedAt.toISOString(),
      })),
      sku: inventoryItems[0]?.sku ? {
        id: inventoryItems[0].sku.id,
        code: inventoryItems[0].sku.code,
        product: {
          id: inventoryItems[0].sku.product.id,
          name: inventoryItems[0].sku.product.name,
          brand: inventoryItems[0].sku.product.brand,
        },
      } : null,
    };

    return json(success(response), { status: 200 });
  } catch (error) {
    console.error('Error al obtener el inventario del SKU:', error);
    return json(errors.internalServerError('Error al obtener el inventario del SKU'), { status: 500 });
  }
};

// Update inventory for a specific SKU
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const skuId = params.skuId;
    
    if (!skuId) {
      return json(errors.badRequest('ID de SKU no proporcionado'), { status: 400 });
    }

    const data = await request.json();
    const { location = 'default', stock, adjustment } = data;

    // Validate input
    if (stock === undefined && adjustment === undefined) {
      return json(
        errors.badRequest('Se requiere stock o ajuste (adjustment)'),
        { status: 400 }
      );
    }

    if (stock !== undefined && (typeof stock !== 'number' || stock < 0)) {
      return json(
        errors.badRequest('El stock debe ser un número mayor o igual a cero'),
        { status: 400 }
      );
    }

    if (adjustment !== undefined && typeof adjustment !== 'number') {
      return json(
        errors.badRequest('El ajuste debe ser un número'),
        { status: 400 }
      );
    }

    // Check if SKU exists
    const sku = await prisma.sku.findUnique({
      where: { id: skuId },
      include: {
        product: {
          include: {
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!sku) {
      return json(errors.notFound('SKU no encontrado'), { status: 404 });
    }

    // Find or create inventory item
    let inventoryItem = await prisma.inventory.findFirst({
      where: {
        skuId,
        location,
      },
    });

    let updatedStock = 0;
    
    if (inventoryItem) {
      // Update existing inventory
      if (stock !== undefined) {
        updatedStock = Math.max(0, stock); // Ensure stock doesn't go below 0
      } else {
        updatedStock = Math.max(0, inventoryItem.stock + adjustment);
      }
      
      inventoryItem = await prisma.inventory.update({
        where: { id: inventoryItem.id },
        data: {
          stock: updatedStock,
        },
      });
    } else {
      // Create new inventory item if it doesn't exist
      if (stock === undefined) {
        // If using adjustment, start from 0
        updatedStock = Math.max(0, adjustment);
      } else {
        updatedStock = Math.max(0, stock);
      }
      
      inventoryItem = await prisma.inventory.create({
        data: {
          skuId,
          location,
          stock: updatedStock,
        },
      });
    }

    // Get all inventory locations for this SKU to calculate total stock
    const allInventory = await prisma.inventory.findMany({
      where: { skuId },
    });
    
    const totalStock = allInventory.reduce((sum, item) => sum + item.stock, 0);

    const response = {
      id: inventoryItem.id,
      skuId: inventoryItem.skuId,
      location: inventoryItem.location,
      stock: inventoryItem.stock,
      totalStock,
      sku: {
        id: sku.id,
        code: sku.code,
        product: {
          id: sku.product.id,
          name: sku.product.name,
          brand: sku.product.brand,
        },
      },
      updatedAt: inventoryItem.updatedAt.toISOString(),
    };

    return json(success(response), { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el inventario:', error);
    return json(errors.internalServerError('Error al actualizar el inventario'), { status: 500 });
  }
};
