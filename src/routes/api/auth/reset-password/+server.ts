import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { createHash } from 'crypto';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from './$types';

// POST /api/auth/reset-password
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { token, userId, password } = await request.json();

    // Validar datos de entrada
    if (!token || !userId || !password) {
      return errors.badRequest('Token, user ID and new password are required');
    }

    if (password.length < 8) {
      return errors.badRequest('Password must be at least 8 characters long');
    }

    // Buscar usuario y verificar token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        resetToken: true,
        resetTokenExpiry: true
      }
    });

    if (!user) {
      return errors.notFound('User not found');
    }

    // Verificar si el token es válido y no ha expirado
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const isTokenValid = 
      user.resetToken === tokenHash && 
      user.resetTokenExpiry && 
      new Date(user.resetTokenExpiry) > new Date();

    if (!isTokenValid) {
      return errors.unauthorized('Invalid or expired token');
    }

    // Hash de la nueva contraseña
    const passwordHash = createHash('sha256').update(password).digest('hex');

    // Actualizar contraseña y limpiar token
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        // Invalidar todos los tokens de sesión anteriores
        refreshToken: null
      }
    });

    return success({
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return errors.internalServerError('Error resetting password');
  }
};
