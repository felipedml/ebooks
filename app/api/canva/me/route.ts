/**
 * Canva API - Get current user info
 * GET /api/canva/me
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canvaTokens } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const userId = 'admin'; // Por enquanto fixo

    // Get token from database
    const tokens = await db
      .select()
      .from(canvaTokens)
      .where(eq(canvaTokens.userId, userId))
      .limit(1);

    if (tokens.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const token = tokens[0];
    const accessToken = decrypt(token.accessToken);

    console.log('[Canva Me] Fetching user data from Canva API...' , accessToken);

    // Buscar profile e capabilities em paralelo
    const [profileResponse, capabilitiesResponse] = await Promise.all([
      fetch('https://api.canva.com/rest/v1/users/me/profile', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch('https://api.canva.com/rest/v1/users/me/capabilities', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    console.log('[Canva Me] Profile status:', profileResponse.status);
    console.log('[Canva Me] Capabilities status:', capabilitiesResponse.status);

    // Profile
    let profile = null;
    if (profileResponse.ok) {
      profile = await profileResponse.json();
      console.log('[Canva Me] Profile:', profile);
    } else {
      console.warn('[Canva Me] Profile failed:', await profileResponse.text());
    }

    // Capabilities
    let capabilities = null;
    if (capabilitiesResponse.ok) {
      capabilities = await capabilitiesResponse.json();
      console.log('[Canva Me] Capabilities:', capabilities);
    } else {
      console.warn('[Canva Me] Capabilities failed:', await capabilitiesResponse.text());
    }

    // Se ambos falharam, retornar erro
    if (!profile && !capabilities) {
      return NextResponse.json(
        { success: false, error: 'Failed to get user info from Canva' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        user_profile: profile,
        capabilities: capabilities,
        scopes: token.scope?.split(' ') || []
      }
    });
  } catch (error) {
    console.error('[Canva Me] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
