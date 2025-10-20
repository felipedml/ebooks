-- Remove coluna master da tabela fluxos (não usada mais, cada fluxo tem seu próprio link)
-- SQLite não suporta DROP COLUMN diretamente, então precisamos recriar a tabela

-- 1. Criar tabela temporária sem a coluna master
CREATE TABLE fluxos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Copiar dados da tabela antiga (sem a coluna master)
INSERT INTO fluxos_new (id, nome, descricao, ativo, created_at, updated_at)
SELECT id, nome, descricao, ativo, created_at, updated_at FROM fluxos;

-- 3. Deletar tabela antiga
DROP TABLE fluxos;

-- 4. Renomear tabela nova
ALTER TABLE fluxos_new RENAME TO fluxos;
