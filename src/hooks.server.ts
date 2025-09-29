import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

// In-memory session storage (use Redis in production)
declare global {
  var userSessions: Map<string, any>;
}

export const handle: Handle = async ({ event, resolve }) => {
  const { cookies, url } = event;

  // Get session ID from cookie
  const sessionId = cookies.get('session');
  let currentUser = null;

  if (sessionId) {
    globalThis.userSessions = globalThis.userSessions || new Map();
    const session = globalThis.userSessions.get(sessionId);

    if (session) {
      currentUser = {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role
      };
    }
  }

  // Add user to locals for use in load functions and pages
  event.locals.user = currentUser;

  // Protect admin routes
  if (url.pathname.startsWith('/productos/admin') || url.pathname.startsWith('/admin')) {
    if (!currentUser) {
      throw redirect(302, '/login');
    }

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'OPERATOR') {
      throw redirect(302, '/unauthorized');
    }
  }

  // Protect API routes that require authentication
  if (url.pathname.startsWith('/api/products') && event.request.method !== 'GET') {
    if (!currentUser) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const response = await resolve(event);
  return response;
};

// Types for TypeScript
declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email: string;
        name: string | null;
        role: string;
      } | null;
    }
  }
}
