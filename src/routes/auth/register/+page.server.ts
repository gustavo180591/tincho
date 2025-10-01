import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { createAuthJWT } from '$lib/server/auth';
import { z } from 'zod';
import { Argon2id } from 'oslo/password';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    try {
      // Validate form data
      const result = registerSchema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.flatten();
        return fail(400, { errors });
      }
      
      const { email, password } = result.data;
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return fail(400, { 
          errors: {
            fieldErrors: {
              email: ['Email already in use']
            }
          }
        });
      }
      
      // Hash password
      const hashedPassword = await new Argon2id().hash(password);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'USER' // Default role
        }
      });
      
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
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      
      // Redirect to home page
      throw redirect(303, '/');
      
    } catch (error) {
      console.error('Registration error:', error);
      return fail(500, {
        errors: {
          formErrors: ['An error occurred while creating your account. Please try again.']
        }
      });
    }
  }
};
