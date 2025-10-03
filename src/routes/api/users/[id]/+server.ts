import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/users/:id
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        docType: true,
        docNumber: true,
        avatar: true,
        emailVerified: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return errors.notFound('User not found');
    }

    return success({
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim()
    });
  } catch (error) {
    console.error(`Error fetching user ${params.id}:`, error);
    return errors.internalServerError('Error fetching user');
  }
};

// PUT /api/users/:id
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Validar datos de entrada
    const { email, firstName, lastName, phone, docType, docNumber, role, status } = data;
    
    if (!email || !firstName || !lastName) {
      return errors.badRequest('Missing required fields');
    }

    // Verificar si el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id }
    });

    if (!userExists) {
      return errors.notFound('User not found');
    }

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        firstName,
        lastName,
        phone: phone || null,
        docType: docType || null,
        docNumber: docNumber || null,
        ...(role && { role }),
        ...(status && { status })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        docType: true,
        docNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return success({
      ...updatedUser,
      fullName: `${updatedUser.firstName} ${updatedUser.lastName}`.trim()
    });
  } catch (error) {
    console.error(`Error updating user ${params.id}:`, error);
    
    // Manejar errores de restricción única
    if (error.code === 'P2002') {
      return errors.badRequest('Email already in use');
    }
    
    return errors.internalServerError('Error updating user');
  }
};

// DELETE /api/users/:id
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    // Verificar si el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id }
    });

    if (!userExists) {
      return errors.notFound('User not found');
    }

    // Eliminar el usuario
    await prisma.user.delete({
      where: { id }
    });

    return success({ success: true });
  } catch (error) {
    console.error(`Error deleting user ${params.id}:`, error);
    
    // Manejar errores de restricción de clave foránea
    if (error.code === 'P2003') {
      return errors.badRequest('Cannot delete user with associated records');
    }
    
    return errors.internalServerError('Error deleting user');
  }
};
