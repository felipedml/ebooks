# APIs que Ainda Precisam de CORS

## ✅ Já Corrigidas (7)
1. `/api/fluxos` ✅
2. `/api/configuracao-visual` ✅
3. `/api/steps` ✅
4. `/api/sessoes` ✅
5. `/api/process-ai-step` ✅
6. `/api/process-canva-ai-step` ✅
7. `/api/health` ✅

## ⏳ Pendentes (por prioridade)

### Alta Prioridade (usadas pelo FlowRunner)
- [ ] `/api/sessoes/[sessionId]/route.ts` - Update de sessão individual
- [ ] `/api/fluxo-ativo/route.ts` - Busca fluxo ativo
- [ ] `/api/inngest-trigger/route.ts` - Trigger de workflows
- [ ] `/api/api-keys/route.ts` - Gestão de API keys

### Média Prioridade (Canva integration)
- [ ] `/api/canva/auth/route.ts`
- [ ] `/api/canva/callback/route.ts`
- [ ] `/api/canva/check-config/route.ts`
- [ ] `/api/canva/me/route.ts`
- [ ] `/api/canva/designs/route.ts`
- [ ] `/api/canva/design/[id]/route.ts`
- [ ] `/api/canva/brand-template/[id]/route.ts`
- [ ] `/api/canva/autofill/route.ts`
- [ ] `/api/canva/export-fill/route.ts`
- [ ] `/api/canva/exports/route.ts`
- [ ] `/api/canva/status/[jobId]/route.ts`
- [ ] `/api/canva/disconnect/route.ts`

### Baixa Prioridade (ferramentas específicas)
- [ ] `/api/generate-questions/route.ts`
- [ ] `/api/generate-speech/route.ts`
- [ ] `/api/generate-summary/route.ts`
- [ ] `/api/salvar-livro/route.ts`
- [ ] `/api/process-canva-autofill-step/route.ts`
- [ ] `/api/fluxo-inngest/route.ts`
- [ ] `/api/fluxos/[id]/route.ts` - Operações individuais de fluxo

## 🔧 Padrão para Aplicar

Para cada arquivo, adicionar:

```typescript
// No topo do arquivo
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

// Adicionar handler OPTIONS
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

// Em cada método (GET, POST, PUT, DELETE):
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin'); // ← Adicionar
  
  try {
    // ... lógica existente
    
    // Substituir NextResponse.json por corsResponse
    return corsResponse(
      { success: true, data: resultado },
      { origin }
    );
  } catch (error) {
    return corsResponse(
      { success: false, error: 'mensagem' },
      { status: 500, origin }
    );
  }
}
```

## 🚀 Como Aplicar em Massa

### Opção 1: Manualmente (mais seguro)
Copie o padrão acima e aplique arquivo por arquivo.

### Opção 2: Script automático
Crie um script para substituir em massa (perigoso, revisar depois):

```bash
# Exemplo de substituição com sed (macOS)
find app/api -name "route.ts" -exec sed -i '' \
  's/return NextResponse\.json(/return corsResponse(/g' {} \;
```

**⚠️ ATENÇÃO:** Revisar manualmente após script automático!

## 📊 Progresso

- **Total de APIs:** ~40
- **Corrigidas:** 7 (17.5%)
- **Pendentes Alta:** 4
- **Pendentes Média:** 12
- **Pendentes Baixa:** 7

## 🎯 Próximo Passo Recomendado

1. Corrigir as 4 de **Alta Prioridade** primeiro
2. Testar em produção
3. Se tudo funcionar, corrigir as de Média e Baixa aos poucos

---

**Dica:** Se os erros 500 persistirem mesmo após CORS, o problema é o banco de dados (veja `PRODUCTION_FIX.md`)
