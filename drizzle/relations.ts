import { relations } from "drizzle-orm/relations";
import { fluxos, steps, livros, pagamentos, perguntas, newRespostasFluxo, sessoes, respostasFluxo } from "./schema";

export const stepsRelations = relations(steps, ({one, many}) => ({
	fluxo: one(fluxos, {
		fields: [steps.fluxoId],
		references: [fluxos.id]
	}),
	newRespostasFluxos: many(newRespostasFluxo),
	respostasFluxos: many(respostasFluxo),
}));

export const fluxosRelations = relations(fluxos, ({many}) => ({
	steps: many(steps),
	newRespostasFluxos: many(newRespostasFluxo),
	respostasFluxos: many(respostasFluxo),
}));

export const pagamentosRelations = relations(pagamentos, ({one}) => ({
	livro: one(livros, {
		fields: [pagamentos.livroId],
		references: [livros.id]
	}),
}));

export const livrosRelations = relations(livros, ({many}) => ({
	pagamentos: many(pagamentos),
	perguntas: many(perguntas),
}));

export const perguntasRelations = relations(perguntas, ({one}) => ({
	livro: one(livros, {
		fields: [perguntas.livroId],
		references: [livros.id]
	}),
}));

export const newRespostasFluxoRelations = relations(newRespostasFluxo, ({one}) => ({
	step: one(steps, {
		fields: [newRespostasFluxo.stepId],
		references: [steps.id]
	}),
	fluxo: one(fluxos, {
		fields: [newRespostasFluxo.fluxoId],
		references: [fluxos.id]
	}),
}));

export const respostasFluxoRelations = relations(respostasFluxo, ({one}) => ({
	sessoe: one(sessoes, {
		fields: [respostasFluxo.sessaoId],
		references: [sessoes.id]
	}),
	step: one(steps, {
		fields: [respostasFluxo.stepId],
		references: [steps.id]
	}),
	fluxo: one(fluxos, {
		fields: [respostasFluxo.fluxoId],
		references: [fluxos.id]
	}),
}));

export const sessoesRelations = relations(sessoes, ({many}) => ({
	respostasFluxos: many(respostasFluxo),
}));