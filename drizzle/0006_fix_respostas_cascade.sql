-- Adicionar CASCADE DELETE na foreign key de respostas_fluxo.step_id
-- SQLite não suporta ALTER COLUMN diretamente, então precisamos recriar a tabela

PRAGMA foreign_keys=OFF;

-- Criar tabela temporária com a estrutura correta
CREATE TABLE respostas_fluxo_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fluxo_id INTEGER NOT NULL REFERENCES fluxos(id),
  step_id INTEGER NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  sessao_id TEXT NOT NULL,
  resposta TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  step_type TEXT,
  step_index INTEGER
);

-- Copiar dados da tabela antiga (mapeando as colunas na ordem correta)
INSERT INTO respostas_fluxo_new (id, fluxo_id, step_id, sessao_id, resposta, created_at, step_type, step_index)
SELECT id, fluxo_id, step_id, sessao_id, resposta, created_at, step_type, step_index FROM respostas_fluxo;

-- Remover tabela antiga
DROP TABLE respostas_fluxo;

-- Renomear tabela nova
ALTER TABLE respostas_fluxo_new RENAME TO respostas_fluxo;

PRAGMA foreign_keys=ON;
