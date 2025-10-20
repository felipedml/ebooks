/**
 * Canva OAuth 2 - Initiate authentication
 * GET /api/canva/auth
 */

import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge, generateAuthUrl } from '@/lib/canva-oauth';

export async function GET() {
  try {
    const clientId = process.env.CANVA_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!clientId || !baseUrl) {
      return NextResponse.json(
        { success: false, error: 'CANVA_CLIENT_ID or NEXT_PUBLIC_BASE_URL not configured' },
        { status: 500 }
      );
    }

    const redirectUri = `${baseUrl}/canva-callback`;

    console.log('[Canva Auth] Base URL:', baseUrl);
    console.log('[Canva Auth] Redirect URI:', redirectUri);

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Encode code_verifier in state (mais confiável que cookie)
    const stateData = {
      id: crypto.randomUUID(),
      cv: codeVerifier // code_verifier
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Generate auth URL
    const authUrl = generateAuthUrl(clientId, redirectUri, codeChallenge, state);
    
    console.log('[Canva Auth] State with code_verifier:', state);
    console.log('[Canva Auth] Full auth URL:', authUrl);

    return NextResponse.json({
      success: true,
      authUrl,
      codeVerifier, // Para compatibilidade com cookie (fallback)
      state
    });
  } catch (error) {
    console.error('[Canva Auth] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
