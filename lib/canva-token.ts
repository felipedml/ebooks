/**
 * Canva Token Management
 * Helper functions to retrieve and manage Canva OAuth tokens
 */

import { db } from '@/lib/db';
import { canvaTokens } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { eq } from 'drizzle-orm';

export interface CanvaTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  isExpired: boolean;
}

/**
 * Get decrypted Canva token for a user
 * @param userId - User ID (default: 'admin')
 * @returns Decrypted token data or null if not found
 */
export async function getCanvaToken(userId: string = 'admin'): Promise<CanvaTokenData | null> {
  try {
    const tokens = await db
      .select()
      .from(canvaTokens)
      .where(eq(canvaTokens.userId, userId))
      .limit(1);

    if (tokens.length === 0) {
      return null;
    }

    const token = tokens[0];
    const now = Math.floor(Date.now() / 1000);
    const isExpired = token.expiresAt ? token.expiresAt < now : false;

    // Decrypt tokens
    const accessToken = decrypt(token.accessToken);
    const refreshToken = token.refreshToken ? decrypt(token.refreshToken) : undefined;

    return {
      accessToken,
      refreshToken,
      expiresAt: token.expiresAt || undefined,
      isExpired
    };
  } catch (error) {
    console.error('[Canva Token] Error retrieving token:', error);
    return null;
  }
}

/**
 * Check if user has valid Canva authentication
 * @param userId - User ID (default: 'admin')
 * @returns true if authenticated and token not expired
 */
export async function isCanvaAuthenticated(userId: string = 'admin'): Promise<boolean> {
  const tokenData = await getCanvaToken(userId);
  return tokenData !== null && !tokenData.isExpired;
}

/**
 * Delete Canva token for a user
 * @param userId - User ID (default: 'admin')
 */
export async function deleteCanvaToken(userId: string = 'admin'): Promise<boolean> {
  try {
    await db.delete(canvaTokens).where(eq(canvaTokens.userId, userId));
    return true;
  } catch (error) {
    console.error('[Canva Token] Error deleting token:', error);
    return false;
  }
}
