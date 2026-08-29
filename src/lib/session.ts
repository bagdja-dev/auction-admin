/**
 * Simple cookie-based session for storing JWT tokens.
 * Server-side only (used in Route Handlers and Server Components).
 *
 * Cookie httpOnly `am_token` menyimpan JWT (tidak pernah dibaca client JS —
 * semua request ke backend lewat BFF proxy, lihat app/api/proxy). Cookie
 * `am_user` non-httpOnly menyimpan info user ringkas untuk client component
 * (lihat hooks/use-auth.ts).
 */
import { cookies } from 'next/headers';

const TOKEN_COOKIE = 'am_token';
const USER_COOKIE = 'am_user';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24 hours
};

export interface SessionUser {
  userId: string;
  email?: string;
  username?: string;
}

export async function setSession(token: string, user: SessionUser) {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
  jar.set(USER_COOKIE, JSON.stringify(user), {
    ...COOKIE_OPTIONS,
    httpOnly: false, // client needs to read user info
  });
}

export async function getSession(): Promise<{
  token: string | null;
  user: SessionUser | null;
}> {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value ?? null;
  const userStr = jar.get(USER_COOKIE)?.value ?? null;

  let user: SessionUser | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      user = null;
    }
  }

  return { token, user };
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(TOKEN_COOKIE);
  jar.delete(USER_COOKIE);
}
