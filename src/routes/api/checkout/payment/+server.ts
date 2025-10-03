import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import { v4 as uuidv4 } from 'uuid';

// Types
type PaymentMethod = {
  id: string;
  type: 'credit_card' | 'paypal' | 'bank_transfer' | 'cash_on_delivery';
  last4?: string;
  brand?: string;
  name?: string;
  isDefault: boolean;
  expiresAt?: string;
};

type PaymentResponse = {
  paymentMethods: PaymentMethod[];
  selectedMethod: PaymentMethod | null;
  billingAddress: any | null;
  saveCard: boolean;
};

// Get payment methods and billing address
export const GET: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return json(errors.unauthorized('Debe iniciar sesión para ver los métodos de pago'), { status: 401 });
    }

    // Get user's payment methods
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });

    // Get user's default billing address
    const defaultBillingAddress = await prisma.address.findFirst({
      where: {
        userId,
        isDefaultBilling: true,
      },
      include: {
        city: { include: { state: { include: { country: true } } } },
      },
    });

    // Transform payment methods for the response
    const transformedMethods: PaymentMethod[] = paymentMethods.map((method) => ({
      id: method.id,
      type: method.type as any,
      last4: method.lastFourDigits || undefined,
      brand: method.brand || undefined,
      name: method.name || undefined,
      isDefault: method.isDefault,
      expiresAt: method.expiryDate?.toISOString(),
    }));

    // Add default payment methods if none exist
    if (transformedMethods.length === 0) {
      transformedMethods.push(
        {
          id: 'credit_card',
          type: 'credit_card',
          name: 'Tarjeta de crédito/débito',
          isDefault: true,
        },
        {
          id: 'paypal',
          type: 'paypal',
          name: 'PayPal',
          isDefault: false,
        },
        {
          id: 'bank_transfer',
          type: 'bank_transfer',
          name: 'Transferencia bancaria',
          isDefault: false,
        },
        {
          id: 'cash_on_delivery',
          type: 'cash_on_delivery',
          name: 'Pago contra entrega',
          isDefault: false,
        }
      );
    }

    const response: PaymentResponse = {
      paymentMethods: transformedMethods,
      selectedMethod: transformedMethods.find((m) => m.isDefault) || transformedMethods[0] || null,
      billingAddress: defaultBillingAddress ? {
        id: defaultBillingAddress.id,
        firstName: defaultBillingAddress.firstName,
        lastName: defaultBillingAddress.lastName,
        address: defaultBillingAddress.street,
        address2: defaultBillingAddress.street2 || undefined,
        city: defaultBillingAddress.city?.name || '',
        state: defaultBillingAddress.city?.state?.name || '',
        country: defaultBillingAddress.city?.state?.country?.name || '',
        postalCode: defaultBillingAddress.postalCode || '',
        phone: defaultBillingAddress.phone || undefined,
      } : null,
      saveCard: false, // Default to not saving card
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    return json(errors.internalServerError('Error al obtener métodos de pago'), { status: 500 });
  }
};

// Process payment
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return json(errors.unauthorized('Debe iniciar sesión para procesar el pago'), { status: 401 });
    }

    const data = await request.json();
    const { 
      paymentMethodId, 
      paymentDetails, 
      billingAddress, 
      saveCard = false,
      useShippingAddress = false,
      cartId,
    } = data;

    // Validate required fields
    if (!paymentMethodId || !cartId) {
      return json(errors.badRequest('Se requiere un método de pago y un carrito'), { status: 400 });
    }

    // Get the cart with items
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return json(errors.notFound('Carrito no encontrado'), { status: 404 });
    }

    if (cart.items.length === 0) {
      return json(errors.badRequest('El carrito está vacío'), { status: 400 });
    }

    // Calculate totals
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.priceAt) * item.qty,
      0
    );

    // In a real app, you would calculate shipping and taxes based on the shipping method
    const shippingCost = 5.99; // Example shipping cost
    const taxRate = 0.1; // 10% tax rate
    const taxAmount = subtotal * taxRate;
    const total = subtotal + shippingCost + taxAmount;

    // Process payment (simplified - in a real app, you'd integrate with a payment provider)
    let paymentMethod;
    let billingAddressId: string | null = null;

    // Start a transaction
    return await prisma.$transaction(async (prisma) => {
      // Handle billing address
      if (billingAddress && !useShippingAddress) {
        // Validate required address fields
        const requiredFields = ['firstName', 'lastName', 'address', 'city', 'state', 'postalCode', 'country'];
        const missingFields = requiredFields.filter(field => !billingAddress[field]);
        
        if (missingFields.length > 0) {
          return json(
            errors.badRequest(`Faltan campos requeridos en la dirección de facturación: ${missingFields.join(', ')}`), 
            { status: 400 }
          );
        }

        // Find or create the country
        let country = await prisma.country.findFirst({
          where: { name: billingAddress.country },
        });

        if (!country) {
          country = await prisma.country.create({
            data: { name: billingAddress.country },
          });
        }

        // Find or create the state
        let state = await prisma.state.findFirst({
          where: { 
            name: billingAddress.state,
            countryId: country.id,
          },
        });

        if (!state) {
          state = await prisma.state.create({
            data: { 
              name: billingAddress.state,
              countryId: country.id,
            },
          });
        }

        // Find or create the city
        let city = await prisma.city.findFirst({
          where: { 
            name: billingAddress.city,
            stateId: state.id,
          },
        });

        if (!city) {
          city = await prisma.city.create({
            data: { 
              name: billingAddress.city,
              stateId: state.id,
            },
          });
        }

        // Create or update the billing address
        const addressData = {
          firstName: billingAddress.firstName,
          lastName: billingAddress.lastName,
          street: billingAddress.address,
          street2: billingAddress.address2 || null,
          postalCode: billingAddress.postalCode,
          phone: billingAddress.phone || null,
          cityId: city.id,
          stateId: state.id,
          countryId: country.id,
          userId,
          isDefaultBilling: saveCard, // If saving card, also set as default billing
        };

        // If this is set as default, unset any existing default billing addresses
        if (saveCard) {
          await prisma.address.updateMany({
            where: { 
              userId,
              isDefaultBilling: true,
              id: { not: billingAddress.id },
            },
            data: { isDefaultBilling: false },
          });
        }

        if (billingAddress.id) {
          // Update existing address
          await prisma.address.update({
            where: { id: billingAddress.id },
            data: addressData,
          });
          billingAddressId = billingAddress.id;
        } else {
          // Create new address
          const newAddress = await prisma.address.create({
            data: addressData,
          });
          billingAddressId = newAddress.id;
        }
      }

      // Handle payment method
      if (paymentMethodId === 'credit_card' && paymentDetails) {
        // In a real app, you would validate the payment details and process the payment
        // This is a simplified version that just creates a payment method record
        
        // Validate card details
        const { cardNumber, expiry, cvv, nameOnCard } = paymentDetails;
        
        if (!cardNumber || !expiry || !cvv || !nameOnCard) {
          return json(errors.badRequest('Faltan detalles de la tarjeta'), { status: 400 });
        }

        // Simple validation (in a real app, use a proper validation library)
        const cardNumberRegex = /^\d{13,19}$/;
        if (!cardNumberRegex.test(cardNumber.replace(/\s+/g, ''))) {
          return json(errors.badRequest('Número de tarjeta no válido'), { status: 400 });
        }

        const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
        if (!expiryRegex.test(expiry)) {
          return json(errors.badRequest('Fecha de vencimiento no válida (MM/YY)'), { status: 400 });
        }

        const cvvRegex = /^\d{3,4}$/;
        if (!cvvRegex.test(cvv)) {
          return json(errors.badRequest('CVV no válido'), { status: 400 });
        }

        // Get card brand from card number (simplified)
        let brand = 'unknown';
        const firstDigit = cardNumber[0];
        
        if (firstDigit === '4') {
          brand = 'visa';
        } else if (firstDigit === '5') {
          brand = 'mastercard';
        } else if (firstDigit === '3') {
          brand = 'amex';
        } else if (firstDigit === '6') {
          brand = 'discover';
        }

        // In a real app, you would tokenize the card with a payment processor
        // and store the token instead of the actual card details
        
        if (saveCard) {
          // Unset any existing default payment methods
          await prisma.paymentMethod.updateMany({
            where: { 
              userId,
              isDefault: true,
            },
            data: { isDefault: false },
          });

          // Create a new payment method
          paymentMethod = await prisma.paymentMethod.create({
            data: {
              id: `pm_${uuidv4()}`,
              userId,
              type: 'credit_card',
              brand,
              lastFourDigits: cardNumber.slice(-4),
              expiryDate: new Date(`20${expiry.split('/')[1]}-${expiry.split('/')[0]}-01`),
              name: nameOnCard,
              isDefault: true,
              billingAddressId,
            },
          });
        }

        // Process payment (in a real app, you would call a payment processor API here)
        const paymentIntent = {
          id: `pi_${uuidv4()}`,
          amount: Math.round(total * 100), // in cents
          currency: 'usd',
          status: 'succeeded',
          payment_method: paymentMethod?.id || `card_${uuidv4()}`,
          created: Math.floor(Date.now() / 1000),
        };

        // Create a payment record
        const payment = await prisma.payment.create({
          data: {
            id: paymentIntent.id,
            userId,
            amount: total,
            currency: 'USD',
            status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'FAILED',
            paymentMethod: paymentMethod?.id || 'credit_card',
            paymentMethodType: 'credit_card',
            paymentIntentId: paymentIntent.id,
            billingAddressId,
            metadata: {
              cardBrand: brand,
              last4: cardNumber.slice(-4),
            },
          },
        });

        // Return the payment result
        return json(success({
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: {
            id: paymentMethod?.id || 'credit_card',
            type: 'credit_card',
            brand: brand,
            last4: cardNumber.slice(-4),
            name: nameOnCard,
            isDefault: saveCard,
          },
          billingAddress: billingAddressId ? {
            id: billingAddressId,
            // Include other address fields if needed
          } : null,
        }));
      } else if (paymentMethodId === 'paypal') {
        // Handle PayPal payment
        // In a real app, you would integrate with the PayPal API
        const paymentIntent = {
          id: `pi_${uuidv4()}`,
          amount: Math.round(total * 100), // in cents
          currency: 'usd',
          status: 'succeeded',
          payment_method: 'paypal',
          created: Math.floor(Date.now() / 1000),
        };

        // Create a payment record
        const payment = await prisma.payment.create({
          data: {
            id: paymentIntent.id,
            userId,
            amount: total,
            currency: 'USD',
            status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
            paymentMethod: 'paypal',
            paymentMethodType: 'paypal',
            paymentIntentId: paymentIntent.id,
            billingAddressId,
          },
        });

        return json(success({
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: {
            id: 'paypal',
            type: 'paypal',
            isDefault: false,
          },
          redirectUrl: `https://paypal.com/checkout?paymentId=${payment.id}`, // Example
        }));
      } else if (paymentMethodId === 'bank_transfer') {
        // Handle bank transfer
        const payment = await prisma.payment.create({
          data: {
            id: `pay_${uuidv4()}`,
            userId,
            amount: total,
            currency: 'USD',
            status: 'PENDING',
            paymentMethod: 'bank_transfer',
            paymentMethodType: 'bank_transfer',
            billingAddressId,
          },
        });

        return json(success({
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: {
            id: 'bank_transfer',
            type: 'bank_transfer',
            isDefault: false,
          },
          bankDetails: {
            accountName: 'Mi Tienda Online',
            accountNumber: '1234567890',
            bankName: 'Banco Ejemplo',
            routingNumber: '123456789',
            reference: `Orden #${payment.id}`,
          },
        }));
      } else if (paymentMethodId === 'cash_on_delivery') {
        // Handle cash on delivery
        const payment = await prisma.payment.create({
          data: {
            id: `pay_${uuidv4()}`,
            userId,
            amount: total,
            currency: 'USD',
            status: 'PENDING',
            paymentMethod: 'cash_on_delivery',
            paymentMethodType: 'cash_on_delivery',
            billingAddressId,
          },
        });

        return json(success({
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: {
            id: 'cash_on_delivery',
            type: 'cash_on_delivery',
            isDefault: false,
          },
          instructions: 'Pague en efectivo cuando reciba su pedido.',
        }));
      } else {
        return json(errors.badRequest('Método de pago no válido'), { status: 400 });
      }
    });
  } catch (error) {
    console.error('Error al procesar el pago:', error);
    return json(errors.internalServerError('Error al procesar el pago'), { status: 500 });
  }
};
