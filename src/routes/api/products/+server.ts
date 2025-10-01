import { json } from '@sveltejs/kit';
import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Type definitions
interface ProductVariantInput {
  sku: string;
  price: number;
  currency?: string;
  stock?: number;
  attributes?: Record<string, unknown>;
  isDefault?: boolean;
}

interface CreateProductRequest {
  name: string;
  slug: string;
  description?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  variants: ProductVariantInput[];
}

// Type for product with relations from Prisma query
type ProductWithRelations = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  seoTitle: string | null;
  seoDesc: string | null;
  createdAt: Date;
  updatedAt: Date;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  variants: Array<{
    id: string;
    sku: string;
    price: number;
    currency: string;
    stock: number;
    attributes: Prisma.JsonValue;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    position: number;
    createdAt: Date;
  }>;
};

// GET /api/products - Get all products
export async function GET() {
  try {
    const products: ProductWithRelations[] = await prisma.product.findMany({
      include: {
        variants: true,
        images: true,
        categories: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data to match the expected frontend format
    const productDisplays = products.map((product) => {
      const defaultVariant = product.variants.find((v) => v.isDefault) || product.variants[0];

      return {
        id: product.id,
        _id: product.id,
        name: product.name,
        price: defaultVariant?.price || 0,
        category: product.categories[0]?.name || 'Sin categoría',
        description: product.description || '',
        stock: product.variants.reduce((total: number, variant) => total + variant.stock, 0),
        isNew: new Date(product.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        images: product.images.map((img) => img.url),
        createdAt: product.createdAt.toISOString(),
        sku: defaultVariant?.sku,
        currency: defaultVariant?.currency || 'ARS'
      };
    });

    return json(productDisplays);
  } catch (error) {
    console.error('Error fetching products:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/products - Create a new product
export async function POST({ request }: { request: Request }) {
  try {
    const body: CreateProductRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.slug || !body.variants || body.variants.length === 0) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate variants
    for (const variant of body.variants) {
      if (!variant.sku || !variant.price || variant.price <= 0) {
        return json({ error: 'Invalid variant data' }, { status: 400 });
      }
    }

    // Create the product in the database
    const newProduct = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description || '',
        status: body.status || 'DRAFT',
        variants: {
          create: body.variants.map((variant: ProductVariantInput) => ({
            sku: variant.sku,
            price: variant.price,
            currency: variant.currency || 'ARS',
            stock: variant.stock || 0,
            attributes: (variant.attributes as Prisma.JsonValue) || {},
            isDefault: variant.isDefault || false
          }))
        }
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
      _id: newProduct.id,
      name: newProduct.name,
      price: defaultVariant?.price || 0,
      category: newProduct.categories[0]?.name || 'Sin categoría',
      description: newProduct.description || '',
      stock: newProduct.variants.reduce((total, variant) => total + variant.stock, 0),
      isNew: true, // Just created, so it's new
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
