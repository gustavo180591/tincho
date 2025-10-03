import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/brands/:id
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const brand = await prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        website: true,
        isActive: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!brand) {
      return errors.notFound('Brand not found');
    }

    return success({
      ...brand,
      productsCount: brand._count.products,
      _count: undefined
    });
  } catch (error) {
    console.error(`Error fetching brand ${params.id}:`, error);
    return errors.internalServerError('Error fetching brand');
  }
};

// PUT /api/brands/:id
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Validar datos de entrada
    const { 
      name, 
      slug, 
      description, 
      logo, 
      website, 
      isActive,
      metaTitle,
      metaDescription,
      metaKeywords
    } = data;
    
    // Verificar si la marca existe
    const existingBrand = await prisma.brand.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!existingBrand) {
      return errors.notFound('Brand not found');
    }

    // Verificar si el nuevo slug ya está en uso por otra marca
    if (slug && slug !== existingBrand.slug) {
      const slugInUse = await prisma.brand.findFirst({
        where: {
          slug,
          id: { not: id }
        },
        select: { id: true }
      });
      
      if (slugInUse) {
        return errors.badRequest('Slug is already in use by another brand');
      }
    }

    // Actualizar la marca
    const updatedBrand = await prisma.brand.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined ? { description } : {}),
        ...(logo !== undefined ? { logo } : {}),
        ...(website !== undefined ? { website } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(metaTitle !== undefined ? { metaTitle } : {}),
        ...(metaDescription !== undefined ? { metaDescription } : {}),
        ...(metaKeywords !== undefined ? { metaKeywords } : {})
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        website: true,
        isActive: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    return success({
      ...updatedBrand,
      productsCount: updatedBrand._count.products,
      _count: undefined
    });
  } catch (error) {
    console.error(`Error updating brand ${params.id}:`, error);
    
    if (error.code === 'P2002') {
      return errors.badRequest('Brand with this slug already exists');
    }
    
    return errors.internalServerError('Error updating brand');
  }
};

// DELETE /api/brands/:id
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    // Verificar si la marca existe
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { 
        id: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    
    if (!brand) {
      return errors.notFound('Brand not found');
    }

    // Verificar si hay productos asociados
    if (brand._count.products > 0) {
      return errors.badRequest('Cannot delete brand with associated products');
    }

    // Eliminar la marca
    await prisma.brand.delete({
      where: { id }
    });

    return success({ success: true });
  } catch (error) {
    console.error(`Error deleting brand ${params.id}:`, error);
    return errors.internalServerError('Error deleting brand');
  }
};
