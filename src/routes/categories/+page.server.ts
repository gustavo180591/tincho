import { error } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { PageServerLoad } from './$types';

const prisma = new PrismaClient();

interface CategoryWithChildren {
  id: string;
  name: string;
  slug: string;
  attributes: any;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    attributes: any;
    products: Array<{ id: string }>;
    productCount?: number;
    image?: string | null;
  }>;
  products: Array<{ id: string }>;
  productCount?: number;
}

export const load: PageServerLoad = async () => {
  try {
    // Fetch all categories with their subcategories and product counts
    const categories = await prisma.category.findMany({
      where: {
        parentId: null // Only get top-level categories
      },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            attributes: true,
            products: {
              select: { id: true },
              where: { active: true }
            }
          }
        },
        products: {
          select: { id: true },
          where: { active: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transform the data to match our needs
    const transformedCategories: CategoryWithChildren[] = categories.map((category: any) => ({
      ...category,
      children: category.children.map((subcategory: any) => ({
        ...subcategory,
        // Get the first image from attributes if available, or use a placeholder
        image: subcategory.attributes?.image || null,
        productCount: subcategory.products?.length || 0
      })),
      productCount: category.products?.length || 0
    }));

    return {
      categories: transformedCategories
    };
  } catch (err) {
    console.error('Error loading categories:', err);
    throw error(500, 'Error loading categories');
  }
}
