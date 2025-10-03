import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { Prisma } from '@prisma/client';

// Tipos para las respuestas
interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  costPerItem: number | null;
  sku: string | null;
  barcode: string | null;
  trackQuantity: boolean;
  quantity: number | null;
  weight: number | null;
  weightUnit: string;
  status: string;
  active: boolean;
  isGiftCard: boolean;
  requiresShipping: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  brand: {
    id: string;
    name: string;
  } | null;
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    position: number;
  }>;
  variants: Array<{
    id: string;
    sku: string | null;
    barcode: string | null;
    price: number;
    compareAtPrice: number | null;
    costPerItem: number | null;
    trackQuantity: boolean;
    quantity: number | null;
    weight: number | null;
    weightUnit: string;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    position: number;
  }>;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  options: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

// Obtener un producto por ID
export const GET: RequestHandler = async ({ params }) => {
  try {
    const productId = params.id;
    
    if (!productId) {
      return json(errors.badRequest('ID de producto no proporcionado'), { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            url: true,
            alt: true,
            position: true,
          },
        },
        variants: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            sku: true,
            barcode: true,
            price: true,
            compareAtPrice: true,
            costPerItem: true,
            trackQuantity: true,
            quantity: true,
            weight: true,
            weightUnit: true,
            option1: true,
            option2: true,
            option3: true,
            position: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        options: {
          select: {
            id: true,
            name: true,
            values: true,
          },
        },
      },
    });

    if (!product) {
      return json(errors.notFound('Producto no encontrado'), { status: 404 });
    }

    // Transformar fechas a strings ISO
    const response: ProductResponse = {
      ...product,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    return json(success(response), { status: 200 });
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    return json(errors.internalServerError('Error al obtener el producto'), { status: 500 });
  }
};

// Actualizar un producto existente
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const productId = params.id;
    
    if (!productId) {
      return json(errors.badRequest('ID de producto no proporcionado'), { status: 400 });
    }

    // Verificar si el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!existingProduct) {
      return json(errors.notFound('Producto no encontrado'), { status: 404 });
    }

    const data = await request.json();
    const {
      name,
      description,
      price,
      compareAtPrice,
      costPerItem,
      sku,
      barcode,
      trackQuantity,
      weight,
      weightUnit = 'g',
      status = 'draft',
      active = true,
      isGiftCard = false,
      requiresShipping = true,
      seoTitle,
      seoDescription,
      brandId,
      variants = [],
      categories = [],
      options = [],
      images = [],
    } = data;

    // Validaciones básicas
    if (!name || !name.trim()) {
      return json(errors.badRequest('El nombre del producto es requerido'), { status: 400 });
    }

    if (price === undefined || price === null) {
      return json(errors.badRequest('El precio es requerido'), { status: 400 });
    }

    if (variants.length === 0) {
      return json(errors.badRequest('Se requiere al menos una variante'), { status: 400 });
    }

    // Verificar si el slug ya está en uso por otro producto
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');

    const existingSlug = await prisma.product.findFirst({
      where: {
        slug,
        NOT: { id: productId },
      },
    });

    if (existingSlug) {
      return json(errors.conflict('Ya existe un producto con un nombre similar'), { status: 409 });
    }

    // Verificar que el brandId existe si se proporciona
    if (brandId) {
      const brandExists = await prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (!brandExists) {
        return json(errors.badRequest('La marca especificada no existe'), { status: 400 });
      }
    }

    // Verificar que las categorías existen
    if (categories && categories.length > 0) {
      const categoryCount = await prisma.category.count({
        where: { id: { in: categories } },
      });

      if (categoryCount !== categories.length) {
        return json(errors.badRequest('Una o más categorías no existen'), { status: 400 });
      }
    }

    // Actualizar el producto
    const updatedProduct = await prisma.$transaction(async (prisma) => {
      // Actualizar el producto
      const product = await prisma.product.update({
        where: { id: productId },
        data: {
          name,
          slug,
          description,
          price,
          compareAtPrice,
          costPerItem,
          sku,
          barcode,
          trackQuantity,
          weight,
          weightUnit,
          status,
          active,
          isGiftCard,
          requiresShipping,
          seoTitle,
          seoDescription,
          brand: brandId ? { connect: { id: brandId } } : undefined,
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Actualizar categorías
      if (categories && categories.length > 0) {
        await prisma.product.update({
          where: { id: productId },
          data: {
            categories: {
              set: categories.map((categoryId: string) => ({ id: categoryId })),
            },
          },
        });
      }

      // Eliminar variantes existentes
      await prisma.variant.deleteMany({
        where: { productId },
      });

      // Crear nuevas variantes
      const createdVariants = await Promise.all(
        variants.map(async (variant: any, index: number) => {
          return prisma.variant.create({
            data: {
              sku: variant.sku || null,
              barcode: variant.barcode || null,
              price: variant.price || 0,
              compareAtPrice: variant.compareAtPrice || null,
              costPerItem: variant.costPerItem || null,
              trackQuantity: variant.trackQuantity ?? true,
              quantity: variant.quantity || 0,
              weight: variant.weight || null,
              weightUnit: variant.weightUnit || 'g',
              option1: variant.option1 || null,
              option2: variant.option2 || null,
              option3: variant.option3 || null,
              position: variant.position !== undefined ? variant.position : index,
              product: { connect: { id: productId } },
            },
          });
        })
      );

      // Eliminar imágenes existentes
      await prisma.image.deleteMany({
        where: { productId },
      });

      // Crear nuevas imágenes
      const createdImages = await Promise.all(
        images.map(async (image: any, index: number) => {
          return prisma.image.create({
            data: {
              url: image.url,
              alt: image.alt || null,
              position: image.position !== undefined ? image.position : index,
              product: { connect: { id: productId } },
            },
          });
        })
      );

      // Eliminar opciones existentes
      await prisma.option.deleteMany({
        where: { productId },
      });

      // Crear nuevas opciones
      const createdOptions = await Promise.all(
        options.map(async (option: any, index: number) => {
          return prisma.option.create({
            data: {
              name: option.name,
              values: option.values || [],
              position: option.position !== undefined ? option.position : index,
              product: { connect: { id: productId } },
            },
          });
        })
      );

      // Obtener el producto actualizado con todas sus relaciones
      const fullProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          images: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              url: true,
              alt: true,
              position: true,
            },
          },
          variants: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              sku: true,
              barcode: true,
              price: true,
              compareAtPrice: true,
              costPerItem: true,
              trackQuantity: true,
              quantity: true,
              weight: true,
              weightUnit: true,
              option1: true,
              option2: true,
              option3: true,
              position: true,
            },
          },
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          options: {
            select: {
              id: true,
              name: true,
              values: true,
              position: true,
            },
            orderBy: { position: 'asc' },
          },
        },
      });

      return fullProduct;
    });

    // Transformar fechas a strings ISO
    const response = {
      ...updatedProduct,
      createdAt: updatedProduct?.createdAt.toISOString(),
      updatedAt: updatedProduct?.updatedAt.toISOString(),
    };

    return json(success(response), { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    return json(errors.internalServerError('Error al actualizar el producto'), { status: 500 });
  }
};

// Eliminar un producto
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const productId = params.id;
    
    if (!productId) {
      return json(errors.badRequest('ID de producto no proporcionado'), { status: 400 });
    }

    // Verificar si el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          select: { id: true },
        },
        orders: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!existingProduct) {
      return json(errors.notFound('Producto no encontrado'), { status: 404 });
    }

    // Verificar si el producto tiene órdenes asociadas
    if (existingProduct.orders && existingProduct.orders.length > 0) {
      return json(
        errors.conflict('No se puede eliminar el producto porque tiene órdenes asociadas'),
        { status: 409 }
      );
    }

    // Eliminar el producto (las relaciones se eliminarán en cascada)
    await prisma.product.delete({
      where: { id: productId },
    });

    return json(success({ id: productId }), { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el producto:', error);
    return json(errors.internalServerError('Error al eliminar el producto'), { status: 500 });
  }
};
