import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/buyers/:id
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const buyer = await prisma.user.findUnique({
      where: { 
        id,
        role: 'BUYER'
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
        buyerProfile: {
          select: {
            preferences: true,
            wishlist: true,
            savedSellers: true,
            newsletterSubscription: true,
            lastPurchaseDate: true,
            totalPurchases: true,
            totalSpent: true,
            defaultPaymentMethod: true,
            defaultShippingAddressId: true,
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

    if (!buyer) {
      return errors.notFound('Buyer not found');
    }

    const { buyerProfile, addresses, ...userData } = buyer;

    return success({
      ...userData,
      fullName: `${userData.firstName} ${userData.lastName}`.trim(),
      ...buyerProfile,
      defaultAddress: addresses[0] || null
    });
  } catch (error) {
    console.error(`Error fetching buyer ${params.id}:`, error);
    return errors.internalServerError('Error fetching buyer');
  }
};

// PUT /api/buyers/:id
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Validar datos de entrada
    const { 
      preferences,
      wishlist,
      savedSellers,
      newsletterSubscription,
      defaultPaymentMethod,
      defaultShippingAddressId,
      isActive
    } = data;

    // Verificar si el comprador existe
    const buyerExists = await prisma.user.findUnique({
      where: { 
        id,
        role: 'BUYER' 
      },
      select: { id: true }
    });

    if (!buyerExists) {
      return errors.notFound('Buyer not found');
    }

    // Verificar si la dirección por defecto existe y pertenece al comprador
    if (defaultShippingAddressId) {
      const addressExists = await prisma.address.findFirst({
        where: { 
          id: defaultShippingAddressId,
          userId: id 
        },
        select: { id: true }
      });

      if (!addressExists) {
        return errors.badRequest('Invalid default shipping address');
      }
    }

    // Actualizar el perfil del comprador
    const updatedProfile = await prisma.buyerProfile.upsert({
      where: { userId: id },
      update: {
        preferences: preferences || {},
        wishlist: wishlist || [],
        savedSellers: savedSellers || [],
        newsletterSubscription: newsletterSubscription !== undefined 
          ? newsletterSubscription 
          : true,
        defaultPaymentMethod: defaultPaymentMethod || null,
        defaultShippingAddressId: defaultShippingAddressId || null,
        isActive: isActive !== undefined ? isActive : true
      },
      create: {
        userId: id,
        preferences: preferences || {},
        wishlist: wishlist || [],
        savedSellers: savedSellers || [],
        newsletterSubscription: newsletterSubscription !== undefined 
          ? newsletterSubscription 
          : true,
        defaultPaymentMethod: defaultPaymentMethod || null,
        defaultShippingAddressId: defaultShippingAddressId || null,
        isActive: isActive !== undefined ? isActive : true,
        totalPurchases: 0,
        totalSpent: 0
      },
      select: {
        preferences: true,
        wishlist: true,
        savedSellers: true,
        newsletterSubscription: true,
        lastPurchaseDate: true,
        totalPurchases: true,
        totalSpent: true,
        defaultPaymentMethod: true,
        defaultShippingAddressId: true,
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

    // Obtener la dirección por defecto si existe
    let defaultAddress = null;
    if (updatedProfile.defaultShippingAddressId) {
      defaultAddress = await prisma.address.findUnique({
        where: { id: updatedProfile.defaultShippingAddressId }
      });
    }

    return success({
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      ...updatedProfile,
      defaultAddress
    });
  } catch (error) {
    console.error(`Error updating buyer ${params.id}:`, error);
    return errors.internalServerError('Error updating buyer');
  }
};
