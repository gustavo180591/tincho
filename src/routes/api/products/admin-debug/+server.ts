import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

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
      const mainImage = product.images.length > 0 ? product.images[0].url : null;

      return {
        id: product.id,
        name: product.name,
        price: defaultVariant?.price ? Number(defaultVariant.price) : 0,
        price: defaultVariant?.price ? Math.round(Number(defaultVariant.price) * 100) : 0,
        category: product.categories[0]?.name,
        description: product.description || '',
        stock: product.variants.reduce((total: number, variant) => total + (variant.stock || 0), 0),
        status: product.status,
        images: product.images.length > 0 ? [mainImage] : [],
        mainImage: mainImage,
        createdAt: product.createdAt.toISOString(),
        sku: defaultVariant?.sku || '',
        currency: defaultVariant?.currency || 'ARS',
        variants: product.variants
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

// POST /api/products/admin-debug - Create a new product (debug version without auth)
export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || body.price === undefined || body.price <= 0 || body.stock < 0) {
      return json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    const slug = generateSlug(body.name);

    // Create the product in the database
    const newProduct = await prisma.product.create({
      data: {
        name: body.name,
        slug: slug,
        description: body.description || '',
        status: body.status || 'DRAFT',
        variants: {
          create: {
            sku: body.sku || `${slug}-001`,
            price: body.price,
            currency: 'ARS',
            stock: body.stock,
            attributes: {},
            isDefault: true
          }
        },
        ...(body.category && {
          categories: {
            connectOrCreate: {
              where: { slug: generateSlug(body.category) },
              create: {
                name: body.category,
                slug: generateSlug(body.category)
              }
            }
          }
        })
      },
      include: {
        variants: true,
        images: true,
        categories: true
      }
    });

    // Transform the created product to match frontend format
    const defaultVariant = newProduct.variants.find(v => v.isDefault) || newProduct.variants[0];
    const productDisplay = {
      id: newProduct.id,
      name: newProduct.name,
      price: defaultVariant?.price || 0,
      category: newProduct.categories[0]?.name,
      description: newProduct.description,
      stock: newProduct.variants.reduce((total, variant) => total + variant.stock, 0),
      status: newProduct.status,
      images: newProduct.images.map(img => img.url),
      createdAt: newProduct.createdAt.toISOString(),
      sku: defaultVariant?.sku,
      currency: defaultVariant?.currency || 'ARS'
    };

    return json(productDisplay, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
