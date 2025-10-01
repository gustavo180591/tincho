import { PrismaClient, UserRole, DocType, Condition, CurrencyCode } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // 1. Crear usuario administrador
  console.log('👤 Creando usuario administrador...');
  const adminEmail = 'admin@tincho.com';
  const adminPassword = await hash('admin123', 10);
  
  // Crear usuario administrador
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'Tincho',
      role: UserRole.ADMIN,
      phone: '+541112345678',
      docType: DocType.DNI,
      docNumber: '12345678',
    },
  });

  // 3. Crear categorías principales
  console.log('🏷️ Creando categorías...');
  const categories = [
    { name: 'Tecnología', slug: 'tecnologia' },
    { name: 'Hogar', slug: 'hogar' },
    { name: 'Deportes', slug: 'deportes' },
    { name: 'Moda', slug: 'moda' },
    { name: 'Belleza', slug: 'belleza' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  // 4. Crear marcas
  console.log('🏭 Creando marcas...');
  const brands = [
    { name: 'Samsung', slug: 'samsung' },
    { name: 'Apple', slug: 'apple' },
    { name: 'Sony', slug: 'sony' },
    { name: 'Nike', slug: 'nike' },
    { name: 'Adidas', slug: 'adidas' },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: brand,
    });
  }

  // 5. Crear tienda demo
  console.log('🏪 Creando tienda demo...');
  const store = await prisma.store.upsert({
    where: { slug: 'tienda-demo' },
    update: {},
    create: {
      name: 'Tienda Demo',
      slug: 'tienda-demo',
      description: 'Tienda de demostración de Tincho',
      seller: {
        create: {
          nickname: 'tiendademo',
          description: 'Vendemos productos de calidad',
          ratingAvg: 0,
          ratingCount: 0,
          verified: true,
          user: {
            create: {
              email: 'vendedor@tincho.com',
              passwordHash: await hash('vendedor123', 10),
              firstName: 'Vendedor',
              lastName: 'Demo',
              role: UserRole.SELLER,
              phone: '+541112345679',
              docType: DocType.CUIT,
              docNumber: '20123456789',
            },
          },
        },
      },
    },
  });

  // 6. Crear productos de ejemplo
  console.log('📦 Creando productos de ejemplo...');
  const products = [
    {
      title: 'Smartphone Avanzado',
      slug: 'smartphone-avanzado',
      description: 'El último smartphone con las mejores características',
      brandSlug: 'samsung',
      categorySlug: 'tecnologia',
      condition: Condition.NEW,
      variations: [
        {
          code: 'SMARTPHONE-128GB',
          variantValues: { color: 'Negro', storage: '128GB' },
          priceAmount: 999.99,
          priceCurrency: CurrencyCode.USD,
          listPrice: 1099.99,
          stock: 10,
          images: [
            'https://via.placeholder.com/500x500?text=Smartphone+Negro+Front',
            'https://via.placeholder.com/500x500?text=Smartphone+Negro+Back',
          ],
        },
        {
          code: 'SMARTPHONE-256GB',
          variantValues: { color: 'Azul', storage: '256GB' },
          priceAmount: 1099.99,
          priceCurrency: CurrencyCode.USD,
          listPrice: 1199.99,
          stock: 5,
          images: [
            'https://via.placeholder.com/500x500?text=Smartphone+Azul+Front',
            'https://via.placeholder.com/500x500?text=Smartphone+Azul+Back',
          ],
        },
      ],
    },
    {
      title: 'Auriculares Inalámbricos',
      slug: 'auriculares-inalambricos',
      description: 'Auriculares con cancelación de ruido',
      brandSlug: 'sony',
      categorySlug: 'tecnologia',
      condition: Condition.NEW,
      variations: [
        {
          code: 'AURICULARES-BLACK',
          variantValues: { color: 'Negro' },
          priceAmount: 199.99,
          priceCurrency: CurrencyCode.USD,
          listPrice: 249.99,
          stock: 20,
          images: [
            'https://via.placeholder.com/500x500?text=Auriculares+Negro',
          ],
        },
      ],
    },
  ];

  for (const productData of products) {
    const { variations, brandSlug, categorySlug, ...product } = productData;
    
    // Primero, obtener el ID de la marca y la categoría
    const brand = await prisma.brand.findUnique({
      where: { slug: brandSlug },
    });

    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    });

    if (!brand || !category) {
      console.error(`No se encontró la marca (${brandSlug}) o categoría (${categorySlug})`);
      continue;
    }

    // Crear el producto
    const createdProduct = await prisma.product.create({
      data: {
        ...product,
        storeId: store.id,
        brandId: brand.id,
        categoryId: category.id,
      },
    });

    // Crear las variantes (SKUs) para el producto
    for (const variation of variations) {
      const { images, ...skuData } = variation;
      
      // Crear la variante (SKU)
      await prisma.sku.create({
        data: {
          ...skuData,
          productId: createdProduct.id,
        },
      });

      // Crear las imágenes para la variante
      for (let i = 0; i < images.length; i++) {
        await prisma.productImage.create({
          data: {
            productId: createdProduct.id,
            url: images[i],
            position: i,
            alt: `${product.title} - ${Object.values(variation.variantValues).join(' ')}`,
          },
        });
      }
    }
  }

  console.log('✅ Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
