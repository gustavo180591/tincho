import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

type InventoryItem = {
  id: string;
  skuId: string;
  location: string | null;
  stock: number;
  sku: {
    id: string;
    code: string | null;
    product: {
      id: string;
      name: string;
      brand: {
        id: string;
        name: string;
      } | null;
    };
  };
  updatedAt: string;
};

// Get all inventory items with pagination and filtering
export const GET: RequestHandler = async ({ url }) => {
  try {
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;
    
    const search = url.searchParams.get('search') || '';
    const location = url.searchParams.get('location');
    const lowStockOnly = url.searchParams.get('lowStock') === 'true';
    const skuId = url.searchParams.get('skuId');
    const productId = url.searchParams.get('productId');
    const minStock = url.searchParams.get('minStock') ? 
      parseInt(url.searchParams.get('minStock') || '0') : null;
    const maxStock = url.searchParams.get('maxStock') ? 
      parseInt(url.searchParams.get('maxStock') || '0') : null;

    // Build where clause
    const where: any = {};

    if (skuId) {
      where.skuId = skuId;
    }

    if (productId) {
      where.sku = {
        productId: productId
      };
    }

    if (location) {
      where.location = location;
    }

    if (lowStockOnly) {
      where.stock = {
        lt: 10 // Consider items with less than 10 in stock as low stock
      };
    }

    if (minStock !== null) {
      where.stock = where.stock || {};
      where.stock.gte = minStock;
    }

    if (maxStock !== null) {
      where.stock = where.stock || {};
      where.stock.lte = maxStock;
    }

    if (search) {
      where.OR = [
        { 'sku.code': { contains: search, mode: 'insensitive' } },
        { 'sku.product.name': { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.inventory.count({
      where,
    });

    // Get inventory items with pagination
    const inventoryItems = await prisma.inventory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        sku: {
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
        },
      },
    });

    // Transform the response
    const response = inventoryItems.map((item) => ({
      id: item.id,
      skuId: item.skuId,
      location: item.location,
      stock: item.stock,
      sku: {
        id: item.sku.id,
        code: item.sku.code,
        product: {
          id: item.sku.product.id,
          name: item.sku.product.name,
          brand: item.sku.product.brand,
        },
      },
      updatedAt: item.updatedAt.toISOString(),
    }));

    return json(
      success({
        data: response,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener el inventario:', error);
    return json(errors.internalServerError('Error al obtener el inventario'), { status: 500 });
  }
};

// Create a new inventory item
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { skuId, location = 'default', stock = 0 } = data;

    // Validate required fields
    if (!skuId) {
      return json(errors.badRequest('El ID de SKU es requerido'), { status: 400 });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return json(
        errors.badRequest('El stock debe ser un número mayor o igual a cero'),
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

    // Check if inventory already exists for this SKU and location
    const existingInventory = await prisma.inventory.findFirst({
      where: {
        skuId,
        location,
      },
    });

    if (existingInventory) {
      return json(
        errors.conflict('Ya existe un registro de inventario para este SKU en la ubicación especificada'),
        { status: 409 }
      );
    }

    // Create the inventory item
    const newInventory = await prisma.inventory.create({
      data: {
        skuId,
        location,
        stock,
      },
    });

    const response = {
      id: newInventory.id,
      skuId: newInventory.skuId,
      location: newInventory.location,
      stock: newInventory.stock,
      sku: {
        id: sku.id,
        code: sku.code,
        product: {
          id: sku.product.id,
          name: sku.product.name,
          brand: sku.product.brand,
        },
      },
      updatedAt: newInventory.updatedAt.toISOString(),
    };

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear el registro de inventario:', error);
    return json(errors.internalServerError('Error al crear el registro de inventario'), { status: 500 });
  }
};
