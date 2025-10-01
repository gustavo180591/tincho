import { error } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { PageServerLoad } from './$types';

const prisma = new PrismaClient();

export const load: PageServerLoad = async () => {
  try {
    // Fetch all brands with product counts
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        products: {
          select: { id: true },
          where: { active: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transform the data to include product counts
    const brandsWithCounts = brands.map(brand => ({
      ...brand,
      productCount: brand.products.length
    }));

    return {
      brands: brandsWithCounts
    };
  } catch (err) {
    console.error('Error loading brands:', err);
    throw error(500, 'Error loading brands');
  }
};
