import { json } from '@sveltejs/kit';
import { PrismaClient, type Prisma } from '@prisma/client';
import type { RequestHandler } from './$types';

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
  description?: string;
  price: number;
  stock: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  sku?: string;
  category?: string;
  images?: string[];
}

interface UpdateProductRequest extends CreateProductRequest {
  id: string;
}

// Helper function to check if user is admin
async function checkAdminRole(request: Request): Promise<{ id: string; role: string } | null> {
  try {
    const cookies = request.headers.get('cookie') || '';
    const token = cookies.split(';').find(c => c.trim().startsWith('token='));

    if (!token) return null;

    // This is a simplified auth check - in a real app you'd verify JWT
    // For now, we'll assume the token contains user info
    const response = await fetch(`${request.url.origin}/api/auth/me`, {
      headers: {
        'cookie': token
      }
    });

    if (!response.ok) return null;

    const userData = await response.json();
    return userData.user && (userData.user.role === 'ADMIN' || userData.user.role === 'OPERATOR')
      ? userData.user
      : null;
  } catch {
    return null;
  }
}

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

// GET /api/products/admin - Get all products for admin
export async function GET({ request }: { request: Request }) {
  try {
    const user = await checkAdminRole(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Transform the data to match the expected admin format
    const productDisplays = products.map((product) => {
      const defaultVariant = product.variants.find((v) => v.isDefault) || product.variants[0];

      return {
        id: product.id,
        name: product.name,
        price: defaultVariant?.price || 0,
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

    return json(productDisplays);
  } catch (error) {
    console.error('Error fetching products:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/products/admin - Create a new product
export async function POST({ request }: { request: Request }) {
  try {
    const user = await checkAdminRole(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateProductRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.price || body.price <= 0 || body.stock < 0) {
      return json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    // Generate slug from name if not provided
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

    // Add images if provided
    if (body.images && body.images.length > 0) {
      await prisma.productImage.createMany({
        data: body.images.map((url, index) => ({
          productId: newProduct.id,
          url: url,
          alt: `${body.name} - Image ${index + 1}`,
          position: index
        }))
      });
    }

    // Fetch the complete product with images
    const completeProduct = await prisma.product.findUnique({
      where: { id: newProduct.id },
      include: {
        variants: true,
        images: true,
        categories: true
      }
    });

    if (!completeProduct) {
      return json({ error: 'Failed to create product' }, { status: 500 });
    }

    // Transform the created product to match frontend format
    const defaultVariant = completeProduct.variants.find(v => v.isDefault) || completeProduct.variants[0];
    const productDisplay = {
      id: completeProduct.id,
      name: completeProduct.name,
      price: defaultVariant?.price || 0,
      category: completeProduct.categories[0]?.name,
      description: completeProduct.description,
      stock: completeProduct.variants.reduce((total, variant) => total + variant.stock, 0),
      status: completeProduct.status,
      images: completeProduct.images.map(img => img.url),
      createdAt: completeProduct.createdAt.toISOString(),
      sku: defaultVariant?.sku,
      currency: defaultVariant?.currency || 'ARS'
    };

    return json(productDisplay, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
