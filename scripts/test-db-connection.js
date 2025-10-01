import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Conectando a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Probar una consulta simple
    const users = await prisma.user.findMany({
      take: 5
    });
    
    console.log(`\nUsuarios encontrados: ${users.length}`);
    console.log(users);
    
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
