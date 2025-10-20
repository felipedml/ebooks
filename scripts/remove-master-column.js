#!/usr/bin/env node
const { config } = require('dotenv');
const { createClient } = require('@libsql/client');
const path = require('path');

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

console.log('🚀 Removendo coluna master da tabela fluxos...\n');
console.log(`📦 URL: ${url}`);
console.log(`🔑 Token: ${authToken ? '✓ Configurado' : '✗ Não configurado'}\n`);

if (!url || !authToken) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function removeMasterColumn() {
  try {
    console.log('📋 Verificando estrutura atual da tabela fluxos...');
    
    // Verificar se a coluna master existe
    const tableInfo = await client.execute(`PRAGMA table_info(fluxos)`);
    const hasMaster = tableInfo.rows.some(row => row.name === 'master');
    
    if (!hasMaster) {
      console.log('✅ Coluna master já foi removida!');
      return;
    }
    
    console.log('🔧 Coluna master encontrada, removendo...\n');
    
    // Desabilitar foreign keys temporariamente
    console.log('🔐 Desabilitando foreign keys...');
    await client.execute('PRAGMA foreign_keys = OFF');
    console.log('   ✅ Foreign keys desabilitadas\n');
    
    // Limpar qualquer tabela temporária residual
    console.log('🧹 Limpando resíduos de tentativas anteriores...');
    try {
      await client.execute('DROP TABLE IF EXISTS fluxos_new');
      console.log('   ✅ Limpeza concluída\n');
    } catch (e) {
      console.log('   ℹ️  Nada para limpar\n');
    }
    
    // Executar a migração passo a passo
    console.log('1️⃣ Criando tabela temporária sem a coluna master...');
    await client.execute(`
      CREATE TABLE fluxos_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        ativo INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log('   ✅ Tabela temporária criada\n');
    
    console.log('2️⃣ Copiando dados (sem a coluna master)...');
    await client.execute(`
      INSERT INTO fluxos_new (id, nome, descricao, ativo, created_at, updated_at)
      SELECT id, nome, descricao, ativo, created_at, updated_at FROM fluxos
    `);
    console.log('   ✅ Dados copiados\n');
    
    console.log('3️⃣ Removendo tabela antiga...');
    await client.execute('DROP TABLE fluxos');
    console.log('   ✅ Tabela antiga removida\n');
    
    console.log('4️⃣ Renomeando tabela nova...');
    await client.execute('ALTER TABLE fluxos_new RENAME TO fluxos');
    console.log('   ✅ Tabela renomeada\n');
    
    console.log('🔐 Reabilitando foreign keys...');
    await client.execute('PRAGMA foreign_keys = ON');
    console.log('   ✅ Foreign keys reabilitadas\n');
    
    // Verificar resultado
    console.log('🔍 Verificando estrutura final...');
    const newTableInfo = await client.execute(`PRAGMA table_info(fluxos)`);
    console.log('\n📋 Colunas na tabela fluxos:');
    newTableInfo.rows.forEach(row => {
      console.log(`   ✓ ${row.name} (${row.type})`);
    });
    
    const stillHasMaster = newTableInfo.rows.some(row => row.name === 'master');
    
    if (stillHasMaster) {
      console.log('\n❌ ERRO: Coluna master ainda existe!');
      process.exit(1);
    }
    
    console.log('\n✅ Sucesso! Coluna master foi removida com sucesso!');
    console.log('✅ Sistema agora usa links únicos: /flow/[id]');
    
  } catch (error) {
    console.error('\n❌ Erro ao remover coluna master:');
    console.error(error.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

removeMasterColumn();
