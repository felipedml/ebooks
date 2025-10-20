-- Tabela normalizada para contatos vinculados à sessão
CREATE TABLE IF NOT EXISTS sessoes_contatos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  sessao_id INTEGER NOT NULL REFERENCES sessoes(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_normalized TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (sessao_id, key)
);
-->statement-breakpoint
-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_sessoes_contatos_key_value_norm ON sessoes_contatos(key, value_normalized);
-->statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sessoes_contatos_sessao ON sessoes_contatos(sessao_id);
