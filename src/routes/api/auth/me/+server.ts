import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/auth/me
export async function GET({ cookies }: Parameters<RequestHandler>[0]) {
  try {
    const sessionId = cookies.get('session');

    if (!sessionId) {
      return json({ user: null }, { status: 401 });
    }

    // Get session from memory
    globalThis.userSessions = globalThis.userSessions || new Map();
    const session = globalThis.userSessions.get(sessionId);

    if (!session) {
      return json({ user: null }, { status: 401 });
    }

    return json({
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
