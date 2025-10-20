require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    console.log('🚀 Aplicando migração CASCADE DELETE...\n');

    console.log('📝 Step 1: Desabilitando foreign keys...');
    await client.execute('PRAGMA foreign_keys=OFF');
    console.log('✅ OK\n');

    console.log('📝 Step 2: Criando tabela temporária...');
    await client.execute(`
      CREATE TABLE respostas_fluxo_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fluxo_id INTEGER NOT NULL REFERENCES fluxos(id),
        step_id INTEGER NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
        sessao_id TEXT NOT NULL,
        resposta TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        step_type TEXT,
        step_index INTEGER
      )
    `);
    console.log('✅ OK\n');

    console.log('📝 Step 3: Copiando dados...');
    await client.execute(`
      INSERT INTO respostas_fluxo_new (id, fluxo_id, step_id, sessao_id, resposta, created_at, step_type, step_index)
      SELECT id, fluxo_id, step_id, sessao_id, resposta, created_at, step_type, step_index FROM respostas_fluxo
    `);
    console.log('✅ OK\n');

    console.log('📝 Step 4: Removendo tabela antiga...');
    await client.execute('DROP TABLE respostas_fluxo');
    console.log('✅ OK\n');

    console.log('📝 Step 5: Renomeando tabela nova...');
    await client.execute('ALTER TABLE respostas_fluxo_new RENAME TO respostas_fluxo');
    console.log('✅ OK\n');

    console.log('📝 Step 6: Reabilitando foreign keys...');
    await client.execute('PRAGMA foreign_keys=ON');
    console.log('✅ OK\n');

    console.log('✅ Migração aplicada com sucesso!');
    console.log('🔄 Agora você pode deletar steps sem erro de FOREIGN KEY.\n');

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    console.error('Detalhes:', error.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

applyMigration();
