import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { getApiKey, getApiKeyByProvider } from './get-api-key';

// Schema definitions for structured outputs - Simplified for OpenAI compatibility
const aiOutputSchema = z.object({
  type: z.enum(['text', 'buttons', 'input', 'options']).describe('Tipo de output'),
  content: z.string().optional().describe('Texto (apenas para type=text)'),
  buttons: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.string(),
    })
  ).optional().describe('Lista de botões (apenas para type=buttons)'),
  placeholder: z.string().optional().describe('Placeholder (apenas para type=input)'),
  inputType: z.enum(['text', 'email', 'tel', 'textarea']).optional().describe('Tipo do input'),
  variable: z.string().optional().describe('Nome da variável'),
  options: z.array(z.string()).optional().describe('Lista de opções (apenas para type=options)'),
});

export type AIOutput = z.infer<typeof aiOutputSchema>;

 
/**
 * Processa um step de AI e retorna output estruturado
 */
export async function processAIStep({
  provider,
  model,
  prompt,
  temperature,
  apiKeyId,
  outputType,
  variables
}: {
  provider: 'openai' | 'gemini';
  model?: string;
  prompt: string;
  temperature?: number;
  apiKeyId?: number;
  outputType: 'text' | 'buttons' | 'input' | 'options';
  variables?: Record<string, unknown>;
}) {
  // Buscar API key do banco ou fallback para env var
  let apiKey: string | null;
  
  if (apiKeyId) {
    apiKey = await getApiKey(apiKeyId);
  } else {
    apiKey = await getApiKeyByProvider(provider);
  }
  
  if (!apiKey) {
    throw new Error(`No API key found for provider: ${provider}`);
  }
  // Replace variables in prompt
  let processedPrompt = prompt;
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      processedPrompt = processedPrompt.replace(regex, String(value));
    }
  }
  

  // Add instruction based on output type
  const typeInstructions = {
    text: 'Gere uma mensagem de texto clara e relevante.',
    buttons: 'Gere uma lista de botões (1-6 opções) relevantes para o contexto.',
    input: 'Defina um campo de input apropriado com placeholder e tipo.',
    options: 'Gere uma lista de opções simples (2-8 itens) para o usuário escolher.',
  };

  const fullPrompt = `${processedPrompt}

Contexto disponível: ${JSON.stringify(variables, null, 2)}

${typeInstructions[outputType]}

IMPORTANTE: Você DEVE retornar um objeto JSON com o campo "type" igual a "${outputType}".`;

  // Select model based on provider with API key from database
  let selectedModel;
  if (provider === 'openai') {
    const openaiClient = createOpenAI({ apiKey });
    selectedModel = openaiClient(model || 'gpt-4o');
  } else if (provider === 'gemini') {
    const google = createGoogleGenerativeAI({ apiKey });
    selectedModel = google(model || 'gemini-2.0-flash-exp');
  } else {
    throw new Error(`Provider ${provider} not supported`);
  }

  try {
    const result = await generateObject({
      model: selectedModel,
      schema: aiOutputSchema,
      prompt: fullPrompt,
      temperature,
      maxRetries: 2,
    });

    // Validate that output type matches requested type
    if (result.object.type !== outputType) {
      console.warn(`AI returned type ${result.object.type} but ${outputType} was requested`);
    }

    return result.object;
  } catch (error) {
    console.error('Error processing AI step:', error);
    
    // Fallback response based on output type
    if (outputType === 'text') {
      return {
        type: 'text',
        content: 'Desculpe, não foi possível processar sua solicitação no momento.',
      };
    } else if (outputType === 'buttons') {
      return {
        type: 'buttons',
        buttons: [
          { id: 'continue', label: 'Continuar', value: 'continue' },
        ],
      };
    } else if (outputType === 'input') {
      return {
        type: 'input',
        placeholder: 'Digite sua resposta',
        inputType: 'text',
      };
    } else {
      return {
        type: 'options',
        options: ['Sim', 'Não'],
      };
    }
  }
}

/**
 * Replace variables in text with actual values
 */
export function replaceVariables(text: string, variables: Record<string, unknown>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}
