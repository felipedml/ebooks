# 🎨🤖 Step Canva + IA - Documentação Completa

## 📋 Visão Geral

O **step `canva_ai`** combina inteligência artificial com a API do Canva para selecionar automaticamente o design mais adequado com base em um contexto específico.

### Como funciona:
1. **Admin** seleciona múltiplos designs do Canva
2. **Admin** escreve uma instrução para a IA (com suporte a variáveis)
3. **Runtime**: IA recebe instrução + lista de designs (título + ID)
4. **IA** analisa e escolhe o design mais apropriado
5. **Frontend** exibe thumbnail + título + reasoning do design selecionado

---

## 🏗️ Arquitetura

### 1. Interface TypeScript (`flow-steps.ts`)

```typescript
interface CanvaDesignOption {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

interface CanvaAIStep {
  type: 'canva_ai';
  instruction: string; // "Selecione o design para {{produto}} focado em {{publico}}"
  aiProvider: 'openai' | 'gemini';
  aiModel?: string; // e.g., 'gpt-4o', 'gemini-2.0-flash-exp'
  apiKeyId?: number; // ID da API key configurada
  availableDesigns: CanvaDesignOption[]; // Designs que admin selecionou
  message?: string; // Mensagem opcional antes de processar
  saveResultAs?: string; // Nome da variável para salvar resultado
  delay?: number;
}
```

---

## 🔄 Fluxo de Execução (Inngest)

### Processamento no Backend:

```typescript
case 'canva_ai':
  // 1. Buscar API key da IA
  const aiKey = await step.run(`${stepId}-get-ai-key`, async () => {
    // Busca do banco de dados
    return { provider, apiKey };
  });

  // 2. Substituir variáveis na instrução
  let instruction = flowStep.instruction;
  for (const [key, value] of Object.entries(responses)) {
    instruction = instruction.replace(/\{\{key\}\}/g, String(value));
  }

  // 3. Montar lista de designs para IA
  const designList = flowStep.availableDesigns
    .map((d, i) => `${i + 1}. ID: ${d.id}, Title: "${d.title}"`)
    .join('\n');

  // 4. Chamar IA com prompt estruturado
  const systemPrompt = `You are a design selection assistant...
Available designs:
${designList}

Respond ONLY with JSON:
{
  "selectedId": "the design ID",
  "selectedTitle": "the design title",
  "reasoning": "why this design was chosen"
}`;

  const selectedDesign = await step.run(`${stepId}-ai-select`, async () => {
    if (aiKey.provider === 'openai') {
      // OpenAI com response_format: json_object
    } else {
      // Gemini com responseMimeType: 'application/json'
    }
    return JSON.parse(response);
  });

  // 5. Enviar para frontend
  await step.sendEvent(`${stepId}-update`, {
    name: "flow/step.update",
    data: {
      sessionId,
      stepIndex: index,
      stepType: 'canva_ai',
      selectedDesign: {
        id: selectedDesign.selectedId,
        title: selectedDesign.selectedTitle,
        thumbnailUrl: chosenDesign?.thumbnailUrl,
        reasoning: selectedDesign.reasoning
      }
    }
  });
```

---

## 🎨 Interface de Configuração (Admin)

### Campos da UI:

1. **Instrução para IA** (required)
   - Textarea com suporte a variáveis `{{nome}}`
   - Exemplo: `"Selecione o design mais adequado para {{produto}} focado em {{publico}}"`

2. **Provider IA** (dropdown)
   - OpenAI / Google Gemini

3. **Modelo** (dropdown dinâmico)
   - Modelos disponíveis baseados no provider selecionado

4. **API Key** (dropdown)
   - Lista filtrada por provider
   - Busca do banco de dados

5. **Designs Disponíveis** (grid de seleção)
   - Botão "🔄 Carregar Designs" → chama `/api/canva/designs`
   - Grid 2-3 colunas com thumbnails
   - Click para selecionar/desselecionar (border purple quando selecionado)
   - Badge com checkmark quando selecionado
   - Contador: "✅ X design(s) selecionado(s)"

6. **Mensagem** (opcional)
   - Exibida antes do processamento

7. **Salvar como** (opcional)
   - Nome da variável para usar em steps posteriores

8. **Delay** (número)
   - Milissegundos de espera

---

## 💾 Persistência no Banco

### Formato salvo:

```json
{
  "instruction": "Selecione o design para {{produto}}",
  "aiProvider": "openai",
  "aiModel": "gpt-4o-mini",
  "apiKeyId": 1,
  "availableDesigns": [
    {
      "id": "DAF...",
      "title": "Design Promocional",
      "thumbnailUrl": "https://..."
    },
    {
      "id": "DBG...",
      "title": "Design Institucional",
      "thumbnailUrl": "https://..."
    }
  ],
  "message": "Analisando designs...",
  "saveResultAs": "design_escolhido",
  "delayMs": 500
}
```

### Tipo no banco:
```sql
tipo = 'canva_ai'
```

---

## 🔌 APIs Utilizadas

### 1. `/api/canva/designs` (GET)
- Busca token do banco automaticamente
- Lista designs do usuário com thumbnails
- Response:
```json
{
  "success": true,
  "items": [
    {
      "id": "DAF...",
      "title": "Nome do Design",
      "thumbnail": {
        "url": "https://..."
      }
    }
  ],
  "continuation": "next_page_token"
}
```

### 2. OpenAI / Gemini APIs
- Chamadas feitas no Inngest (backend)
- Response format: JSON object
- Temperature: 0.3 (para seleções consistentes)

---

## 📊 Output da IA

### Formato esperado:
```json
{
  "selectedId": "DAF1234567890",
  "selectedTitle": "Design Promocional",
  "reasoning": "Este design foi escolhido porque possui elementos visuais que destacam promoções e atrai o público-alvo especificado."
}
```

---

## 🎯 Casos de Uso

### Exemplo 1: E-commerce
```
Instrução: "Selecione o design mais adequado para divulgar {{produto}} em uma campanha de {{tipo_campanha}}"

Designs disponíveis:
- Design Promocional (fundo vermelho, destaque de preço)
- Design Institucional (clean, minimalista)
- Design Storytelling (focado em narrativa)

Input do usuário:
- produto: "Tênis Esportivo"
- tipo_campanha: "Black Friday"

IA escolhe: "Design Promocional"
Reasoning: "O design promocional é ideal para Black Friday pois destaca preços e promoções com cores chamativas."
```

### Exemplo 2: Marketing de Conteúdo
```
Instrução: "Escolha o design que melhor se adapta ao tema {{tema}} para o público {{publico}}"

Designs disponíveis:
- Design Corporativo
- Design Criativo
- Design Educacional

Input:
- tema: "Dicas de Produtividade"
- publico: "Profissionais Liberais"

IA escolhe: "Design Educacional"
```

---

## ✅ Checklist de Implementação

- [x] Interface `CanvaAIStep` em `flow-steps.ts`
- [x] Lógica Inngest com chamadas IA
- [x] API `/api/canva/designs` atualizada
- [x] UI de configuração com grid de designs
- [x] Seleção múltipla com thumbnails
- [x] Persistência no banco (save/load)
- [x] Visualização na lista de steps
- [x] Suporte a variáveis na instrução
- [x] Integração OpenAI e Gemini
- [ ] FlowRunner - exibir design selecionado (próximo passo)

---

## 🚀 Próximos Passos

1. **FlowRunner**: Adicionar renderização do step `canva_ai`
   - Exibir thumbnail do design selecionado
   - Mostrar título e reasoning da IA
   - Animação de "pensando..."

2. **Otimizações**:
   - Cache de designs do Canva
   - Paginação na seleção de designs
   - Preview de como ficará na instrução

3. **Features Extras**:
   - Filtrar designs por tipo/categoria
   - Buscar designs por nome
   - Suporte a Brand Templates também
