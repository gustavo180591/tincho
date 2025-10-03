import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';

// Type definitions
type ProductVariantInput = {
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  costPerItem?: number | null;
  currency?: string;
  stock?: number;
  trackQuantity?: boolean;
  barcode?: string | null;
  weight?: number | null;
  weightUnit?: 'g' | 'kg' | 'lb' | 'oz';
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionsUnit?: 'cm' | 'in';
  attributes?: Record<string, unknown>;
  isDefault?: boolean;
  options?: Array<{
    name: string;
    value: string;
  }>;
};

type ProductImageInput = {
  url: string;
  alt?: string | null;
  position?: number;
  isDefault?: boolean;
};

type CreateProductRequest = {
  name: string;
  slug: string;
  description?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED';
  type?: 'PHYSICAL' | 'DIGITAL' | 'SERVICE';
  isGiftCard?: boolean;
  trackQuantity?: boolean;
  allowBackorder?: boolean;
  isActive?: boolean;
  brandId?: string | null;
  categories?: string[];
  variants: ProductVariantInput[];
  images?: ProductImageInput[];
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  taxCategory?: string;
  requiresShipping?: boolean;
  weight?: number | null;
  weightUnit?: 'g' | 'kg' | 'lb' | 'oz';
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionsUnit?: 'cm' | 'in';
};

// GET /api/products - Get all products with pagination and filtering
export const GET: RequestHandler = async ({ url }) => {
  try {
    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Filtering
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') as 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED' | null;
    const categoryId = url.searchParams.get('categoryId');
    const brandId = url.searchParams.get('brandId');
    const minPrice = parseFloat(url.searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '1000000');
    const inStock = url.searchParams.get('inStock') === 'true';
    const isActive = url.searchParams.get('isActive') !== 'false';
    const isGiftCard = url.searchParams.get('isGiftCard');
    
    // Sorting
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status && { status }),
      ...(brandId && { brandId }),
      ...(isGiftCard !== null && { isGiftCard: isGiftCard === 'true' }),
      ...(isActive && { isActive: true }),
      ...(inStock && {
        OR: [
          { trackQuantity: false },
          { 
            trackQuantity: true,
            variants: {
              some: {
                stock: { gt: 0 }
              }
            }
          }
        ]
      })
    };

    // Add price range filter
    if (minPrice > 0 || maxPrice < 1000000) {
      where.variants = {
        some: {
          price: {
            gte: minPrice,
            lte: maxPrice
          },
          isActive: true
        }
      };
    }

    // Add category filter if provided
    if (categoryId) {
      where.categories = {
        some: { id: categoryId }
      };
    }

    // Build orderBy clause
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [];
    if (sortBy === 'price') {
      orderBy.push({
        variants: {
          _count: sortOrder === 'asc' ? 'asc' : 'desc'
        }
      });
    } else if (['name', 'createdAt', 'updatedAt', 'status'].includes(sortBy)) {
      orderBy.push({
        [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc'
      });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }
    orderBy.push({ id: 'asc' }); // For consistent ordering

    // Execute queries
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { isDefault: 'desc' }
          },
          images: {
            orderBy: { position: 'asc' },
            take: 1 // Only get the first image for the listing
          },
          categories: {
            select: {
              id: true,
              name: true,
              slug: true
            },
            take: 1 // Only get the first category for the listing
          },
          brand: {
            select: {
              id: true,
              name: true,
              logo: true
            }
          },
          // Removed _count as it's not in the model
          }
        },
        skip,
        take: limit,
        orderBy
      }),
      prisma.product.count({ where })
    ]);

    // Transform the data
    const transformedProducts = products.map((product: any) => {
      const variants = product.variants || [];
      const defaultVariant = variants.find((v: any) => v.isDefault) || variants[0];
      const imageUrl = product.images?.[0]?.url || null;
      const category = product.categories?.[0];
      
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        status: product.status,
        isActive: product.active,
        isGiftCard: false, // Default value
        trackQuantity: true, // Default value
        price: defaultVariant?.price || 0,
        compareAtPrice: defaultVariant?.compareAtPrice || null,
        sku: defaultVariant?.sku,
        stock: variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0),
        image: imageUrl,
        category: category ? {
          id: category.id,
          name: category.name,
          slug: category.slug
        } : null,
        brand: product.brandId ? {
          id: product.brandId,
          name: '' // Will be populated if needed
        } : null,
        variantsCount: variants.length,
        ordersCount: 0, // Default value
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      };
    });

    return success({
      data: transformedProducts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return errors.internalServerError('Error fetching products');
  }
};

// POST /api/products - Create a new product
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: CreateProductRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.slug || !body.variants || body.variants.length === 0) {
      return errors.badRequest('Name, slug, and at least one variant are required');
    }

    // Validate variants
    for (const variant of body.variants) {
      if (!variant.sku || variant.price === undefined || variant.price < 0) {
        return errors.badRequest('Each variant must have a valid SKU and price');
      }
      
      if (variant.compareAtPrice !== undefined && variant.compareAtPrice < variant.price) {
        return errors.badRequest('Compare at price must be greater than or equal to price');
      }
      
      if (variant.stock !== undefined && variant.stock < 0) {
        return errors.badRequest('Stock cannot be negative');
      }
    }

    // Check if slug is already in use
    const existingProduct = await prisma.product.findUnique({
      where: { slug: body.slug },
      select: { id: true }
    });
    
    if (existingProduct) {
      return errors.badRequest('A product with this slug already exists');
    }

    // Check if any SKU is already in use
    const variantSkus = body.variants.map((v: any) => v.sku);
    const existingVariants = await prisma.variant.findMany({
      where: { sku: { in: variantSkus } },
      select: { sku: true }
    });
    
    if (existingVariants.length > 0) {
      return errors.badRequest(`The following SKUs are already in use: ${existingVariants.map((v: any) => v.sku).join(', ')}`);
    }

    // Check if brand exists if provided
    if (body.brandId) {
      const brandExists = await prisma.brand.findUnique({
        where: { id: body.brandId },
        select: { id: true }
      });
      
      if (!brandExists) {
        return errors.badRequest('Brand not found');
      }
    }

    // Check if categories exist if provided
    if (body.categories && body.categories.length > 0) {
      const categoriesCount = await prisma.category.count({
        where: { id: { in: body.categories } }
      });
      
      if (categoriesCount !== body.categories.length) {
        return errors.badRequest('One or more categories not found');
      }
    }

    // Create the product
    const newProduct = await prisma.product.create({
      data: {
          name: body.name,
          slug: body.slug,
          description: body.description || null,
          status: body.status || 'DRAFT',
          type: body.type || 'PHYSICAL',
          isGiftCard: body.isGiftCard || false,
          trackQuantity: body.trackQuantity ?? true,
          allowBackorder: body.allowBackorder || false,
          isActive: body.isActive ?? true,
          brandId: body.brandId || null,
          seoTitle: body.seoTitle || null,
          seoDescription: body.seoDescription || null,
          taxCategory: body.taxCategory || 'standard',
          requiresShipping: body.requiresShipping ?? true,
          weight: body.weight || null,
          weightUnit: body.weightUnit || 'kg',
          length: body.length || null,
          width: body.width || null,
          height: body.height || null,
          dimensionsUnit: body.dimensionsUnit || 'cm',
          
          // Create variants
          variants: {
            create: body.variants.map((variant, index) => ({
              sku: variant.sku,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice || null,
              costPerItem: variant.costPerItem || null,
              currency: variant.currency || 'ARS',
              stock: variant.stock || 0,
              trackQuantity: variant.trackQuantity ?? true,
              barcode: variant.barcode || null,
              weight: variant.weight || null,
              weightUnit: variant.weightUnit || 'kg',
              length: variant.length || null,
              width: variant.width || null,
              height: variant.height || null,
              dimensionsUnit: variant.dimensionsUnit || 'cm',
              attributes: variant.attributes || {},
              isDefault: variant.isDefault || (index === 0), // First variant is default if none specified
              options: variant.options || [],
              isActive: true
            }))
          },
          
          // Create images if provided
          ...(body.images && body.images.length > 0 ? {
            images: {
              create: body.images.map((img, index) => ({
                url: img.url,
                alt: img.alt || null,
                position: img.position !== undefined ? img.position : index,
                isDefault: img.isDefault || (index === 0) // First image is default if none specified
              }))
            }
          } : {}),
          
          // Connect categories if provided
          ...(body.categories && body.categories.length > 0 ? {
            categories: {
              connect: body.categories.map(id => ({ id }))
            }
          } : {})
        },
        include: {
          variants: {
            orderBy: { isDefault: 'desc' }
          },
          images: {
            orderBy: { position: 'asc' }
          },
          categories: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              logo: true
            }
          },
          _count: {
            select: {
              variants: true
            }
          }
        }
      });

    // Prepare the response
    const response = {
      id: newProduct.id,
      name: newProduct.name,
      slug: newProduct.slug,
      description: newProduct.description,
      status: newProduct.status,
      type: 'PHYSICAL', // Default value
      isGiftCard: false, // Default value
      trackQuantity: true, // Default value
      allowBackorder: false, // Default value
      isActive: newProduct.active,
      price: 0, // Will be updated with variants
      compareAtPrice: null,
      sku: '', // Will be updated with variants
      stock: 0, // Will be updated with variants
      image: null,
      category: null, // Will be updated with relations
      brand: newProduct.brandId ? { id: newProduct.brandId, name: '' } : null,
      variantsCount: 0, // Will be updated with relations
      variants: [], // Will be updated with relations
      images: [], // Will be updated with relations
      categories: [], // Will be updated with relations
      seoTitle: null,
      seoDescription: null,
      taxCategory: 'standard',
      requiresShipping: true,
      weight: null,
      weightUnit: 'kg',
      length: null,
      width: null,
      height: null,
      dimensionsUnit: 'cm',
      tags: [],
      createdAt: newProduct.createdAt.toISOString(),
      updatedAt: newProduct.updatedAt.toISOString()
    };

    return success(response, {}, 201);
  } catch (error) {
    console.error('Error creating product:', error);
    
    if ((error as any).code === 'P2002') {
      return errors.badRequest('A product with this slug or SKU already exists');
    }
    
    return errors.internalServerError('Error creating product');
  }
};
