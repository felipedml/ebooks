/**
 * Webhook Types
 * Tipos para configuração avançada de webhooks
 */

export interface WebhookBodyField {
  key: string;
  value: string;
  type: 'static' | 'variable';
  variableName?: string; // Se type === 'variable', qual variável usar
}

export interface WebhookConfig {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  bodyFields?: WebhookBodyField[]; // Campos customizados do body
  includeSessionData?: boolean; // Incluir sessionId, flowId, timestamp automaticamente
  includeAllVariables?: boolean; // Incluir todas as variáveis coletadas
}
