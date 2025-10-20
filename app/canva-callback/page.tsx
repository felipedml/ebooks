'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CanvaCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log('[Canva Callback] ===== PROCESSING =====');
    console.log('[Canva Callback] URL:', window.location.href);
    
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    console.log('[Canva Callback] Code:', code ? 'YES (' + code.substring(0, 20) + '...)' : 'NO');
    console.log('[Canva Callback] State:', state ? 'YES (' + state.substring(0, 20) + '...)' : 'NO');
    console.log('[Canva Callback] Error:', error);

    if (error) {
      console.error('[Canva Callback] Error from Canva:', error);
      window.location.href = '/config?canva_error=' + error;
      return;
    }

    if (!code) {
      console.error('[Canva Callback] No code received!');
      window.location.href = '/config?canva_error=no_code';
      return;
    }

    // Pegar code_verifier do STATE (método mais confiável!)
    let codeVerifier = null;
    
    if (state) {
      try {
        // Decode base64url manually (browser doesn't have Buffer)
        const base64 = state.replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const stateData = JSON.parse(jsonStr);
        codeVerifier = stateData.cv;
        console.log('[Canva Callback] Code verifier from STATE:', codeVerifier ? 'FOUND ✅' : 'NOT FOUND');
      } catch (err) {
        console.error('[Canva Callback] Failed to parse state:', err);
      }
    }
    
    // Fallback: tentar cookie se state não funcionou
    if (!codeVerifier) {
      console.log('[Canva Callback] Trying cookie as fallback...');
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      codeVerifier = cookies['canva_code_verifier'];
      console.log('[Canva Callback] Code verifier from COOKIE:', codeVerifier ? 'FOUND' : 'NOT FOUND');
      
      if (codeVerifier) {
        document.cookie = 'canva_code_verifier=; path=/; max-age=0';
      }
    }

    if (!codeVerifier) {
      console.error('[Canva Callback] ❌ No code_verifier found in state or cookie!');
      window.location.href = '/config?canva_error=no_verifier';
      return;
    }

    // Redirecionar para API com code e code_verifier
    console.log('[Canva Callback] ✅ Redirecting to API callback...');
    window.location.href = `/api/canva/callback?code=${encodeURIComponent(code)}&code_verifier=${encodeURIComponent(codeVerifier)}`;
  }, [searchParams]);

  return (
    <>
      <script dangerouslySetInnerHTML={{
        __html: `
          console.log('[Canva Callback INLINE] Script executing!');
          console.log('[Canva Callback INLINE] URL:', window.location.href);
          console.log('[Canva Callback INLINE] window.opener:', !!window.opener);
        `
      }} />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processando autenticação...</p>
        </div>
      </div>
    </>
  );
}

export default function CanvaCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <CanvaCallbackContent />
    </Suspense>
  );
}
