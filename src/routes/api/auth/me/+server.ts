import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

// GET /api/auth/me
export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('accessToken');

    if (!accessToken) {
      return errors.unauthorized('No authentication token provided');
    }

    // Verificar el token JWT
    const decoded = jwt.verify(accessToken, JWT_SECRET) as JwtPayload;
    
    // Obtener información del usuario desde la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return errors.notFound('User not found');
    }

    return success({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
        phone: user.phone || null,
        docType: user.docType || null,
        docNumber: user.docNumber || null,
        avatar: user.avatar || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      return errors.unauthorized('Token expired');
    } 
    
    if (error instanceof jwt.JsonWebTokenError) {
      return errors.unauthorized('Invalid token');
    }
    
    return errors.internalServerError('Error fetching user data');
  }
};
