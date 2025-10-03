import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/categories
export const GET: RequestHandler = async ({ url }) => {
  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const parentId = url.searchParams.get('parentId');
    const includeProducts = url.searchParams.get('includeProducts') === 'true';
    const onlyActive = url.searchParams.get('onlyActive') !== 'false';

    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(parentId ? { parentId } : { parentId: null }),
      ...(onlyActive && { isActive: true })
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
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
          products: includeProducts ? {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true,
              isActive: true
            },
            where: { isActive: true },
            orderBy: { name: 'asc' }
          } : false,
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
        },
        skip,
        take: limit,
        orderBy: [
          { order: 'asc' },
          { name: 'asc' }
        ]
      }),
      prisma.category.count({ where })
    ]);

    return success({
      data: categories.map(category => ({
        ...category,
        subCategoriesCount: category._count.children,
        productsCount: category._count.products,
        _count: undefined
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return errors.internalServerError('Error fetching categories');
  }
};

// POST /api/categories
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validar datos de entrada
    const { 
      name, 
      slug, 
      description, 
      image, 
      parentId, 
      isActive = true, 
      order = 0,
      metaTitle,
      metaDescription,
      metaKeywords
    } = data;
    
    if (!name || !slug) {
      return errors.badRequest('Name and slug are required');
    }

    // Verificar si la categoría padre existe
    if (parentId) {
      const parentExists = await prisma.category.findUnique({
        where: { id: parentId }
      });
      
      if (!parentExists) {
        return errors.badRequest('Parent category not found');
      }
    }

    // Crear la categoría
    const newCategory = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        parentId: parentId || null,
        isActive,
        order,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        metaKeywords: metaKeywords || null
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
      ...newCategory,
      subCategoriesCount: newCategory._count.children,
      productsCount: newCategory._count.products,
      _count: undefined
    }, {}, 201);
  } catch (error) {
    console.error('Error creating category:', error);
    
    if (error.code === 'P2002') {
      return errors.badRequest('Category with this slug already exists');
    }
    
    return errors.internalServerError('Error creating category');
  }
};
