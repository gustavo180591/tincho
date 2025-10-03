import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { createHash } from 'crypto';
import { errors, success } from '$lib/api/response';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_REFRESH_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';

// POST /api/auth/refresh-token
export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return errors.badRequest('Refresh token is required');
    }

    // Verificar el refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    
    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        refreshToken: true
      }
    });

    if (!user || user.refreshToken !== refreshToken) {
      return errors.unauthorized('Invalid refresh token');
    }

    // Generar nuevos tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Actualizar el refresh token en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken }
    });

    // Configurar cookies seguras
    cookies.set('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 15 // 15 minutos
    });

    cookies.set('refreshToken', newRefreshToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    });

    return success({
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    if (error instanceof jwt.TokenExpiredError) {
      return errors.unauthorized('Refresh token expired');
    }
    return errors.unauthorized('Invalid refresh token');
  }
};
