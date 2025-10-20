'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import type { 
  FlowStep, 
  InputStep, 
  OptionsStep, 
  AIStep, 
  AudioStep, 
  CanvaStep, 
  CanvaAIStep, 
  CanvaDesignOption 
} from '@/app/src/inngest/functions/flow-steps';
interface FlowRunnerProps {
  flowId: number;
  onComplete?: (responses: Record<string, unknown>) => void;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'interaction';
  content?: string;
  buttons?: Array<{ id: string; label: string; value: string; link?: string }>; 
  input?: {
    placeholder?: string;
    inputType?: 'text' | 'email' | 'tel' | 'textarea';
  };
  audio?: {
    audioBase64: string;
    mimeType: string;
  };
  canvaAIResult?: {
    selected: { id: string; title: string; thumbnailUrl?: string; reasoning: string };
    designs: CanvaDesignOption[];
  };
  timestamp: string;
}

export default function FlowRunner({ flowId, onComplete }: FlowRunnerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [dbSessionId, setDbSessionId] = useState<number | null>(null);
  const [sessionCreating, setSessionCreating] = useState(false); // Flag para evitar criação dupla
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [responses] = useState<Record<string, unknown>>({});

  // Use useRef to persist data across re-renders
  const variablesRef = useRef<Record<string, string>>({});
  const contactDataRef = useRef<Record<string, string>>({});
  const [isProcessing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flowLoaded, setFlowLoaded] = useState(false);
  const [flowStarted, setFlowStarted] = useState(false); // Prevent double start
  const [displayedSteps, setDisplayedSteps] = useState<Set<number>>(new Set()); // Track displayed steps
  const [activeInteractionMessageId, setActiveInteractionMessageId] = useState<string | null>(null);
  const [visualConfigLoaded, setVisualConfigLoaded] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false); // Track AI processing state

  // Canva AI UI state
  const [expandedDesignId, setExpandedDesignId] = useState<string | null>(null);
  const [designDetails, setDesignDetails] = useState<Record<string, { thumbnailUrl?: string; previewUrl?: string; imageUrl?: string }>>({});

  const fetchDesignDetail = async (id: string) => {
    try {
      if (designDetails[id]) return; // cache
      const res = await fetch(`/api/canva/design/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDesignDetails(prev => ({ ...prev, [id]: data.design }));
      }
    } catch (e) {
      console.error('[FlowRunner] Failed to fetch design detail:', e);
    }
  };

  const handleDesignClick = async (id: string) => {
    const next = expandedDesignId === id ? null : id;
    setExpandedDesignId(next);
    if (next) await fetchDesignDetail(id);
  };

  const resolveDesignImageUrl = (id: string, fallback?: string) => {
    const detail = designDetails[id];
    // Try common fields safely; fallback to provided thumbnailUrl
    const candidate = (detail && (detail.thumbnailUrl || detail.previewUrl || detail.imageUrl)) || fallback;
    return candidate || '';
  };

  const [visualConfig, setVisualConfig] = useState({
    corBackground: '#f3f4f6',
    corBalaoBot: '#ffffff',
    corBalaoUser: '#10b981',
    corTextoBot: '#374151',
    corTextoUser: '#ffffff',
    imagemLogo: ''
  });

  // Removed audio recording state - audio is now pre-recorded by admin

  // Replace variables in text with actual values
  const replaceVariables = (text: string): string => {
    console.log('[FlowRunner] replaceVariables called with text:', text);
    console.log('[FlowRunner] Available variables:', variablesRef.current);

    let result = text;
    Object.keys(variablesRef.current).forEach((key) => {
      const regex = new RegExp(`@\\{${key}\\}`, 'g');
      const before = result;
      result = result.replace(regex, variablesRef.current[key]);
      if (before !== result) {
        console.log(`[FlowRunner] Replaced @{${key}} with "${variablesRef.current[key]}"`);
      }
    });

    console.log('[FlowRunner] Result after replacement:', result);
    return result;
  };

  // Load visual config
  useEffect(() => {
    loadVisualConfig();
  }, []);

  const loadVisualConfig = async () => {
    try {
      const response = await fetch('/api/configuracao-visual');

      if (response.ok) {
        const data = await response.json();

        // API returns 'configuracao' with camelCase keys from Drizzle
        if (data.success && data.configuracao) {
          const apiConfig = data.configuracao;

          const config = {
            corBackground: apiConfig.corBackground || '#f3f4f6',
            corBalaoBot: apiConfig.corBalaoBot || '#ffffff',
            corBalaoUser: apiConfig.corBalaoUser || '#10b981',
            corTextoBot: apiConfig.corTextoBot || '#374151',
            corTextoUser: apiConfig.corTextoUser || '#ffffff',
            imagemLogo: apiConfig.imagemLogo || ''
          };

          setVisualConfig(config);
          setVisualConfigLoaded(true);
        }
      } else {
        console.error('[FlowRunner] API response not ok:', response.status, response.statusText);
      }
    } catch (err) {
    }
  };

  // Update URL with sessionId
  useEffect(() => {
    if (sessionId) {
      const url = new URL(window.location.href);
      url.searchParams.set('sessionId', sessionId);
      window.history.replaceState({}, '', url.toString());
      console.log('[FlowRunner] URL updated with sessionId:', sessionId);
    }
  }, [sessionId]);

  // Create session in database
  const createSession = async () => {
    // Prevent multiple session creation attempts
    if (dbSessionId || sessionCreating) {
      console.log('[FlowRunner] Session already created or creating, skipping');
      return;
    }

    setSessionCreating(true);
    try {
      // Get userId from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('userId') ||
        urlParams.get('user_id') ||
        urlParams.get('uid');

      const metadata = {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      };

      console.log('[FlowRunner] Creating session with sessionId:', sessionId);

      const response = await fetch('/api/sessoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fluxoId: flowId,
          userId,
          metadata,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDbSessionId(data.sessao.id);
        console.log('[FlowRunner] Session created successfully:', data.sessao);
      } else {
        const errorData = await response.json();
        console.error('[FlowRunner] Failed to create session:', errorData);
      }
    } catch (err) {
      console.error('[FlowRunner] Error creating session:', err);
    } finally {
      setSessionCreating(false);
    }
  };

  // Save interaction to database
  const saveInteraction = async (stepIndex: number, stepType: string, resposta: unknown) => {
    if (!dbSessionId) {
      console.warn('[FlowRunner] No dbSessionId, skipping save interaction');
      return;
    }

    try {
      await fetch(`/api/sessoes/${sessionId}/interacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepIndex,
          stepType,
          resposta,
        }),
      });
      console.log('[FlowRunner] Interaction saved:', { stepIndex, stepType });
    } catch (err) {
      console.error('[FlowRunner] Error saving interaction:', err);
    }
  };

  // Mark session as complete
  const completeSession = async () => {
    if (!dbSessionId) return;

    try {
      await fetch(`/api/sessoes/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completo',
          completedAt: new Date().toISOString(),
          contactData: Object.keys(contactDataRef.current).length > 0 ? contactDataRef.current : undefined,
        }),
      });
      console.log('[FlowRunner] Session completed with contact data:', contactDataRef.current);
    } catch (err) {
      console.error('[FlowRunner] Error completing session:', err);
    }
  };

  // Load flow
  useEffect(() => {
    if (flowId && !flowLoaded) {
      console.log('[FlowRunner] Loading flow:', flowId);
      setMessages([]);
      setCurrentStepIndex(0);
      setInputValue('');
      setFlowStarted(false); // Reset para permitir novo início
      setSessionCreating(false); // Reset flag de criação
      setDisplayedSteps(new Set()); // Reset steps exibidos
      variablesRef.current = {}; // Reset variables
      contactDataRef.current = {}; // Reset contact data

      loadFlow();
    }
  }, [flowId, flowLoaded]);

  const loadFlow = async () => {
    try {
      setLoading(true);
      setError(null);

      const [flowResponse, stepsResponse] = await Promise.all([
        fetch(`/api/fluxos?id=${flowId}`),
        fetch(`/api/steps?fluxoId=${flowId}`)
      ]);

      if (!flowResponse.ok || !stepsResponse.ok) {
        throw new Error('Failed to load flow');
      }

      const flowData = await flowResponse.json();
      const stepsData = await stepsResponse.json();

      const flowSteps: FlowStep[] = stepsData.steps?.map((step: { tipo: string; conteudo: string }) => {
        const content = JSON.parse(step.conteudo);
        switch (step.tipo) {
          case 'texto':
            return { type: 'text', content: content.texto || '', delay: content.delayMs };
          case 'botoes':
            return { type: 'button', buttons: content.botoes || [], webhook: content.webhook };
          case 'input':
            return {
              type: 'input',
              placeholder: content.placeholder,
              inputType: content.inputType,
              variable: content.variavel,
              isContactData: content.isContactData,
              webhook: content.webhook
            };
          case 'options':
            return { type: 'options', options: content.opcoes || [], webhook: content.webhook };
          case 'ai':
            return {
              type: 'ai',
              provider: content.provider || 'openai',
              apiKeyId: content.apiKeyId,
              model: content.model,
              prompt: content.prompt || '',
              outputType: content.outputType || 'text',
              temperature: content.temperature ?? 0.7,
              maxTokens: content.maxTokens
            };
          case 'audio':
            console.log('[FlowRunner] Loading audio step with content:', content);
            const audioStep = {
              type: 'audio' as const,
              mode: content.mode || 'static',
              audioBase64: content.audioBase64,
              mimeType: content.mimeType || 'audio/webm',
              ttsTemplate: content.ttsTemplate,
              delay: content.delayMs || 500
            };
            console.log('[FlowRunner] Audio step parsed:', audioStep);
            return audioStep;
          case 'canva':
            console.log('[FlowRunner] Loading canva step with content:', content);
            return {
              type: 'canva' as const,
              action: content.action || 'list_designs',
              designId: content.designId,
              brandTemplateId: content.brandTemplateId,
              autofillFields: content.autofillFields,
              message: content.message,
              saveResultAs: content.saveResultAs,
              delay: content.delayMs || 500
            };
          case 'canva_ai':
            console.log('[FlowRunner] Loading canva_ai step with content:', content);
            const canvaAI = {
              type: 'canva_ai' as const,
              instruction: content.instruction || '',
              aiProvider: content.aiProvider || 'openai',
              aiModel: content.aiModel,
              apiKeyId: content.apiKeyId,
              availableDesigns: content.availableDesigns || [],
              message: content.message,
              saveResultAs: content.saveResultAs,
              delay: content.delayMs || 500
            };
            console.log('[FlowRunner] Canva AI step loaded:', canvaAI);
            console.log('[FlowRunner] API Key ID from content:', content.apiKeyId);
            return canvaAI;
          default:
            return null;
        }
      }).filter(Boolean) || [];

      console.log('[FlowRunner] Flow steps loaded:', flowSteps);
      setFlowSteps(flowSteps);
      setFlowLoaded(true);

      // Create session in database
      await createSession();

      // Pass steps directly to avoid state timing issues
      setTimeout(() => {
        console.log('[FlowRunner] Calling sendStartEvent after timeout');
        sendStartEvent(flowSteps);
      }, 100);
    } catch (err) {
      console.error('[FlowRunner] Error loading flow:', err);
      setError('Erro ao carregar fluxo');
    } finally {
      setLoading(false);
    }
  };

  const sendStartEvent = async (steps?: FlowStep[]) => {
    // Prevent double start
    if (flowStarted) {
      console.log('[FlowRunner] Flow already started, skipping');
      return;
    }

    setFlowStarted(true);
    const stepsToUse = steps || flowSteps;
    console.log('[FlowRunner] Sending start event with steps:', stepsToUse);
    try {
      await fetch('/api/inngest-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'flow/started',
          data: {
            flowId,
            sessionId,
            steps: stepsToUse.map((step) => {
              const baseStep = { type: step.type };
              switch (step.type) {
                case 'text':
                  return { ...baseStep, content: step.content, delay: step.delay };
                case 'button':
                  return { ...baseStep, buttons: step.buttons };
                case 'input':
                  return {
                    ...baseStep,
                    placeholder: step.placeholder,
                    inputType: step.inputType,
                    variable: step.variable
                  };
                case 'options':
                  return { ...baseStep, options: step.options };
                case 'audio':
                  return {
                    ...baseStep,
                    mode: step.mode || 'static',
                    audioBase64: step.audioBase64,
                    mimeType: step.mimeType,
                    ttsTemplate: step.ttsTemplate,
                    delay: step.delay
                  };
                case 'canva':
                  return {
                    ...baseStep,
                    action: step.action,
                    designId: step.designId,
                    brandTemplateId: step.brandTemplateId,
                    autofillFields: step.autofillFields,
                    message: step.message,
                    saveResultAs: step.saveResultAs,
                    delay: step.delay
                  };
                case 'canva_ai':
                  const canvaAIStep = step as CanvaAIStep;
                  return {
                    ...baseStep,
                    instruction: canvaAIStep.instruction,
                    aiProvider: canvaAIStep.aiProvider,
                    aiModel: canvaAIStep.aiModel,
                    apiKeyId: canvaAIStep.apiKeyId,
                    availableDesigns: canvaAIStep.availableDesigns,
                    message: canvaAIStep.message,
                    saveResultAs: canvaAIStep.saveResultAs,
                    delay: canvaAIStep.delay
                  };
                default:
                  return baseStep;
              }
            })
          }
        })
      });

      displayNextStep(0, stepsToUse);
    } catch (err) {
      console.error('[FlowRunner] Error sending start event:', err);
    }
  };

  const displayNextStep = (fromIndex: number, steps?: FlowStep[]) => {
    const stepsToUse = steps || flowSteps;
    console.log('[FlowRunner] displayNextStep called with index:', fromIndex);
    console.log('[FlowRunner] Total steps:', stepsToUse.length);
    console.log('[FlowRunner] Current step:', stepsToUse[fromIndex]);

    // Check if step was already displayed
    if (displayedSteps.has(fromIndex)) {
      console.log('[FlowRunner] Step', fromIndex, 'already displayed, skipping');
      return;
    }

    if (fromIndex >= stepsToUse.length) {
      console.log('[FlowRunner] No more steps to display');
      return;
    }

    // Mark step as displayed
    setDisplayedSteps(prev => new Set([...prev, fromIndex]));

    const step = stepsToUse[fromIndex];

    if (step.type === 'text') {
      // Bot message with variables replaced
      const message: ChatMessage = {
        id: `msg-${Date.now()}-${fromIndex}`,
        type: 'bot',
        content: replaceVariables(step.content),
        timestamp: new Date().toISOString()
      };

      console.log('[FlowRunner] Adding bot message:', message);
      setMessages(prev => { 
        const isDuplicate = prev.some(msg =>
          msg.type === 'bot' &&
          msg.content === message.content &&
          Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
        );

        if (isDuplicate) {
          console.log('[FlowRunner] Duplicate message detected, skipping');
          return prev;
        }

        return [...prev, message];
      });
      setCurrentStepIndex(fromIndex);

      // Save text step content to variables
      if (message.content) {
        variablesRef.current = {
          ...variablesRef.current,
          [`step-${fromIndex + 1}-text`]: message.content
        };
      }

      // Check if next step is also text
      setTimeout(() => {
        if (fromIndex + 1 < stepsToUse.length) {
          const nextStep = stepsToUse[fromIndex + 1];
          if (nextStep.type === 'text' || nextStep.type === 'audio' || nextStep.type === 'ai' || nextStep.type === 'canva_ai') {
            displayNextStep(fromIndex + 1, stepsToUse);
          } else {
            // Display interactive step
            displayInteractiveStep(fromIndex + 1, stepsToUse);
          }
        } else {
          // Flow completed
          console.log('[FlowRunner] Flow completed!');
          completeSession();
        }
      }, (step as { delay?: number }).delay || 500);
    } else if (step.type === 'audio') {
      // Audio step - check if dynamic or static
      if (step.mode === 'dynamic' && step.ttsTemplate && !step.audioBase64) {
        // Dynamic audio - need to generate with TTS
        processAudioStepDynamic(step as AudioStep, fromIndex, stepsToUse);
      } else {
        // Static audio - display immediately
        const audioMessage: ChatMessage = {
          id: `msg-audio-${Date.now()}-${fromIndex}`,
          type: 'bot',
          content: '', // No text, just audio
          audio: step.audioBase64 ? {
            audioBase64: step.audioBase64,
            mimeType: step.mimeType || 'audio/webm'
          } : undefined,
          timestamp: new Date().toISOString()
        };

        console.log('[FlowRunner] Adding audio message:', audioMessage);
        setMessages(prev => {
          // Check for duplicate audio messages
          const isDuplicate = prev.some(msg =>
            msg.type === 'bot' &&
            msg.audio &&
            msg.audio.audioBase64 === audioMessage.audio?.audioBase64 &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(audioMessage.timestamp).getTime()) < 2000
          );

          if (isDuplicate) {
            console.log('[FlowRunner] Duplicate audio message detected, skipping');
            return prev;
          }

          return [...prev, audioMessage];
        });
        setCurrentStepIndex(fromIndex);

        // Continue to next step after delay
        setTimeout(() => {
          if (fromIndex + 1 < stepsToUse.length) {
            const nextStep = stepsToUse[fromIndex + 1];
            if (nextStep.type === 'text' || nextStep.type === 'audio' || nextStep.type === 'ai' || nextStep.type === 'canva_ai') {
              displayNextStep(fromIndex + 1, stepsToUse);
            } else {
              displayInteractiveStep(fromIndex + 1, stepsToUse);
            }
          } else {
            console.log('[FlowRunner] Flow completed!');
            completeSession();
          }
        }, step.delay || 500);
      }
    } else if (step.type === 'ai') {
      // AI step - process asynchronously
      processAIStepLocal(step as AIStep, fromIndex, stepsToUse);
    } else if (step.type === 'canva_ai') {
      // Canva AI step - process asynchronously
      processCanvaAIStepLocal(step as CanvaAIStep, fromIndex, stepsToUse);
    } else {
      // Interactive step
      displayInteractiveStep(fromIndex, stepsToUse);
    }
  };

  const processCanvaAIStepLocal = async (canvaAIStep: CanvaAIStep, index: number, steps: FlowStep[]) => {
    console.log('[FlowRunner] Processing Canva AI step:', canvaAIStep);
    console.log('[FlowRunner] API Key ID:', canvaAIStep.apiKeyId);
    console.log('[FlowRunner] Available designs:', canvaAIStep.availableDesigns?.length);
    
    if (!canvaAIStep.apiKeyId) {
      console.error('[FlowRunner] ERROR: No API Key ID configured for this step!');
      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}-${index}`,
        type: 'bot',
        content: '❌ Este step não foi configurado corretamente. Por favor, configure uma API Key no painel de administração.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    if (!canvaAIStep.availableDesigns || canvaAIStep.availableDesigns.length === 0) {
      console.error('[FlowRunner] ERROR: No designs configured for this step!');
      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}-${index}`,
        type: 'bot',
        content: '❌ Nenhum design foi selecionado para este step. Por favor, configure no painel de administração.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setAiProcessing(true);
    setCurrentStepIndex(index);

    // Show optional message first
    if (canvaAIStep.message) {
      const message: ChatMessage = {
        id: `msg-canva-ai-msg-${Date.now()}-${index}`,
        type: 'bot',
        content: canvaAIStep.message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, message]);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      // Call API to process Canva AI step
      const response = await fetch('/api/process-canva-ai-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: canvaAIStep.instruction,
          availableDesigns: canvaAIStep.availableDesigns,
          aiProvider: canvaAIStep.aiProvider,
          aiModel: canvaAIStep.aiModel,
          apiKeyId: canvaAIStep.apiKeyId,
          variables: variablesRef.current,
        }),
      });

      const result = await response.json();

      if (result.success && result.output) {
        const { selectedDesign } = result.output;

        // Build rich Canva AI message
        const message: ChatMessage = {
          id: `msg-canva-ai-result-${Date.now()}-${index}`,
          type: 'bot',
          canvaAIResult: {
            selected: {
              id: selectedDesign.id,
              title: selectedDesign.title,
              thumbnailUrl: selectedDesign.thumbnailUrl,
              reasoning: selectedDesign.reasoning
            },
            designs: canvaAIStep.availableDesigns
          },
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, message]);

        // Preload details for selected design
        fetchDesignDetail(selectedDesign.id);

        // Save result to variables
        if (canvaAIStep.saveResultAs) {
          variablesRef.current = {
            ...variablesRef.current,
            [canvaAIStep.saveResultAs]: selectedDesign.id
          };
        }

        // Continue to next step after delay
        setTimeout(() => {
          if (index + 1 < steps.length) {
            const nextStep = steps[index + 1];
            if (nextStep.type === 'text' || nextStep.type === 'ai' || nextStep.type === 'canva_ai' || nextStep.type === 'audio') {
              displayNextStep(index + 1, steps);
            } else {
              displayInteractiveStep(index + 1, steps);
            }
          } else {
            completeSession();
          }
        }, 500);
      } else {
        throw new Error(result.error || 'Failed to process Canva AI step');
      }
    } catch (error) {
      console.error('[FlowRunner] Error processing Canva AI step:', error);
      
      let errorContent = '❌ Desculpe, ocorreu um erro ao selecionar o design.';
      
      // Check if it's an API error with message
      if (error instanceof Error && error.message.includes('API Key está corrompida')) {
        errorContent = '❌ A API Key está corrompida. Por favor, reconfigure no painel de administração.';
      } else if (error instanceof Error && error.message) {
        errorContent = `❌ ${error.message}`;
      }
      
      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}-${index}`,
        type: 'bot',
        content: errorContent,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiProcessing(false);
    }
  };

  const processAudioStepDynamic = async (audioStep: AudioStep, index: number, steps: FlowStep[]) => {
    console.log('[FlowRunner] Processing dynamic audio step:', audioStep);
    setAiProcessing(true);
    setCurrentStepIndex(index);

    // Show "Generating audio..." message
    const loadingMessage: ChatMessage = {
      id: `msg-audio-loading-${Date.now()}`,
      type: 'bot',
      content: '🎵 Gerando áudio personalizado...',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Replace variables in template
      let textToConvert = audioStep.ttsTemplate || '';
      Object.keys(variablesRef.current).forEach((key) => {
        const regex = new RegExp(`@\\{${key}\\}`, 'g');
        textToConvert = textToConvert.replace(regex, variablesRef.current[key]);
      });

      console.log('[FlowRunner] Generating TTS with text:', textToConvert);

      // Generate speech
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToConvert,
          model: 'tts-1',
          voice: 'alloy',
          speed: 1.0
        })
      });

      const data = await response.json();

      // Remove loading message and add audio
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));

      if (data.success && data.audioBase64) {
        const audioMessage: ChatMessage = {
          id: `msg-audio-${Date.now()}-${index}`,
          type: 'bot',
          content: '',
          audio: {
            audioBase64: data.audioBase64,
            mimeType: data.mimeType || 'audio/mpeg'
          },
          timestamp: new Date().toISOString()
        };

        console.log('[FlowRunner] Adding generated audio message');
        setMessages(prev => {
          // Check for duplicate audio messages
          const isDuplicate = prev.some(msg =>
            msg.type === 'bot' &&
            msg.audio &&
            msg.audio.audioBase64 === audioMessage.audio?.audioBase64 &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(audioMessage.timestamp).getTime()) < 2000
          );

          if (isDuplicate) {
            console.log('[FlowRunner] Duplicate generated audio message detected, skipping');
            return prev;
          }

          return [...prev, audioMessage];
        });
      } else {
        // Error generating audio
        const errorMessage: ChatMessage = {
          id: `msg-audio-error-${Date.now()}`,
          type: 'bot',
          content: '❌ Erro ao gerar áudio',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('[FlowRunner] Error generating dynamic audio:', error);
      // Remove loading and show error
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));
      const errorMessage: ChatMessage = {
        id: `msg-audio-error-${Date.now()}`,
        type: 'bot',
        content: '❌ Erro ao gerar áudio',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiProcessing(false);

      // Continue to next step
      setTimeout(() => {
        if (index + 1 < steps.length) {
          const nextStep = steps[index + 1];
          if (nextStep.type === 'text' || nextStep.type === 'audio' || nextStep.type === 'ai' || nextStep.type === 'canva_ai') {
            displayNextStep(index + 1, steps);
          } else {
            displayInteractiveStep(index + 1, steps);
          }
        } else {
          console.log('[FlowRunner] Flow completed!');
          completeSession();
        }
      }, audioStep.delay || 500);
    }
  };

  const processAIStepLocal = async (aiStep: AIStep, index: number, steps: FlowStep[]) => {
    console.log('[FlowRunner] Processing AI step:', aiStep);
    setAiProcessing(true);
    setCurrentStepIndex(index);

    try {
      // Call API to process AI step
      const response = await fetch('/api/process-ai-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiStep.provider,
          apiKeyId: aiStep.apiKeyId,
          model: aiStep.model,
          prompt: aiStep.prompt,
          outputType: aiStep.outputType,
          variables: variablesRef.current,
          temperature: aiStep.temperature,
          maxTokens: aiStep.maxTokens,
        }),
      });

      const result = await response.json();

      if (result.success && result.output) {
        const aiOutput = result.output;

        // Process AI output based on type
        if (aiOutput.type === 'text') {
          const message: ChatMessage = {
            id: `msg-ai-${Date.now()}-${index}`,
            type: 'bot',
            content: aiOutput.content,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, message]);

          // Save AI output to variables
          variablesRef.current = {
            ...variablesRef.current,
            [`step-${index + 1}-ai`]: aiOutput.content
          };

          // Continue to next step after delay
          setTimeout(() => {
            if (index + 1 < steps.length) {
              const nextStep = steps[index + 1];
              if (nextStep.type === 'text' || nextStep.type === 'audio' || nextStep.type === 'ai' || nextStep.type === 'canva_ai') {
                displayNextStep(index + 1, steps);
              } else {
                displayInteractiveStep(index + 1, steps);
              }
            } else {
              completeSession();
            }
          }, 500);
        } else {
          // For buttons, input, options - create interactive message
          const interactiveMessage: ChatMessage = {
            id: `msg-ai-interactive-${Date.now()}-${index}`,
            type: 'interaction',
            timestamp: new Date().toISOString()
          };

          if (aiOutput.type === 'buttons') {
            interactiveMessage.buttons = aiOutput.buttons;
          } else if (aiOutput.type === 'input') {
            interactiveMessage.input = {
              placeholder: aiOutput.placeholder,
              inputType: aiOutput.inputType
            };
          } else if (aiOutput.type === 'options') {
            interactiveMessage.buttons = aiOutput.options.map((opt: string, idx: number) => ({
              id: `ai-option-${idx}`,
              label: opt,
              value: opt
            }));
          }

          setMessages(prev => [...prev, interactiveMessage]);
          setActiveInteractionMessageId(interactiveMessage.id);
        }
      } else {
        throw new Error(result.error || 'Failed to process AI step');
      }
    } catch (error) {
      console.error('[FlowRunner] Error processing AI step:', error);
      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}-${index}`,
        type: 'bot',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiProcessing(false);
    }
  };

  const displayInteractiveStep = (index: number, steps?: FlowStep[]) => {
    const stepsToUse = steps || flowSteps;
    if (index >= stepsToUse.length) return;

    const step = stepsToUse[index];
    console.log('[FlowRunner] displayInteractiveStep called with step:', step);
    const interactiveMessage: ChatMessage = {
      id: `msg-interactive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
      type: 'interaction',
      timestamp: new Date().toISOString()
    };

    switch (step.type) {
      case 'button':
        interactiveMessage.buttons = step.buttons;
        break;
      case 'input':
        interactiveMessage.input = {
          placeholder: step.placeholder ? replaceVariables(step.placeholder) : undefined,
          inputType: step.inputType
        };
        break;
      case 'options':
        const optionsStep = step as OptionsStep;
        interactiveMessage.buttons = optionsStep.options?.map((opt: string, idx: number) => ({
          id: `option-${idx}`,
          label: opt,
          value: opt
        })) || [];
        break;
      case 'audio':
        console.log('[FlowRunner] Audio step detected in displayInteractiveStep');
        // Nothing to attach; UI will read current step details directly
        break;
    }

    setMessages(prev => [...prev, interactiveMessage]);
    setActiveInteractionMessageId(interactiveMessage.id);
    setCurrentStepIndex(index);
    console.log('[FlowRunner] Interactive message added, currentStepIndex set to:', index);
  };

  const executeWebhook = async (webhook: { url?: string; method?: string; headers?: Record<string, string> }, data: Record<string, unknown>) => {
    if (!webhook?.url) return;

    try {
      console.log('[FlowRunner] Executing webhook:', webhook.url);

      const response = await fetch(webhook.url, {
        method: webhook.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.headers || {})
        },
        body: JSON.stringify({
          ...data,
          sessionId,
          flowId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.error('[FlowRunner] Webhook failed:', response.status);
      } else {
        console.log('[FlowRunner] Webhook executed successfully');
      }
    } catch (err) {
      console.error('[FlowRunner] Webhook error:', err);
    }
  };

  const handleButtonClick = async (buttonId: string, buttonValue: string, link?: string) => {
    console.log(`[FlowRunner] Button clicked: ${buttonValue}`);

    // Open link in new tab if provided
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }

    // Remove interaction message
    setMessages(prev => prev.filter(msg => msg.id !== activeInteractionMessageId));
    setActiveInteractionMessageId(null);

    // Add user response
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      type: 'user',
      content: buttonValue,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Get current step for webhook
    const currentStep = flowSteps[currentStepIndex];
    const isOptionStep = currentStep?.type === 'options';

    // Save button/option selection to variables for AI steps
    variablesRef.current = {
      ...variablesRef.current,
      [`step-${currentStepIndex + 1}-${isOptionStep ? 'option' : 'button'}`]: buttonValue
    };
    console.log('[FlowRunner] Button/Option saved to variables:', variablesRef.current);

    // Execute webhook if configured
    const stepWithWebhook = currentStep as { webhook?: { url?: string; method?: string; headers?: Record<string, string> } };
    if (stepWithWebhook?.webhook) {
      await executeWebhook(stepWithWebhook.webhook, {
        type: isOptionStep ? 'option_selected' : 'button_click',
        buttonId: isOptionStep ? undefined : buttonId,
        selectedOption: isOptionStep ? buttonValue : undefined,
        buttonValue: !isOptionStep ? buttonValue : undefined,
        stepIndex: currentStepIndex
      });
    }

    // Save interaction to database
    await saveInteraction(
      currentStepIndex,
      isOptionStep ? 'options' : 'button',
      {
        buttonId: isOptionStep ? undefined : buttonId,
        selectedOption: isOptionStep ? buttonValue : undefined,
        buttonValue: !isOptionStep ? buttonValue : undefined,
        link,
      }
    );

    // Send event to Inngest
    await fetch('/api/inngest-trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: isOptionStep ? 'flow/option.selected' : 'flow/button.clicked',
        data: {
          sessionId,
          flowId,
          stepIndex: currentStepIndex,
          ...(isOptionStep ? { selectedOption: buttonValue } : { buttonId, buttonValue })
        }
      })
    }).catch(err => console.error('[FlowRunner] Error sending button event:', err));

    // Continue to next step
    displayNextStep(currentStepIndex + 1);
  };

  const handleInputSubmit = async () => {
    if (!inputValue.trim()) return;

    // Remove interaction message
    setMessages(prev => prev.filter(msg => msg.id !== activeInteractionMessageId));
    setActiveInteractionMessageId(null);

    // Add user response
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Get current step for webhook
    const currentStep = flowSteps[currentStepIndex] as InputStep;

    // Save variable for future use in text replacement
    if (currentStep?.variable) {
      variablesRef.current = {
        ...variablesRef.current,
        [currentStep.variable!]: inputValue
      };
      console.log('[FlowRunner] Variable saved:', currentStep.variable, inputValue);
      console.log('[FlowRunner] All variables now:', variablesRef.current);
    }

    // If this input is marked as contact data, save it
    if (currentStep?.isContactData && currentStep.variable) {
      contactDataRef.current = {
        ...contactDataRef.current,
        [currentStep.variable!]: inputValue
      };
      console.log('[FlowRunner] Contact data collected:', currentStep.variable, inputValue);
      console.log('[FlowRunner] All contact data now:', contactDataRef.current);
    }

    // Execute webhook if configured
    if (currentStep?.webhook) {
      await executeWebhook(currentStep.webhook, {
        type: 'input_submit',
        value: inputValue,
        stepIndex: currentStepIndex,
        variable: currentStep.variable
      });
    }

    // Save interaction to database
    await saveInteraction(
      currentStepIndex,
      'input',
      {
        value: inputValue,
        variable: currentStep.variable,
        isContactData: currentStep.isContactData,
      }
    );

    // Send event to Inngest
    await fetch('/api/inngest-trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'flow/input.submitted',
        data: {
          sessionId,
          flowId,
          stepIndex: currentStepIndex,
          value: inputValue
        }
      })
    });

    // Clear input
    setInputValue('');

    // Continue to next step
    displayNextStep(currentStepIndex + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando fluxo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: visualConfig.corBackground, minHeight: '100vh', width: '100%' }}>
      <div className="max-w-2xl mx-auto p-4">
        <div className="space-y-4 pb-4">
          {messages.map((message, index) => {
            const isBot = message.type === 'bot';
            const isInteraction = message.type === 'interaction';
            const isLastMessage = index === messages.length - 1;

            return (
              <motion.div
                key={message.id}
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${!isBot && !isInteraction ? 'justify-end' : ''}`}
              >
                {/* Bot Avatar */}
                {isBot && (
                  visualConfig.imagemLogo && visualConfig.imagemLogo.length > 0 ? (
                    <img
                      src={visualConfig.imagemLogo}
                      alt="Bot"
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">AI</span>
                    </div>
                  )
                )}

                {/* Message Content */}
                <div className={`flex-1 max-w-md ${!isBot ? 'flex flex-col items-end' : ''}`}>
                  {/* Regular message bubble */}
                  {!isInteraction && (
                    <>
                      {message.content && (
                        <div
                          className="rounded-lg px-4 py-3 inline-block"
                          style={{
                            backgroundColor: isBot ? visualConfig.corBalaoBot : visualConfig.corBalaoUser,
                            color: isBot ? visualConfig.corTextoBot : visualConfig.corTextoUser,
                            ...(isBot && { border: '1px solid #e5e7eb' })
                          }}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      )}
                      {message.canvaAIResult && isBot && (
                        <div
                          className="mt-2 rounded-lg p-3 border"
                          style={{
                            backgroundColor: visualConfig.corBalaoBot,
                            color: visualConfig.corTextoBot
                          }}
                        >
                          <div className="space-y-3">
                            {/* Selected Design */}
                            <div>
                              {/* AI reasoning above the image */}
                              <div className="text-sm whitespace-pre-wrap mb-2">{message.canvaAIResult.selected.reasoning}</div>
                              <motion.div layout className="overflow-hidden rounded-lg border" initial={false}>
                                <img
                                  src={resolveDesignImageUrl(message.canvaAIResult.selected.id, message.canvaAIResult.selected.thumbnailUrl)}
                                  alt={message.canvaAIResult.selected.title}
                                  className="w-full object-cover"
                                />
                              </motion.div>
                            </div>

                            {/* Gallery of Available Designs */}
                            <div className="pt-3 border-t">
                              <div className="text-sm font-semibold mb-2">Outros designs</div>
                              <div className="grid grid-cols-3 gap-2">
                                {message.canvaAIResult.designs.map((d) => (
                                  <motion.div
                                    key={d.id}
                                    layout
                                    onClick={() => handleDesignClick(d.id)}
                                    className={`cursor-pointer rounded-md overflow-hidden border ${expandedDesignId === d.id ? 'col-span-3' : ''}`}
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                  >
                                    <img
                                      src={resolveDesignImageUrl(d.id, d.thumbnailUrl)}
                                      alt={d.title}
                                      className={`w-full object-cover ${expandedDesignId === d.id ? 'h-64' : 'h-24'}`}
                                    />
                                    <div className="p-2 text-xs truncate">{d.title}</div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {message.audio && isBot && (
                        <div className="mt-2">
                          <audio 
                            controls 
                            src={`data:${message.audio.mimeType};base64,${message.audio.audioBase64}`}
                            className="w-full max-w-md rounded-lg"
                            style={{
                              filter: 'brightness(0.95)'
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Interactive elements */}
                  {isInteraction && isLastMessage && (
                    <>
                      {/* Buttons/Options */}
                      {message.buttons && (
                        <div className="flex flex-wrap gap-2 justify-end">
                          {message.buttons.map((button) => (
                            <button
                              key={button.id}
                              onClick={() => handleButtonClick(button.id, button.value, button.link)}
                              className="px-4 py-2 rounded-full border text-sm transition-colors hover:brightness-90 flex items-center gap-1"
                              style={{
                                backgroundColor: visualConfig.corBalaoUser,
                                color: visualConfig.corTextoUser,
                                borderColor: visualConfig.corBalaoUser,
                              }}
                              title={button.link ? `Link: ${button.link}` : undefined}
                            >
                              {button.label}
                              {button.link && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Input */}
                      {message.input && (
                        <div className="w-full max-w-sm">
                          {message.input.inputType === 'textarea' ? (
                            <Textarea
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              placeholder={message.input.placeholder || 'Digite aqui...'}
                              className="w-full resize-none"
                              rows={3}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleInputSubmit();
                                }
                              }}
                            />
                          ) : (
                            <input
                              type={message.input.inputType || 'text'}
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              placeholder={message.input.placeholder || 'Digite aqui...'}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleInputSubmit();
                                }
                              }}
                            />
                          )}
                          <button
                            onClick={handleInputSubmit}
                            disabled={!inputValue.trim()}
                            className="mt-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:brightness-90"
                            style={{
                              backgroundColor: visualConfig.corBalaoUser,
                              color: visualConfig.corTextoUser
                            }}
                          >
                            Enviar
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* User Avatar */}
                {!isBot && !isInteraction && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0"></div>
                )}
              </motion.div>
            );
          })}

          {/* AI Processing Loader */}
          {aiProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              {/* Bot Avatar */}
              {visualConfig.imagemLogo && visualConfig.imagemLogo.length > 0 ? (
                <img
                  src={visualConfig.imagemLogo}
                  alt="Bot"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
              )}

              {/* Loader Content */}
              <div
                className="rounded-lg px-4 py-3 inline-block"
                style={{
                  backgroundColor: visualConfig.corBalaoBot,
                  color: visualConfig.corTextoBot,
                  border: '1px solid #e5e7eb'
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm">Um momento...</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
