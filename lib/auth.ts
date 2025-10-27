/**
 * Auth utilities - Simple session-based authentication
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-in-production-please';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Hash password with secret
 */
function hashPassword(password: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(password)
    .digest('hex');
}

/**
 * Generate secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate login credentials
 */
export function validateCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/**
 * Create session cookie
 */
export async function createSession(): Promise<string> {
  const token = generateSessionToken();
  const hashedToken = hashPassword(token);
  
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, hashedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  
  return token;
}

/**
 * Validate session
 */
export async function validateSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionToken?.value) {
      return false;
    }
    
    // Session exists and is valid
    return true;
  } catch (error) {
    console.error('[Auth] Error validating session:', error);
    return false;
  }
}

/**
 * Destroy session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get session cookie name (for client-side checks)
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}
