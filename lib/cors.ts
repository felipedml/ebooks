/**
 * CORS utilities for API routes
 */

import { NextResponse } from 'next/server';

// Allowed origins - configure via environment variable
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://pembrokecollins.com.br',
      'https://www.pembrokecollins.com.br',
    ];

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(origin?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  // Check if origin is allowed
  if (origin && (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin))) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (ALLOWED_ORIGINS.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreFlight(request: Request): NextResponse {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

/**
 * Add CORS headers to a NextResponse
 */
export function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  const corsHeaders = getCorsHeaders(origin);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Create a NextResponse with CORS headers
 */
export function corsResponse(
  data: unknown,
  options?: { status?: number; origin?: string | null }
): NextResponse {
  const response = NextResponse.json(data, { status: options?.status });
  return addCorsHeaders(response, options?.origin);
}
