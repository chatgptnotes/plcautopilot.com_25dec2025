import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password'];
const PUBLIC_PREFIXES = ['/blog', '/_next', '/api', '/favicon', '/og-image'];

// Admin-only routes
const ADMIN_ROUTES = ['/admin', '/billing', '/subscription'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static assets
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix)) ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('plcautopilot_auth');

  if (!authCookie?.value) {
    // Not authenticated, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Decode the base64 cookie
    const authData = JSON.parse(atob(authCookie.value));
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));

    if (isAdminRoute && authData.role !== 'admin') {
      // User trying to access admin route, redirect to user dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch {
    // Invalid cookie, redirect to login and clear the bad cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('plcautopilot_auth');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
