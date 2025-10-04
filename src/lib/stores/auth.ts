import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Define the user type
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  token?: string;
  isVerified?: boolean;
  avatar?: string;
  // Add any other user properties you need
}

// Function to retrieve user from localStorage
function getStoredUser(): User | null {
  if (!browser) return null;
  
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (e) {
    console.error('Failed to parse user from localStorage', e);
    return null;
  }
}

// Create the auth store
function createAuthStore() {
  const { subscribe, set, update } = writable<User | null>(browser ? getStoredUser() : null);

  return {
    subscribe,
    set: (user: User | null) => {
      if (browser) {
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          localStorage.removeItem('user');
        }
      }
      set(user);
    },
    login: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        // In a real app, you would make an API call to your backend
        // const response = await fetch('/api/auth/login', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ email, password })
        // });
        // const data = await response.json();
        
        // For demo purposes, simulate an API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock user data - in a real app, this would come from your API
        const mockUser: User = {
          id: '1',
          email,
          name: email.split('@')[0],
          role: 'user',
          token: 'demo-token-123456',
          isVerified: true
        };
        
        auth.set(mockUser);
        return { success: true };
      } catch (error) {
        console.error('Login failed:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Login failed' 
        };
      }
    },
    logout: async (): Promise<void> => {
      try {
        // In a real app, you would call your logout API
        // await fetch('/api/auth/logout', { method: 'POST' });
        
        // For demo purposes, simulate an API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear the auth state
        auth.set(null);
        
        // Redirect to home page
        if (browser) {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Logout failed:', error);
      }
    },
    register: async (userData: {
      name: string;
      email: string;
      password: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        // In a real app, you would make an API call to your backend
        // const response = await fetch('/api/auth/register', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(userData)
        // });
        // const data = await response.json();
        
        // For demo purposes, simulate an API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock user data - in a real app, this would come from your API
        const mockUser: User = {
          id: '1',
          ...userData,
          role: 'user',
          token: 'demo-token-123456',
          isVerified: false
        };
        
        auth.set(mockUser);
        return { success: true };
      } catch (error) {
        console.error('Registration failed:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Registration failed' 
        };
      }
    },
    // Add other auth methods as needed (password reset, email verification, etc.)
  };
}

export const auth = createAuthStore();

// Subscribe to auth changes and sync with localStorage
if (browser) {
  auth.subscribe(user => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  });
}

// Helper function to check if user is authenticated
export function isAuthenticated(user: User | null): boolean {
  return !!user?.token;
}

// Helper function to check if user has a specific role
export function hasRole(user: User | null, role: string): boolean {
  return user?.role === role;
}

// Helper function to get the auth token
export function getAuthToken(user: User | null): string | undefined {
  return user?.token;
}
