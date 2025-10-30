import { sqliteTable, AnySQLiteColumn, foreignKey, integer, text, real } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const steps = sqliteTable("steps", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	fluxoId: integer("fluxo_id").notNull().references(() => fluxos.id, { onDelete: "cascade" } ),
	ordem: integer().default(0).notNull(),
	tipo: text().notNull(),
	conteudo: text().notNull(),
	condicoes: text(),
	proximoStep: integer("proximo_step"),
	ativo: integer().default(true).notNull(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
});

export const livros = sqliteTable("livros", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	nome: text().notNull(),
	titulo: text().notNull(),
	subtitulo: text(),
	resumo: text().notNull(),
	idioma: text().default("PORTUGUÊS DO BRASIL").notNull(),
	autor: text().notNull(),
	email: text().notNull(),
	whatsapp: text(),
	status: text().default("pendente").notNull(),
	valor: real().default(49.9).notNull(),
	conteudo: text(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
});

export const pagamentos = sqliteTable("pagamentos", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	livroId: integer("livro_id").notNull().references(() => livros.id),
	valor: real().notNull(),
	status: text().default("pendente").notNull(),
	plataforma: text(),
	transacaoId: text("transacao_id"),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
});

export const perguntas = sqliteTable("perguntas", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	livroId: integer("livro_id").notNull().references(() => livros.id),
	pergunta: text().notNull(),
	resposta: text().notNull(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
});

export const configuracaoVisual = sqliteTable("configuracao_visual", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	corBackground: text("cor_background").default("#f3f4f6").notNull(),
	corBalaoBot: text("cor_balao_bot").default("#ffffff").notNull(),
	corBalaoUser: text("cor_balao_user").default("#10b981").notNull(),
	corTextoBot: text("cor_texto_bot").default("#374151").notNull(),
	corTextoUser: text("cor_texto_user").default("#ffffff").notNull(),
	imagemLogo: text("imagem_logo"),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
});

export const fluxos = sqliteTable("fluxos", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	nome: text().notNull(),
	descricao: text(),
	ativo: integer().default(true).notNull(),
	master: integer().default(false),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
	updatedAt: text("updated_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
});

export const newRespostasFluxo = sqliteTable("__new_respostas_fluxo", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	fluxoId: integer("fluxo_id").notNull().references(() => fluxos.id),
	stepId: integer("step_id").notNull().references(() => steps.id),
	sessaoId: text("sessao_id").notNull(),
	resposta: text().notNull(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
});

export const respostasFluxo = sqliteTable("respostas_fluxo", {
	id: integer().primaryKey({ autoIncrement: true }),
	fluxoId: integer("fluxo_id").notNull().references(() => fluxos.id),
	stepId: integer("step_id").notNull().references(() => steps.id, { onDelete: "cascade" } ),
	sessaoId: integer("sessao_id").references(() => sessoes.id, { onDelete: "cascade" } ),
	stepIndex: integer("step_index"),
	stepType: text("step_type"),
	resposta: text().notNull(),
	createdAt: text("created_at").default("sql`(CURRENT_TIMESTAMP)`").notNull(),
});

