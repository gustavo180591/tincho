import { verifyAuthJWT } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types for TypeScript
declare global {
  namespace App {
    interface Locals {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
      } | null;
    }
  }
}

const auth: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session');
  
  // Initialize user as null by default
  event.locals.user = null;
  
  if (sessionId) {
    try {
      // Verify the JWT token
      const { payload } = await verifyAuthJWT(sessionId);
      
      if (payload && typeof payload === 'object' && 'id' in payload) {
        // Get the user from the database
        const user = await prisma.user.findUnique({
          where: { id: payload.id as string },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        });
        
        if (user) {
          // Add user to locals for use in load functions and pages
          event.locals.user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: user.role
          };
        } else {
          // User not found, clear session
          event.cookies.delete('session', { path: '/' });
        }
      } else {
        // Invalid token, clear session
        event.cookies.delete('session', { path: '/' });
      }
    } catch (error) {
      console.error('Error verifying auth token:', error);
      // Clear invalid session
      event.cookies.delete('session', { path: '/' });
    }
  }

  return resolve(event);
};

const redirects: Handle = async ({ event, resolve }) => {
  const protectedRoutes = ['/profile', '/orders', '/settings', '/admin', '/seller'];
  const isProtectedRoute = protectedRoutes.some(route => 
    event.url.pathname.startsWith(route)
  );

  // Redirect to login for protected routes if not authenticated
  if (isProtectedRoute && !event.locals.user) {
    throw redirect(303, `/auth/login?redirectTo=${encodeURIComponent(event.url.pathname)}`);
  }

  // Redirect away from auth pages if already logged in
  if (['/auth/login', '/auth/register'].includes(event.url.pathname) && event.locals.user) {
    const redirectTo = event.url.searchParams.get('redirectTo') || '/';
    throw redirect(303, redirectTo);
  }

  // Check admin and seller role requirements
  if (event.locals.user) {
    // Check if user has required role for admin routes
    if (event.url.pathname.startsWith('/admin') && event.locals.user.role !== 'ADMIN') {
      throw redirect(302, '/unauthorized');
    }
    
    // Check if user has required role for seller routes
    if (event.url.pathname.startsWith('/seller') && !['SELLER', 'ADMIN'].includes(event.locals.user.role)) {
      throw redirect(302, '/unauthorized');
    }
  }

  return resolve(event);
};

export const handle = sequence(auth, redirects);
