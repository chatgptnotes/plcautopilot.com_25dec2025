// Authentication utilities and static credentials

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  authenticated: boolean;
  createdAt: string;
}

// Hardcoded credentials for static authentication
export const STATIC_USERS: Record<string, { password: string; user: Omit<User, 'authenticated'> }> = {
  'admin@plcautopilot.com': {
    password: 'admin123',
    user: {
      id: 'admin-001',
      email: 'admin@plcautopilot.com',
      name: 'Administrator',
      role: 'admin',
      createdAt: '2025-01-01T00:00:00Z',
    },
  },
  'user@plcautopilot.com': {
    password: 'user123',
    user: {
      id: 'user-001',
      email: 'user@plcautopilot.com',
      name: 'Demo User',
      role: 'user',
      createdAt: '2025-01-01T00:00:00Z',
    },
  },
};

// Route configuration
export const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password'];
export const PUBLIC_ROUTE_PREFIXES = ['/blog'];
export const ADMIN_ROUTES = ['/admin', '/billing', '/subscription'];

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

export function validateCredentials(email: string, password: string): User | null {
  const userRecord = STATIC_USERS[email.toLowerCase()];
  if (userRecord && userRecord.password === password) {
    return { ...userRecord.user, authenticated: true };
  }
  return null;
}

// Cookie and storage keys
export const AUTH_COOKIE_NAME = 'plcautopilot_auth';
export const AUTH_STORAGE_KEY = 'plcautopilot_user';

// Get all users (for admin user management)
export function getAllUsers(): User[] {
  return Object.values(STATIC_USERS).map(record => ({
    ...record.user,
    authenticated: false,
  }));
}
