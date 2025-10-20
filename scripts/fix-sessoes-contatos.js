require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

(async () => {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error('❌ TURSO_DATABASE_URL/TURSO_AUTH_TOKEN não configurados');
    process.exit(1);
  }
  const db = createClient({ url, authToken });
  try {
    console.log('🔧 Criando tabela `sessoes_contatos` se não existir...');
    await db.execute(
      `CREATE TABLE IF NOT EXISTS sessoes_contatos (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        sessao_id INTEGER NOT NULL REFERENCES sessoes(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        value_normalized TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (sessao_id, key)
      );`
    );

    console.log('🔧 Criando índices...');
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_sessoes_contatos_key_value_norm
       ON sessoes_contatos(key, value_normalized);`
    );
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_sessoes_contatos_sessao
       ON sessoes_contatos(sessao_id);`
    );

    console.log('✅ Tabela e índices prontos!');
  } catch (e) {
    console.error('❌ Erro ao criar tabela/índices:', e);
    process.exit(1);
  } finally {
    db.close();
  }
})();
