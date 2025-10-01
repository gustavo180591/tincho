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

// POST /api/debug/create-product - Create a new product (no auth required)
export async function POST({ request }: { request: Request }) {
  try {
    console.log('=== DEBUG ENDPOINT: Creando producto ===');
    const body = await request.json();
    console.log('Datos recibidos:', body);

    // Handle both direct format and variant format
    let price, stock, sku, currency;
    if (body.variants && body.variants.length > 0) {
      // Formato de variantes (como lo envía el formulario)
      price = body.variants[0].price;
      stock = body.variants[0].stock || 0;
      sku = body.variants[0].sku;
      currency = body.variants[0].currency || 'ARS';
    } else {
      // Formato directo
      price = body.price;
      stock = body.stock || 0;
      sku = body.sku || `${generateSlug(body.name)}-001`;
      currency = body.currency || 'ARS';
    }

    // Validate required fields
    if (!body.name || price === undefined || price <= 0 || stock < 0) {
      console.log('Validación fallida:', { name: !!body.name, price, stock });
      return json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    console.log('Precio:', price);
    const slug = generateSlug(body.name);
    console.log('Slug generado:', slug);
    const newProduct = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        description: body.description || '',
        status: body.status || 'DRAFT',
        variants: {
          create: {
            sku,
            price: price / 100, // Convert priceCents to price
            currency,
            stock,
            attributes: {},
            isDefault: true
          }
        },
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

    console.log('Producto creado exitosamente:', newProduct.id);

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

    console.log('Producto transformado:', productDisplay);
    return json(productDisplay, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
