/**
 * Process Canva AI step synchronously
 * POST /api/process-canva-ai-step
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { getApiKey } from '@/lib/get-api-key';
import type { CanvaDesignOption } from '@/app/src/inngest/functions/flow-steps';
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
      instruction,
      availableDesigns,
      aiProvider,
      aiModel,
      apiKeyId,
      variables
    } = body;

    console.log('[Canva AI API] Processing with:', { instruction, designCount: availableDesigns?.length, aiProvider, apiKeyId });

    // Validate required fields
    if (!apiKeyId) {
      return corsResponse(
        { success: false, error: 'API key ID is required' },
        { status: 400, origin }
      );
    }

    if (!availableDesigns || availableDesigns.length === 0) {
      return corsResponse(
        { success: false, error: 'No designs available to select from' },
        { status: 400, origin }
      );
    }

    // Get AI API key (decrypted) using shared helper to ensure consistent crypto
    const { getApiKey } = await import('@/lib/get-api-key');
    const apiKey = await getApiKey(parseInt(apiKeyId));
    if (!apiKey) {
      return corsResponse(
        { success: false, error: 'API key not found or invalid' },
        { status: 404, origin }
      );
    }

    // Replace variables in instruction
    let processedInstruction = instruction;
    if (variables) {
      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedInstruction = processedInstruction.replace(regex, String(variables[key]));
      });
    }

    console.log('[Canva AI API] Processed instruction:', processedInstruction);

    // Build design list for AI
    const designList = (availableDesigns as CanvaDesignOption[])
      .map((d, i) => `${i + 1}. ID: ${d.id}, Title: "${d.title}"`)
      .join('\n');

    const systemPrompt = `You are a design selection assistant. Based on the user's instruction and the available designs, select the most appropriate design.

Available designs:
${designList}

Respond ONLY with a JSON object in this exact format:
{
  "selectedId": "the design ID",
  "selectedTitle": "the design title",
  "reasoning": "brief explanation of why this design was chosen"
}`;

    const userPrompt = `Instruction: ${processedInstruction}

Select the most appropriate design from the list and respond with the JSON format specified.`;

    console.log('[Canva AI API] Calling AI...');

    let selectedDesign;

    if (aiProvider === 'openai') {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      const completion = await openai.chat.completions.create({
        model: aiModel || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      selectedDesign = JSON.parse(completion.choices[0].message.content || '{}');
    } else {
      // Gemini
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: aiModel || 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent([systemPrompt, userPrompt]);
      selectedDesign = JSON.parse(result.response.text());
    }

    console.log('[Canva AI API] AI selected:', selectedDesign);

    // Find full design info
    const chosenDesign = (availableDesigns as CanvaDesignOption[]).find(
      (d) => d.id === selectedDesign.selectedId
    );

    return corsResponse(
      {
        success: true,
        output: {
          type: 'canva_ai_result',
          selectedDesign: {
            id: selectedDesign.selectedId,
            title: selectedDesign.selectedTitle,
            thumbnailUrl: chosenDesign?.thumbnailUrl,
            reasoning: selectedDesign.reasoning
          }
        }
      },
      { origin }
    );
  } catch (error) {
    console.error('[Canva AI API] Error:', error);
    return corsResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process Canva AI step'
      },
      { status: 500, origin }
    );
  }
}
