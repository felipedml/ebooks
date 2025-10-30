import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    // Check database connection
    if (!db) {
      return corsResponse(
        {
          status: 'error',
          database: 'not_initialized',
          message: 'Database connection not available',
          timestamp: new Date().toISOString(),
        },
        { status: 500, origin }
      );
    }

    // Try a simple query using Drizzle's sql
    await db.run(sql`SELECT 1`);
    
    return corsResponse(
      {
        status: 'ok',
        database: 'connected',
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: new Date().toISOString(),
      },
      { origin }
    );
  } catch (error) {
    console.error('[Health Check] Database error:', error);
    
    return corsResponse(
      {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500, origin }
    );
  }
}
