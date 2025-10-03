import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Types
type ShippingAddress = {
  firstName: string;
  lastName: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
};

type ShippingMethod = {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDelivery: string;
};

type ShippingResponse = {
  address: ShippingAddress | null;
  availableMethods: ShippingMethod[];
  selectedMethod: ShippingMethod | null;
};

// Get shipping methods and address
export const GET: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return json(errors.unauthorized('Debe iniciar sesión para ver los métodos de envío'), { status: 401 });
    }

    // Get user's default shipping address
    const defaultAddress = await prisma.address.findFirst({
      where: {
        userId,
        isDefaultShipping: true,
      },
    });

    // In a real app, you would calculate these based on the address and cart contents
    const availableMethods: ShippingMethod[] = [
      {
        id: 'standard',
        name: 'Envío Estándar',
        description: 'Entrega en 3-5 días hábiles',
        price: 5.99,
        estimatedDelivery: '3-5 días hábiles',
      },
      {
        id: 'express',
        name: 'Envío Express',
        description: 'Entrega en 1-2 días hábiles',
        price: 12.99,
        estimatedDelivery: '1-2 días hábiles',
      },
      {
        id: 'pickup',
        name: 'Recogida en Tienda',
        description: 'Recoge tu pedido en nuestra tienda',
        price: 0,
        estimatedDelivery: 'Disponible en 1 hora',
      },
    ];

    // Get selected shipping method from user's preferences or use default
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { defaultShippingMethod: true },
    });

    const selectedMethodId = userPreferences?.defaultShippingMethod || 'standard';
    const selectedMethod = availableMethods.find((m) => m.id === selectedMethodId) || availableMethods[0];

    const response: ShippingResponse = {
      address: defaultAddress ? {
        firstName: defaultAddress.firstName,
        lastName: defaultAddress.lastName,
        address: defaultAddress.street,
        address2: defaultAddress.street2 || undefined,
        city: defaultAddress.city?.name || '',
        state: defaultAddress.state?.name || '',
        postalCode: defaultAddress.postalCode || '',
        country: defaultAddress.country?.name || '',
        phone: defaultAddress.phone || undefined,
      } : null,
      availableMethods,
      selectedMethod,
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener métodos de envío:', error);
    return json(errors.internalServerError('Error al obtener métodos de envío'), { status: 500 });
  }
};

// Update shipping information
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return json(errors.unauthorized('Debe iniciar sesión para actualizar la información de envío'), { status: 401 });
    }

    const data = await request.json();
    const { 
      address, 
      shippingMethodId,
      saveAsDefault = false,
      useBillingAddress = false
    } = data;

    // Validate required fields
    if (!address && !shippingMethodId) {
      return json(errors.badRequest('Se requiere una dirección o un método de envío'), { status: 400 });
    }

    // Start a transaction
    return await prisma.$transaction(async (prisma) => {
      // If address is provided, create or update it
      let shippingAddressId: string | undefined;
      
      if (address) {
        // Validate required address fields
        const requiredFields = ['firstName', 'lastName', 'address', 'city', 'state', 'postalCode', 'country'];
        const missingFields = requiredFields.filter(field => !address[field]);
        
        if (missingFields.length > 0) {
          return json(
            errors.badRequest(`Faltan campos requeridos: ${missingFields.join(', ')}`), 
            { status: 400 }
          );
        }

        // Find or create the country
        let country = await prisma.country.findFirst({
          where: { name: address.country },
        });

        if (!country) {
          country = await prisma.country.create({
            data: { name: address.country },
          });
        }

        // Find or create the state
        let state = await prisma.state.findFirst({
          where: { 
            name: address.state,
            countryId: country.id,
          },
        });

        if (!state) {
          state = await prisma.state.create({
            data: { 
              name: address.state,
              countryId: country.id,
            },
          });
        }

        // Find or create the city
        let city = await prisma.city.findFirst({
          where: { 
            name: address.city,
            stateId: state.id,
          },
        });

        if (!city) {
          city = await prisma.city.create({
            data: { 
              name: address.city,
              stateId: state.id,
            },
          });
        }

        // Create or update the address
        const addressData = {
          firstName: address.firstName,
          lastName: address.lastName,
          street: address.address,
          street2: address.address2 || null,
          postalCode: address.postalCode,
          phone: address.phone || null,
          cityId: city.id,
          stateId: state.id,
          countryId: country.id,
          userId,
          isDefaultShipping: saveAsDefault,
        };

        // If this is set as default, unset any existing default shipping addresses
        if (saveAsDefault) {
          await prisma.address.updateMany({
            where: { 
              userId,
              isDefaultShipping: true,
              id: { not: address.id },
            },
            data: { isDefaultShipping: false },
          });
        }

        if (address.id) {
          // Update existing address
          await prisma.address.update({
            where: { id: address.id },
            data: addressData,
          });
          shippingAddressId = address.id;
        } else {
          // Create new address
          const newAddress = await prisma.address.create({
            data: addressData,
          });
          shippingAddressId = newAddress.id;
        }
      }

      // Update user preferences with selected shipping method if provided
      if (shippingMethodId) {
        await prisma.userPreferences.upsert({
          where: { userId },
          update: { defaultShippingMethod: shippingMethodId },
          create: { 
            userId, 
            defaultShippingMethod: shippingMethodId,
          },
        });
      }

      // Get the updated shipping information
      const updatedAddress = shippingAddressId 
        ? await prisma.address.findUnique({
            where: { id: shippingAddressId },
            include: {
              city: { include: { state: { include: { country: true } } } },
            },
          })
        : null;

      // Get available shipping methods (in a real app, these would be calculated based on address)
      const availableMethods: ShippingMethod[] = [
        {
          id: 'standard',
          name: 'Envío Estándar',
          description: 'Entrega en 3-5 días hábiles',
          price: 5.99,
          estimatedDelivery: '3-5 días hábiles',
        },
        {
          id: 'express',
          name: 'Envío Express',
          description: 'Entrega en 1-2 días hábiles',
          price: 12.99,
          estimatedDelivery: '1-2 días hábiles',
        },
        {
          id: 'pickup',
          name: 'Recogida en Tienda',
          description: 'Recoge tu pedido en nuestra tienda',
          price: 0,
          estimatedDelivery: 'Disponible en 1 hora',
        },
      ];

      // Get the selected shipping method
      const selectedMethod = shippingMethodId 
        ? availableMethods.find(m => m.id === shippingMethodId) 
        : availableMethods[0];

      const response: ShippingResponse = {
        address: updatedAddress ? {
          id: updatedAddress.id,
          firstName: updatedAddress.firstName,
          lastName: updatedAddress.lastName,
          address: updatedAddress.street,
          address2: updatedAddress.street2 || undefined,
          city: updatedAddress.city?.name || '',
          state: updatedAddress.city?.state?.name || '',
          country: updatedAddress.city?.state?.country?.name || '',
          postalCode: updatedAddress.postalCode || '',
          phone: updatedAddress.phone || undefined,
        } : null,
        availableMethods,
        selectedMethod: selectedMethod || null,
      };

      return json(success(response));
    });
  } catch (error) {
    console.error('Error al actualizar la información de envío:', error);
    return json(errors.internalServerError('Error al actualizar la información de envío'), { status: 500 });
  }
};
