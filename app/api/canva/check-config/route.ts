/**
 * Canva Configuration Check
 * GET /api/canva/check-config
 * 
 * Helper endpoint to verify Canva OAuth configuration
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  const redirectUri = process.env.CANVA_REDIRECT_URI;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  const defaultRedirectUri = `${baseUrl || 'http://localhost:3000'}/canva-callback`;
  const effectiveRedirectUri = redirectUri || defaultRedirectUri;

  return NextResponse.json({
    success: true,
    config: {
      clientId: clientId ? '✅ Configurado' : '❌ FALTANDO',
      clientSecret: clientSecret ? '✅ Configurado' : '❌ FALTANDO',
      redirectUri: effectiveRedirectUri,
      redirectUriConfigured: redirectUri ? '✅ Explícito' : '⚠️ Usando default',
      baseUrl: baseUrl || '⚠️ Usando default (http://localhost:3000)',
      encryptionKey: encryptionKey ? '✅ Configurado' : '❌ FALTANDO',
    },
    instructions: {
      message: 'Copie a Redirect URI abaixo e adicione no Dashboard do Canva',
      redirectUriToCopy: effectiveRedirectUri,
      dashboardUrl: 'https://www.canva.com/developers/',
      steps: [
        '1. Acesse https://www.canva.com/developers/',
        '2. Selecione seu app',
        '3. Procure "Redirect URIs" ou "OAuth redirect URIs"',
        `4. Adicione EXATAMENTE: ${effectiveRedirectUri}`,
        '5. Clique em SALVAR',
        '6. Aguarde 30 segundos',
        '7. Teste novamente o fluxo OAuth'
      ]
    }
  });
}
