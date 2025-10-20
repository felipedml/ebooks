import { inngest } from "../client";

// Step types
export interface TextStep {
  type: 'text';
  content: string;
  delay?: number;
}

export interface WebhookConfig {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ButtonStep {
  type: 'button';
  buttons: Array<{
    id: string;
    label: string;
    value: string;
    link?: string; // URL opcional para redirecionar o usuário
  }>;
  webhook?: WebhookConfig;
}

export interface InputStep {
  type: 'input';
  placeholder?: string;
  inputType?: 'text' | 'email' | 'tel' | 'textarea';
  variable?: string;
  isContactData?: boolean; // Marcar como dado de contato
  webhook?: WebhookConfig;
}

export interface OptionsStep {
  type: 'options';
  options: string[];
  webhook?: WebhookConfig;
}

export interface AIStep {
  type: 'ai';
  provider: 'openai' | 'gemini';
  apiKeyId?: number; // ID da API key configurada no banco
  model?: string; // e.g., 'gpt-4o', 'gemini-2.0-flash-exp'
  prompt: string; // Prompt que pode usar variáveis {variable_name}
  outputType: 'text' | 'buttons' | 'input' | 'options';
  temperature?: number;
  maxTokens?: number;
}

export interface AudioStep {
  type: 'audio';
  mode: 'static' | 'dynamic'; // Estático (pré-gravado) ou Dinâmico (TTS em tempo real)
  // Para modo 'static':
  audioBase64?: string; // Áudio em base64 gravado pelo admin
  mimeType?: string; // Tipo do áudio (audio/webm, audio/mpeg, etc)
  // Para modo 'dynamic':
  ttsTemplate?: string; // Template de texto com variáveis para gerar áudio dinamicamente
  delay?: number; // Delay antes de mostrar (como text step)
}

export interface CanvaStep {
  type: 'canva';
  action: 'list_designs' | 'get_design' | 'create_autofill'; // Ação a executar
  // Para 'list_designs': lista designs do usuário
  // Para 'get_design': obtém design específico
  designId?: string; // ID do design (para get_design)
  // Para 'create_autofill': cria design a partir de template
  brandTemplateId?: string; // ID do Brand Template
  autofillFields?: Record<string, string>; // Campos do autofill (pode conter variáveis @{var})
  message?: string; // Mensagem a exibir antes da ação
  saveResultAs?: string; // Nome da variável para salvar resultado (ex: 'canva_design_id')
  delay?: number;
}

export interface CanvaDesignOption {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

export interface CanvaAIStep {
  type: 'canva_ai';
  instruction: string; // Instrução para IA (pode usar variáveis {{var}})
  aiProvider: 'openai' | 'gemini';
  aiModel?: string; // e.g., 'gpt-4o', 'gemini-2.0-flash-exp'
  apiKeyId?: number; // ID da API key configurada
  availableDesigns: CanvaDesignOption[]; // Designs que admin selecionou
  message?: string; // Mensagem a exibir antes
  saveResultAs?: string; // Nome da variável para salvar design selecionado
  delay?: number;
}

export type FlowStep = TextStep | ButtonStep | InputStep | OptionsStep | AIStep | AudioStep | CanvaStep | CanvaAIStep;

// Main flow orchestrator
export const runFlowFn = inngest.createFunction(
  { id: "flow-runner" },
  { event: "flow/start" },
  async ({ event, step }) => {
    const { flowId, sessionId, steps } = event.data;
    const responses: Record<string, unknown> = {};
    
    for (const [index, flowStep] of steps.entries()) {
      const stepId = `step-${index}`;
      
      switch (flowStep.type) {
        case 'text':
          // Text steps just need a delay
          await step.sleep(`${stepId}-delay`, flowStep.delay || 500);
          
          // Send update to client
          await step.sendEvent(`${stepId}-update`, {
            name: "flow/step.update",
            data: {
              sessionId,
              stepIndex: index,
              stepType: 'text',
              content: flowStep.content
            }
          });
          break;
          
        case 'button':
          // Send buttons to client
          await step.sendEvent(`${stepId}-buttons`, {
            name: "flow/step.update", 
            data: {
              sessionId,
              stepIndex: index,
              stepType: 'button',
              buttons: flowStep.buttons
            }
          });
          
          // Wait for user selection
          const buttonEvent = await step.waitForEvent(
            `${stepId}-wait`,
            {
              event: "flow/button.selected",
              timeout: "5m",
              if: `async.data.sessionId == '${sessionId}' && async.data.stepIndex == ${index}`
            }
          );
          
          if (buttonEvent) {
            responses[stepId] = buttonEvent.data.selectedValue;
          }
          break;
          
        case 'input':
          // Send input request to client
          await step.sendEvent(`${stepId}-input`, {
            name: "flow/step.update",
            data: {
              sessionId,
              stepIndex: index,
              stepType: 'input',
              placeholder: flowStep.placeholder,
              inputType: flowStep.inputType
            }
          });
          
          // Wait for user input
          const inputEvent = await step.waitForEvent(
            `${stepId}-wait`,
            {
              event: "flow/input.submitted",
              timeout: "5m",
              if: `async.data.sessionId == '${sessionId}' && async.data.stepIndex == ${index}`
            }
          );
          
          if (inputEvent) {
            responses[stepId] = inputEvent.data.value;
            // Store with variable name if provided
            if (flowStep.variable) {
              responses[flowStep.variable] = inputEvent.data.value;
            }
          }
          break;

        case 'options':
          // Send options to client
          await step.sendEvent(`${stepId}-options`, {
            name: "flow/step.update",
            data: {
              sessionId,
              stepIndex: index,
              stepType: 'options',
              options: flowStep.options
            }
          });
          
          // Wait for user selection
          const optionEvent = await step.waitForEvent(
            `${stepId}-wait`,
            {
              event: "flow/option.selected",
              timeout: "5m",
              if: `async.data.sessionId == '${sessionId}' && async.data.stepIndex == ${index}`
            }
          );
          
          if (optionEvent) {
            responses[stepId] = optionEvent.data.selectedOption;
          }
          break;

        case 'ai':
          // Process AI step
          const aiResult = await step.run(`${stepId}-ai-process`, async () => {
            const { processAIStep } = await import('@/lib/ai-processor');
            
            return processAIStep({
              provider: flowStep.provider,
              apiKeyId: flowStep.apiKeyId,
              model: flowStep.model,
              prompt: flowStep.prompt,
              outputType: flowStep.outputType,
              variables: responses,
              temperature: flowStep.temperature,
              maxTokens: flowStep.maxTokens,
            });
          });

          // Send AI-generated content based on output type
          if (aiResult.type === 'text') {
            await step.sendEvent(`${stepId}-update`, {
              name: "flow/step.update",
              data: {
                sessionId,
                stepIndex: index,
                stepType: 'text',
                content: aiResult.content
              }
            });
          } else if (aiResult.type === 'buttons') {
            await step.sendEvent(`${stepId}-buttons`, {
              name: "flow/step.update",
              data: {
                sessionId,
                stepIndex: index,
                stepType: 'button',
                buttons: aiResult.buttons
              }
            });
            
            // Wait for user selection
            const aiButtonEvent = await step.waitForEvent(
              `${stepId}-wait`,
              {
                event: "flow/button.selected",
                timeout: "5m",
                if: `async.data.sessionId == '${sessionId}' && async.data.stepIndex == ${index}`
              }
            );
            
            if (aiButtonEvent) {
              responses[stepId] = aiButtonEvent.data.selectedValue;
            }
          } else if (aiResult.type === 'input') {
            await step.sendEvent(`${stepId}-input`, {
              name: "flow/step.update",
              data: {
                sessionId,
                stepIndex: index,
                stepType: 'input',
                placeholder: aiResult.placeholder,
                inputType: aiResult.inputType
              }
            });
            
            // Wait for user input
            const aiInputEvent = await step.waitForEvent(
              `${stepId}-wait`,
              {
                event: "flow/input.submitted",
                timeout: "5m",
                if: `async.data.sessionId == '${sessionId}' && async.data.stepIndex == ${index}`
              }
            );
            
            if (aiInputEvent) {
              responses[stepId] = aiInputEvent.data.value;
              if (aiResult.variable) {
                responses[aiResult.variable] = aiInputEvent.data.value;
              }
            }
          } else if (aiResult.type === 'options') {
            await step.sendEvent(`${stepId}-options`, {
              name: "flow/step.update",
              data: {
                sessionId,
                stepIndex: index,
                stepType: 'options',
                options: aiResult.options
              }
            });
            
            // Wait for user selection
            const aiOptionEvent = await step.waitForEvent(
              `${stepId}-wait`,
              {
                event: "flow/option.selected",
                timeout: "5m",
                if: `async.data.sessionId == '${sessionId}' && async.data.stepIndex == ${index}`
              }
            );
            
            if (aiOptionEvent) {
              responses[stepId] = aiOptionEvent.data.selectedOption;
            }
          }
          
          // Store AI result
          responses[`${stepId}_ai_result`] = aiResult;
          break;

        case 'audio':
          // Audio steps - static or dynamic
          await step.sleep(`${stepId}-delay`, flowStep.delay || 500);
          
          let audioData = flowStep.audioBase64;
          let audioMime = flowStep.mimeType || 'audio/mpeg';
          
          // If dynamic mode, generate audio with TTS in real-time
          if (flowStep.mode === 'dynamic' && flowStep.ttsTemplate) {
            try {
              // Replace variables in template
              let textToConvert = flowStep.ttsTemplate;
              for (const [key, value] of Object.entries(responses)) {
                const regex = new RegExp(`@\\{${key}\\}`, 'g');
                textToConvert = textToConvert.replace(regex, String(value));
              }
              
              // Generate speech using TTS
              const ttsResponse = await step.run(`${stepId}-tts`, async () => {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-speech`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: textToConvert,
                    model: 'tts-1',
                    voice: 'alloy',
                    speed: 1.0
                  })
                });
                return await res.json();
              });
              
              if (ttsResponse.success && ttsResponse.audioBase64) {
                audioData = ttsResponse.audioBase64;
                audioMime = ttsResponse.mimeType || 'audio/mpeg';
              }
            } catch (error) {
              console.error('[Inngest] Error generating dynamic TTS:', error);
              // Continue with empty audio if TTS fails
            }
          }
          
          // Send audio to client
          await step.sendEvent(`${stepId}-update`, {
            name: "flow/step.update",
            data: {
              sessionId,
              stepIndex: index,
              stepType: 'audio',
              audioBase64: audioData,
              mimeType: audioMime
            }
          });
          break;

        case 'canva':
          await step.sleep(`${stepId}-delay`, flowStep.delay || 500);
          
          // Get Canva access token from database
          const canvaTokenData = await step.run(`${stepId}-get-token`, async () => {
            const { getCanvaToken } = await import('@/lib/canva-token');
            return await getCanvaToken('admin');
          });
          
          if (!canvaTokenData || canvaTokenData.isExpired) {
            console.error('[Inngest] Canva not authenticated or token expired');
            await step.sendEvent(`${stepId}-error`, {
              name: "flow/step.update",
              data: {
                sessionId,
                stepIndex: index,
                stepType: 'canva',
                error: canvaTokenData?.isExpired 
                  ? 'Canva token expired - please re-authenticate' 
                  : 'Canva not authenticated'
              }
            });
            break;
          }
          
          const canvaToken = canvaTokenData.accessToken;
          
          let canvaResult: { success?: boolean; error?: string | { message?: string }; items?: unknown[]; design?: unknown; designId?: string; status?: string } | undefined;
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          
          try {
            switch (flowStep.action) {
              case 'list_designs':
                // Call API to list designs
                canvaResult = await step.run(`${stepId}-list`, async () => {
                  const res = await fetch(`${baseUrl}/api/canva/designs?access_token=${canvaToken}`);
                  return await res.json();
                });
                break;
                
              case 'get_design':
                if (flowStep.designId) {
                  canvaResult = await step.run(`${stepId}-get`, async () => {
                    const res = await fetch(`${baseUrl}/api/canva/design/${flowStep.designId}?access_token=${canvaToken}`);
                    return await res.json();
                  });
                }
                break;
                
              case 'create_autofill':
                if (flowStep.brandTemplateId) {
                  // Replace variables in autofill fields
                  const fields = { ...flowStep.autofillFields };
                  if (fields) {
                    for (const [key, value] of Object.entries(fields)) {
                      for (const [varKey, varValue] of Object.entries(responses)) {
                        const regex = new RegExp(`@\\{${varKey}\\}`, 'g');
                        fields[key] = String(value).replace(regex, String(varValue));
                      }
                    }
                  }
                  
                  // Create autofill job and wait for completion (API polls internally for up to 30s)
                  canvaResult = await step.run(`${stepId}-autofill`, async () => {
                    const res = await fetch(`${baseUrl}/api/canva/autofill`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        access_token: canvaToken,
                        brandTemplateId: flowStep.brandTemplateId,
                        fields
                      })
                    });
                    return await res.json();
                  });
                  
                  // Check if autofill was successful
                  if (canvaResult && !canvaResult.success) {
                    console.error('[Inngest] Autofill failed:', canvaResult.error);
                    // Send error to client but continue flow
                    await step.sendEvent(`${stepId}-autofill-error`, {
                      name: "flow/step.update",
                      data: {
                        sessionId,
                        stepIndex: index,
                        stepType: 'canva',
                        action: 'create_autofill',
                        error: typeof canvaResult.error === 'object' ? canvaResult.error?.message : canvaResult.error || 'Autofill failed',
                        status: canvaResult.status
                      }
                    });
                  }
                }
                break;
            }
            
            // Save result if saveResultAs is defined
            if (flowStep.saveResultAs && canvaResult) {
              responses[flowStep.saveResultAs] = canvaResult;
            }
            
            // Send to client
            await step.sendEvent(`${stepId}-update`, {
              name: "flow/step.update",
              data: {
                sessionId,
                stepIndex: index,
                stepType: 'canva',
                action: flowStep.action,
                result: canvaResult,
                message: flowStep.message
              }
            });
          } catch (error) {
            console.error('[Inngest] Error processing Canva step:', error);
            await step.sendEvent(`${stepId}-error`, {
              name: "flow/step.update",
              data: {
                sessionId,
                stepIndex: index,
                stepType: 'canva',
                error: 'Failed to process Canva action'
              }
            });
          }
          break;

        case 'canva_ai':
          await step.sleep(`${stepId}-delay`, flowStep.delay || 500);
          
          // Get AI API key via shared helper (consistent crypto)
          const aiKey = await step.run(`${stepId}-get-ai-key`, async () => {
            if (!flowStep.apiKeyId) return null;
            const { getApiKey } = await import('@/lib/get-api-key');
            const { db } = await import('@/lib/db');
            const { apiKeys } = await import('@/lib/db/schema');
            const { eq } = await import('drizzle-orm');
            
            const keys = await db.select().from(apiKeys).where(eq(apiKeys.id, flowStep.apiKeyId)).limit(1);
            if (keys.length === 0) return null;
            const decrypted = await getApiKey(flowStep.apiKeyId);
            if (!decrypted) return null;
            return {
              provider: keys[0].provider,
              apiKey: decrypted,
            };
          });
          
          if (!aiKey) {
            console.error('[Inngest] AI API key not found');
            await step.sendEvent(`${stepId}-error`, {
              name: "flow/step.update",
              data: {
                sessionId,
                stepIndex: index,
                stepType: 'canva_ai',
                error: 'AI API key not configured'
              }
            });
            break;
          }
          
          // Replace variables in instruction
          let instruction = flowStep.instruction;
          for (const [key, value] of Object.entries(responses)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            instruction = instruction.replace(regex, String(value));
          }
          
          // Call AI to select design
          const selectedDesign = await step.run(`${stepId}-ai-select`, async () => {
            const designList = flowStep.availableDesigns
              .map((d: CanvaDesignOption, i: number) => `${i + 1}. ID: ${d.id}, Title: "${d.title}"`)
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
            
            const userPrompt = `Instruction: ${instruction}

Select the most appropriate design from the list and respond with the JSON format specified.`;
            
            if (aiKey.provider === 'openai') {
              const { OpenAI } = await import('openai');
              const openai = new OpenAI({ apiKey: aiKey.apiKey });
              
              const completion = await openai.chat.completions.create({
                model: flowStep.aiModel || 'gpt-4o-mini',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3
              });
              
              return JSON.parse(completion.choices[0].message.content || '{}');
            } else {
              // Gemini
              const { GoogleGenerativeAI } = await import('@google/generative-ai');
              const genAI = new GoogleGenerativeAI(aiKey.apiKey);
              const model = genAI.getGenerativeModel({
                model: flowStep.aiModel || 'gemini-2.0-flash-exp',
                generationConfig: {
                  temperature: 0.3,
                  responseMimeType: 'application/json'
                }
              });
              
              const result = await model.generateContent([systemPrompt, userPrompt]);
              return JSON.parse(result.response.text());
            }
          });
          
          // Find full design info
          const chosenDesign = flowStep.availableDesigns.find((d: CanvaDesignOption) => d.id === selectedDesign.selectedId);
          
          // Save result if needed
          if (flowStep.saveResultAs) {
            responses[flowStep.saveResultAs] = selectedDesign;
          }
          
          // Send to client
          await step.sendEvent(`${stepId}-update`, {
            name: "flow/step.update",
            data: {
              sessionId,
              stepIndex: index,
              stepType: 'canva_ai',
              message: flowStep.message,
              selectedDesign: {
                id: selectedDesign.selectedId,
                title: selectedDesign.selectedTitle,
                thumbnailUrl: chosenDesign?.thumbnailUrl,
                reasoning: selectedDesign.reasoning
              }
            }
          });
          break;
      }
    }
    
    return { sessionId, completed: true };
  }
);
