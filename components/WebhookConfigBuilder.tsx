'use client';

import { useState } from 'react';
import { Webhook, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WebhookBodyField {
  key: string;
  value: string;
  type: 'static' | 'variable';
  variableName?: string;
}

interface WebhookConfig {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  bodyFields?: WebhookBodyField[];
  includeSessionData?: boolean;
  includeAllVariables?: boolean;
}

interface Props {
  webhook?: WebhookConfig;
  onChange: (webhook: WebhookConfig) => void;
  availableVariables?: string[]; // Lista de variáveis disponíveis para seleção
}

export default function WebhookConfigBuilder({ webhook, onChange, availableVariables = [] }: Props) {
  const [isExpanded, setIsExpanded] = useState(!!webhook?.url);

  const updateWebhook = (updates: Partial<WebhookConfig>) => {
    onChange({ ...webhook, ...updates });
  };

  const addBodyField = () => {
    const bodyFields = webhook?.bodyFields || [];
    updateWebhook({
      bodyFields: [...bodyFields, { key: '', value: '', type: 'static' }]
    });
  };

  const updateBodyField = (index: number, updates: Partial<WebhookBodyField>) => {
    const bodyFields = [...(webhook?.bodyFields || [])];
    bodyFields[index] = { ...bodyFields[index], ...updates };
    updateWebhook({ bodyFields });
  };

  const removeBodyField = (index: number) => {
    const bodyFields = [...(webhook?.bodyFields || [])];
    bodyFields.splice(index, 1);
    updateWebhook({ bodyFields });
  };

  const addHeader = () => {
    const headers = webhook?.headers || {};
    const newKey = `Header${Object.keys(headers).length + 1}`;
    updateWebhook({
      headers: { ...headers, [newKey]: '' }
    });
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const headers = { ...(webhook?.headers || {}) };
    if (oldKey !== newKey) {
      delete headers[oldKey];
    }
    headers[newKey] = value;
    updateWebhook({ headers });
  };

  const removeHeader = (key: string) => {
    const headers = { ...(webhook?.headers || {}) };
    delete headers[key];
    updateWebhook({ headers });
  };

  if (!isExpanded && !webhook?.url) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Webhook className="w-4 h-4" />
          + Adicionar Webhook (opcional)
        </button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5" />
          <h3 className="font-semibold">Configuração de Webhook</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* URL */}
          <div>
            <label className="block text-sm font-medium mb-1">URL do Webhook *</label>
            <Input
              value={webhook?.url || ''}
              onChange={(e) => updateWebhook({ url: e.target.value })}
              placeholder="https://exemplo.com/webhook"
              className="w-full"
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-medium mb-1">Método HTTP</label>
            <select
              value={webhook?.method || 'POST'}
              onChange={(e) => updateWebhook({ method: e.target.value as WebhookConfig['method'] })}
              className="w-full p-2 border rounded"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Options */}
          <div className="space-y-2 bg-gray-50 p-3 rounded">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={webhook?.includeSessionData !== false}
                onChange={(e) => updateWebhook({ includeSessionData: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Incluir dados da sessão (sessionId, flowId, timestamp)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={webhook?.includeAllVariables || false}
                onChange={(e) => updateWebhook({ includeAllVariables: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Incluir todas as variáveis coletadas</span>
            </label>
          </div>

          {/* Body Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Campos do Body</label>
              <Button
                type="button"
                onClick={addBodyField}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar Campo
              </Button>
            </div>

            {webhook?.bodyFields && webhook.bodyFields.length > 0 && (
              <div className="space-y-2">
                {webhook.bodyFields.map((field, index) => (
                  <div key={index} className="flex gap-2 items-start bg-white p-2 rounded border">
                    <Input
                      value={field.key}
                      onChange={(e) => updateBodyField(index, { key: e.target.value })}
                      placeholder="chave"
                      className="flex-1"
                    />
                    
                    <select
                      value={field.type}
                      onChange={(e) => updateBodyField(index, { 
                        type: e.target.value as 'static' | 'variable',
                        variableName: e.target.value === 'variable' ? availableVariables[0] || '' : undefined
                      })}
                      className="p-2 border rounded"
                    >
                      <option value="static">Valor Fixo</option>
                      <option value="variable">Variável</option>
                    </select>

                    {field.type === 'static' ? (
                      <Input
                        value={field.value}
                        onChange={(e) => updateBodyField(index, { value: e.target.value })}
                        placeholder="valor estático"
                        className="flex-1"
                      />
                    ) : (
                      <div className="flex-1 space-y-1">
                        <select
                          value={field.variableName || ''}
                          onChange={(e) => {
                            const varName = e.target.value;
                            updateBodyField(index, { 
                              variableName: varName, 
                              value: varName ? `{{${varName}}}` : '' 
                            });
                          }}
                          className="w-full p-2 border rounded bg-white"
                        >
                          <option value="">📋 Selecione uma variável</option>
                          {availableVariables.map(varName => (
                            <option key={varName} value={varName}>
                              {varName}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={field.value || (field.variableName ? `{{${field.variableName}}}` : '')}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            // Extrai o nome da variável se estiver no formato {{var}}
                            const match = newValue.match(/^\{\{([^}]+)\}\}$/);
                            if (match) {
                              updateBodyField(index, { 
                                variableName: match[1],
                                value: newValue 
                              });
                            } else {
                              updateBodyField(index, { value: newValue });
                            }
                          }}
                          placeholder="{{nome-da-variavel}}"
                          className="w-full text-sm font-mono bg-blue-50 border-blue-300"
                          readOnly={false}
                        />
                      </div>
                    )}

                    <button
                      onClick={() => removeBodyField(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(!webhook?.bodyFields || webhook.bodyFields.length === 0) && (
              <p className="text-sm text-gray-500 italic">
                Nenhum campo personalizado. Use as opções acima para incluir dados automaticamente.
              </p>
            )}
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Headers Customizados</label>
              <Button
                type="button"
                onClick={addHeader}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar Header
              </Button>
            </div>

            {webhook?.headers && Object.keys(webhook.headers).length > 0 && (
              <div className="space-y-2">
                {Object.entries(webhook.headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <Input
                      value={key}
                      onChange={(e) => updateHeader(key, e.target.value, value)}
                      placeholder="Header Key"
                      className="flex-1"
                    />
                    <Input
                      value={value}
                      onChange={(e) => updateHeader(key, key, e.target.value)}
                      placeholder="Header Value"
                      className="flex-1"
                    />
                    <button
                      onClick={() => removeHeader(key)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Example Preview */}
          {webhook?.url && (
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono">
              <div className="text-green-400 mb-1">
                {webhook.method || 'POST'} {webhook.url}
              </div>
              {webhook.headers && Object.keys(webhook.headers).length > 0 && (
                <div className="text-blue-400 mb-2">
                  Headers: {JSON.stringify(webhook.headers, null, 2)}
                </div>
              )}
              <div className="text-yellow-400">
                Body (exemplo):
              </div>
              <pre className="mt-1 text-gray-300">
                {JSON.stringify({
                  ...(webhook.includeSessionData !== false && {
                    sessionId: 'session-123',
                    flowId: 1,
                    timestamp: new Date().toISOString()
                  }),
                  ...(webhook.bodyFields?.reduce((acc, field) => {
                    acc[field.key] = field.type === 'static' ? field.value : `{{${field.variableName}}}`;
                    return acc;
                  }, {} as Record<string, string>) || {}),
                  ...(webhook.includeAllVariables && {
                    variables: { exemplo: 'valor' }
                  })
                }, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
