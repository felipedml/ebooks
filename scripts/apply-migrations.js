#!/usr/bin/env node
const { config } = require('dotenv');
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

console.log('🚀 Aplicando migrações no Turso...\n');
console.log(`📦 URL: ${url}`);
console.log(`🔑 Token: ${authToken ? '✓ Configurado' : '✗ NÃO CONFIGURADO'}\n`);

async function applyMigrations() {
  if (!url || !authToken) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas!');
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  try {
    // Read migration files in order
    const migrationsDir = path.resolve(__dirname, '../drizzle');
    const migrations = [
      '0000_dashing_zaran.sql',
      '0001_sleepy_the_phantom.sql',
      '0002_add_configuracao_visual.sql',
      '0003_add_sessoes_tracking.sql',
      '0004_add_step_columns.sql',
      '0005_add_sessoes_contatos.sql',
      '0006_add_canva_tokens.sql',
      '0007_add_api_keys.sql'
    ];

    for (const migrationFile of migrations) {
      const filePath = path.join(migrationsDir, migrationFile);
      console.log(`📄 Aplicando: ${migrationFile}...`);

      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split by statement-breakpoint and semicolon
      const statements = sql
        .split(/-->.*statement-breakpoint|;/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .filter(s => !s.startsWith('--')); // Remove comments

      for (const statement of statements) {
        if (!statement) continue;
        
        try {
          // Log statement being executed (first 100 chars)
          const preview = statement.substring(0, 100).replace(/\s+/g, ' ');
          console.log(`   🔧 Executando: ${preview}...`);
          await client.execute(statement);
          console.log(`   ✅ OK`);
        } catch (error) {
          // Ignore "table already exists" errors
          if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
            console.log(`   ⚠️  Já existe, pulando...`);
          } else {
            console.error(`   ❌ Erro no statement: ${statement.substring(0, 150)}`);
            throw error;
          }
        }
      }

      console.log(`   ✅ Concluído\n`);
    }

    // Verify tables created
    console.log('🔍 Verificando tabelas criadas...\n');
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );

    if (tables.rows.length > 0) {
      console.log('📋 Tabelas no banco:');
      tables.rows.forEach(row => {
        console.log(`   ✓ ${row.name}`);
      });
    }

    // Add master field to fluxos if not exists
    console.log('\n🔧 Verificando campo master...');
    try {
      await client.execute('ALTER TABLE fluxos ADD COLUMN master integer DEFAULT false');
      console.log('   ✅ Campo master adicionado');
    } catch (error) {
      if (error.message && error.message.includes('duplicate column')) {
        console.log('   ✓ Campo master já existe');
      } else {
        console.log('   ⚠️  ', error.message);
      }
    }

    // Add contact_data field to sessoes if not exists
    console.log('\n🔧 Verificando campo contact_data na tabela sessoes...');
    try {
      await client.execute('ALTER TABLE sessoes ADD COLUMN contact_data text');
      console.log('   ✅ Campo contact_data adicionado');
    } catch (error) {
      if (error.message && error.message.includes('duplicate column')) {
        console.log('   ✓ Campo contact_data já existe');
      } else if (error.message && error.message.includes('no such table')) {
        console.log('   ⚠️  Tabela sessoes ainda não existe (será criada pela migração)');
      } else {
        console.log('   ⚠️  ', error.message);
      }
    }

    console.log('\n✅ Todas as migrações foram aplicadas com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migrações:');
    console.error(`   ${error.message}`);
    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }
    process.exit(1);
  }
}

applyMigrations();
