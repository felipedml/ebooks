import { NextRequest, NextResponse } from 'next/server';
import { processAIStep } from '@/lib/ai-processor';
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const body = await request.json();
    
    const {
      provider,
      apiKeyId,
      model,
      prompt,
      outputType,
      variables,
      temperature,
      maxTokens,
    } = body;

    // Validate required fields
    if (!provider || !prompt || !outputType) {
      return corsResponse(
        { success: false, error: 'Missing required fields' },
        { status: 400, origin }
      );
    }

    // Process AI step
    const output = await processAIStep({
      provider,
      apiKeyId,
      model,
      prompt,
      outputType,
      variables: variables || {},
      temperature,
      maxTokens,
    });

    return corsResponse(
      {
        success: true,
        output,
      },
      { origin }
    );
  } catch (error) {
    console.error('[API] Error processing AI step:', error);
    return corsResponse(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process AI step' 
      },
      { status: 500, origin }
    );
  }
}
