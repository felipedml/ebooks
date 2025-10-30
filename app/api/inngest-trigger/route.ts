import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/app/src/inngest/client';
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const body = await request.json();
    const { name, data } = body;

    if (!name || !data) {
      return corsResponse(
        { 
          success: false,
          error: 'Missing event name or data' 
        },
        { status: 400, origin }
      );
    }

    // Send event to Inngest
    await inngest.send({
      name,
      data
    });

    return corsResponse(
      { 
        success: true,
        message: `Event ${name} sent successfully` 
      },
      { origin }
    );
  } catch (error) {
    console.error('[API] Error triggering Inngest event:', error);
    return corsResponse(
      { 
        success: false,
        error: 'Failed to trigger event',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500, origin }
    );
  }
}
