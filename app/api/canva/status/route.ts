/**
 * Canva OAuth - Check authentication status
 * GET /api/canva/status
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canvaTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const userId = 'admin'; // TODO: Get from session
    
    const tokens = await db
      .select({
        id: canvaTokens.id,
        expiresAt: canvaTokens.expiresAt,
        scope: canvaTokens.scope,
        createdAt: canvaTokens.createdAt
      })
      .from(canvaTokens)
      .where(eq(canvaTokens.userId, userId))
      .limit(1);

    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        authenticated: false
      });
    }

    const token = tokens[0];
    const now = Math.floor(Date.now() / 1000);
    const isExpired = token.expiresAt ? token.expiresAt < now : false;

    return NextResponse.json({
      success: true,
      authenticated: !isExpired,
      expiresAt: token.expiresAt,
      scope: token.scope,
      createdAt: token.createdAt
    });
  } catch (error) {
    console.error('[Canva Status] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
