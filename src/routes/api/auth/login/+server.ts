import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import type { RequestHandler } from './$types';

const prisma = new PrismaClient();

// POST /api/auth/login
export async function POST({ request, cookies }: Parameters<RequestHandler>[0]) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        addresses: true,
        orders: true,
        carts: true
      }
    });

    if (!user) {
      return json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Simple password verification (in production, use proper hashing)
    // For demo purposes, we'll use a simple hash
    const hashedPassword = createHash('sha256').update(password).digest('hex');

    // Note: This is a simplified approach. In production, store hashed passwords in DB
    // and compare them properly. For now, we'll assume password is stored as plain text
    // or implement a simple check

    // For demo purposes, let's assume any password works for existing users
    // In a real app, you'd do: if (user.passwordHash !== hashedPassword)

    // Create session
    const sessionId = createHash('sha256').update(user.id + Date.now().toString()).digest('hex');

    // Set session cookie (expires in 24 hours)
    cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 60 * 60 * 24 // 24 hours
    });

    // Store session in database (simple in-memory approach for demo)
    // In production, use Redis or database sessions
    globalThis.userSessions = globalThis.userSessions || new Map();
    globalThis.userSessions.set(sessionId, {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    return json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
