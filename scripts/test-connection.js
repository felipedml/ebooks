#!/usr/bin/env node
const { config } = require('dotenv');
const { createClient } = require('@libsql/client');
const path = require('path');

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

console.log('🔍 Testando conexão com Turso...\n');
console.log(`📦 URL: ${url}`);
console.log(`🔑 Token: ${authToken ? authToken.substring(0, 30) + '...' : 'NÃO CONFIGURADO'}\n`);

async function testConnection() {
  try {
    const client = createClient({
      url,
      authToken
    });

    console.log('🔄 Tentando conectar...');
    
    const result = await client.execute('SELECT 1 as test');
    console.log('✅ Conexão bem-sucedida!');
    console.log('📊 Resultado do teste:', result.rows);

    // List tables
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    
    console.log('\n📋 Tabelas no banco:');
    if (tables.rows.length === 0) {
      console.log('   (nenhuma tabela encontrada - banco vazio)');
    } else {
      tables.rows.forEach(row => {
        console.log(`   - ${row.name}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Erro ao conectar:');
    console.error(`   Código: ${error.code}`);
    console.error(`   Mensagem: ${error.message}`);
    
    if (error.code === 'SERVER_ERROR' && error.message.includes('401')) {
      console.error('\n💡 Dica: Token inválido ou expirado.');
      console.error('   Execute: turso db tokens create <nome-do-banco>');
    }
    
    process.exit(1);
  }
}

testConnection();
