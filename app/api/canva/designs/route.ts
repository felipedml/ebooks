/**
 * Canva API - List designs with thumbnails
 * GET /api/canva/designs?continuation=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canvaTokens } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const continuation = searchParams.get('continuation');
    
    const userId = 'admin'; // Por enquanto fixo

    // Get token from database
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

    const token = tokens[0];
    const accessToken = decrypt(token.accessToken);

    const url = continuation
      ? `https://api.canva.com/rest/v1/designs?continuation=${continuation}`
      : 'https://api.canva.com/rest/v1/designs';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Canva Designs] API error:', error);
      return NextResponse.json(
        { success: false, error: `Canva API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('[Canva Designs] Found', data.items?.length || 0, 'designs');

    return NextResponse.json({
      success: true,
      continuation: data.continuation,
      items: data.items || []
    });
  } catch (error) {
    console.error('[Canva Designs] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list designs' },
      { status: 500 }
    );
  }
}
