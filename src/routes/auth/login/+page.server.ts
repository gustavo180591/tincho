import { fail, redirect } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcrypt';
import { createAuthJWT } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const prisma = new PrismaClient();

export const load: PageServerLoad = async ({ locals }) => {
  // If user is already logged in, redirect to home
  if (locals.user) {
    throw redirect(303, '/');
  }
  
  return {};
};

export const actions: Actions = {
  default: async ({ cookies, request, url }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;
    const rememberMe = data.get('remember-me') === 'on';
    
    // Basic validation
    if (!email || !password) {
      return fail(400, { email, error: 'Email y contraseña son requeridos' });
    }
    
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          role: true,
          active: true
        }
      });
      
      // Check if user exists and is active
      if (!user || !user.active) {
        return fail(400, { email, error: 'Credenciales inválidas' });
      }
      
      // Verify password
      const passwordValid = await compare(password, user.passwordHash);
      if (!passwordValid) {
        return fail(400, { email, error: 'Credenciales inválidas' });
      }
      
      // Create JWT token
      const token = await createAuthJWT({
        id: user.id,
        email: user.email,
        role: user.role
      });
      
      // Set cookie
      cookies.set('session', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: rememberMe ? 60 * 60 * 24 * 30 : undefined, // 30 days if remember me is checked
      });
      
      // Redirect to home or the page the user was trying to access
      const redirectTo = url.searchParams.get('redirectTo') || '/';
      throw redirect(303, redirectTo);
      
    } catch (error) {
      console.error('Login error:', error);
      return fail(500, { email, error: 'Error al iniciar sesión. Por favor, inténtalo de nuevo.' });
    }
  }
};
