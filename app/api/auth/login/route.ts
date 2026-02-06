import { NextResponse } from 'next/server';
import { checkPassword, signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (checkPassword(password)) {
      const token = await signToken({ role: 'admin' });
      
      // Set secure HTTP-only cookie
      const cookieStore = await cookies();
      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: false, // Force false for localhost/http
        sameSite: 'lax', // Relax sameSite for easier local testing
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
