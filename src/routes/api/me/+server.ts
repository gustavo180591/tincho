import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/db';
import { errors } from '$lib/api/response';

// GET /api/me - Get current user profile
export const GET: RequestHandler = async ({ locals }) => {
  try {
    const user = locals.user;
    
    if (!user) {
      return errors.unauthorized();
    }

    // Get user data from database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        phoneVerified: true,
        documentType: true,
        documentNumber: true,
        dateOfBirth: true,
        addresses: {
          select: {
            id: true,
            label: true,
            type: true,
            street: true,
            number: true,
            zipcode: true,
            reference: true,
            city: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        sellerProfile: {
          select: {
            id: true,
            store: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!userData) {
      return errors.notFound('User');
    }

    return json({
      success: true,
      data: userData,
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return errors.internalServerError();
  }
};

// PATCH /api/me - Update current user profile
export const PATCH: RequestHandler = async ({ request, locals }) => {
  try {
    const user = locals.user;
    
    if (!user) {
      return errors.unauthorized();
    }

    const data = await request.json();
    
    // Validate allowed fields
    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'avatar',
      'documentType',
      'documentNumber',
      'dateOfBirth',
    ];
    
    const updates: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates[key] = value;
      }
    }
    
    // If there are no valid updates
    if (Object.keys(updates).length === 0) {
      return errors.invalidRequest('No valid fields provided for update');
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updates,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        phoneVerified: true,
        documentType: true,
        documentNumber: true,
        dateOfBirth: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    return errors.internalServerError();
  }
};
