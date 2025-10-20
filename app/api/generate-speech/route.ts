import { NextRequest, NextResponse } from 'next/server';
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getApiKey, getApiKeyByProvider } from '@/lib/get-api-key';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            apiKeyId,
            model = 'tts-1',
            voice = 'alloy',
            text,
            speed = 1.0,
            variables = {}
        } = body;

        // Validate required fields
        if (!text) {
            return NextResponse.json(
                { success: false, error: 'Text is required' },
                { status: 400 }
            );
        }

        // Get API key
        let apiKey: string | null;
        if (apiKeyId) {
            apiKey = await getApiKey(apiKeyId);
        } else {
            apiKey = await getApiKeyByProvider('openai');
        }

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'No OpenAI API key found' },
                { status: 400 }
            );
        }

        // Replace variables in text
        let processedText = text;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{${key}}`, 'g');
            processedText = processedText.replace(regex, String(value));
        }

        // Create OpenAI client with API key
        const openaiClient = createOpenAI({ apiKey });

        // Generate speech
        const audio = await generateSpeech({
            model: openaiClient.speech(model),
            text: processedText,
            voice,
            ...(speed !== 1.0 && { speed })
        });

        // Get audio data from uint8ArrayData property
        const audioData = (audio as unknown as { audio: { uint8ArrayData: Uint8Array } }).audio.uint8ArrayData;

        if (!audioData) {
            throw new Error('Could not extract audio data from result');
        }

        // Convert to base64
        const audioBuffer = Buffer.from(audioData);
        const audioBase64 = audioBuffer.toString('base64');

        return NextResponse.json({
            success: true,
            audioBase64,
            mimeType: 'audio/mpeg'
        });
    } catch (error) {
        console.error('[API] Error generating speech:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate speech'
            },
            { status: 500 }
        );
    }
}
