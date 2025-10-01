import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { RequestHandler } from './$types';

const prisma = new PrismaClient();

interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  sku?: string;
  category?: string;
  images?: string[];
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

// PUT /api/products/admin/[id] - Update a product
export async function PUT({ request, params }: { request: Request; params: { id: string } }) {
  try {
    const user = await checkAdminRole(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateProductRequest = await request.json();

    // Validate required fields
    if (body.price !== undefined && body.price <= 0) {
      return json({ error: 'Price must be greater than 0' }, { status: 400 });
    }

    if (body.stock !== undefined && body.stock < 0) {
      return json({ error: 'Stock cannot be negative' }, { status: 400 });
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: { variants: true, images: true, categories: true }
    });

    if (!existingProduct) {
      return json({ error: 'Product not found' }, { status: 404 });
    }

    // Update product data
    const updateData: any = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
      updateData.slug = generateSlug(body.name);
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Update default variant
    const defaultVariant = existingProduct.variants.find(v => v.isDefault) || existingProduct.variants[0];
    if (defaultVariant) {
      const variantUpdateData: any = {};

      if (body.price !== undefined) {
        variantUpdateData.price = body.price;
      }

      if (body.stock !== undefined) {
        variantUpdateData.stock = body.stock;
      }

      if (body.sku !== undefined) {
        variantUpdateData.sku = body.sku;
      }

      if (Object.keys(variantUpdateData).length > 0) {
        await prisma.productVariant.update({
          where: { id: defaultVariant.id },
          data: variantUpdateData
        });
      }
    }

    // Handle category update
    if (body.category !== undefined) {
      if (body.category) {
        // Connect or create category
        await prisma.productCategory.upsert({
          where: { slug: generateSlug(body.category) },
          update: { name: body.category },
          create: {
            name: body.category,
            slug: generateSlug(body.category)
          }
        });

        updateData.categories = {
          set: [{ slug: generateSlug(body.category) }]
        };
      } else {
        // Disconnect all categories
        updateData.categories = {
          set: []
        };
      }
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        variants: true,
        images: true,
        categories: true
      }
    });

    // Handle images update
    if (body.images !== undefined) {
      // Delete existing images
      await prisma.productImage.deleteMany({
        where: { productId: params.id }
      });

      // Add new images
      if (body.images.length > 0) {
        await prisma.productImage.createMany({
          data: body.images.map((url, index) => ({
            productId: params.id,
            url: url,
            alt: `${updatedProduct.name} - Image ${index + 1}`,
            position: index
          }))
        });
      }
    }

    // Fetch the complete updated product
    const completeProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: true,
        images: true,
        categories: true
      }
    });

    if (!completeProduct) {
      return json({ error: 'Failed to update product' }, { status: 500 });
    }

    // Transform the updated product to match frontend format
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

    return json(productDisplay);
  } catch (error) {
    console.error('Error updating product:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/products/admin/[id] - Delete a product
export async function DELETE({ request, params }: { request: Request; params: { id: string } }) {
  try {
    const user = await checkAdminRole(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: { variants: true, images: true }
    });

    if (!existingProduct) {
      return json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete the product (this will cascade delete variants and images due to Prisma schema)
    await prisma.product.delete({
      where: { id: params.id }
    });

    return json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
