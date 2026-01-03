'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  User,
  validateCredentials,
  AUTH_STORAGE_KEY,
  AUTH_COOKIE_NAME,
  isPublicRoute,
  isAdminRoute
} from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const userData = JSON.parse(stored) as User;
          if (userData.authenticated) {
            setUser(userData);
          }
        }
      } catch (e) {
        console.error('Error loading user:', e);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  // Route protection effect
  useEffect(() => {
    if (isLoading) return;

    // Don't redirect on public routes
    if (isPublicRoute(pathname)) {
      // If logged in and on login page, redirect to appropriate dashboard
      if (pathname === '/login' && user) {
        router.push(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
      }
      return;
    }

    // Not authenticated, redirect to login
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(pathname));
      return;
    }

    // User trying to access admin route
    if (isAdminRoute(pathname) && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const validatedUser = validateCredentials(email, password);
      if (validatedUser) {
        setUser(validatedUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(validatedUser));
        // Set a cookie for middleware (base64 encoded for simple parsing)
        document.cookie = `${AUTH_COOKIE_NAME}=${btoa(JSON.stringify({
          email: validatedUser.email,
          role: validatedUser.role
        }))}; path=/; max-age=86400; SameSite=Lax`;
        return { success: true };
      }
      return { success: false, error: 'Invalid email or password' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Clear the auth cookie
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin: user?.role === 'admin',
        isAuthenticated: !!user?.authenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
