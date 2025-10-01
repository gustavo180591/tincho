import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { createHash } from 'crypto';
import { errors, success } from '$lib/api/response';
import type { RequestHandler } from './$types';

// POST /api/auth/register
export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['email', 'password', 'firstName', 'lastName'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return errors.invalidRequest(
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }
    
    const { email, password, firstName, lastName, phone, role = 'BUYER' } = data;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errors.invalidRequest('Invalid email format');
    }
    
    // Validate password strength (min 8 chars, at least one letter and one number)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return errors.invalidRequest(
        'Password must be at least 8 characters long and include both letters and numbers'
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return errors.invalidRequest('Email already in use', 409);
    }
    
    // Hash password (in production, use bcrypt or similar)
    const hashedPassword = createHash('sha256').update(password).digest('hex');
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // In production, use proper password hashing
        firstName,
        lastName,
        phone,
        role,
        emailVerified: false, // Set to false, require email verification
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    
    // Create session
    const sessionId = createHash('sha256')
      .update(user.id + Date.now().toString())
      .digest('hex');
    
    // Set session cookie (expires in 24 hours)
    cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    
    // In a real app, you would send an email verification link here
    
    return success(user, undefined, 201);
  } catch (err) {
    console.error('Error during registration:', err);
    return errors.internalServerError();
  }
};
