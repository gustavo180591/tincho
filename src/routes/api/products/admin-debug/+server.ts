import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/products/admin-debug - Debug endpoint without auth
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        images: true,
        categories: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('=== DEBUG ENDPOINT ===');
    console.log('Total products in DB:', products.length);
    products.forEach(p => {
      console.log(`Product: ${p.name}, Status: ${p.status}, ID: ${p.id}`);
    });

    // Transform the data to match the expected admin format
    const productDisplays = products.map((product) => {
      const defaultVariant = product.variants.find((v) => v.isDefault) || product.variants[0];

      return {
        id: product.id,
        name: product.name,
        priceCents: defaultVariant?.priceCents || 0,
        category: product.categories[0]?.name,
        description: product.description,
        stock: product.variants.reduce((total: number, variant) => total + variant.stock, 0),
        status: product.status,
        images: product.images.map((img) => img.url),
        createdAt: product.createdAt.toISOString(),
        sku: defaultVariant?.sku,
        currency: defaultVariant?.currency || 'ARS'
      };
    });

    return json({
      products: productDisplays,
      total: products.length,
      debug: 'No auth required'
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
