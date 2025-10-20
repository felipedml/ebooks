/**
 * Canva API - Get specific design (server-side token)
 * GET /api/canva/design/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canvaTokens } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = 'admin';
    // Load access token from DB (same approach as /api/canva/designs)
    const tokens = await db
      .select()
      .from(canvaTokens)
      .where(eq(canvaTokens.userId, userId))
      .limit(1);

    if (tokens.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated with Canva' },
        { status: 401 }
      );
    }

    const accessToken = decrypt(tokens[0].accessToken);

    const response = await fetch(`https://api.canva.com/rest/v1/designs/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { success: false, error: `Canva API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      design: data.design
    });
  } catch (error) {
    console.error('[Canva Design] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get design' },
      { status: 500 }
    );
  }
}
