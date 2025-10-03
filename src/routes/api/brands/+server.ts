import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/brands
export const GET: RequestHandler = async ({ url }) => {
  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
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
      ...(onlyActive && { isActive: true })
    };

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({
        where,
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
            orderBy: { name: 'asc' },
            take: 5 // Limitar productos por marca para no sobrecargar la respuesta
          } : false,
          _count: {
            select: {
              products: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { name: 'asc' }
        ]
      }),
      prisma.brand.count({ where })
    ]);

    return success({
      data: brands.map(brand => ({
        ...brand,
        productsCount: brand._count.products,
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
    console.error('Error fetching brands:', error);
    return errors.internalServerError('Error fetching brands');
  }
};

// POST /api/brands
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validar datos de entrada
    const { 
      name, 
      slug, 
      description, 
      logo, 
      website, 
      isActive = true,
      metaTitle,
      metaDescription,
      metaKeywords
    } = data;
    
    if (!name || !slug) {
      return errors.badRequest('Name and slug are required');
    }

    // Verificar si ya existe una marca con el mismo slug
    const existingBrand = await prisma.brand.findUnique({
      where: { slug },
      select: { id: true }
    });
    
    if (existingBrand) {
      return errors.badRequest('Brand with this slug already exists');
    }

    // Crear la marca
    const newBrand = await prisma.brand.create({
      data: {
        name,
        slug,
        description: description || null,
        logo: logo || null,
        website: website || null,
        isActive,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        metaKeywords: metaKeywords || null
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
      ...newBrand,
      productsCount: newBrand._count.products,
      _count: undefined
    }, {}, 201);
  } catch (error) {
    console.error('Error creating brand:', error);
    
    if (error.code === 'P2002') {
      return errors.badRequest('Brand with this slug already exists');
    }
    
    return errors.internalServerError('Error creating brand');
  }
};
