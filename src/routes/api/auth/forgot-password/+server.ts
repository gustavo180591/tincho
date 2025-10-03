import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { createHash, randomBytes } from 'crypto';
import { errors, success } from '$lib/api/response';
import { sendPasswordResetEmail } from '$lib/email/sendEmail';
import type { RequestHandler } from './$types';

// POST /api/auth/forgot-password
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return errors.badRequest('Email is required');
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });

    // Si el usuario existe, generar token de recuperación
    if (user) {
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenHash = createHash('sha256').update(resetToken).digest('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: resetTokenHash,
          resetTokenExpiry: resetTokenExpiry
        }
      });

      // Enviar email con el enlace de recuperación
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user.id}`;
      
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl
      });
    }

    // Por seguridad, siempre devolvemos éxito aunque el email no exista
    return success({
      message: 'If an account with that email exists, you will receive a password reset link.'
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    return errors.internalServerError('Error processing your request');
  }
};
