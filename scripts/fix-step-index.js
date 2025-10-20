require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

async function fixStepIndex() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('❌ Variáveis de ambiente não configuradas');
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  try {
    console.log('🔧 Adicionando coluna step_index...');
    
    // Tentar adicionar a coluna
    await client.execute('ALTER TABLE respostas_fluxo ADD COLUMN step_index INTEGER');
    
    console.log('✅ Coluna step_index adicionada com sucesso!');
  } catch (error) {
    if (error.message?.includes('duplicate column name')) {
      console.log('ℹ️  Coluna step_index já existe');
    } else {
      console.error('❌ Erro:', error.message);
    }
  } finally {
    client.close();
  }
}

fixStepIndex();
