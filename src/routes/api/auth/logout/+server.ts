import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/auth/logout
export async function POST({ cookies }: Parameters<RequestHandler>[0]) {
  try {
    // Get session ID from cookie
    const sessionId = cookies.get('session');

    if (sessionId) {
      // Remove session from memory
      globalThis.userSessions = globalThis.userSessions || new Map();
      globalThis.userSessions.delete(sessionId);
    }

    // Clear session cookie
    cookies.set('session', '', {
      path: '/',
      httpOnly: true,
      secure: false,
      maxAge: 0 // Expire immediately
    });

    return json({ success: true });

  } catch (error) {
    console.error('Logout error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
