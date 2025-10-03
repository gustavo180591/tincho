import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Upload a new product image
export const POST: RequestHandler = async ({ request, params }) => {
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

    const data = await request.json();
    const { url, alt, position } = data;

    // Validate required fields
    if (!url) {
      return json(errors.badRequest('La URL de la imagen es requerida'), { status: 400 });
    }

    // Get the next position if not provided
    let imagePosition = position;
    if (position === undefined || position === null) {
      const lastImage = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      imagePosition = lastImage ? lastImage.position + 1 : 0;
    }

    // Create the image
    const image = await prisma.productImage.create({
      data: {
        url,
        alt: alt || null,
        position: imagePosition,
        product: { connect: { id: productId } },
      },
    });

    return json(
      success({
        id: image.id,
        url: image.url,
        alt: image.alt,
        position: image.position,
        productId: image.productId,
        createdAt: image.createdAt.toISOString(),
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al cargar la imagen:', error);
    return json(errors.internalServerError('Error al cargar la imagen'), { status: 500 });
  }
};

// Get all images for a product
export const GET: RequestHandler = async ({ params }) => {
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

    // Get all images for the product, ordered by position
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });

    // Transform the response
    const response = images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      position: image.position,
      productId: image.productId,
      createdAt: image.createdAt.toISOString(),
    }));

    return json(success(response), { status: 200 });
  } catch (error) {
    console.error('Error al obtener las imágenes del producto:', error);
    return json(errors.internalServerError('Error al obtener las imágenes del producto'), { status: 500 });
  }
};
