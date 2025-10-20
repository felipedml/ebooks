'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Play, ChevronUp, ChevronDown, Activity, Webhook, Palette, Upload, Copy, Link2, Check } from 'lucide-react';
import type { FlowStep, TextStep, ButtonStep, InputStep, OptionsStep, AIStep, AudioStep, CanvaStep, CanvaAIStep, CanvaDesignOption } from '@/app/src/inngest/functions/flow-steps';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Flow {
  id: number;
  name: string;
  description: string;
  active: boolean;
  steps?: FlowStep[];
  createdAt: string;
}

const STEP_TYPES = [
  { value: 'text', label: 'Texto', desc: 'Exibe uma mensagem de texto' },
  { value: 'button', label: 'Botões', desc: 'Opções clicáveis para o usuário' },
  { value: 'input', label: 'Input', desc: 'Campo para entrada de dados' },
  { value: 'options', label: 'Opções', desc: 'Múltipla escolha' },
  { value: 'ai', label: 'IA', desc: 'Processamento com IA' },
  { value: 'audio', label: 'Áudio', desc: 'Reproduz áudio gravado ou geração de áudio com IA' },
  { value: 'canva', label: 'Canva', desc: 'Integração com Canva' },
  { value: 'canva_ai', label: 'Canva + IA', desc: 'IA seleciona design do Canva' }
];

const OPENAI_MODELS = [
  { value: 'gpt-5', label: 'GPT-5 (Mais recente e mais capaz)' },
  { value: 'gpt-4.1', label: 'GPT-4.1 (Nova geração estável)' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Rápido e econômico)' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (Ultra leve / menor custo)' },
  { value: 'gpt-4o', label: 'GPT-4o (Multimodal — legado ou compatível)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (se ainda for suportado)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (baixo custo)' },
  { value: 'o4-mini', label: 'o4 Mini (Raciocínio leve / especializado)' },
];


const GEMINI_MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Modelo de raciocínio completo)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Equilíbrio entre velocidade e capacidade)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Mais leve / custo otimizado)' },
  { value: 'gemini-live-2.5-flash', label: 'Gemini Live 2.5 Flash (Áudio / vídeo em tempo real)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Legado ainda suportado)' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Legado leve)' },
  { value: 'gemini-exp-1121', label: 'Gemini Exp 1121 (Experimental avançado)' },
  { value: 'gemini-exp-1206', label: 'Gemini Exp 1206 (Experimental mais recente)' },
];

export default function ConfigInnguestPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [flowModal, setFlowModal] = useState(false);
  const [stepModal, setStepModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  // Flow form
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [flowActive, setFlowActive] = useState(true);
  const [copiedFlowId, setCopiedFlowId] = useState<number | null>(null);

  // Step form
  const [stepType, setStepType] = useState<'text' | 'button' | 'input' | 'options' | 'ai' | 'audio' | 'canva' | 'canva_ai'>('text');
  const [stepContent, setStepContent] = useState<FlowStep>({ type: 'text', content: '' });

  // Canva OAuth states
  const [canvaAccessToken, setCanvaAccessToken] = useState<string>('');
  const [canvaAuthenticating, setCanvaAuthenticating] = useState(false);
  const [canvaUserInfo, setCanvaUserInfo] = useState<{
    displayName?: string;
    user_profile?: { display_name?: string };
    scopes?: string[];
    capabilities?: { can_use_design_autofill?: boolean };
    availableDesigns?: CanvaDesignOption[];
  } | null>(null);

  // Variables popup
  const [showVariablesPopup, setShowVariablesPopup] = useState(false);
  const [currentInputField, setCurrentInputField] = useState<string | null>(null);
  const [showPreviousStepsPopup, setShowPreviousStepsPopup] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isTTSGenerating, setIsTTSGenerating] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [showTTSModal, setShowTTSModal] = useState(false);

  // AI text generation for TTS
  const [showAITextGenerator, setShowAITextGenerator] = useState(false);
  const [aiTextPrompt, setAiTextPrompt] = useState('');
  const [isGeneratingAIText, setIsGeneratingAIText] = useState(false);
  const [showStepsPopup, setShowStepsPopup] = useState(false);

  // Template TTS popup states
  const [showTemplateVariablesPopup, setShowTemplateVariablesPopup] = useState(false);
  const [showTemplateStepsPopup, setShowTemplateStepsPopup] = useState(false);

  // Visual configuration
  const [visualConfig, setVisualConfig] = useState({
    corBackground: '#f3f4f6',
    corBalaoBot: '#ffffff',
    corBalaoUser: '#10b981',
    corTextoBot: '#374151',
    corTextoUser: '#ffffff',
    imagemLogo: ''
  });
  const [savingVisual, setSavingVisual] = useState(false);

  // API Keys states
  const [apiKeys, setApiKeys] = useState<Array<{ id: number; nome: string; provider: string; keyMasked: string; ativa: boolean }>>([]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ nome: '', provider: 'openai', apiKey: '' });
  const [savingApiKey, setSavingApiKey] = useState(false);

  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showDeleteFlowDialog, setShowDeleteFlowDialog] = useState(false);
  const [showDeleteStepDialog, setShowDeleteStepDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [deleteFlowId, setDeleteFlowId] = useState<number | null>(null);
  const [deleteStepIndex, setDeleteStepIndex] = useState<number | null>(null);

  const loadFlows = useCallback(async () => {
    try {
      const response = await fetch('/api/fluxos');
      const data = await response.json();
      if (data.success) {
        // Convert fluxos to flows with steps
        const flowsWithSteps = await Promise.all(
          data.fluxos.map(async (fluxo: { id: number; nome: string; descricao: string; ativo: boolean; createdAt: string }) => {
            const stepsRes = await fetch(`/api/steps?fluxoId=${fluxo.id}`);
            const stepsData = await stepsRes.json();


            const flowSteps: FlowStep[] = stepsData.steps?.map((step: { tipo: string; conteudo: string | Record<string, unknown> }) => {

              const content = typeof step.conteudo === 'string' ? JSON.parse(step.conteudo) : step.conteudo;
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
                  return {
                    type: 'audio',
                    mode: content.mode || 'static',
                    audioBase64: content.audioBase64,
                    mimeType: content.mimeType || 'audio/webm',
                    ttsTemplate: content.ttsTemplate,
                    delay: content.delayMs || 500
                  };
                case 'canva':
                  return {
                    type: 'canva',
                    action: content.action || 'list_designs',
                    designId: content.designId,
                    brandTemplateId: content.brandTemplateId,
                    autofillFields: content.autofillFields,
                    message: content.message,
                    saveResultAs: content.saveResultAs,
                    delay: content.delayMs || 500
                  };
                case 'canva_ai':
                  return {
                    type: 'canva_ai',
                    instruction: content.instruction || '',
                    aiProvider: content.aiProvider || 'openai',
                    aiModel: content.aiModel,
                    apiKeyId: content.apiKeyId,
                    availableDesigns: content.availableDesigns || [],
                    message: content.message,
                    saveResultAs: content.saveResultAs,
                    delay: content.delayMs || 500
                  };
                default:
                  return null;
              }
            }).filter(Boolean) || [];

            return {
              id: fluxo.id,
              name: fluxo.nome,
              description: fluxo.descricao,
              active: fluxo.ativo,
              steps: flowSteps,
              createdAt: fluxo.createdAt
            };
          })
        );

        setFlows(flowsWithSteps);

        // Update selected flow if it exists using callback to access latest state
        setSelectedFlow(prevSelected => {
          if (prevSelected) {
            const updatedSelectedFlow = flowsWithSteps.find(f => f.id === prevSelected.id);
            return updatedSelectedFlow || prevSelected;
          } else if (flowsWithSteps.length > 0) {
            return flowsWithSteps[0];
          }
          return prevSelected;
        });

        return flowsWithSteps;
      }
    } catch (error) {
      console.error('Error loading flows:', error);
    }
    return [];
  }, []);

  useEffect(() => {
    loadFlows();
    loadVisualConfig();
    loadApiKeys();
  }, [loadFlows]);

  // Check for Canva OAuth callback and load status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const canvaAuth = params.get('canva_auth');
    const canvaError = params.get('canva_error');

    if (canvaAuth === 'success') {
      console.log('[Config] ✅ Canva auth successful!');
      // Clean URL
      window.history.replaceState({}, '', '/config');
      // Reload status
      checkCanvaStatus();
      // Show success message
      setTimeout(() => {
        alert('✅ Conectado com Canva com sucesso!');
      }, 500);
    } else if (canvaError) {
      console.log('[Config] ❌ Canva auth error:', canvaError);
      // Clean URL
      window.history.replaceState({}, '', '/config');
      alert('❌ Erro ao conectar com Canva: ' + canvaError);
      // Load current status anyway
      checkCanvaStatus();
    } else {
      // Load current status
      checkCanvaStatus();
    }
  }, []);

  const checkCanvaStatus = async () => {
    try {
      console.log('[Config] Checking Canva status...');
      const response = await fetch('/api/canva/status');
      const data = await response.json();

      console.log('[Config] Status response:', data);

      if (data.success && data.authenticated) {
        console.log('[Config] ✅ User is authenticated!');
        setCanvaAccessToken('authenticated'); // Just a flag, token is in DB

        // Buscar informações do usuário
        try {
          console.log('[Config] Fetching user info...');
          const userResponse = await fetch('/api/canva/me');
          const userData = await userResponse.json();
          console.log('[Config] User data:', userData);

          if (userData.success) {
            setCanvaUserInfo(userData.user);
            console.log('[Config] User info set:', userData.user);
          }
        } catch (err) {
          console.error('[Config] Error fetching user info:', err);
        }
      } else {
        console.log('[Config] ❌ Not authenticated');
        setCanvaAccessToken('');
        setCanvaUserInfo(null);
      }
    } catch (error) {
      console.error('[Config] Error checking Canva status:', error);
      setCanvaAccessToken('');
      setCanvaUserInfo(null);
    }
  };

  const loadVisualConfig = async () => {
    try {
      const response = await fetch('/api/configuracao-visual');
      const data = await response.json();
      if (data.success && data.configuracao) {
        setVisualConfig({
          corBackground: data.configuracao.corBackground || '#f3f4f6',
          corBalaoBot: data.configuracao.corBalaoBot || '#ffffff',
          corBalaoUser: data.configuracao.corBalaoUser || '#10b981',
          corTextoBot: data.configuracao.corTextoBot || '#374151',
          corTextoUser: data.configuracao.corTextoUser || '#ffffff',
          imagemLogo: data.configuracao.imagemLogo || ''
        });
      }
    } catch (error) {
      console.error('Error loading visual config:', error);
    }
  };

  const saveVisualConfig = async () => {
    try {
      setSavingVisual(true);
      const response = await fetch('/api/configuracao-visual', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visualConfig)
      });

      const data = await response.json();
      if (data.success) {
        setDialogMessage('Configurações visuais salvas com sucesso!');
        setShowSuccessDialog(true);
      }
    } catch (error) {
      console.error('Error saving visual config:', error);
      setDialogMessage('Erro ao salvar configurações visuais');
      setShowErrorDialog(true);
    } finally {
      setSavingVisual(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisualConfig(prev => ({ ...prev, imagemLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // API Keys functions
  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const saveApiKey = async () => {
    if (!newApiKey.nome || !newApiKey.apiKey) {
      setDialogMessage('Nome e API key são obrigatórios!');
      setShowErrorDialog(true);
      return;
    }

    try {
      setSavingApiKey(true);
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApiKey)
      });

      const data = await response.json();
      if (data.success) {
        setDialogMessage('API Key salva com sucesso!');
        setShowSuccessDialog(true);
        setShowApiKeyModal(false);
        setNewApiKey({ nome: '', provider: 'openai', apiKey: '' });
        await loadApiKeys();
      } else {
        setDialogMessage(data.error || 'Erro ao salvar API key');
        setShowErrorDialog(true);
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      setDialogMessage('Erro ao salvar API key');
      setShowErrorDialog(true);
    } finally {
      setSavingApiKey(false);
    }
  };

  const deleteApiKey = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta API key?')) return;

    try {
      const response = await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setDialogMessage('API Key deletada com sucesso!');
        setShowSuccessDialog(true);
        await loadApiKeys();
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      setDialogMessage('Erro ao deletar API key');
      setShowErrorDialog(true);
    }
  };

  const toggleApiKeyStatus = async (id: number, ativa: boolean) => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ativa: !ativa })
      });

      const data = await response.json();
      if (data.success) {
        await loadApiKeys();
      }
    } catch (error) {
      console.error('Error toggling API key:', error);
    }
  };

  const saveFlow = async () => {
    if (!flowName) return;

    try {
      setSaving(true);
      const method = editingFlow ? 'PUT' : 'POST';

      const response = await fetch('/api/fluxos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingFlow && { id: editingFlow.id }),
          nome: flowName,
          descricao: flowDescription,
          ativo: flowActive,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadFlows();


      }
    } catch (error) {
      console.error('Error saving flow:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveStep = async () => {
    if (!selectedFlow) return;

    // Validate step content before saving
    if (stepContent.type === 'canva_ai') {
      const canvaAI = stepContent as CanvaAIStep;
      if (!canvaAI.instruction || !canvaAI.instruction.trim()) {
        alert('❌ Por favor, adicione uma instrução para a IA');
        return;
      }
      if (!canvaAI.apiKeyId) {
        alert('❌ Por favor, selecione uma API Key');
        return;
      }
      if (!canvaAI.availableDesigns || canvaAI.availableDesigns.length === 0) {
        alert('❌ Por favor, selecione pelo menos um design do Canva');
        return;
      }
    }

    try {
      setSaving(true);

      // Delete all existing steps for this flow
      await fetch(`/api/steps?fluxoId=${selectedFlow.id}`, {
        method: 'DELETE'
      });

      // Get current steps
      const currentSteps = selectedFlow.steps || [];
      const updatedSteps = [...currentSteps];

      if (editingStepIndex !== null) {
        // Update existing step
        updatedSteps[editingStepIndex] = stepContent;
      } else {
        // Add new step
        updatedSteps.push(stepContent);
      }

      // Save all steps to database
      for (let i = 0; i < updatedSteps.length; i++) {
        const step = updatedSteps[i];
        let oldContent: Record<string, unknown> = {};

        switch (step.type) {
          case 'text':
            oldContent = { texto: (step as TextStep).content, delayMs: (step as TextStep).delay };
            break;
          case 'button':
            const buttonStep = step as ButtonStep;
            oldContent = {
              botoes: buttonStep.buttons,
              ...(buttonStep.webhook && { webhook: buttonStep.webhook })
            };
            break;
          case 'input':
            const inputStep = step as InputStep;
            oldContent = {
              placeholder: inputStep.placeholder,
              inputType: inputStep.inputType,
              variavel: inputStep.variable,
              ...(inputStep.isContactData && { isContactData: inputStep.isContactData }),
              ...(inputStep.webhook && { webhook: inputStep.webhook })
            };
            break;
          case 'options':
            const optionsStep = step as OptionsStep;
            oldContent = {
              opcoes: optionsStep.options,
              ...(optionsStep.webhook && { webhook: optionsStep.webhook })
            };
            break;
          case 'ai':
            const aiStep = step as AIStep;
            oldContent = {
              provider: aiStep.provider,
              apiKeyId: aiStep.apiKeyId,
              model: aiStep.model,
              prompt: aiStep.prompt,
              outputType: aiStep.outputType,
              temperature: aiStep.temperature,
              maxTokens: aiStep.maxTokens
            };
            break;
          case 'audio':
            const audioStep = step as AudioStep;
            oldContent = {
              mode: audioStep.mode,
              audioBase64: audioStep.audioBase64,
              mimeType: audioStep.mimeType,
              ttsTemplate: audioStep.ttsTemplate,
              delayMs: audioStep.delay
            };
            console.log('[Config] Saving audio step with content:', oldContent);
            break;
          case 'canva':
            const canvaStep = step as CanvaStep;
            oldContent = {
              action: canvaStep.action,
              designId: canvaStep.designId,
              brandTemplateId: canvaStep.brandTemplateId,
              autofillFields: canvaStep.autofillFields,
              message: canvaStep.message,
              saveResultAs: canvaStep.saveResultAs,
              delayMs: canvaStep.delay
            };
            console.log('[Config] Saving canva step with content:', oldContent);
            break;
          case 'canva_ai':
            const canvaAIStep = step as CanvaAIStep;
            oldContent = {
              instruction: canvaAIStep.instruction,
              aiProvider: canvaAIStep.aiProvider,
              aiModel: canvaAIStep.aiModel,
              apiKeyId: canvaAIStep.apiKeyId,
              availableDesigns: canvaAIStep.availableDesigns,
              message: canvaAIStep.message,
              saveResultAs: canvaAIStep.saveResultAs,
              delayMs: canvaAIStep.delay
            };
            console.log('[Config] Saving canva_ai step with content:', oldContent);
            break;
        }

        await fetch('/api/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fluxo_id: selectedFlow.id,
            tipo: getStepTipo(step.type),
            conteudo: JSON.stringify(oldContent),
            ordem: i,
            ativo: true
          }),
        });
      }

      // Reload flows to get fresh data and update UI
      await loadFlows();
      closeStepModal();
    } catch (error) {
      console.error('Error saving step:', error);
      setError('Error saving step');
    } finally {
      setSaving(false);
    }
  };

  const duplicateFlow = async (flow: Flow) => {
    try {
      setSaving(true);

      // Create new flow with duplicated data
      const response = await fetch('/api/fluxos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: `${flow.name} (cópia)`,
          descricao: flow.description,
          ativo: false // Start as inactive
        }),
      });

      const data = await response.json();
      if (data.success && data.fluxo) {
        const newFluxoId = data.fluxo.id;

        // Duplicate all steps from original flow
        if (flow.steps && flow.steps.length > 0) {
          for (let i = 0; i < flow.steps.length; i++) {
            const step = flow.steps[i];
            let oldContent: Record<string, unknown> = {};

            switch (step.type) {
              case 'text':
                oldContent = { texto: (step as TextStep).content, delayMs: (step as TextStep).delay };
                break;
              case 'button':
                const buttonStep = step as ButtonStep;
                oldContent = {
                  botoes: buttonStep.buttons,
                  ...(buttonStep.webhook && { webhook: buttonStep.webhook })
                };
                break;
              case 'input':
                const inputStep = step as InputStep;
                oldContent = {
                  placeholder: inputStep.placeholder,
                  inputType: inputStep.inputType,
                  variavel: inputStep.variable,
                  ...(inputStep.isContactData && { isContactData: inputStep.isContactData }),
                  ...(inputStep.webhook && { webhook: inputStep.webhook })
                };
                break;
              case 'options':
                const optionsStep = step as OptionsStep;
                oldContent = {
                  opcoes: optionsStep.options,
                  ...(optionsStep.webhook && { webhook: optionsStep.webhook })
                };
                break;
              case 'ai':
                const aiStep = step as AIStep;
                oldContent = {
                  provider: aiStep.provider,
                  apiKeyId: aiStep.apiKeyId,
                  model: aiStep.model,
                  prompt: aiStep.prompt,
                  outputType: aiStep.outputType,
                  temperature: aiStep.temperature,
                  maxTokens: aiStep.maxTokens
                };
                break;
              case 'audio':
                const audioStep = step as AudioStep;
                oldContent = {
                  mode: audioStep.mode,
                  audioBase64: audioStep.audioBase64,
                  mimeType: audioStep.mimeType,
                  ttsTemplate: audioStep.ttsTemplate,
                  delayMs: audioStep.delay
                };
                break;
              case 'canva':
                const canvaStep = step as CanvaStep;
                oldContent = {
                  action: canvaStep.action,
                  designId: canvaStep.designId,
                  brandTemplateId: canvaStep.brandTemplateId,
                  autofillFields: canvaStep.autofillFields,
                  message: canvaStep.message,
                  saveResultAs: canvaStep.saveResultAs,
                  delayMs: canvaStep.delay
                };
                break;
            }

            await fetch('/api/steps', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fluxo_id: newFluxoId,
                tipo: getStepTipo(step.type),
                conteudo: JSON.stringify(oldContent),
                ordem: i,
                ativo: true
              }),
            });
          }
        }

        // Reload flows and show success
        await loadFlows();
        setDialogMessage('Fluxo duplicado com sucesso!');
        setShowSuccessDialog(true);
      }
    } catch (error) {
      console.error('Error duplicating flow:', error);
      setDialogMessage('Erro ao duplicar fluxo');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const copyFlowLink = async (flowId: number) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const flowUrl = `${baseUrl}/flow/${flowId}`;

    try {
      await navigator.clipboard.writeText(flowUrl);
      setCopiedFlowId(flowId);
      setTimeout(() => setCopiedFlowId(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      setDialogMessage('Erro ao copiar link');
      setShowErrorDialog(true);
    }
  };

  const deleteFlow = async (id: number) => {
    setDeleteFlowId(id);
    setShowDeleteFlowDialog(true);
  };

  const confirmDeleteFlow = async () => {
    if (!deleteFlowId) return;

    try {
      await fetch(`/api/fluxos?id=${deleteFlowId}`, { method: 'DELETE' });
      await loadFlows();
      setShowDeleteFlowDialog(false);
      setDeleteFlowId(null);
    } catch (error) {
      console.error('Error deleting flow:', error);
      setDialogMessage('Erro ao deletar fluxo');
      setShowErrorDialog(true);
    }
  };

  const deleteStep = async (index: number) => {
    if (!selectedFlow) return;
    setDeleteStepIndex(index);
    setShowDeleteStepDialog(true);
  };

  const confirmDeleteStep = async () => {
    if (!selectedFlow || deleteStepIndex === null) return;

    try {
      setSaving(true);

      // Delete all existing steps for this flow
      await fetch(`/api/steps?fluxoId=${selectedFlow.id}`, {
        method: 'DELETE'
      });

      // Get updated steps (without the deleted one)
      const updatedSteps = selectedFlow.steps?.filter((_, i) => i !== deleteStepIndex) || [];

      // Save all remaining steps to database
      for (let i = 0; i < updatedSteps.length; i++) {
        const step = updatedSteps[i];
        let oldContent: Record<string, unknown> = {};

        switch (step.type) {
          case 'text':
            oldContent = { texto: (step as TextStep).content, delayMs: (step as TextStep).delay };
            break;
          case 'button':
            const buttonStep = step as ButtonStep;
            oldContent = {
              botoes: buttonStep.buttons,
              ...(buttonStep.webhook && { webhook: buttonStep.webhook })
            };
            break;
          case 'input':
            const inputStep = step as InputStep;
            oldContent = {
              placeholder: inputStep.placeholder,
              inputType: inputStep.inputType,
              variavel: inputStep.variable,
              ...(inputStep.isContactData && { isContactData: inputStep.isContactData }),
              ...(inputStep.webhook && { webhook: inputStep.webhook })
            };
            break;
          case 'options':
            const optionsStep = step as OptionsStep;
            oldContent = {
              opcoes: optionsStep.options,
              ...(optionsStep.webhook && { webhook: optionsStep.webhook })
            };
            break;
          case 'ai':
            const aiStep2 = step as AIStep;
            oldContent = {
              provider: aiStep2.provider,
              apiKeyId: aiStep2.apiKeyId,
              model: aiStep2.model,
              prompt: aiStep2.prompt,
              outputType: aiStep2.outputType,
              temperature: aiStep2.temperature,
              maxTokens: aiStep2.maxTokens
            };
            break;
          case 'audio':
            const audioStep2 = step as AudioStep;
            oldContent = {
              mode: audioStep2.mode,
              audioBase64: audioStep2.audioBase64,
              mimeType: audioStep2.mimeType,
              ttsTemplate: audioStep2.ttsTemplate,
              delayMs: audioStep2.delay
            };
            break;
        }

        await fetch('/api/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fluxo_id: selectedFlow.id,
            tipo: getStepTipo(step.type),
            conteudo: JSON.stringify(oldContent),
            ordem: i,
            ativo: true
          }),
        });
      }

      // Reload flows to get fresh data and update UI
      await loadFlows();
      setShowDeleteStepDialog(false);
      setDeleteStepIndex(null);
    } catch (error) {
      console.error('Error deleting step:', error);
      setDialogMessage('Erro ao deletar step');
      setShowErrorDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const moveStep = async (index: number, direction: 'up' | 'down') => {
    if (!selectedFlow || !selectedFlow.steps) return;

    try {
      setSaving(true);

      const steps = [...selectedFlow.steps];
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= steps.length) return;

      // Swap steps
      [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];

      // Delete all existing steps
      await fetch(`/api/steps?fluxoId=${selectedFlow.id}`, {
        method: 'DELETE'
      });

      // Save all steps with new order
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        let oldContent: Record<string, unknown> = {};

        switch (step.type) {
          case 'text':
            oldContent = { texto: (step as TextStep).content, delayMs: (step as TextStep).delay };
            break;
          case 'button':
            const buttonStep = step as ButtonStep;
            oldContent = {
              botoes: buttonStep.buttons,
              ...(buttonStep.webhook && { webhook: buttonStep.webhook })
            };
            break;
          case 'input':
            const inputStep = step as InputStep;
            oldContent = {
              placeholder: inputStep.placeholder,
              inputType: inputStep.inputType,
              variavel: inputStep.variable,
              ...(inputStep.isContactData && { isContactData: inputStep.isContactData }),
              ...(inputStep.webhook && { webhook: inputStep.webhook })
            };
            break;
          case 'options':
            const optionsStep = step as OptionsStep;
            oldContent = {
              opcoes: optionsStep.options,
              ...(optionsStep.webhook && { webhook: optionsStep.webhook })
            };
            break;
          case 'ai':
            const aiStep3 = step as AIStep;
            oldContent = {
              provider: aiStep3.provider,
              apiKeyId: aiStep3.apiKeyId,
              model: aiStep3.model,
              prompt: aiStep3.prompt,
              outputType: aiStep3.outputType,
              temperature: aiStep3.temperature,
              maxTokens: aiStep3.maxTokens
            };
            break;
          case 'audio':
            const audioStep3 = step as AudioStep;
            oldContent = {
              mode: audioStep3.mode,
              audioBase64: audioStep3.audioBase64,
              mimeType: audioStep3.mimeType,
              ttsTemplate: audioStep3.ttsTemplate,
              delayMs: audioStep3.delay
            };
            break;
        }

        await fetch('/api/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fluxo_id: selectedFlow.id,
            tipo: getStepTipo(step.type),
            conteudo: JSON.stringify(oldContent),
            ordem: i,
            ativo: true
          }),
        });
      }

      // Reload flows to get fresh data and update UI
      await loadFlows();
    } catch (error) {
      console.error('Error moving step:', error);
    } finally {
      setSaving(false);
    }
  };

  const openFlowModal = (flow?: Flow) => {
    if (flow) {
      setEditingFlow(flow);
      setFlowName(flow.name);
      setFlowDescription(flow.description);
      setFlowActive(flow.active);
    } else {
      setEditingFlow(null);
      setFlowName('');
      setFlowDescription('');
      setFlowActive(true);
    }
    setFlowModal(true);
  };

  const closeFlowModal = () => {
    setFlowModal(false);
    setEditingFlow(null);
    setFlowName('');
    setFlowDescription('');
    setFlowActive(true);
  };

  const openStepModal = (index?: number) => {
    if (index !== undefined && selectedFlow?.steps?.[index]) {
      setEditingStepIndex(index);
      const step = selectedFlow.steps[index];
      setStepType(step.type);
      setStepContent(step);
    } else {
      setEditingStepIndex(null);
      setStepType('text');
      setStepContent({ type: 'text', content: '' });
    }
    setStepModal(true);
  };

  const closeStepModal = () => {
    setStepModal(false);
    setEditingStepIndex(null);
    setStepContent({ type: 'text', content: '' });
    setError('');
  };

  // Get all available variables from previous steps
  const getAvailableVariables = () => {
    if (!selectedFlow) return [];

    const variables: Array<{ name: string; stepIndex: number; stepType: string }> = [];

    selectedFlow.steps?.forEach((step, index) => {
      if (step.type === 'input' && (step as InputStep).variable) {
        variables.push({
          name: (step as InputStep).variable!,
          stepIndex: index,
          stepType: 'input'
        });
      }
    });

    return variables;
  };

  // Insert variable into current field
  const insertVariable = (variableName: string, fieldName: string) => {
    const variableTag = `{${variableName}}`;

    switch (fieldName) {
      case 'content':
        if (stepType === 'ai') {
          const currentPrompt = (stepContent as AIStep).prompt || '';
          updateStepContent({ prompt: currentPrompt + variableTag });
        }
        break;
      case 'canva_ai_instruction':
        if (stepType === 'canva_ai') {
          const currentInstruction = (stepContent as CanvaAIStep).instruction || '';
          updateStepContent({ instruction: currentInstruction + variableTag });
        }
        break;
    }

    setShowVariablesPopup(false);
    setCurrentInputField(null);
  };

  // Insert previous step data into prompt
  const insertPreviousStepData = (stepTag: string) => {
    if (stepType === 'ai') {
      const currentPrompt = (stepContent as AIStep).prompt || '';
      updateStepContent({ prompt: currentPrompt + stepTag });
    } else if (stepType === 'canva_ai' && currentInputField === 'canva_ai_instruction') {
      const currentInstruction = (stepContent as CanvaAIStep).instruction || '';
      updateStepContent({ instruction: currentInstruction + stepTag });
    }
    setShowPreviousStepsPopup(false);
  };

  // Helper para converter tipo de step do novo formato para o antigo
  const getStepTipo = (stepType: string): string => {
    switch (stepType) {
      case 'text': return 'texto';
      case 'button': return 'botoes';
      case 'input': return 'input';
      case 'options': return 'options';
      case 'ai': return 'ai';
      case 'audio': return 'audio';
      case 'canva': return 'canva';
      case 'canva_ai': return 'canva_ai';
      default: return stepType;
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          updateStepContent({
            audioBase64: base64,
            mimeType: 'audio/webm'
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setAudioRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Erro ao acessar microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (audioRecorder && audioRecorder.state !== 'inactive') {
      audioRecorder.stop();
      setIsRecording(false);
      setAudioRecorder(null);
    }
  };

  // Canva OAuth handler - SIMPLES: salva em cookie e redireciona
  const handleCanvaAuth = async () => {
    try {
      const response = await fetch('/api/canva/auth');
      const data = await response.json();

      if (data.success) {
        // Salvar code_verifier em COOKIE (persiste em redirects externos)
        document.cookie = `canva_code_verifier=${data.codeVerifier}; path=/; max-age=600; SameSite=Lax`;

        console.log('[Config] Code verifier:', data.codeVerifier);
        console.log('[Config] Cookie set:', document.cookie);
        console.log('[Config] Waiting 1 second before redirect...');

        // Aguardar para garantir que cookie foi salvo
        setTimeout(() => {
          console.log('[Config] Cookie before redirect:', document.cookie);
          console.log('[Config] Redirecting to:', data.authUrl.substring(0, 100) + '...');
          window.location.href = data.authUrl;
        }, 1000);
      } else {
        alert('Erro: ' + (data.error || 'Desconhecido'));
      }
    } catch (error) {
      console.error('[Config] Error:', error);
      alert('Erro ao iniciar autenticação');
    }
  };

  const generateAIText = async () => {
    if (!aiTextPrompt.trim()) {
      alert('Digite um prompt para gerar o texto');
      return;
    }

    setIsGeneratingAIText(true);
    try {
      // Get a default API key for OpenAI
      const apiKeysResponse = await fetch('/api/api-keys');
      const apiKeysData = await apiKeysResponse.json();
      const openaiKey = apiKeysData.apiKeys?.find((k: { provider: string; id: number }) => k.provider === 'openai');

      if (!openaiKey) {
        alert('Nenhuma API key da OpenAI configurada');
        return;
      }

      const response = await fetch('/api/process-ai-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'openai',
          apiKeyId: openaiKey.id,
          model: 'gpt-4o',
          prompt: aiTextPrompt,
          outputType: 'text',
          variables: {}
        })
      });

      const data = await response.json();
      if (data.success && data.result) {
        setTtsText(data.result);
        setShowAITextGenerator(false);
        setAiTextPrompt('');
      } else {
        alert('Erro ao gerar texto: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error generating AI text:', error);
      alert('Erro ao gerar texto com IA');
    } finally {
      setIsGeneratingAIText(false);
    }
  };

  const generateTTS = async () => {
    if (!ttsText.trim()) {
      alert('Digite um texto para gerar o áudio');
      return;
    }

    setIsTTSGenerating(true);
    try {
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          model: 'tts-1',
          voice: 'alloy',
          speed: 1.0
        })
      });

      const data = await response.json();
      if (data.success && data.audioBase64) {
        updateStepContent({
          audioBase64: data.audioBase64,
          mimeType: 'audio/mpeg'
        });
        setShowTTSModal(false);
        setTtsText('');
        setShowAITextGenerator(false);
        setAiTextPrompt('');
      } else {
        alert('Erro ao gerar áudio: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error generating TTS:', error);
      alert('Erro ao gerar áudio com IA');
    } finally {
      setIsTTSGenerating(false);
    }
  };

  const updateStepContent = (updates: Partial<FlowStep>) => {
    console.log('[Config] updateStepContent called with:', updates);
    console.log('[Config] Current stepType:', stepType);
    setStepContent(prev => {
      console.log('[Config] Previous stepContent:', prev);
      // Create new object maintaining type consistency
      const merged = { ...prev, ...updates };

      // Return properly typed object based on current type
      switch (stepType) {
        case 'text':
          return {
            type: 'text',
            content: 'content' in merged ? (merged as TextStep).content : '',
            delay: 'delay' in merged ? (merged as TextStep).delay : undefined
          } as TextStep;

        case 'button':
          return {
            type: 'button',
            buttons: 'buttons' in merged ? (merged as ButtonStep).buttons : [],
            webhook: 'webhook' in merged ? (merged as ButtonStep).webhook : undefined
          } as ButtonStep;

        case 'input':
          return {
            type: 'input',
            placeholder: 'placeholder' in merged ? (merged as InputStep).placeholder : undefined,
            inputType: 'inputType' in merged ? (merged as InputStep).inputType : undefined,
            variable: 'variable' in merged ? (merged as InputStep).variable : undefined,
            isContactData: 'isContactData' in merged ? (merged as InputStep).isContactData : undefined,
            webhook: 'webhook' in merged ? (merged as InputStep).webhook : undefined
          } as InputStep;

        case 'options':
          return {
            type: 'options',
            options: 'options' in merged ? (merged as OptionsStep).options : [],
            webhook: 'webhook' in merged ? (merged as OptionsStep).webhook : undefined
          } as OptionsStep;

        case 'ai':
          return {
            type: 'ai',
            provider: 'provider' in merged ? (merged as AIStep).provider : 'openai',
            apiKeyId: 'apiKeyId' in merged ? (merged as AIStep).apiKeyId : undefined,
            model: 'model' in merged ? (merged as AIStep).model : undefined,
            prompt: 'prompt' in merged ? (merged as AIStep).prompt : '',
            outputType: 'outputType' in merged ? (merged as AIStep).outputType : 'text',
            temperature: 'temperature' in merged ? (merged as AIStep).temperature : 0.7,
            maxTokens: 'maxTokens' in merged ? (merged as AIStep).maxTokens : undefined
          } as AIStep;

        case 'audio':
          return {
            type: 'audio',
            mode: 'mode' in merged ? (merged as AudioStep).mode : 'static',
            audioBase64: 'audioBase64' in merged ? (merged as AudioStep).audioBase64 : undefined,
            mimeType: 'mimeType' in merged ? (merged as AudioStep).mimeType : 'audio/webm',
            ttsTemplate: 'ttsTemplate' in merged ? (merged as AudioStep).ttsTemplate : undefined,
            delay: 'delay' in merged ? (merged as AudioStep).delay : 500
          } as AudioStep;

        case 'canva':
          return {
            type: 'canva',
            action: 'action' in merged ? (merged as CanvaStep).action : 'list_designs',
            designId: 'designId' in merged ? (merged as CanvaStep).designId : undefined,
            brandTemplateId: 'brandTemplateId' in merged ? (merged as CanvaStep).brandTemplateId : undefined,
            autofillFields: 'autofillFields' in merged ? (merged as CanvaStep).autofillFields : undefined,
            message: 'message' in merged ? (merged as CanvaStep).message : undefined,
            saveResultAs: 'saveResultAs' in merged ? (merged as CanvaStep).saveResultAs : undefined,
            delay: 'delay' in merged ? (merged as CanvaStep).delay : 500
          } as CanvaStep;

        case 'canva_ai':
          return {
            type: 'canva_ai',
            instruction: 'instruction' in merged ? (merged as CanvaAIStep).instruction : '',
            aiProvider: 'aiProvider' in merged ? (merged as CanvaAIStep).aiProvider : 'openai',
            aiModel: 'aiModel' in merged ? (merged as CanvaAIStep).aiModel : undefined,
            apiKeyId: 'apiKeyId' in merged ? (merged as CanvaAIStep).apiKeyId : undefined,
            availableDesigns: 'availableDesigns' in merged ? (merged as CanvaAIStep).availableDesigns : [],
            message: 'message' in merged ? (merged as CanvaAIStep).message : undefined,
            saveResultAs: 'saveResultAs' in merged ? (merged as CanvaAIStep).saveResultAs : undefined,
            delay: 'delay' in merged ? (merged as CanvaAIStep).delay : 500
          } as CanvaAIStep;

        default:
          return prev;
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-medium text-[#1a1a1a] mb-3">Configuração de Fluxos</h1>
          <p className="text-[#6B6B6B] text-base">Configure e gerencie seus fluxos de conversação</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Fluxos */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-[#1a1a1a]">Fluxos</h2>
                <button
                  onClick={() => openFlowModal()}
                  className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#2d2d2d] transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Novo Fluxo
                </button>
              </div>

              <div className="space-y-3">
                {flows.map((flow) => (
                  <div
                    key={flow.id}
                    onClick={() => setSelectedFlow(flow)}
                    className={`p-5 rounded-xl cursor-pointer transition-all duration-200 border ${selectedFlow?.id === flow.id
                      ? 'bg-[#F5F5F4] border-[#1a1a1a] shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-[#1a1a1a] mb-1 truncate">{flow.name}</h3>
                          <p className="text-sm text-[#6B6B6B] line-clamp-2">{flow.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${flow.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}>
                              {flow.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1 ml-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyFlowLink(flow.id);
                            }}
                            className="p-2 text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copiar link do fluxo"
                          >
                            {copiedFlowId === flow.id ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateFlow(flow);
                            }}
                            className="p-2 text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Duplicar fluxo"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openFlowModal(flow);
                            }}
                            className="p-2 text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar fluxo"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFlow(flow.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deletar fluxo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Flow Link Display */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                        <Link2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <code className="text-xs text-[#6B6B6B] flex-1 truncate font-mono">
                          {typeof window !== 'undefined' ? `${window.location.origin}/flow/${flow.id}` : `/flow/${flow.id}`}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Configuration */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mt-6">
              <div className="flex items-center mb-6">
                <Palette className="h-5 w-5 text-[#1a1a1a] mr-2" />
                <h2 className="text-xl font-medium text-[#1a1a1a]">Personalização Visual</h2>
              </div>

              <div className="space-y-6">
                {/* Background Color */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Cor do Background</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={visualConfig.corBackground}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corBackground: e.target.value }))}
                      className="h-11 w-20 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={visualConfig.corBackground}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corBackground: e.target.value }))}
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Bot Balloon Color */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Cor do Balão Bot</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={visualConfig.corBalaoBot}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corBalaoBot: e.target.value }))}
                      className="h-11 w-20 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={visualConfig.corBalaoBot}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corBalaoBot: e.target.value }))}
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>

                {/* User Balloon Color */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Cor do Balão Usuário</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={visualConfig.corBalaoUser}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corBalaoUser: e.target.value }))}
                      className="h-11 w-20 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={visualConfig.corBalaoUser}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corBalaoUser: e.target.value }))}
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Bot Text Color */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Cor do Texto Bot</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={visualConfig.corTextoBot}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corTextoBot: e.target.value }))}
                      className="h-11 w-20 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={visualConfig.corTextoBot}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corTextoBot: e.target.value }))}
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>

                {/* User Text Color */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Cor do Texto Usuário</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={visualConfig.corTextoUser}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corTextoUser: e.target.value }))}
                      className="h-11 w-20 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={visualConfig.corTextoUser}
                      onChange={(e) => setVisualConfig(prev => ({ ...prev, corTextoUser: e.target.value }))}
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Logo Image */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Logo/Imagem</label>
                  <div className="space-y-3">
                    {visualConfig.imagemLogo && (
                      <div className="relative inline-block">
                        <img
                          src={visualConfig.imagemLogo}
                          alt="Logo"
                          className="h-24 object-contain bg-gray-50 p-3 rounded-xl border border-gray-200"
                        />
                        <button
                          onClick={() => setVisualConfig(prev => ({ ...prev, imagemLogo: '' }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center gap-2 transition-colors">
                        <Upload className="h-4 w-4 text-[#6B6B6B]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">{visualConfig.imagemLogo ? 'Trocar Imagem' : 'Carregar Imagem'}</span>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={saveVisualConfig}
                  disabled={savingVisual}
                  className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#2d2d2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                >
                  {savingVisual ? 'Salvando...' : 'Salvar Configurações Visuais'}
                </button>
              </div>
            </div>

            {/* API Keys Section */}
            <div className="bg-white mt-4 rounded-2xl border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-[#1a1a1a] mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    API Keys
                  </h3>
                  <p className="text-sm text-[#6B6B6B]">Gerencie suas chaves de API para OpenAI e Gemini</p>
                </div>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="px-4 py-2.5 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#2d2d2d] transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Nova API Key
                </button>
              </div>

              <div className="space-y-3">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Nenhuma API key cadastrada</p>
                    <p className="mt-1 text-xs text-gray-400">Adicione suas chaves de API para usar steps de IA</p>
                  </div>
                ) : (
                  apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0">
                          <img
                            src={key.provider === 'openai' ? '/openai.svg' : '/google.svg'}
                            alt={key.provider}
                            className="h-8 w-8"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-[#1a1a1a]">{key.nome}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${key.ativa ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                              {key.ativa ? 'Ativa' : 'Inativa'}
                            </span>
                          </div>
                          <code className="text-xs text-gray-500 font-mono">{key.keyMasked}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleApiKeyStatus(key.id, key.ativa)}
                          className="p-2 text-gray-500 hover:text-[#1a1a1a] hover:bg-gray-100 rounded-lg transition-colors"
                          title={key.ativa ? 'Desativar' : 'Ativar'}
                        >
                          {key.ativa ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => deleteApiKey(key.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Editor de Steps */}
          <div className="lg:col-span-2">
            {selectedFlow ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-medium text-[#1a1a1a] mb-2">{selectedFlow.name}</h2>
                    <p className="text-base text-[#6B6B6B]">{selectedFlow.description}</p>
                  </div>
                  <button
                    onClick={() => openStepModal()}
                    className="px-4 py-2.5 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#2d2d2d] transition-colors duration-200 flex items-center gap-2 text-sm font-medium flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Step
                  </button>
                </div>

                {/* Lista de Steps */}
                {saving && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-sm font-medium text-blue-700">Salvando alterações...</span>
                  </div>
                )}

                <div className="space-y-4">
                  {selectedFlow.steps?.map((step, index) => (
                    <div key={index} className="bg-[#FAFAF9] border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[#6B6B6B] mb-2">
                            Step {index + 1} • {STEP_TYPES.find(t => t.value === step.type)?.label}
                          </div>

                          {step.type === 'text' && (
                            <p className="text-[#1a1a1a] leading-relaxed">{(step as TextStep).content}</p>
                          )}

                          {step.type === 'button' && (
                            <div>
                              <div className="flex flex-wrap gap-2">
                                {(step as ButtonStep).buttons.map((btn, i) => (
                                  <span key={i} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-[#1a1a1a]">
                                    {btn.label}
                                  </span>
                                ))}
                              </div>
                              {(step as ButtonStep).webhook?.url && (
                                <div className="mt-3 text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                                  <Webhook className="w-3.5 h-3.5" />
                                  <span>Webhook: {(step as ButtonStep).webhook?.method || 'POST'}</span>
                                  <span className="text-[#6B6B6B]">→</span>
                                  <span className="text-[#6B6B6B] truncate max-w-xs">{(step as ButtonStep).webhook?.url}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {step.type === 'input' && (
                            <div className="space-y-2">
                              <div className="text-sm text-[#6B6B6B] space-y-1">
                                <div><span className="font-medium text-[#1a1a1a]">Tipo:</span> {(step as InputStep).inputType || 'text'}</div>
                                <div><span className="font-medium text-[#1a1a1a]">Placeholder:</span> &quot;{(step as InputStep).placeholder || ''}&quot;</div>
                                {(step as InputStep).variable && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-[#1a1a1a]">Variável:</span>
                                    <code className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{(step as InputStep).variable}</code>
                                  </div>
                                )}
                              </div>
                              {(step as InputStep).webhook?.url && (
                                <div className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                                  <Webhook className="h-3.5 w-3.5" />
                                  Webhook configurado
                                </div>
                              )}
                            </div>
                          )}

                          {step.type === 'options' && (
                            <div>
                              <div className="flex flex-wrap gap-2">
                                {(step as OptionsStep).options?.map((option, idx) => (
                                  <span key={idx} className="px-2.5 py-1 bg-white border border-gray-300 rounded-md text-xs font-medium text-[#1a1a1a]">
                                    {option}
                                  </span>
                                ))}
                              </div>
                              {(step as OptionsStep).webhook?.url && (
                                <div className="text-xs text-emerald-600 mt-3 flex items-center gap-1.5 font-medium">
                                  <Webhook className="h-3.5 w-3.5" />
                                  Webhook configurado
                                </div>
                              )}
                            </div>
                          )}

                          {step.type === 'ai' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-md">
                                  <img
                                    src={(step as AIStep).provider === 'openai' ? '/openai.svg' : '/google.svg'}
                                    alt={(step as AIStep).provider === 'openai' ? 'OpenAI' : 'Gemini'}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span className="text-xs font-medium text-purple-700">
                                    {(step as AIStep).provider === 'openai' ? 'OpenAI' : 'Gemini'}
                                  </span>
                                </div>
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium">
                                  Output: {(step as AIStep).outputType}
                                </span>
                              </div>
                              <p className="text-sm text-[#6B6B6B] line-clamp-2 italic">&quot;{(step as AIStep).prompt}&quot;</p>
                              {(step as AIStep).model && (
                                <div className="text-xs text-[#6B6B6B]">Modelo: <code className="font-mono">{(step as AIStep).model}</code></div>
                              )}
                            </div>
                          )}

                          {step.type === 'audio' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {(step as AudioStep).mode === 'static' ? (
                                  <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-medium">
                                    🎙️ Estático {(step as AudioStep).audioBase64 ? '✓' : '(não gravado)'}
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-medium">
                                    ⚡ Dinâmico (TTS)
                                  </span>
                                )}
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs">
                                  Delay: {(step as AudioStep).delay || 500}ms
                                </span>
                              </div>
                              {(step as AudioStep).mode === 'static' && (step as AudioStep).audioBase64 && (
                                <p className="text-xs text-[#6B6B6B]">
                                  Tipo: {(step as AudioStep).mimeType || 'audio/webm'}
                                </p>
                              )}
                              {(step as AudioStep).mode === 'dynamic' && (step as AudioStep).ttsTemplate && (
                                <p className="text-xs text-[#6B6B6B] italic line-clamp-1">
                                  Template: {(step as AudioStep).ttsTemplate}
                                </p>
                              )}
                            </div>
                          )}

                          {step.type === 'canva' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-medium">
                                  🎨 Canva - {
                                    (step as CanvaStep).action === 'list_designs' ? '📋 Listar' :
                                      (step as CanvaStep).action === 'get_design' ? '🔍 Obter' :
                                        '✨ Criar'
                                  }
                                </span>
                              </div>
                              {(step as CanvaStep).message && (
                                <p className="text-xs text-[#6B6B6B] italic line-clamp-1">
                                  {(step as CanvaStep).message}
                                </p>
                              )}
                              {(step as CanvaStep).action === 'get_design' && (step as CanvaStep).designId && (
                                <p className="text-xs text-[#6B6B6B]">
                                  Design ID: <code className="font-mono">{(step as CanvaStep).designId}</code>
                                </p>
                              )}
                              {(step as CanvaStep).action === 'create_autofill' && (step as CanvaStep).brandTemplateId && (
                                <p className="text-xs text-[#6B6B6B]">
                                  Template: <code className="font-mono">{(step as CanvaStep).brandTemplateId}</code>
                                </p>
                              )}
                              {(step as CanvaStep).saveResultAs && (
                                <p className="text-xs text-green-700 font-medium">
                                  💾 Salva como: @{'{' + (step as CanvaStep).saveResultAs + '}'}
                                </p>
                              )}
                            </div>
                          )}

                          {step.type === 'canva_ai' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border border-purple-200 rounded-md text-xs font-medium">
                                  🎨🤖 Canva + IA
                                </span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                                  {(step as CanvaAIStep).aiProvider.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-[#6B6B6B] italic line-clamp-2">
                                📝 &quot;{(step as CanvaAIStep).instruction}&quot;
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {(step as CanvaAIStep).availableDesigns.slice(0, 3).map((design, i) => (
                                  <div key={i} className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded text-[10px]">
                                    <span>🖼️</span>
                                    <span className="text-purple-700 truncate max-w-[100px]">{design.title}</span>
                                  </div>
                                ))}
                                {(step as CanvaAIStep).availableDesigns.length > 3 && (
                                  <span className="text-[10px] text-gray-500">
                                    +{(step as CanvaAIStep).availableDesigns.length - 3} mais
                                  </span>
                                )}
                              </div>
                              {(step as CanvaAIStep).saveResultAs && (
                                <p className="text-xs text-green-700 font-medium">
                                  💾 Salva como: @{'{' + (step as CanvaAIStep).saveResultAs + '}'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0 || saving}
                            className="p-2 text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                            title="Mover para cima"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === (selectedFlow.steps?.length || 0) - 1 || saving}
                            className="p-2 text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openStepModal(index)}
                            disabled={saving}
                            className="p-2 text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Editar step"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteStep(index)}
                            disabled={saving}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Deletar step"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!selectedFlow.steps || selectedFlow.steps.length === 0 && (
                    <div className="text-center py-16 px-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <Activity className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-medium text-[#1a1a1a] mb-2">Nenhum step configurado</h3>
                      <p className="text-sm text-[#6B6B6B] mb-6">Adicione steps para construir o fluxo de conversação</p>
                      <button
                        onClick={() => openStepModal()}
                        className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#2d2d2d] transition-colors inline-flex items-center gap-2 text-sm font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Criar Primeiro Step
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <div className="text-center py-16 px-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Play className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-[#1a1a1a] mb-2">Selecione um fluxo</h3>
                  <p className="text-sm text-[#6B6B6B]">Escolha um fluxo ao lado para visualizar e editar seus steps</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Fluxo - Dialog Style */}
      {flowModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={closeFlowModal} />
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 rounded-lg">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {editingFlow ? 'Editar Fluxo' : 'Novo Fluxo'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure as informações do fluxo
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Nome
                </label>
                <Input
                  id="name"
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="Nome do fluxo"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Descrição
                </label>
                <Textarea
                  id="description"
                  value={flowDescription}
                  onChange={(e) => setFlowDescription(e.target.value)}
                  placeholder="Descrição opcional"
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={flowActive}
                  onChange={(e) => setFlowActive(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="active" className="text-sm">Fluxo ativo</label>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                💡 <strong>Link do fluxo:</strong> Cada fluxo possui um link único que pode ser acessado em <code className="bg-white px-1 py-0.5 rounded">/flow/[id]</code>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeFlowModal}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={saveFlow}
                disabled={saving || !flowName}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Step - Dialog Style */}
      {stepModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={closeStepModal} />
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {editingStepIndex !== null ? 'Editar Step' : 'Novo Step'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure o conteúdo do step
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={stepType}
                  onChange={(e) => {
                    const type = e.target.value as 'text' | 'button' | 'input' | 'options' | 'ai' | 'audio' | 'canva' | 'canva_ai';
                    console.log('[Config] Step type changed to:', type);
                    setStepType(type);

                    // Reset content based on type
                    switch (type) {
                      case 'text':
                        setStepContent({ type: 'text', content: '' });
                        break;
                      case 'button':
                        setStepContent({ type: 'button', buttons: [] });
                        break;
                      case 'input':
                        setStepContent({ type: 'input' });
                        break;
                      case 'options':
                        setStepContent({ type: 'options', options: [] });
                        break;
                      case 'ai':
                        setStepContent({
                          type: 'ai',
                          provider: 'openai',
                          prompt: '',
                          outputType: 'text',
                          temperature: 0.7
                        });
                        break;
                      case 'audio':
                        console.log('[Config] Initializing audio step');
                        setStepContent({
                          type: 'audio',
                          mode: 'static',
                          delay: 500
                        });
                        break;
                      case 'canva':
                        console.log('[Config] Initializing canva step');
                        setStepContent({
                          type: 'canva',
                          action: 'list_designs',
                          message: 'Acessando seus designs do Canva...',
                          delay: 500
                        });
                        break;
                      case 'canva_ai':
                        console.log('[Config] Initializing canva_ai step');
                        setStepContent({
                          type: 'canva_ai',
                          instruction: '',
                          aiProvider: 'openai',
                          availableDesigns: [],
                          delay: 500
                        });
                        break;
                    }
                  }}
                  className="w-full p-2 border rounded"
                  disabled={editingStepIndex !== null}
                >
                  {STEP_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Text Step */}
              {stepType === 'text' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium">Texto</label>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentInputField('content');
                          setShowVariablesPopup(true);
                        }}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center gap-1"
                      >
                        <span>@</span>
                        Variáveis
                      </button>
                    </div>
                    <textarea
                      value={(stepContent as TextStep).content || ''}
                      onChange={(e) => updateStepContent({ content: e.target.value })}
                      className="w-full p-2 border rounded h-32"
                      placeholder="Digite o texto... Use @{variavel} para inserir valores dinâmicos"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Use @&#123;nome_variavel&#125; para inserir valores de inputs anteriores
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Delay (ms)</label>
                    <input
                      type="number"
                      value={(stepContent as TextStep).delay || 500}
                      onChange={(e) => updateStepContent({ delay: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded"
                      placeholder="500"
                    />
                  </div>
                </div>
              )}

              {/* Button Step */}
              {stepType === 'button' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Botões</label>
                    {(stepContent as ButtonStep).buttons?.map((button, index) => (
                      <div key={index} className="space-y-2 mb-3 p-3 border rounded bg-gray-50">
                        <div className="flex gap-2">
                          <input
                            value={button.label}
                            onChange={(e) => {
                              const buttons = [...((stepContent as ButtonStep).buttons || [])];
                              buttons[index] = { ...buttons[index], label: e.target.value };
                              updateStepContent({ buttons });
                            }}
                            className="flex-1 p-2 border rounded bg-white"
                            placeholder="Label do Botão"
                          />
                          <input
                            value={button.value}
                            onChange={(e) => {
                              const buttons = [...((stepContent as ButtonStep).buttons || [])];
                              buttons[index] = { ...buttons[index], value: e.target.value };
                              updateStepContent({ buttons });
                            }}
                            className="flex-1 p-2 border rounded bg-white"
                            placeholder="Valor"
                          />
                          <button
                            onClick={() => {
                              const buttons = ((stepContent as ButtonStep).buttons || []).filter((_, i) => i !== index);
                              updateStepContent({ buttons });
                            }}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                            title="Remover botão"
                          >
                            X
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap">🔗 Link (opcional):</span>
                          <input
                            value={button.link || ''}
                            onChange={(e) => {
                              const buttons = [...((stepContent as ButtonStep).buttons || [])];
                              buttons[index] = { ...buttons[index], link: e.target.value };
                              updateStepContent({ buttons });
                            }}
                            className="flex-1 p-2 border rounded text-sm bg-white"
                            placeholder="https://exemplo.com"
                            type="url"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const buttons = [...((stepContent as ButtonStep).buttons || [])];
                        buttons.push({ id: Date.now().toString(), label: '', value: '' });
                        updateStepContent({ buttons });
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      + Adicionar Botão
                    </button>
                  </div>

                  {/* Webhook Config for Button */}
                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium mb-1">
                      <Webhook className="inline-block w-4 h-4 mr-1" />
                      Webhook (opcional)
                    </label>
                    <div className="space-y-2">
                      <input
                        value={(stepContent as ButtonStep).webhook?.url || ''}
                        onChange={(e) => updateStepContent({
                          webhook: {
                            ...(stepContent as ButtonStep).webhook,
                            url: e.target.value
                          }
                        })}
                        className="w-full p-2 border rounded"
                        placeholder="https://exemplo.com/webhook"
                      />
                      {(stepContent as ButtonStep).webhook?.url && (
                        <>
                          <select
                            value={(stepContent as ButtonStep).webhook?.method || 'POST'}
                            onChange={(e) => updateStepContent({
                              webhook: {
                                ...(stepContent as ButtonStep).webhook,
                                method: e.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
                              }
                            })}
                            className="w-full p-2 border rounded"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600">Headers</label>
                            {Object.entries((stepContent as ButtonStep).webhook?.headers || {}).map(([key, value], index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  value={key}
                                  onChange={(e) => {
                                    const headers = { ...(stepContent as ButtonStep).webhook?.headers };
                                    delete headers[key];
                                    headers[e.target.value] = value;
                                    updateStepContent({
                                      webhook: {
                                        ...(stepContent as ButtonStep).webhook,
                                        headers
                                      }
                                    });
                                  }}
                                  className="flex-1 p-2 border rounded"
                                  placeholder="Header Key"
                                />
                                <input
                                  value={value}
                                  onChange={(e) => {
                                    const headers = { ...(stepContent as ButtonStep).webhook?.headers };
                                    headers[key] = e.target.value;
                                    updateStepContent({
                                      webhook: {
                                        ...(stepContent as ButtonStep).webhook,
                                        headers
                                      }
                                    });
                                  }}
                                  className="flex-1 p-2 border rounded"
                                  placeholder="Header Value"
                                />
                                <button
                                  onClick={() => {
                                    const headers = { ...(stepContent as ButtonStep).webhook?.headers };
                                    delete headers[key];
                                    updateStepContent({
                                      webhook: {
                                        ...(stepContent as ButtonStep).webhook,
                                        headers
                                      }
                                    });
                                  }}
                                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                                >
                                  X
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const headers = { ...(stepContent as ButtonStep).webhook?.headers || {} };
                                headers[`Header${Object.keys(headers).length + 1}`] = '';
                                updateStepContent({
                                  webhook: {
                                    ...(stepContent as ButtonStep).webhook,
                                    headers
                                  }
                                });
                              }}
                              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                            >
                              + Adicionar Header
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Input Step */}
              {stepType === 'input' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium">Placeholder</label>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentInputField('placeholder');
                          setShowVariablesPopup(true);
                        }}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center gap-1"
                      >
                        <span>@</span>
                        Variáveis
                      </button>
                    </div>
                    <input
                      value={(stepContent as InputStep).placeholder || ''}
                      onChange={(e) => updateStepContent({ placeholder: e.target.value })}
                      className="w-full p-2 border rounded"
                      placeholder="Digite aqui... Use @{variavel} para valores dinâmicos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo do Input</label>
                    <select
                      value={(stepContent as InputStep).inputType || 'text'}
                      onChange={(e) => updateStepContent({ inputType: e.target.value as 'text' | 'email' | 'tel' | 'textarea' })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="text">Texto</option>
                      <option value="email">Email</option>
                      <option value="tel">Telefone</option>
                      <option value="textarea">Textarea</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome da Variável (opcional)</label>
                    <input
                      value={(stepContent as InputStep).variable || ''}
                      onChange={(e) => updateStepContent({ variable: e.target.value })}
                      className="w-full p-2 border rounded"
                      placeholder="ex: nome_usuario, email_cliente..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Para usar em condicionais, defina um nome único para esta resposta
                    </p>
                  </div>

                  {/* Mark as Contact Data */}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-200">
                    <input
                      type="checkbox"
                      id="isContactData"
                      checked={(stepContent as InputStep).isContactData || false}
                      onChange={(e) => updateStepContent({ isContactData: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isContactData" className="text-sm font-medium text-blue-900 cursor-pointer">
                      📇 Marcar como dado de contato
                    </label>
                    <p className="text-xs text-blue-700 ml-auto">
                      Será salvo ao finalizar a sessão
                    </p>
                  </div>

                  {/* Webhook Config for Input */}
                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium mb-1">
                      <Webhook className="inline-block w-4 h-4 mr-1" />
                      Webhook (opcional)
                    </label>
                    <div className="space-y-2">
                      <input
                        value={(stepContent as InputStep).webhook?.url || ''}
                        onChange={(e) => updateStepContent({
                          webhook: {
                            ...(stepContent as InputStep).webhook,
                            url: e.target.value
                          }
                        })}
                        className="w-full p-2 border rounded"
                        placeholder="https://exemplo.com/webhook"
                      />
                      {(stepContent as InputStep).webhook?.url && (
                        <>
                          <select
                            value={(stepContent as InputStep).webhook?.method || 'POST'}
                            onChange={(e) => updateStepContent({
                              webhook: {
                                ...(stepContent as InputStep).webhook,
                                method: e.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
                              }
                            })}
                            className="w-full p-2 border rounded"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600">Headers</label>
                            {Object.entries((stepContent as InputStep).webhook?.headers || {}).map(([key, value], index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  value={key}
                                  onChange={(e) => {
                                    const headers = { ...(stepContent as InputStep).webhook?.headers };
                                    delete headers[key];
                                    headers[e.target.value] = value;
                                    updateStepContent({
                                      webhook: {
                                        ...(stepContent as InputStep).webhook,
                                        headers
                                      }
                                    });
                                  }}
                                  className="flex-1 p-2 border rounded"
                                  placeholder="Header Key"
                                />
                                <input
                                  value={value}
                                  onChange={(e) => {
                                    const headers = { ...(stepContent as InputStep).webhook?.headers };
                                    headers[key] = e.target.value;
                                    updateStepContent({
                                      webhook: {
                                        ...(stepContent as InputStep).webhook,
                                        headers
                                      }
                                    });
                                  }}
                                  className="flex-1 p-2 border rounded"
                                  placeholder="Header Value"
                                />
                                <button
                                  onClick={() => {
                                    const headers = { ...(stepContent as InputStep).webhook?.headers };
                                    delete headers[key];
                                    updateStepContent({
                                      webhook: {
                                        ...(stepContent as InputStep).webhook,
                                        headers
                                      }
                                    });
                                  }}
                                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                                >
                                  X
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const headers = { ...(stepContent as InputStep).webhook?.headers || {} };
                                headers[`Header${Object.keys(headers).length + 1}`] = '';
                                updateStepContent({
                                  webhook: {
                                    ...(stepContent as InputStep).webhook,
                                    headers
                                  }
                                });
                              }}
                              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                            >
                              + Adicionar Header
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Options Step */}
              {stepType === 'options' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Opções</label>
                    <div className="space-y-2">
                      {((stepContent as OptionsStep).options || []).map((option, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(stepContent as OptionsStep).options || []];
                              newOptions[idx] = e.target.value;
                              updateStepContent({ options: newOptions });
                            }}
                            className="flex-1 p-2 border rounded"
                            placeholder={`Opção ${idx + 1}`}
                          />
                          <button
                            onClick={() => {
                              const newOptions = [...(stepContent as OptionsStep).options || []];
                              newOptions.splice(idx, 1);
                              updateStepContent({ options: newOptions });
                            }}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const newOptions = [...(stepContent as OptionsStep).options || [], ''];
                        updateStepContent({ options: newOptions });
                      }}
                      className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4 inline mr-1" />
                      Adicionar Opção
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Cada opção será exibida como um item clicável para o usuário selecionar
                    </p>
                  </div>

                  {/* Webhook Config for Options */}
                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium mb-1">
                      <Webhook className="inline-block w-4 h-4 mr-1" />
                      Webhook (opcional)
                    </label>
                    <div className="space-y-2">
                      <input
                        value={(stepContent as OptionsStep).webhook?.url || ''}
                        onChange={(e) => updateStepContent({
                          webhook: {
                            ...(stepContent as OptionsStep).webhook,
                            url: e.target.value
                          }
                        })}
                        className="w-full p-2 border rounded"
                        placeholder="https://exemplo.com/webhook"
                      />
                      {(stepContent as OptionsStep).webhook?.url && (
                        <>
                          <select
                            value={(stepContent as OptionsStep).webhook?.method || 'POST'}
                            onChange={(e) => updateStepContent({
                              webhook: {
                                ...(stepContent as OptionsStep).webhook,
                                method: e.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
                              }
                            })}
                            className="w-full p-2 border rounded"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600">Headers</label>
                            {Object.entries((stepContent as OptionsStep).webhook?.headers || {}).map(([key, value], index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  value={key}
                                  onChange={(e) => {
                                    const headers = { ...(stepContent as OptionsStep).webhook?.headers };
                                    delete headers[key];
                                    headers[e.target.value] = value;
                                    updateStepContent({
                                      webhook: {
                                        ...(stepContent as OptionsStep).webhook,
                                        headers
                                      }
                                    });
                                  }}
                                  className="flex-1 p-2 border rounded"
                                  placeholder="Header Key"
                                />
                                <input
                                  value={value}
                                  onChange={(e) => {
                                    const headers = { ...(stepContent as OptionsStep).webhook?.headers };
                                    headers[key] = e.target.value;
                                    updateStepContent({
                                      webhook: {
                                        ...(stepContent as OptionsStep).webhook,
                                        headers
                                      }
                                    });
                                  }}
                                  className="flex-1 p-2 border rounded"
                                  placeholder="Header Value"
                                />
                                <button
                                  onClick={() => {
                                    const headers = { ...(stepContent as OptionsStep).webhook?.headers };
                                    delete headers[key];
                                    updateStepContent({
                                      webhook: {
                                        ...(stepContent as OptionsStep).webhook,
                                        headers
                                      }
                                    });
                                  }}
                                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                                >
                                  X
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const headers = { ...(stepContent as OptionsStep).webhook?.headers || {} };
                                headers[`Header${Object.keys(headers).length + 1}`] = '';
                                updateStepContent({
                                  webhook: {
                                    ...(stepContent as OptionsStep).webhook,
                                    headers
                                  }
                                });
                              }}
                              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                            >
                              + Adicionar Header
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Step */}
              {stepType === 'ai' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-900 mb-2">Step de IA Dinâmico</h4>
                    <p className="text-xs text-purple-700">
                      Este step usa IA para gerar conteúdo dinâmico baseado nas respostas anteriores do usuário.
                      Use <code className="bg-purple-100 px-1 rounded">{'{variavel}'}</code> no prompt para referenciar variáveis.
                    </p>
                  </div>

                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-3">Provider de IA</label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* OpenAI Option */}
                      <button
                        type="button"
                        onClick={() => updateStepContent({ provider: 'openai' })}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${(stepContent as AIStep).provider === 'openai' || !(stepContent as AIStep).provider
                          ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <img src="/openai.svg" alt="OpenAI" className="h-8 w-8" />
                          <span className="text-sm font-medium text-[#1a1a1a]">OpenAI</span>
                          <span className="text-xs text-[#6B6B6B]">GPT-4o, GPT-4o-mini</span>
                        </div>
                      </button>

                      {/* Gemini Option */}
                      <button
                        type="button"
                        onClick={() => updateStepContent({ provider: 'gemini' })}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${(stepContent as AIStep).provider === 'gemini'
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <img src="/google.svg" alt="Google Gemini" className="h-8 w-8" />
                          <span className="text-sm font-medium text-[#1a1a1a]">Google Gemini</span>
                          <span className="text-xs text-[#6B6B6B]">Gemini 2.0 Flash</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Modelo</label>
                    <select
                      value={(stepContent as AIStep).model || ((stepContent as AIStep).provider === 'gemini' ? 'gemini-2.0-flash-exp' : 'gpt-4o')}
                      onChange={(e) => updateStepContent({ model: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:border-transparent"
                    >
                      {(stepContent as AIStep).provider === 'gemini'
                        ? GEMINI_MODELS.map(model => (
                          <option key={model.value} value={model.value}>{model.label}</option>
                        ))
                        : OPENAI_MODELS.map(model => (
                          <option key={model.value} value={model.value}>{model.label}</option>
                        ))
                      }
                    </select>
                    <p className="text-xs text-[#6B6B6B] mt-1">
                      {(stepContent as AIStep).provider === 'gemini'
                        ? 'Recomendado: Gemini 2.0 Flash para velocidade ou 1.5 Pro para tarefas complexas'
                        : 'Recomendado: GPT-4o para melhor qualidade ou GPT-4o Mini para economia'
                      }
                    </p>
                  </div>

                  {/* Output Type */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Tipo de Output</label>
                    <select
                      value={(stepContent as AIStep).outputType || 'text'}
                      onChange={(e) => updateStepContent({ outputType: e.target.value as 'text' | 'buttons' | 'input' | 'options' })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:border-transparent"
                    >
                      <option value="text">Texto</option>
                      <option value="buttons">Botões</option>
                      <option value="input">Input</option>
                      <option value="options">Opções</option>
                    </select>
                    <p className="text-xs text-[#6B6B6B] mt-1">A IA gerará o tipo de conteúdo especificado</p>
                  </div>

                  {/* Available Variables - Mostrar TODOS os steps anteriores */}
                  {selectedFlow?.steps && selectedFlow.steps.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-emerald-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Dados Disponíveis dos Steps Anteriores
                      </h4>
                      <p className="text-xs text-emerald-700 mb-3">
                        A IA tem acesso a todos os dados abaixo. Use as tags no prompt:
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedFlow.steps.slice(0, editingStepIndex === null ? selectedFlow.steps.length : editingStepIndex).map((prevStep, idx) => {
                          // Renderizar TODOS os tipos de steps
                          switch (prevStep.type) {
                            case 'text':
                              const textContent = (prevStep as TextStep).content?.substring(0, 40);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => insertPreviousStepData(`{step-${idx + 1}-text}`)}
                                  className="w-full flex items-start gap-2 text-xs p-2 bg-white rounded border border-emerald-200 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer text-left"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-mono font-bold">
                                        {'{step-' + (idx + 1) + '-text}'}
                                      </code>
                                      <span className="text-gray-600 font-medium">Step {idx + 1}: Texto</span>
                                    </div>
                                    <p className="text-gray-500 text-[10px] truncate">&quot;{textContent}...&quot;</p>
                                  </div>
                                </button>
                              );

                            case 'button':
                              const buttonStep = prevStep as ButtonStep;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => insertPreviousStepData(`{step-${idx + 1}-button}`)}
                                  className="w-full flex items-start gap-2 text-xs p-2 bg-white rounded border border-emerald-200 hover:bg-purple-50 hover:border-purple-300 transition-colors cursor-pointer text-left"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-mono font-bold">
                                        {'{step-' + (idx + 1) + '-button}'}
                                      </code>
                                      <span className="text-gray-600 font-medium">Step {idx + 1}: Botão clicado</span>
                                    </div>
                                    <p className="text-gray-500 text-[10px]">
                                      Opções: {buttonStep.buttons?.map(b => b.value).join(', ')}
                                    </p>
                                  </div>
                                </button>
                              );

                            case 'input':
                              const inputStep = prevStep as InputStep;
                              const inputTag = inputStep.variable ? `{${inputStep.variable}}` : `{step-${idx + 1}-input}`;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => insertPreviousStepData(inputTag)}
                                  className="w-full flex items-start gap-2 text-xs p-2 bg-white rounded border border-emerald-200 hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer text-left"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      {inputStep.variable ? (
                                        <>
                                          <code className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-mono font-bold">
                                            {'{' + inputStep.variable + '}'}
                                          </code>
                                          <span className="text-gray-400 text-[10px]">ou</span>
                                        </>
                                      ) : null}
                                      <code className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-mono font-bold">
                                        {'{step-' + (idx + 1) + '-input}'}
                                      </code>
                                      <span className="text-gray-600 font-medium">Step {idx + 1}: Input</span>
                                    </div>
                                    <p className="text-gray-500 text-[10px]">&quot;{inputStep.placeholder}&quot;</p>
                                  </div>
                                </button>
                              );

                            case 'options':
                              const optionsStep = prevStep as OptionsStep;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => insertPreviousStepData(`{step-${idx + 1}-option}`)}
                                  className="w-full flex items-start gap-2 text-xs p-2 bg-white rounded border border-emerald-200 hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer text-left"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    <svg className="w-3.5 h-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-mono font-bold">
                                        {'{step-' + (idx + 1) + '-option}'}
                                      </code>
                                      <span className="text-gray-600 font-medium">Step {idx + 1}: Opção selecionada</span>
                                    </div>
                                    <p className="text-gray-500 text-[10px]">
                                      Opções: {optionsStep.options?.join(', ')}
                                    </p>
                                  </div>
                                </button>
                              );

                            case 'ai':
                              const aiStep = prevStep as AIStep;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => insertPreviousStepData(`{step-${idx + 1}-ai}`)}
                                  className="w-full flex items-start gap-2 text-xs p-2 bg-white rounded border border-emerald-200 hover:bg-pink-50 hover:border-pink-300 transition-colors cursor-pointer text-left"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    <svg className="w-3.5 h-3.5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="px-1.5 py-0.5 bg-pink-100 text-pink-800 rounded text-[10px] font-mono font-bold">
                                        {'{step-' + (idx + 1) + '-ai}'}
                                      </code>
                                      <span className="text-gray-600 font-medium">Step {idx + 1}: Resposta da IA</span>
                                    </div>
                                    <p className="text-gray-500 text-[10px]">
                                      {aiStep.provider === 'openai' ? 'OpenAI' : 'Gemini'} - {aiStep.outputType}
                                    </p>
                                  </div>
                                </button>
                              );

                            default:
                              return null;
                          }
                        })}
                      </div>

                      <div className="mt-3 p-2 bg-emerald-100 rounded-lg">
                        <p className="text-[10px] text-emerald-800 font-medium">
                          <strong>Como usar:</strong> Copie as tags acima e cole no prompt. Ex: &quot;Olá {'{'}step-1-input{'}'}, vi que você escolheu {'{'}step-2-button{'}'}...&quot;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-[#1a1a1a]">Prompt para a IA</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowPreviousStepsPopup(true)}
                          className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Inserir Step Anterior
                        </button>
                        <button
                          onClick={() => {
                            setCurrentInputField('prompt');
                            setShowVariablesPopup(true);
                          }}
                          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Inserir Variável
                        </button>
                      </div>
                    </div>
                    <Textarea
                      value={(stepContent as AIStep).prompt || ''}
                      onChange={(e) => updateStepContent({ prompt: e.target.value })}
                      className="min-h-[150px] font-mono text-sm"
                      placeholder={`Exemplo:\nCom base no nome {nome} e interesse {interesse}, gere uma mensagem personalizada oferecendo produtos relacionados.\n\nUse as variáveis disponíveis acima no formato {nome_variavel}`}
                    />
                    <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-blue-700 text-xs">
                        <strong>Dica:</strong> A IA tem acesso a todas as respostas anteriores.
                        Use <code className="bg-blue-100 px-1 rounded">{'{variable}'}</code> no prompt para referenciar os dados coletados nos steps anteriores.
                      </div>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                      Temperature: {(stepContent as AIStep).temperature ?? 0.7}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={(stepContent as AIStep).temperature ?? 0.7}
                      onChange={(e) => updateStepContent({ temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[#6B6B6B] mt-1">
                      <span>Mais preciso (0)</span>
                      <span>Mais criativo (2)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Step */}
              {stepType === 'audio' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-orange-900 mb-2">🎙️ Step de Áudio</h4>
                    <p className="text-xs text-orange-700">
                      Escolha entre áudio estático (pré-gravado) ou dinâmico (gerado com TTS durante o fluxo usando as respostas do usuário).
                    </p>
                  </div>

                  {/* Mode Selection: Static vs Dynamic */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-3">Modo do Áudio</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => updateStepContent({ mode: 'static', ttsTemplate: undefined })}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${(stepContent as AudioStep).mode === 'static'
                          ? 'border-green-500 bg-green-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-[#1a1a1a]">Estático</span>
                          <span className="text-xs text-[#6B6B6B] text-center">Áudio pré-gravado (mesmo para todos)</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateStepContent({ mode: 'dynamic', audioBase64: undefined, mimeType: undefined })}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${(stepContent as AudioStep).mode === 'dynamic'
                          ? 'border-purple-500 bg-purple-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-sm font-medium text-[#1a1a1a]">Dinâmico</span>
                          <span className="text-xs text-[#6B6B6B] text-center">TTS em tempo real (personalizado)</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Static Mode: Audio Upload/Record */}
                  {(stepContent as AudioStep).mode === 'static' && (
                    <>
                      {(stepContent as AudioStep).audioBase64 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm text-green-800 mb-2">✓ Áudio configurado</p>
                          <audio
                            controls
                            src={`data:${(stepContent as AudioStep).mimeType};base64,${(stepContent as AudioStep).audioBase64}`}
                            className="w-full"
                          />
                          <button
                            type="button"
                            onClick={() => updateStepContent({ audioBase64: undefined, mimeType: undefined })}
                            className="mt-2 text-xs text-red-600 hover:text-red-800"
                          >
                            Remover áudio
                          </button>
                        </div>
                      )}

                      {!(stepContent as AudioStep).audioBase64 && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">Escolha como adicionar o áudio:</p>

                          {/* Upload Button */}
                          <div>
                            <label className="cursor-pointer">
                              <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                                <Upload className="w-5 h-5 text-orange-600" />
                                <span className="text-sm font-medium text-orange-900">Fazer upload de arquivo</span>
                              </div>
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const base64 = (reader.result as string).split(',')[1];
                                      updateStepContent({
                                        audioBase64: base64,
                                        mimeType: file.type || 'audio/mpeg'
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {/* Record Button */}
                          <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${isRecording
                              ? 'bg-red-50 border-red-500 hover:bg-red-100'
                              : 'bg-red-50 border-red-200 hover:bg-red-100'
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              <Activity className={`w-5 h-5 ${isRecording ? 'text-red-600 animate-pulse' : 'text-red-600'}`} />
                              <span className="text-sm font-medium text-red-900">
                                {isRecording ? '⏹️ Parar gravação' : '🎙️ Gravar pelo navegador'}
                              </span>
                            </div>
                          </button>

                          {/* TTS Button */}
                          <button
                            type="button"
                            onClick={() => setShowTTSModal(true)}
                            className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <span className="text-sm font-medium text-purple-900">🤖 Gerar com IA (TTS)</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Dynamic Mode: TTS Template */}
                  {(stepContent as AudioStep).mode === 'dynamic' && (
                    <div className="space-y-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-purple-900">📝 Template de Texto para TTS</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowTemplateVariablesPopup(!showTemplateVariablesPopup);
                              setShowTemplateStepsPopup(false);
                            }}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center gap-1"
                          >
                            <span>@</span>
                            Variáveis
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowTemplateStepsPopup(!showTemplateStepsPopup);
                              setShowTemplateVariablesPopup(false);
                            }}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1"
                          >
                            <span>📋</span>
                            Steps
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-purple-700">
                        Este texto será convertido em áudio durante o fluxo, usando as respostas do usuário.
                      </p>
                      <Textarea
                        value={(stepContent as AudioStep).ttsTemplate || ''}
                        onChange={(e) => updateStepContent({ ttsTemplate: e.target.value })}
                        placeholder="Ex: Olá @{nome}, baseado na sua resposta @{step-1-ai_result}, recomendamos..."
                        className="min-h-[120px]"
                      />

                      {/* Variables Popup for Template */}
                      {showTemplateVariablesPopup && (
                        <div className="p-3 bg-white border border-purple-300 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-purple-900">@ Variáveis de Input:</p>
                            <button
                              type="button"
                              onClick={() => setShowTemplateVariablesPopup(false)}
                              className="text-xs text-purple-600 hover:text-purple-800"
                            >
                              Fechar
                            </button>
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {getAvailableVariables().length === 0 ? (
                              <p className="text-xs text-gray-500 p-2">Nenhuma variável disponível ainda</p>
                            ) : (
                              getAvailableVariables().map((variable) => (
                                <button
                                  key={variable.name}
                                  type="button"
                                  onClick={() => {
                                    updateStepContent({
                                      ttsTemplate: ((stepContent as AudioStep).ttsTemplate || '') + `@{${variable.name}}`
                                    });
                                    setShowTemplateVariablesPopup(false);
                                  }}
                                  className="block w-full text-left px-2 py-1.5 text-xs bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
                                >
                                  <span className="font-mono text-purple-700 font-medium">@{'{' + variable.name + '}'}</span>
                                  <span className="text-gray-500 ml-2">
                                    (Step {variable.stepIndex + 1})
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* Steps Popup for Template */}
                      {showTemplateStepsPopup && (
                        <div className="p-3 bg-white border border-blue-300 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-blue-900">📋 Dados de Steps Anteriores:</p>
                            <button
                              type="button"
                              onClick={() => setShowTemplateStepsPopup(false)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Fechar
                            </button>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {!selectedFlow?.steps?.some((s, i) => (s.type === 'ai' || s.type === 'text') && i < (editingStepIndex ?? selectedFlow.steps!.length)) ? (
                              <p className="text-xs text-gray-500 p-2">Nenhum step anterior disponível</p>
                            ) : (
                              <>
                                {/* AI Results */}
                                {selectedFlow?.steps?.map((step, index) => {
                                  if (step.type === 'ai' && index < (editingStepIndex ?? selectedFlow.steps!.length)) {
                                    return (
                                      <button
                                        key={`step-${index}-ai`}
                                        type="button"
                                        onClick={() => {
                                          updateStepContent({
                                            ttsTemplate: ((stepContent as AudioStep).ttsTemplate || '') + `@{step-${index + 1}-ai_result}`
                                          });
                                          setShowTemplateStepsPopup(false);
                                        }}
                                        className="block w-full text-left px-2 py-1.5 text-xs bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                                      >
                                        <span className="font-mono text-blue-700 font-medium">@{'{step-' + (index + 1) + '-ai_result}'}</span>
                                        <span className="text-gray-500 ml-2">
                                          (Step {index + 1} - IA)
                                        </span>
                                      </button>
                                    );
                                  }
                                  if (step.type === 'text' && index < (editingStepIndex ?? selectedFlow.steps!.length)) {
                                    return (
                                      <button
                                        key={`step-${index}-text`}
                                        type="button"
                                        onClick={() => {
                                          updateStepContent({
                                            ttsTemplate: ((stepContent as AudioStep).ttsTemplate || '') + `@{step-${index + 1}-text}`
                                          });
                                          setShowTemplateStepsPopup(false);
                                        }}
                                        className="block w-full text-left px-2 py-1.5 text-xs bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                                      >
                                        <span className="font-mono text-blue-700 font-medium">@{'{step-' + (index + 1) + '-text}'}</span>
                                        <span className="text-gray-500 ml-2">
                                          (Step {index + 1} - Texto)
                                        </span>
                                      </button>
                                    );
                                  }
                                  return null;
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        💡 O áudio será gerado em tempo real durante o fluxo, personalizado para cada usuário
                      </p>
                    </div>
                  )}

                  {/* Delay */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                      Delay antes de tocar (ms)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5000"
                      step="100"
                      value={(stepContent as AudioStep).delay || 500}
                      onChange={(e) => updateStepContent({ delay: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-xs text-[#6B6B6B] mt-1">Tempo de espera antes do áudio tocar (padrão: 500ms)</p>
                  </div>
                </div>
              )}

              {/* Canva Step */}
              {stepType === 'canva' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <img src="/canva.svg" alt="Canva" className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">Integração Canva</h4>
                        <p className="text-sm text-gray-500">Conecte e gerencie seus designs</p>
                      </div>
                    </div>
                  </div>

                  {/* Authentication Status */}
                  {!canvaAccessToken && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900 mb-1">Autenticação necessária</h5>
                          <p className="text-sm text-gray-500 mb-4">
                            Conecte sua conta Canva para acessar designs e templates
                          </p>
                          <button
                            type="button"
                            onClick={handleCanvaAuth}
                            disabled={canvaAuthenticating}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
                          >
                            {canvaAuthenticating ? (
                              <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Conectando...</span>
                              </>
                            ) : (
                              <>
                                <img src="/canva.svg" alt="Canva" className="w-4 h-4" />
                                <span>Conectar com Canva</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {canvaAccessToken && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold text-green-900">Conta Canva conectada</h5>
                            {canvaUserInfo ? (
                              <div className="text-sm text-green-700 space-y-0.5">
                                {canvaUserInfo.user_profile && (
                                  <p className="font-medium">{canvaUserInfo.user_profile.display_name || 'Usuário Canva'}</p>
                                )}
                                <div className="text-xs space-y-0.5">
                                  {canvaUserInfo.scopes && canvaUserInfo.scopes.length > 0 && (
                                    <p>{canvaUserInfo.scopes.length} scopes ativos</p>
                                  )}
                                  {canvaUserInfo.capabilities?.can_use_design_autofill !== undefined && (
                                    <p>Autofill: {canvaUserInfo.capabilities.can_use_design_autofill ? '✅' : '❌'}</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-green-700">Pronto para usar a API do Canva</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/canva/disconnect', { method: 'POST' });
                              const data = await response.json();
                              if (data.success) {
                                setCanvaAccessToken('');
                                setCanvaUserInfo(null);
                              } else {
                                alert('Erro ao desconectar do Canva');
                              }
                            } catch (error) {
                              console.error('[Config] Error disconnecting Canva:', error);
                              alert('Erro ao desconectar do Canva');
                            }
                          }}
                          className="text-sm text-green-700 hover:text-green-900 font-medium transition-colors"
                        >
                          Desconectar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Mensagem
                      <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <Input
                      value={(stepContent as CanvaStep).message || ''}
                      onChange={(e) => updateStepContent({ message: e.target.value })}
                      placeholder="Acessando seus designs do Canva..."
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Mensagem exibida durante o processamento</p>
                  </div>

                  {/* Action Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Ação do Canva</label>
                    <select
                      value={(stepContent as CanvaStep).action}
                      onChange={(e) => updateStepContent({ action: e.target.value as 'list_designs' | 'get_design' | 'create_autofill' })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all bg-white"
                    >
                      <option value="list_designs">📋 Listar Designs</option>
                      <option value="get_design">🔍 Obter Design Específico</option>
                      <option value="create_autofill">✨ Criar Design (Autofill)</option>
                    </select>
                  </div>

                  {/* Design ID (para get_design) */}
                  {(stepContent as CanvaStep).action === 'get_design' && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h5 className="text-sm font-semibold text-blue-900">Obter Design Específico</h5>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-blue-900">
                          ID do Design
                        </label>
                        <Input
                          value={(stepContent as CanvaStep).designId || ''}
                          onChange={(e) => updateStepContent({ designId: e.target.value })}
                          placeholder="DAFVztcvd9z"
                          className="bg-white"
                        />
                        <p className="text-xs text-blue-700">ID do design do Canva que você deseja obter</p>
                      </div>
                    </div>
                  )}

                  {/* Brand Template ID e Fields (para create_autofill) */}
                  {(stepContent as CanvaStep).action === 'create_autofill' && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <h5 className="text-sm font-semibold text-purple-900">Criar Design com Autofill</h5>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-purple-900">
                          ID do Brand Template
                        </label>
                        <Input
                          value={(stepContent as CanvaStep).brandTemplateId || ''}
                          onChange={(e) => updateStepContent({ brandTemplateId: e.target.value })}
                          placeholder="ID do Brand Template"
                          className="bg-white"
                        />
                        <p className="text-xs text-purple-700">Template base para criar o design</p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-purple-900">
                          Campos do Autofill
                          <span className="ml-1 text-purple-600 font-normal">(JSON)</span>
                        </label>
                        <Textarea
                          value={JSON.stringify((stepContent as CanvaStep).autofillFields || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              updateStepContent({ autofillFields: parsed });
                            } catch {
                              // Invalid JSON, ignore
                            }
                          }}
                          placeholder='{\n  "headline": "Título",\n  "subtitle": "@{nome}",\n  "price": "R$ @{valor}"\n}'
                          className="min-h-[140px] font-mono text-sm bg-white"
                        />
                        <div className="flex items-start gap-2 text-xs text-purple-700 bg-purple-100 px-3 py-2 rounded-lg">
                          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Use <code className="px-1 py-0.5 bg-white rounded">@{'{variavel}'}</code> para inserir dados dinâmicos</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save Result As */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Salvar resultado como
                      <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <Input
                      value={(stepContent as CanvaStep).saveResultAs || ''}
                      onChange={(e) => updateStepContent({ saveResultAs: e.target.value })}
                      placeholder="canva_design_id"
                    />
                    <p className="text-xs text-gray-500">
                      Nome da variável para usar em steps posteriores
                    </p>
                  </div>

                  {/* Delay */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Delay
                      <span className="ml-1 text-gray-400 font-normal">(milissegundos)</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5000"
                      step="100"
                      value={(stepContent as CanvaStep).delay || 500}
                      onChange={(e) => updateStepContent({ delay: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Tempo de espera antes de processar (padrão: 500ms)</p>
                  </div>
                </div>
              )}

              {/* Canva AI Step */}
              {stepType === 'canva_ai' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">IA seleciona Design do Canva</h4>
                        <p className="text-sm text-gray-500">IA analisa contexto e escolhe o melhor design</p>
                      </div>
                    </div>
                  </div>

                  {/* Instruction */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Instrução para IA
                        <span className="ml-1 text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentInputField('canva_ai_instruction');
                            setShowPreviousStepsPopup(true);
                          }}
                          className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Inserir Step Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentInputField('canva_ai_instruction');
                            setShowVariablesPopup(true);
                          }}
                          className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors font-medium flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Inserir Variável
                        </button>
                      </div>
                    </div>
                    <Textarea
                      value={(stepContent as CanvaAIStep).instruction || ''}
                      onChange={(e) => updateStepContent({ instruction: e.target.value })}
                      placeholder="Selecione o design mais adequado para {{produto}} focado em {{publico}}"
                      className="min-h-[100px]"
                    />
                    <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="text-purple-700 text-xs">
                        <strong>Dica:</strong> Use <code className="bg-purple-100 px-1 rounded">{`{{variavel}}`}</code> para variáveis de input ou <code className="bg-purple-100 px-1 rounded">{`{step-X-ai_result}`}</code> para resultados de steps anteriores.
                        A IA usará essas informações para escolher o design mais adequado.
                      </div>
                    </div>
                  </div>

                  {/* AI Provider */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Provider IA</label>
                      <select
                        value={(stepContent as CanvaAIStep).aiProvider}
                        onChange={(e) => updateStepContent({ aiProvider: e.target.value as 'openai' | 'gemini' })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="gemini">Google Gemini</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Modelo</label>
                      <select
                        value={(stepContent as CanvaAIStep).aiModel || ''}
                        onChange={(e) => updateStepContent({ aiModel: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        {((stepContent as CanvaAIStep).aiProvider === 'openai' ? OPENAI_MODELS : GEMINI_MODELS).map((model) => (
                          <option key={model.value} value={model.value}>{model.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">API Key</label>
                    <select
                      value={(stepContent as CanvaAIStep).apiKeyId || ''}
                      onChange={(e) => updateStepContent({ apiKeyId: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Selecione uma API Key</option>
                      {apiKeys
                        .filter(k => k.provider === (stepContent as CanvaAIStep).aiProvider)
                        .map((key) => (
                          <option key={key.id} value={key.id}>
                            {key.nome} ({key.provider})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Designs Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Designs Disponíveis
                        <span className="ml-1 text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/canva/designs');
                            const data = await response.json();
                            if (data.success && data.items) {
                              // Store designs in state for selection
                              setCanvaUserInfo((prev) => ({ ...prev, availableDesigns: data.items }));
                            } else {
                              alert('Erro ao buscar designs: ' + (data.error || 'Desconhecido'));
                            }
                          } catch (error) {
                            console.error('[Config] Error loading designs:', error);
                            alert('Erro ao buscar designs do Canva');
                          }
                        }}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        🔄 Carregar Designs
                      </button>
                    </div>

                    {canvaUserInfo?.availableDesigns && canvaUserInfo.availableDesigns.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-3 border rounded-lg bg-gray-50">
                        {canvaUserInfo.availableDesigns.map((design: CanvaDesignOption & { name?: string; thumbnail?: { url?: string } }) => {
                          const isSelected = (stepContent as CanvaAIStep).availableDesigns.some(d => d.id === design.id);
                          return (
                            <button
                              key={design.id}
                              type="button"
                              onClick={() => {
                                const current = (stepContent as CanvaAIStep).availableDesigns || [];
                                if (isSelected) {
                                  // Remove
                                  updateStepContent({
                                    availableDesigns: current.filter(d => d.id !== design.id)
                                  });
                                } else {
                                  // Add
                                  updateStepContent({
                                    availableDesigns: [...current, {
                                      id: design.id,
                                      title: design.title || design.name || 'Sem título',
                                      thumbnailUrl: design.thumbnail?.url
                                    }]
                                  });
                                }
                              }}
                              className={`relative rounded-lg border-2 p-2 text-left transition-all ${isSelected
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                              {design.thumbnail?.url && (
                                <img
                                  src={design.thumbnail.url}
                                  alt={design.title || 'Design'}
                                  className="w-full h-24 object-cover rounded mb-2"
                                />
                              )}
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {design.title || design.name || 'Sem título'}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                ID: {design.id.substring(0, 12)}...
                              </p>
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">Clique em &quot;Carregar Designs&quot; para ver seus designs do Canva</p>
                      </div>
                    )}

                    {(stepContent as CanvaAIStep).availableDesigns.length > 0 && (
                      <p className="text-xs text-gray-600">
                        ✅ {(stepContent as CanvaAIStep).availableDesigns.length} design(s) selecionado(s)
                      </p>
                    )}
                  </div>

                  {/* Message (optional) */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Mensagem
                      <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <Input
                      value={(stepContent as CanvaAIStep).message || ''}
                      onChange={(e) => updateStepContent({ message: e.target.value })}
                      placeholder="Analisando os melhores designs para você..."
                    />
                  </div>

                  {/* Save Result As */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Salvar resultado como
                      <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <Input
                      value={(stepContent as CanvaAIStep).saveResultAs || ''}
                      onChange={(e) => updateStepContent({ saveResultAs: e.target.value })}
                      placeholder="design_selecionado"
                    />
                    <p className="text-xs text-gray-500">
                      Nome da variável para usar em steps posteriores
                    </p>
                  </div>

                  {/* Delay */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Delay <span className="text-gray-400 font-normal">(ms)</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5000"
                      step="100"
                      value={(stepContent as CanvaAIStep).delay || 500}
                      onChange={(e) => updateStepContent({ delay: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeStepModal}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={saveStep}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* TTS Modal */}
      <Dialog open={showTTSModal} onOpenChange={setShowTTSModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🤖 Gerar Áudio com IA (TTS)</DialogTitle>
            <DialogDescription>
              Digite o texto que será convertido em áudio pela IA. Use @{'{variavel}'} para incluir dados de steps anteriores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* AI Text Generator Section */}
            {!showAITextGenerator && (
              <button
                type="button"
                onClick={() => setShowAITextGenerator(true)}
                className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                disabled={isTTSGenerating}
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm font-medium text-blue-900">💡 Gerar texto com IA primeiro</span>
              </button>
            )}

            {showAITextGenerator && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-blue-900">💡 Gerador de Texto com IA</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAITextGenerator(false);
                      setAiTextPrompt('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    disabled={isGeneratingAIText}
                  >
                    Fechar
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-900 mb-1">Prompt para IA</label>
                  <Textarea
                    value={aiTextPrompt}
                    onChange={(e) => setAiTextPrompt(e.target.value)}
                    placeholder="Ex: Escreva uma mensagem de boas-vindas amigável e profissional para um sistema de atendimento..."
                    className="min-h-[80px]"
                    disabled={isGeneratingAIText}
                  />
                  <p className="text-xs text-blue-700 mt-1">💡 Dica: Você pode referenciar dados de steps anteriores no prompt</p>
                </div>

                {/* Variables for AI Prompt */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-800 font-medium hover:text-blue-900">
                    📋 Clique nas variáveis para inserir no prompt
                  </summary>
                  <div className="mt-2 p-2 bg-white rounded border border-blue-200 max-h-48 overflow-y-auto space-y-1">
                    {getAvailableVariables().length === 0 && !selectedFlow?.steps?.some((s, i) => (s.type === 'ai' || s.type === 'text' || s.type === 'input') && i < (editingStepIndex ?? selectedFlow.steps!.length)) ? (
                      <p className="text-gray-500 p-2">Nenhuma variável disponível ainda</p>
                    ) : (
                      <>
                        {getAvailableVariables().map((variable) => (
                          <button
                            key={variable.name}
                            type="button"
                            onClick={() => setAiTextPrompt(prev => prev + `@{${variable.name}}`)}
                            className="block w-full text-left p-1.5 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                            disabled={isGeneratingAIText}
                          >
                            <span className="font-mono text-blue-700 font-medium">@{'{' + variable.name + '}'}</span>
                            <span className="text-gray-500 text-xs ml-2">(Step {variable.stepIndex + 1})</span>
                          </button>
                        ))}
                        {selectedFlow?.steps?.map((step, index) => {
                          if (index >= (editingStepIndex ?? selectedFlow.steps!.length)) return null;
                          if (step.type === 'ai') {
                            return (
                              <button
                                key={`step-${index}-ai`}
                                type="button"
                                onClick={() => setAiTextPrompt(prev => prev + `@{step-${index + 1}-ai_result}`)}
                                className="block w-full text-left p-1.5 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                disabled={isGeneratingAIText}
                              >
                                <span className="font-mono text-blue-700 font-medium">@{'{step-' + (index + 1) + '-ai_result}'}</span>
                                <span className="text-gray-500 text-xs ml-2">(Resultado IA - Step {index + 1})</span>
                              </button>
                            );
                          }
                          if (step.type === 'text') {
                            return (
                              <button
                                key={`step-${index}-text`}
                                type="button"
                                onClick={() => setAiTextPrompt(prev => prev + `@{step-${index + 1}-text}`)}
                                className="block w-full text-left p-1.5 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                disabled={isGeneratingAIText}
                              >
                                <span className="font-mono text-blue-700 font-medium">@{'{step-' + (index + 1) + '-text}'}</span>
                                <span className="text-gray-500 text-xs ml-2">(Texto - Step {index + 1})</span>
                              </button>
                            );
                          }
                          return null;
                        })}
                      </>
                    )}
                  </div>
                </details>

                <Button
                  onClick={generateAIText}
                  disabled={isGeneratingAIText || !aiTextPrompt.trim()}
                  className="w-full"
                  size="sm"
                >
                  {isGeneratingAIText ? 'Gerando texto...' : '✨ Gerar Texto'}
                </Button>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-[#1a1a1a]">Texto para TTS</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVariablesPopup(!showVariablesPopup);
                      setShowStepsPopup(false);
                    }}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center gap-1"
                    disabled={isTTSGenerating}
                  >
                    <span>@</span>
                    Inserir Variável
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStepsPopup(!showStepsPopup);
                      setShowVariablesPopup(false);
                    }}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1"
                    disabled={isTTSGenerating}
                  >
                    <span>📋</span>
                    Steps Anteriores
                  </button>
                </div>
              </div>
              <Textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Digite o texto para converter em áudio... Ex: Olá @{nome}, seu pedido @{step-1-ai_result} está pronto!"
                className="min-h-[120px]"
                disabled={isTTSGenerating}
              />

              {/* Variables Popup - Only Input Variables */}
              {showVariablesPopup && (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-purple-900">@ Variáveis de Input - Clique para inserir:</p>
                    <button
                      type="button"
                      onClick={() => setShowVariablesPopup(false)}
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {getAvailableVariables().length === 0 ? (
                      <p className="text-xs text-gray-500 p-2">Nenhuma variável de input disponível ainda. Adicione steps de Input antes deste step.</p>
                    ) : (
                      getAvailableVariables().map((variable) => (
                        <button
                          key={variable.name}
                          type="button"
                          onClick={() => {
                            setTtsText(prev => prev + `@{${variable.name}}`);
                            setShowVariablesPopup(false);
                          }}
                          className="block w-full text-left px-2 py-1.5 text-xs bg-white border border-purple-200 rounded hover:bg-purple-100 transition-colors"
                        >
                          <span className="font-mono text-purple-700 font-medium">@{'{' + variable.name + '}'}</span>
                          <span className="text-gray-500 ml-2">
                            (Step {variable.stepIndex + 1} - {variable.stepType})
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Steps Popup - AI Results and Text Steps */}
              {showStepsPopup && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-blue-900">📋 Dados de Steps Anteriores - Clique para inserir:</p>
                    <button
                      type="button"
                      onClick={() => setShowStepsPopup(false)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {!selectedFlow?.steps?.some((s, i) => (s.type === 'ai' || s.type === 'text') && i < (editingStepIndex ?? selectedFlow.steps!.length)) ? (
                      <p className="text-xs text-gray-500 p-2">Nenhum step anterior com dados disponíveis. Adicione steps de IA ou Texto antes deste step.</p>
                    ) : (
                      <>
                        {/* AI Results from previous steps */}
                        {selectedFlow?.steps?.some((s, i) => s.type === 'ai' && i < (editingStepIndex ?? selectedFlow.steps!.length)) && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-blue-800 mb-1">🤖 Resultados de IA:</p>
                            {selectedFlow?.steps?.map((step, index) => {
                              if (step.type === 'ai' && index < (editingStepIndex ?? selectedFlow.steps!.length)) {
                                return (
                                  <button
                                    key={`step-${index}-ai`}
                                    type="button"
                                    onClick={() => {
                                      setTtsText(prev => prev + `@{step-${index + 1}-ai_result}`);
                                      setShowStepsPopup(false);
                                    }}
                                    className="block w-full text-left px-2 py-1.5 text-xs bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors mb-1"
                                  >
                                    <span className="font-mono text-blue-700 font-medium">@{'{step-' + (index + 1) + '-ai_result}'}</span>
                                    <span className="text-gray-500 ml-2">
                                      (Step {index + 1} - resultado IA)
                                    </span>
                                  </button>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}

                        {/* Text from previous steps */}
                        {selectedFlow?.steps?.some((s, i) => s.type === 'text' && i < (editingStepIndex ?? selectedFlow.steps!.length)) && (
                          <div>
                            <p className="text-xs font-semibold text-blue-800 mb-1">💬 Textos de Steps:</p>
                            {selectedFlow?.steps?.map((step, index) => {
                              if (step.type === 'text' && index < (editingStepIndex ?? selectedFlow.steps!.length)) {
                                return (
                                  <button
                                    key={`step-${index}-text`}
                                    type="button"
                                    onClick={() => {
                                      setTtsText(prev => prev + `@{step-${index + 1}-text}`);
                                      setShowStepsPopup(false);
                                    }}
                                    className="block w-full text-left px-2 py-1.5 text-xs bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors mb-1"
                                  >
                                    <span className="font-mono text-blue-700 font-medium">@{'{step-' + (index + 1) + '-text}'}</span>
                                    <span className="text-gray-500 ml-2">
                                      (Step {index + 1} - texto)
                                    </span>
                                  </button>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Voz: Alloy (neutra) | Modelo: TTS-1 (OpenAI)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTTSModal(false);
              setTtsText('');
              setShowVariablesPopup(false);
              setShowStepsPopup(false);
              setShowAITextGenerator(false);
              setAiTextPrompt('');
            }} disabled={isTTSGenerating || isGeneratingAIText}>
              Cancelar
            </Button>
            <Button onClick={generateTTS} disabled={isTTSGenerating || isGeneratingAIText || !ttsText.trim()}>
              {isTTSGenerating ? 'Gerando áudio...' : '🎵 Gerar Áudio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Modal */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova API Key</DialogTitle>
            <DialogDescription>
              Adicione uma chave de API para usar nos steps de IA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Nome Identificador</label>
              <Input
                value={newApiKey.nome}
                onChange={(e) => setNewApiKey({ ...newApiKey, nome: e.target.value })}
                placeholder="Ex: OpenAI Produção, Gemini Pessoal"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Provider</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewApiKey({ ...newApiKey, provider: 'openai' })}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 justify-center ${newApiKey.provider === 'openai'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <img src="/openai.svg" alt="OpenAI" className="h-5 w-5" />
                  <span className="text-sm font-medium">OpenAI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewApiKey({ ...newApiKey, provider: 'gemini' })}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 justify-center ${newApiKey.provider === 'gemini'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <img src="/google.svg" alt="Gemini" className="h-5 w-5" />
                  <span className="text-sm font-medium">Gemini</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">API Key</label>
              <Input
                type="password"
                value={newApiKey.apiKey}
                onChange={(e) => setNewApiKey({ ...newApiKey, apiKey: e.target.value })}
                placeholder={newApiKey.provider === 'openai' ? 'sk-...' : 'AIza...'}
                className="w-full font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {newApiKey.provider === 'openai'
                  ? 'Obtenha em: platform.openai.com/api-keys'
                  : 'Obtenha em: aistudio.google.com/app/apikey'
                }
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>🔒 Segurança:</strong> Sua API key será encriptada antes de ser salva no banco de dados.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowApiKeyModal(false);
              setNewApiKey({ nome: '', provider: 'openai', apiKey: '' });
            }}>
              Cancelar
            </Button>
            <Button onClick={saveApiKey} disabled={savingApiKey}>
              {savingApiKey ? 'Salvando...' : 'Salvar API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sucesso</DialogTitle>
            <DialogDescription>{dialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
            <DialogDescription>{dialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Flow Dialog */}
      <Dialog open={showDeleteFlowDialog} onOpenChange={setShowDeleteFlowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este fluxo? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteFlowDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteFlow}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step Dialog */}
      <Dialog open={showDeleteStepDialog} onOpenChange={setShowDeleteStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este step? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteStepDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteStep}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variables Popup */}
      <Dialog open={showVariablesPopup} onOpenChange={setShowVariablesPopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Variáveis Disponíveis</DialogTitle>
            <DialogDescription>
              Clique em uma variável para inseri-la no campo atual
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getAvailableVariables().length > 0 ? (
              getAvailableVariables().map((variable, index) => (
                <button
                  key={index}
                  onClick={() => currentInputField && insertVariable(variable.name, currentInputField)}
                  className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-purple-900">@&#123;{variable.name}&#125;</div>
                      <div className="text-xs text-purple-600">
                        Step {variable.stepIndex + 1} • Input
                      </div>
                    </div>
                    <span className="text-purple-400">→</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-sm">Nenhuma variável disponível</p>
                <p className="text-xs mt-1">
                  Adicione steps de Input com o campo &quot;Nome da Variável&quot; preenchido
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVariablesPopup(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Previous Steps Popup */}
      <Dialog open={showPreviousStepsPopup} onOpenChange={setShowPreviousStepsPopup}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Dados dos Steps Anteriores</DialogTitle>
            <DialogDescription>
              Clique em um step para inserir sua tag no prompt da IA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {selectedFlow?.steps && selectedFlow.steps.length > 0 ? (
              selectedFlow.steps.slice(0, editingStepIndex === null ? selectedFlow.steps.length : editingStepIndex).map((prevStep, idx) => {
                let stepTag = '';
                let stepIcon = null;
                let stepColor = '';
                let stepLabel = '';
                let stepPreview = '';

                switch (prevStep.type) {
                  case 'text':
                    stepTag = `{step-${idx + 1}-text}`;
                    stepColor = 'blue';
                    stepLabel = 'Mensagem de texto';
                    stepPreview = (prevStep as TextStep).content?.substring(0, 50) || '';
                    stepIcon = (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    );
                    break;

                  case 'button':
                    stepTag = `{step-${idx + 1}-button}`;
                    stepColor = 'purple';
                    stepLabel = 'Botão selecionado';
                    stepPreview = (prevStep as ButtonStep).buttons?.map(b => b.value).join(', ') || '';
                    stepIcon = (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    );
                    break;

                  case 'input':
                    const inputStep = prevStep as InputStep;
                    stepTag = inputStep.variable ? `{${inputStep.variable}}` : `{step-${idx + 1}-input}`;
                    stepColor = 'green';
                    stepLabel = 'Resposta do usuário';
                    stepPreview = inputStep.placeholder || '';
                    stepIcon = (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    );
                    break;

                  case 'options':
                    stepTag = `{step-${idx + 1}-option}`;
                    stepColor = 'orange';
                    stepLabel = 'Opção escolhida';
                    stepPreview = (prevStep as OptionsStep).options?.join(', ') || '';
                    stepIcon = (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    );
                    break;

                  case 'ai':
                    const aiStep = prevStep as AIStep;
                    stepTag = `{step-${idx + 1}-ai}`;
                    stepColor = 'pink';
                    stepLabel = 'Resposta da IA anterior';
                    stepPreview = `${aiStep.provider === 'openai' ? 'OpenAI' : 'Gemini'} - ${aiStep.outputType}`;
                    stepIcon = (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    );
                    break;

                  default:
                    return null;
                }

                const bgColorClass = {
                  blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
                  purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
                  green: 'bg-green-50 hover:bg-green-100 border-green-200',
                  orange: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
                  pink: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
                }[stepColor] || 'bg-gray-50 hover:bg-gray-100 border-gray-200';

                const iconBgClass = {
                  blue: 'bg-blue-100 text-blue-600',
                  purple: 'bg-purple-100 text-purple-600',
                  green: 'bg-green-100 text-green-600',
                  orange: 'bg-orange-100 text-orange-600',
                  pink: 'bg-pink-100 text-pink-600',
                }[stepColor] || 'bg-gray-100 text-gray-600';

                const codeBgClass = {
                  blue: 'bg-blue-100 text-blue-800',
                  purple: 'bg-purple-100 text-purple-800',
                  green: 'bg-green-100 text-green-800',
                  orange: 'bg-orange-100 text-orange-800',
                  pink: 'bg-pink-100 text-pink-800',
                }[stepColor] || 'bg-gray-100 text-gray-800';

                const arrowColorClass = {
                  blue: 'text-blue-400',
                  purple: 'text-purple-400',
                  green: 'text-green-400',
                  orange: 'text-orange-400',
                  pink: 'text-pink-400',
                }[stepColor] || 'text-gray-400';

                return (
                  <button
                    key={idx}
                    onClick={() => insertPreviousStepData(stepTag)}
                    className={`w-full p-4 text-left ${bgColorClass} rounded-lg border transition-all hover:shadow-md group`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 p-2 ${iconBgClass} rounded-lg group-hover:scale-110 transition-transform`}>
                        {stepIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <code className={`px-2 py-1 ${codeBgClass} rounded font-mono text-sm font-bold`}>
                            {stepTag}
                          </code>
                          <span className="text-xs text-gray-500">Step {idx + 1}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-700 mb-1">{stepLabel}</div>
                        <div className="text-xs text-gray-500 truncate">{stepPreview}</div>
                      </div>
                      <div className={`flex-shrink-0 ${arrowColorClass} group-hover:translate-x-1 transition-transform`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center p-12 text-gray-500">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-lg font-medium mb-2">Nenhum step anterior</p>
                <p className="text-sm">
                  Este é o primeiro step ou não há steps anteriores ainda.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviousStepsPopup(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
