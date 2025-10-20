#!/usr/bin/env node
const { config } = require('dotenv');
const { execSync } = require('child_process');
const path = require('path');

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

console.log('🔐 Carregando variáveis de ambiente...');
console.log(`📦 Database URL: ${url || 'local'}`);
console.log(`🔑 Auth Token: ${authToken ? `✓ Configurado (${authToken.substring(0, 20)}...)` : '✗ Não configurado'}`);

if (!url) {
  console.error('❌ Erro: DATABASE_URL ou TURSO_DATABASE_URL não configurado!');
  process.exit(1);
}

if (!authToken) {
  console.error('❌ Erro: DATABASE_AUTH_TOKEN ou TURSO_AUTH_TOKEN não configurado!');
  process.exit(1);
}

// Run drizzle-kit push with command-line parameters
console.log('\n🚀 Executando migrações...\n');

try {
  const schemaPath = path.resolve(__dirname, '../lib/db/schema.ts');
  const command = `npx drizzle-kit push --dialect=sqlite --schema="${schemaPath}" --url="${url}" --auth-token="${authToken}" --force`;
  
  console.log(`📝 Schema: ${schemaPath}\n`);
  
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env
    }
  });
  console.log('\n✅ Migrações concluídas com sucesso!');
} catch (error) {
  console.error('\n❌ Erro ao executar migrações');
  if (!error.message.includes('Command failed')) {
    console.error(`   Detalhes: ${error.message}`);
  }
  process.exit(1);
}
