import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

type SkuResponse = {
  id: string;
  code: string | null;
  variantValues: any;
  priceAmount: number;
  priceCurrency: string;
  listPrice: number | null;
  stock: number;
  gtin: string | null;
  active: boolean;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
};

// Get all SKUs for a specific product
export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const productId = params.productId;
    
    if (!productId) {
      return json(errors.badRequest('ID de producto no proporcionado'), { status: 400 });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return json(errors.notFound('Producto no encontrado'), { status: 404 });
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';
    const activeOnly = url.searchParams.get('active') !== 'false';

    // Build where clause
    const where: any = {
      productId,
    };

    if (activeOnly) {
      where.active = true;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { gtin: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.sku.count({ where });

    // Get SKUs with pagination
    const skus = await prisma.sku.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        inventories: true,
      },
    });

    // Transform the response
    const response = skus.map((sku) => {
      const totalStock = sku.inventories.reduce((sum, inv) => sum + inv.stock, 0);
      return {
        id: sku.id,
        code: sku.code,
        variantValues: sku.variantValues,
        priceAmount: sku.priceAmount,
        priceCurrency: sku.priceCurrency,
        listPrice: sku.listPrice,
        stock: totalStock, // For backward compatibility
        totalStock,        // More explicit
        gtin: sku.gtin,
        active: sku.active,
        createdAt: sku.createdAt.toISOString(),
        updatedAt: sku.updatedAt.toISOString(),
      } as SkuResponse;
    });

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
    console.error('Error al obtener los SKUs del producto:', error);
    return json(errors.internalServerError('Error al obtener los SKUs del producto'), { status: 500 });
  }
};

// Create a new SKU for a product
export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const productId = params.productId;
    
    if (!productId) {
      return json(errors.badRequest('ID de producto no proporcionado'), { status: 400 });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true, currency: true },
    });

    if (!product) {
      return json(errors.notFound('Producto no encontrado'), { status: 404 });
    }

    const data = await request.json();
    const {
      code,
      variantValues,
      priceAmount,
      priceCurrency = product.currency,
      listPrice,
      stock = 0,
      gtin,
      active = true,
    } = data;

    // Validate required fields
    if (!code) {
      return json(errors.badRequest('El código de SKU es requerido'), { status: 400 });
    }

    if (priceAmount === undefined || priceAmount === null) {
      return json(errors.badRequest('El precio es requerido'), { status: 400 });
    }

    // Check if code is already taken
    const codeExists = await prisma.sku.findFirst({
      where: { code },
    });

    if (codeExists) {
      return json(errors.conflict('El código de SKU ya está en uso'), { status: 409 });
    }

    // Create the SKU and its default inventory in a transaction
    const [newSku] = await prisma.$transaction([
      prisma.sku.create({
        data: {
          code,
          variantValues,
          priceAmount,
          priceCurrency,
          listPrice: listPrice || priceAmount * 1.2, // 20% markup by default
          gtin,
          active,
          product: { connect: { id: productId } },
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
      }),
      // Create default inventory
      prisma.inventory.create({
        data: {
          sku: { connect: { code } },
          stock,
          location: 'default',
        },
      }),
    ]);

    const response = {
      ...newSku,
      totalStock: stock,
      createdAt: newSku.createdAt.toISOString(),
      updatedAt: newSku.updatedAt.toISOString(),
    };

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear el SKU:', error);
    return json(errors.internalServerError('Error al crear el SKU'), { status: 500 });
  }
};
