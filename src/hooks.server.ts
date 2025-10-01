import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/db';

// In-memory session storage (use Redis in production)
declare global {
  var userSessions: Map<string, { userId: string; expires: number }>;
}

export const handle: Handle = async ({ event, resolve }) => {
  const { cookies, url } = event;

  // Initialize session store if it doesn't exist
  globalThis.userSessions = globalThis.userSessions || new Map();
  
  // Get session ID from cookie
  const sessionId = cookies.get('session');
  
  // Clean up expired sessions
  const now = Date.now();
  for (const [id, session] of globalThis.userSessions.entries()) {
    if (session.expires < now) {
      globalThis.userSessions.delete(id);
    }
  }

  // If we have a session ID, try to find the user
  if (sessionId) {
    const session = globalThis.userSessions.get(sessionId);
    
    if (session && session.expires > now) {
      try {
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            emailVerified: true,
          },
        });

        if (user) {
          // Add user to locals for use in load functions and pages
          event.locals.user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            emailVerified: user.emailVerified,
          };
          
          // Refresh session expiration
          globalThis.userSessions.set(sessionId, {
            ...session,
            expires: now + 24 * 60 * 60 * 1000, // 24 hours from now
          });
        } else {
          // User not found, clear session
          globalThis.userSessions.delete(sessionId);
          cookies.delete('session', { path: '/' });
        }
      } catch (error) {
        console.error('Error fetching user session:', error);
        // Clear invalid session
        globalThis.userSessions.delete(sessionId);
        cookies.delete('session', { path: '/' });
      }
    } else {
      // Session expired or not found, clear cookie
      if (session) globalThis.userSessions.delete(sessionId);
      cookies.delete('session', { path: '/' });
    }
  }

  // Protect admin routes
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/seller')) {
    if (!event.locals.user) {
      // Redirect to login with return URL
      throw redirect(302, `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`);
    }

    // Check if user has required role for admin routes
    if (url.pathname.startsWith('/admin') && event.locals.user.role !== 'ADMIN') {
      throw redirect(302, '/unauthorized');
    }
    
    // Check if user has required role for seller routes
    if (url.pathname.startsWith('/seller') && !['SELLER', 'ADMIN'].includes(event.locals.user.role)) {
      throw redirect(302, '/unauthorized');
    }
  }

  // Protect API routes that require authentication
  const protectedApiRoutes = [
    '/api/me',
    '/api/orders',
    '/api/cart',
    '/api/favorites',
    '/api/addresses',
  ];
  
  const isProtectedApiRoute = protectedApiRoutes.some(route => 
    url.pathname.startsWith(route)
  );
  
  if (isProtectedApiRoute && !event.locals.user) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { 
          code: 'unauthorized', 
          message: 'Authentication required' 
        } 
      }), 
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  const response = await resolve(event);
  return response;
};

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
        emailVerified: boolean;
      } | null;
    }
  }
}
