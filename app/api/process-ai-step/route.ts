import { NextRequest, NextResponse } from 'next/server';
import { processAIStep } from '@/lib/ai-processor';

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
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

    return NextResponse.json({
      success: true,
      output,
    });
  } catch (error) {
    console.error('[API] Error processing AI step:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process AI step' 
      },
      { status: 500 }
    );
  }
}
