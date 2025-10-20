-- Adicionar colunas step_index e step_type na tabela respostas_fluxo

ALTER TABLE respostas_fluxo ADD COLUMN step_index INTEGER;
-->statement-breakpoint
ALTER TABLE respostas_fluxo ADD COLUMN step_type TEXT;
