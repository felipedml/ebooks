# Correções para Erros 500 em Produção

## 🔧 Correções Aplicadas

Foram adicionados **CORS headers** nas seguintes APIs críticas:

### ✅ APIs Corrigidas:
1. **`/api/fluxos`** - CRUD de fluxos
2. **`/api/configuracao-visual`** - Configuração de cores e logo
3. **`/api/steps`** - Gerenciamento de steps (GET, POST, PUT, DELETE)
4. **`/api/sessoes`** - Criação e gestão de sessões
5. **`/api/process-ai-step`** - Processamento de IA (OpenAI/Gemini)
6. **`/api/process-canva-ai-step`** - Seleção de designs Canva com IA
7. **`/api/health`** - Health check do banco de dados

### 🔨 Padrão Aplicado:
Todas as APIs agora seguem este padrão:

```typescript
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

// Handler de OPTIONS para preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    // ... sua lógica
    
    return corsResponse(
      { success: true, data: resultado },
      { origin }
    );
  } catch (error) {
    return corsResponse(
      { success: false, error: 'Mensagem de erro' },
      { status: 500, origin }
    );
  }
}
```

## ⚠️ Problema Identificado

Os erros **500** que você está vendo NÃO são apenas de CORS. São problemas de **banco de dados**.

### Evidências:
- ✅ Headers CORS chegam corretamente: `access-control-allow-credentials: true`
- ❌ Resposta com status 500 indica erro no servidor
- ⚠️ Provável causa: **Database não configurado em produção**

## 🚨 AÇÃO NECESSÁRIA: Configurar Banco de Dados

### 1. Verificar Variáveis de Ambiente no Vercel/Hosting

Acesse o painel do seu hosting e verifique se existem:

```bash
# OBRIGATÓRIAS para produção:
DATABASE_URL=libsql://[sua-db].turso.io
DATABASE_AUTH_TOKEN=eyJhb...

# CORS (opcional, mas recomendado):
ALLOWED_ORIGINS=https://pembrokecollins.com.br,https://www.pembrokecollins.com.br

# Auth (se usar sistema de login):
AUTH_SECRET=seu-secret-aqui
```

### 2. Criar Banco Turso (se não criou ainda)

```bash
# Instalar Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Criar database
turso db create geracao-livros

# Pegar URL do banco
turso db show geracao-livros --url

# Criar token de autenticação
turso db tokens create geracao-livros
```

### 3. Aplicar Migrations no Turso

Depois de ter `DATABASE_URL` e `DATABASE_AUTH_TOKEN` configurados:

```bash
# Local (para testar)
pnpm db:migrate:turso

# Ou manualmente:
turso db shell geracao-livros < drizzle/0000_dashing_zaran.sql
turso db shell geracao-livros < drizzle/0001_sleepy_the_phantom.sql
turso db shell geracao-livros < drizzle/0002_add_configuracao_visual.sql
turso db shell geracao-livros < drizzle/0003_add_sessoes_tracking.sql
turso db shell geracao-livros < drizzle/0004_add_step_columns.sql
turso db shell geracao-livros < drizzle/0005_add_sessoes_contatos.sql
turso db shell geracao-livros < drizzle/0006_add_canva_tokens.sql
turso db shell geracao-livros < drizzle/0007_add_api_keys.sql
```

### 4. Testar Health Check

Depois de configurar, teste:

```bash
curl https://pembrokecollins.com.br/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "database": "connected",
  "environment": "production"
}
```

Se retornar **500**, o banco ainda não está configurado.

## 📋 Checklist de Deploy

- [ ] DATABASE_URL configurado no hosting
- [ ] DATABASE_AUTH_TOKEN configurado no hosting
- [ ] ALLOWED_ORIGINS incluindo seu domínio
- [ ] Migrations aplicadas no Turso
- [ ] `/api/health` retornando status 200
- [ ] Build passando sem erros
- [ ] Redeploy após configurar variáveis

## 🔍 Debug em Produção

### Ver logs do servidor:
Se estiver na Vercel:
```bash
vercel logs [deployment-url]
```

### Testar endpoint específico:
```bash
# Health check
curl -i https://pembrokecollins.com.br/api/health

# Fluxos (com CORS)
curl -i -H "Origin: https://pembrokecollins.com.br" \
  https://pembrokecollins.com.br/api/fluxos

# Steps
curl -i -H "Origin: https://pembrokecollins.com.br" \
  "https://pembrokecollins.com.br/api/steps?fluxoId=1"
```

## 📚 Próximos Passos

1. **Configure o banco Turso** seguindo o guia acima
2. **Adicione as variáveis de ambiente** no painel do hosting
3. **Faça redeploy** da aplicação
4. **Teste o health check** para confirmar conexão
5. Se ainda houver problemas, **compartilhe os logs** do servidor

## 🆘 Ainda com Erro?

Se após configurar o banco os erros persistirem, verifique:

1. **Console do navegador**: Procure mensagens detalhadas
2. **Network tab**: Veja a resposta completa do servidor (aba Response)
3. **Logs do servidor**: No Vercel Dashboard > Logs
4. **Teste local**: `pnpm dev` e teste as mesmas rotas localmente

---

**Resumo:** O CORS está funcionando ✅, mas o banco de dados precisa ser configurado ⚠️
