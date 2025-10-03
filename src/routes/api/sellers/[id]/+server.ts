import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/sellers/:id
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const seller = await prisma.user.findUnique({
      where: { 
        id,
        role: 'SELLER'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        docType: true,
        docNumber: true,
        avatar: true,
        sellerProfile: {
          select: {
            storeName: true,
            description: true,
            rating: true,
            totalSales: true,
            isVerified: true,
            website: true,
            socialMedia: true,
            policies: true,
            returnPolicy: true,
            shippingPolicy: true,
            customerServiceEmail: true,
            customerServicePhone: true,
            businessHours: true,
            categories: true,
            bannerImage: true,
            logo: true,
            bankAccount: true,
            taxId: true,
            businessAddress: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true
          }
        },
        addresses: {
          where: { isDefault: true },
          take: 1
        },
        createdAt: true,
        updatedAt: true
      }
    });

    if (!seller) {
      return errors.notFound('Seller not found');
    }

    const { sellerProfile, addresses, ...userData } = seller;

    return success({
      ...userData,
      fullName: `${userData.firstName} ${userData.lastName}`.trim(),
      ...sellerProfile,
      defaultAddress: addresses[0] || null
    });
  } catch (error) {
    console.error(`Error fetching seller ${params.id}:`, error);
    return errors.internalServerError('Error fetching seller');
  }
};

// PUT /api/sellers/:id
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Validar datos de entrada
    const { 
      storeName,
      description,
      website,
      socialMedia,
      policies,
      returnPolicy,
      shippingPolicy,
      customerServiceEmail,
      customerServicePhone,
      businessHours,
      categories,
      bannerImage,
      logo,
      bankAccount,
      taxId,
      businessAddress,
      isActive
    } = data;
    
    if (!storeName) {
      return errors.badRequest('Store name is required');
    }

    // Verificar si el vendedor existe
    const sellerExists = await prisma.user.findUnique({
      where: { 
        id,
        role: 'SELLER' 
      },
      select: { id: true }
    });

    if (!sellerExists) {
      return errors.notFound('Seller not found');
    }

    // Actualizar el perfil del vendedor
    const updatedProfile = await prisma.sellerProfile.upsert({
      where: { userId: id },
      update: {
        storeName,
        description: description || null,
        website: website || null,
        socialMedia: socialMedia || {},
        policies: policies || {},
        returnPolicy: returnPolicy || null,
        shippingPolicy: shippingPolicy || null,
        customerServiceEmail: customerServiceEmail || null,
        customerServicePhone: customerServicePhone || null,
        businessHours: businessHours || {},
        categories: categories || [],
        bannerImage: bannerImage || null,
        logo: logo || null,
        bankAccount: bankAccount || null,
        taxId: taxId || null,
        businessAddress: businessAddress || {},
        isActive: isActive !== undefined ? isActive : true
      },
      create: {
        userId: id,
        storeName,
        description: description || null,
        website: website || null,
        socialMedia: socialMedia || {},
        policies: policies || {},
        returnPolicy: returnPolicy || null,
        shippingPolicy: shippingPolicy || null,
        customerServiceEmail: customerServiceEmail || null,
        customerServicePhone: customerServicePhone || null,
        businessHours: businessHours || {},
        categories: categories || [],
        bannerImage: bannerImage || null,
        logo: logo || null,
        bankAccount: bankAccount || null,
        taxId: taxId || null,
        businessAddress: businessAddress || {},
        isActive: isActive !== undefined ? isActive : true,
        rating: 0,
        totalSales: 0
      },
      select: {
        storeName: true,
        description: true,
        rating: true,
        totalSales: true,
        isVerified: true,
        website: true,
        socialMedia: true,
        policies: true,
        returnPolicy: true,
        shippingPolicy: true,
        customerServiceEmail: true,
        customerServicePhone: true,
        businessHours: true,
        categories: true,
        bannerImage: true,
        logo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Obtener datos básicos del usuario
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return success({
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      ...updatedProfile
    });
  } catch (error) {
    console.error(`Error updating seller ${params.id}:`, error);
    
    if (error.code === 'P2002') {
      return errors.badRequest('Store name already in use');
    }
    
    return errors.internalServerError('Error updating seller');
  }
};
