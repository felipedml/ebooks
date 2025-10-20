require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

async function applyMigration() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    console.log('🚀 Aplicando CASCADE DELETE em todas as FKs...\n');

    // 1. Fix sessoes table
    console.log('📝 Step 1: Corrigindo tabela sessoes...');
    await client.execute('PRAGMA foreign_keys=OFF');
    
    await client.execute(`
      CREATE TABLE sessoes_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL UNIQUE,
        fluxo_id INTEGER NOT NULL REFERENCES fluxos(id) ON DELETE CASCADE,
        user_id TEXT,
        status TEXT NOT NULL DEFAULT 'em_andamento',
        current_step_index INTEGER DEFAULT 0,
        contact_data TEXT,
        metadata TEXT,
        started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        last_interaction_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.execute(`
      INSERT INTO sessoes_new SELECT * FROM sessoes
    `);
    
    await client.execute('DROP TABLE sessoes');
    await client.execute('ALTER TABLE sessoes_new RENAME TO sessoes');
    console.log('✅ Sessoes OK\n');

    // 2. Fix respostas_fluxo table (adicionar CASCADE no fluxo_id também)
    console.log('📝 Step 2: Corrigindo respostas_fluxo (fluxo_id CASCADE)...');
    
    await client.execute(`
      CREATE TABLE respostas_fluxo_new2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fluxo_id INTEGER NOT NULL REFERENCES fluxos(id) ON DELETE CASCADE,
        step_id INTEGER NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
        sessao_id TEXT NOT NULL,
        resposta TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        step_type TEXT,
        step_index INTEGER
      )
    `);
    
    await client.execute(`
      INSERT INTO respostas_fluxo_new2 (id, fluxo_id, step_id, sessao_id, resposta, created_at, step_type, step_index)
      SELECT id, fluxo_id, step_id, sessao_id, resposta, created_at, step_type, step_index FROM respostas_fluxo
    `);
    
    await client.execute('DROP TABLE respostas_fluxo');
    await client.execute('ALTER TABLE respostas_fluxo_new2 RENAME TO respostas_fluxo');
    console.log('✅ Respostas_fluxo OK\n');

    await client.execute('PRAGMA foreign_keys=ON');

    console.log('✅ Todas as migrações aplicadas com sucesso!');
    console.log('🔄 Agora você pode:');
    console.log('   - Deletar fluxos (deleta sessões e respostas)');
    console.log('   - Deletar steps (deleta respostas)');
    console.log('   - Deletar sessões (deleta contatos)\n');

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    console.error('Detalhes:', error.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

applyMigration();
