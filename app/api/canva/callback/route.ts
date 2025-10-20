/**
 * Canva OAuth 2 - Callback endpoint
 * GET /api/canva/callback?code=xxx&state=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/canva-oauth';
import { db } from '@/lib/db';
import { canvaTokens } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const codeVerifier = searchParams.get('code_verifier');
    
    // Handle Canva errors
    if (error) {
      console.log('[Canva Callback] Error from Canva:', error);
      return NextResponse.redirect(new URL('/config?canva_error=' + error, request.url));
    }

    if (!code) {
      console.log('[Canva Callback] No code received');
      return NextResponse.redirect(new URL('/config?canva_error=no_code', request.url));
    }
    
    if (!codeVerifier) {
      console.log('[Canva Callback API] No code_verifier in URL!');
      return NextResponse.redirect(new URL('/config?canva_error=no_verifier', request.url));
    }

    const clientId = process.env.CANVA_CLIENT_ID;
    const clientSecret = process.env.CANVA_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!clientId || !clientSecret || !baseUrl) {
      return NextResponse.redirect(new URL('/config?canva_error=missing_config', request.url));
    }

    const redirectUri = `${baseUrl}/canva-callback`;

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri, codeVerifier);

    // Calculate expiration timestamp
    const expiresAt = tokenData.expires_in 
      ? Math.floor(Date.now() / 1000) + tokenData.expires_in 
      : null;

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token 
      ? encrypt(tokenData.refresh_token) 
      : null;

    // Check if token already exists for this user
    const userId = 'admin'; // For now, single user. TODO: Get from session
    const existingTokens = await db
      .select()
      .from(canvaTokens)
      .where(eq(canvaTokens.userId, userId))
      .limit(1);

    if (existingTokens.length > 0) {
      // Update existing token
      await db
        .update(canvaTokens)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
          scope: tokenData.scope,
          tokenType: tokenData.token_type || 'Bearer',
          updatedAt: new Date().toISOString()
        })
        .where(eq(canvaTokens.userId, userId));
    } else {
      // Insert new token
      await db.insert(canvaTokens).values({
        userId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        scope: tokenData.scope,
        tokenType: tokenData.token_type || 'Bearer'
      });
    }

    console.log('[Canva Callback] ✅ Token stored successfully for user:', userId);
    console.log('[Canva Callback] Token expires at:', expiresAt);
    console.log('[Canva Callback] Scopes:', tokenData.scope);
    
    // Redirecionar de volta para config com sucesso
    return NextResponse.redirect(new URL('/config?canva_auth=success', request.url));
  } catch (error) {
    console.error('[Canva Callback] Error:', error);
    
    const errorUrl = new URL('/config?canva_error=token_exchange_failed', request.url);
    return NextResponse.redirect(errorUrl);
  }
}
