import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const livros = sqliteTable('livros', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  titulo: text('titulo').notNull(),
  subtitulo: text('subtitulo'),
  resumo: text('resumo').notNull(),
  idioma: text('idioma').notNull().default('PORTUGUÊS DO BRASIL'),
  autor: text('autor').notNull(),
  email: text('email').notNull(),
  whatsapp: text('whatsapp'),
  status: text('status').notNull().default('pendente'), // pendente, pago, gerando, concluído
  valor: real('valor').notNull().default(49.90),
  conteudo: text('conteudo'), // Conteúdo do livro gerado
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const perguntas = sqliteTable('perguntas', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  livroId: integer('livro_id').notNull().references(() => livros.id),
  pergunta: text('pergunta').notNull(),
  resposta: text('resposta').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const pagamentos = sqliteTable('pagamentos', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  livroId: integer('livro_id').notNull().references(() => livros.id),
  valor: real('valor').notNull(),
  status: text('status').notNull().default('pendente'), // pendente, pago, cancelado
  plataforma: text('plataforma'), // stripe, paypal, pix, etc
  transacaoId: text('transacao_id'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Tabela para configuração de fluxos
export const fluxos = sqliteTable('fluxos', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const steps = sqliteTable('steps', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  fluxoId: integer('fluxo_id').notNull().references(() => fluxos.id, { onDelete: 'cascade' }),
  ordem: integer('ordem').notNull().default(0),
  tipo: text('tipo').notNull(), // 'texto', 'botoes', 'imagem', 'video', 'input', 'condicional'
  conteudo: text('conteudo', { mode: 'json' }),
  proximoStep: integer('proximo_step'), // ID do próximo step (opcional)
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Tabela para API Keys encriptadas
export const apiKeys = sqliteTable('api_keys', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(), // Nome descritivo da key
  provider: text('provider').notNull(), // 'openai' ou 'gemini'
  keyEncriptada: text('key_encriptada').notNull(), // API key encriptada
  ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Tabela para rastrear sessões de usuários
export const sessoes = sqliteTable('sessoes', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().unique(), // UUID único da sessão
  fluxoId: integer('fluxo_id').notNull().references(() => fluxos.id, { onDelete: 'cascade' }),
  userId: text('user_id'), // ID externo do usuário (opcional, pode vir da URL)
  status: text('status').notNull().default('em_andamento'), // em_andamento, completo, abandonado
  currentStepIndex: integer('current_step_index').default(0), // Índice do step atual
  contactData: text('contact_data'), // JSON com dados de contato coletados
  metadata: text('metadata'), // JSON com dados extras (utm_source, device, etc)
  startedAt: text('started_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
  lastInteractionAt: text('last_interaction_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Tabela para respostas dos usuários no fluxo (interações)
export const respostasFluxo = sqliteTable('respostas_fluxo', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  fluxoId: integer('fluxo_id').notNull().references(() => fluxos.id, { onDelete: 'cascade' }), // ID do fluxo
  // Passo do fluxo associado à resposta (obrigatório no schema original)
  stepId: integer('step_id').notNull().references(() => steps.id, { onDelete: 'cascade' }),
  sessaoId: integer('sessao_id').references(() => sessoes.id, { onDelete: 'cascade' }), // Sessão (opcional por compatibilidade)
  stepIndex: integer('step_index'), // Índice do step no fluxo
  stepType: text('step_type'), // text, button, input, options
  resposta: text('resposta').notNull(), // JSON com os dados da resposta
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Tabela normalizada de contatos por sessão
export const sessoesContatos = sqliteTable('sessoes_contatos', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  sessaoId: integer('sessao_id').notNull().references(() => sessoes.id, { onDelete: 'cascade' }),
  contactKey: text('key').notNull(),
  value: text('value').notNull(),
  valueNormalized: text('value_normalized').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Livro = typeof livros.$inferSelect;
export type NovoLivro = typeof livros.$inferInsert;

export type Pergunta = typeof perguntas.$inferSelect;
export type NovaPergunta = typeof perguntas.$inferInsert;

export type Pagamento = typeof pagamentos.$inferSelect;
export type NovoPagamento = typeof pagamentos.$inferInsert;

export type Fluxo = typeof fluxos.$inferSelect;
export type NovoFluxo = typeof fluxos.$inferInsert;

export type Step = typeof steps.$inferSelect;
export type NovoStep = typeof steps.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NovaApiKey = typeof apiKeys.$inferInsert;

// Tabela para configurações visuais da página inicial
export const configuracaoVisual = sqliteTable('configuracao_visual', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  corBackground: text('cor_background').notNull().default('#f3f4f6'), // gray-100
  corBalaoBot: text('cor_balao_bot').notNull().default('#ffffff'), // white
  corBalaoUser: text('cor_balao_user').notNull().default('#10b981'), // emerald-600
  corTextoBot: text('cor_texto_bot').notNull().default('#374151'), // gray-700
  corTextoUser: text('cor_texto_user').notNull().default('#ffffff'), // white
  imagemLogo: text('imagem_logo'), // Base64 da imagem
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Sessao = typeof sessoes.$inferSelect;
export type NovaSessao = typeof sessoes.$inferInsert;

export type RespostaFluxo = typeof respostasFluxo.$inferSelect;
export type NovaRespostaFluxo = typeof respostasFluxo.$inferInsert;

export type ConfiguracaoVisual = typeof configuracaoVisual.$inferSelect;
export type NovaConfiguracaoVisual = typeof configuracaoVisual.$inferInsert;

// Tabela para tokens OAuth do Canva (criptografados)
export const canvaTokens = sqliteTable('canva_tokens', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().default('admin'), // Para multi-usuário futuro
  accessToken: text('access_token').notNull(), // Criptografado
  refreshToken: text('refresh_token'), // Criptografado (opcional)
  expiresAt: integer('expires_at'), // Timestamp de expiração
  scope: text('scope'), // Escopos autorizados
  tokenType: text('token_type').default('Bearer'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type CanvaToken = typeof canvaTokens.$inferSelect;
export type NovoCanvaToken = typeof canvaTokens.$inferInsert;
