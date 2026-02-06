import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Paths that do not require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/hooks', // Webhooks should be public (or use key auth) to allow external tools
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if path is public
  // We check if the path STARTS with any of the public paths
  // Note: /api/hooks/qbittorrent starts with /api/hooks, so it's allowed.
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Also allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') // Files like favicon.ico, images, etc.
  ) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = req.cookies.get('auth_token')?.value;

  if (!token) {
    // Redirect to login if no token
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const payload = await verifyToken(token);
  if (!payload) {
    // Redirect to login if invalid token
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (handled above but good to be explicit if needed, currently we match all)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
