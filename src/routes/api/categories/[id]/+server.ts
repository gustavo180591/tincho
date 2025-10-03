import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/categories/:id
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        isActive: true,
        order: true,
        parentId: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            isActive: true,
            _count: {
              select: {
                products: true,
                children: true
              }
            }
          },
          orderBy: [
            { order: 'asc' },
            { name: 'asc' }
          ]
        },
        _count: {
          select: {
            products: true,
            children: true
          }
        }
      }
    });

    if (!category) {
      return errors.notFound('Category not found');
    }

    return success({
      ...category,
      subCategories: category.children.map(child => ({
        ...child,
        productsCount: child._count.products,
        subCategoriesCount: child._count.children,
        _count: undefined
      })),
      children: undefined,
      productsCount: category._count.products,
      subCategoriesCount: category._count.children,
      _count: undefined
    });
  } catch (error) {
    console.error(`Error fetching category ${params.id}:`, error);
    return errors.internalServerError('Error fetching category');
  }
};

// PUT /api/categories/:id
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Validar datos de entrada
    const { 
      name, 
      slug, 
      description, 
      image, 
      parentId, 
      isActive, 
      order,
      metaTitle,
      metaDescription,
      metaKeywords
    } = data;

    // Verificar si la categoría existe
    const categoryExists = await prisma.category.findUnique({
      where: { id }
    });

    if (!categoryExists) {
      return errors.notFound('Category not found');
    }

    // Verificar si la categoría padre existe (si se está actualizando)
    if (parentId) {
      if (parentId === id) {
        return errors.badRequest('Category cannot be its own parent');
      }

      const parentExists = await prisma.category.findUnique({
        where: { id: parentId }
      });
      
      if (!parentExists) {
        return errors.badRequest('Parent category not found');
      }

      // Verificar si la nueva jerarquía crearía un bucle
      let currentParentId = parentId;
      while (currentParentId) {
        if (currentParentId === id) {
          return errors.badRequest('Circular reference in category hierarchy');
        }
        const parent = await prisma.category.findUnique({
          where: { id: currentParentId },
          select: { parentId: true }
        });
        currentParentId = parent?.parentId;
      }
    }

    // Actualizar la categoría
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(metaKeywords !== undefined && { metaKeywords })
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        isActive: true,
        order: true,
        parentId: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        _count: {
          select: {
            children: true,
            products: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    return success({
      ...updatedCategory,
      subCategoriesCount: updatedCategory._count.children,
      productsCount: updatedCategory._count.products,
      _count: undefined
    });
  } catch (error) {
    console.error(`Error updating category ${params.id}:`, error);
    
    if (error.code === 'P2002') {
      return errors.badRequest('Category with this slug already exists');
    }
    
    return errors.internalServerError('Error updating category');
  }
};

// DELETE /api/categories/:id
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    // Verificar si la categoría existe
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            products: true
          }
        }
      }
    });

    if (!category) {
      return errors.notFound('Category not found');
    }

    // Verificar si la categoría tiene subcategorías o productos
    if (category._count.children > 0) {
      return errors.badRequest('Cannot delete category with subcategories');
    }

    if (category._count.products > 0) {
      return errors.badRequest('Cannot delete category with associated products');
    }

    // Eliminar la categoría
    await prisma.category.delete({
      where: { id }
    });

    return success({ success: true });
  } catch (error) {
    console.error(`Error deleting category ${params.id}:`, error);
    return errors.internalServerError('Error deleting category');
  }
};
