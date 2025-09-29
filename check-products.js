import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        images: true,
        categories: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('=== PRODUCTOS EN LA BASE DE DATOS ===');
    console.log(`Total: ${products.length} productos\n`);

    products.forEach((product, index) => {
      console.log(`--- Producto ${index + 1} ---`);
      console.log(`ID: ${product.id}`);
      console.log(`Nombre: ${product.name}`);
      console.log(`Estado: ${product.status}`);
      console.log(`Slug: ${product.slug}`);
      console.log(`Precio: ${product.variants[0]?.priceCents || 0} centavos`);
      console.log(`Stock: ${product.variants.reduce((total, v) => total + v.stock, 0)}`);
      console.log(`Imágenes: ${product.images.length}`);
      console.log(`Categorías: ${product.categories.length}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
