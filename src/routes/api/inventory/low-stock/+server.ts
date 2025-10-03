import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

type LowStockItem = {
  skuId: string;
  skuCode: string | null;
  productId: string;
  productName: string;
  brandName: string | null;
  currentStock: number;
  location: string | null;
  threshold: number;
};

// Get low stock items
export const GET: RequestHandler = async ({ url }) => {
  try {
    // Parse query parameters
    const threshold = parseInt(url.searchParams.get('threshold') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;
    const location = url.searchParams.get('location') || null;
    const productId = url.searchParams.get('productId');
    const brandId = url.searchParams.get('brandId');

    // Build where clause
    const where: any = {
      stock: {
        lte: threshold, // Items with stock less than or equal to threshold
      },
    };

    if (location) {
      where.location = location;
    }

    // Add product filter if provided
    if (productId) {
      where.sku = {
        productId: productId,
      };
    }

    // Add brand filter if provided
    if (brandId) {
      where.sku = where.sku || {};
      where.sku.product = {
        brandId: brandId,
      };
    }

    // Get total count for pagination
    const total = await prisma.inventory.count({ where });

    // Get low stock items with pagination
    const lowStockItems = await prisma.inventory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { stock: 'asc' }, // Sort by stock level (lowest first)
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
    const response = lowStockItems.map((item) => ({
      skuId: item.skuId,
      skuCode: item.sku.code,
      productId: item.sku.product.id,
      productName: item.sku.product.name,
      brandName: item.sku.product.brand?.name || null,
      currentStock: item.stock,
      location: item.location,
      threshold,
      lastUpdated: item.updatedAt.toISOString(),
    }));

    return json(
      success({
        data: response,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          threshold,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener el inventario con bajo stock:', error);
    return json(
      errors.internalServerError('Error al obtener el inventario con bajo stock'),
      { status: 500 }
    );
  }
};
