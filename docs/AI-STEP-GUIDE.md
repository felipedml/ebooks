# Guia do Step de IA Dinâmico

## 📚 Visão Geral

O **Step de IA** permite que você gere conteúdo dinâmico nos seus fluxos usando modelos de linguagem (LLMs). A IA pode ler todas as respostas anteriores do usuário e gerar:

- **Texto**: Mensagens personalizadas
- **Botões**: Opções dinâmicas baseadas no contexto
- **Input**: Campos de entrada adaptados
- **Opções**: Listas de seleção contextuais

## 🎯 Como Funciona

1. **Coleta Contexto**: A IA recebe todas as variáveis e respostas anteriores
2. **Processa Prompt**: Substitui variáveis `{nome_variavel}` no seu prompt
3. **Gera Output**: Usa AI SDK v5+ com structured outputs (Zod schemas)
4. **Exibe ao Usuário**: Renderiza o conteúdo gerado no fluxo

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione ao seu `.env.local`:

```bash
# OpenAI
OPENAI_API_KEY=sk-your-api-key-here

# Google Gemini
GOOGLE_API_KEY=your-google-gemini-api-key-here

### 2. Criar Step de IA

Na interface `/config`:

1. Selecione um fluxo
2. Clique em "Novo Step"
3. Escolha **"AI Dinâmico"**
4. Configure:
   - **Provider**: OpenAI ou Google Gemini
   - **Modelo**: 
     - OpenAI: `gpt-4o` (padrão), `gpt-4o-mini`, `gpt-4-turbo`
     - Gemini: `gemini-2.0-flash-exp` (padrão), `gemini-1.5-pro`
   - **Tipo de Output**: text, buttons, input ou options
   - **Prompt**: Instrução para a IA (pode usar variáveis)
   - **Temperature**: 0 (preciso) a 2 (criativo)

## 💡 Exemplos Práticos

### Exemplo 1: Mensagem Personalizada

**Contexto**: Usuário informou nome e interesse

**Prompt**:
```
Com base no nome {nome} e interesse em {interesse}, 
crie uma mensagem de boas-vindas calorosa e personalizada 
oferecendo produtos relacionados ao interesse dele.
```

**Output Type**: `text`

**Resultado**:
> "Olá João! Vi que você se interessa por programação. 
> Temos cursos incríveis de Python, JavaScript e DevOps 
> que vão acelerar sua carreira. Quer conhecer?"

---

### Exemplo 2: Botões Dinâmicos

**Contexto**: Usuário escolheu categoria "Tecnologia"

**Prompt**:
```
O usuário se interessou pela categoria {categoria}.
Gere 3-5 subcategorias relevantes como opções de botão.
Use labels curtos e atrativos.
```

**Output Type**: `buttons`

**Resultado**:
```json
{
  "buttons": [
    { "id": "1", "label": "IA & Machine Learning", "value": "ai_ml" },
    { "id": "2", "label": "Desenvolvimento Web", "value": "web_dev" },
    { "id": "3", "label": "DevOps & Cloud", "value": "devops" },
    { "id": "4", "label": "Mobile Apps", "value": "mobile" }
  ]
}
```

---

### Exemplo 3: Input Contextual

**Contexto**: Usuário quer feedback sobre produto X

**Prompt**:
```
O usuário quer dar feedback sobre {produto_nome}.
Crie um campo de input apropriado para coletar 
opinião detalhada com placeholder relevante.
```

**Output Type**: `input`

**Resultado**:
```json
{
  "placeholder": "Como foi sua experiência com o Curso de React? Conte os detalhes...",
  "inputType": "textarea"
}
```

---

### Exemplo 4: Recomendações

**Contexto**: Usuário tem nível de experiência e orçamento

**Prompt**:
```
Usuário: nível {nivel_experiencia}, orçamento {orcamento}.
Gere uma lista de 3-5 cursos recomendados como opções.
Seja específico e relevante ao perfil.
```

**Output Type**: `options`

**Resultado**:
```json
{
  "options": [
    "React do Zero ao Avançado - R$ 197",
    "Node.js para Iniciantes - R$ 147",
    "Git & GitHub Essencial - R$ 97"
  ]
}
```

## 🎨 Uso de Variáveis

### Variáveis Disponíveis

A IA tem acesso a:

- **Variáveis nomeadas**: Campos input com `variable` definido
- **Respostas de steps**: `step-0`, `step-1`, etc.
- **Seleções**: Valores de botões e opções escolhidos

### Sintaxe

Use `{nome_variavel}` no prompt:

```
Olá {nome}!
Você escolheu {interesse}.
Sua experiência é {nivel}.
```

### Variáveis Complexas

Você pode referenciar toda a conversa:

```
Com base em toda a conversa anterior:
{step-0}: nome
{step-1}: interesse  
{step-2}: objetivo

Gere uma proposta personalizada de curso.
```

## ⚙️ Configurações Avançadas

### Temperature

- **0.0 - 0.3**: Respostas consistentes e precisas
- **0.4 - 0.7**: Balanceado (padrão: 0.7)
- **0.8 - 1.5**: Criativo e variado
- **1.6 - 2.0**: Muito criativo (pode ser imprevisível)

### Modelos Disponíveis

**OpenAI**:
- `gpt-4o`: Mais inteligente e capaz (padrão OpenAI)
- `gpt-4o-mini`: Mais rápido e econômico
- `gpt-4-turbo`: Versão anterior, ainda poderoso
- `gpt-3.5-turbo`: Mais barato, menos capaz

**Google Gemini**:
- `gemini-2.0-flash-exp`: Mais rápido e eficiente (padrão Gemini) ⚡
- `gemini-1.5-pro`: Mais capaz e inteligente
- `gemini-1.5-flash`: Versão rápida 1.5

## 🔍 Como a IA Funciona (Técnico)

### AI SDK v5+ com Structured Outputs

```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Schema Zod para validação
const schema = z.object({
  type: z.literal('text'),
  content: z.string()
});

// Gera output estruturado
const result = await generateObject({
  model: openai('gpt-4o'),
  schema,
  prompt: processedPrompt,
  temperature: 0.7
});
```

### Fluxo de Processamento

1. **Inngest recebe step AI**
2. **`processAIStep()`** é chamado com:
   - Provider (openai/gemini)
   - Modelo
   - Prompt com variáveis
   - Todas as respostas anteriores
3. **Substitui variáveis** no prompt
4. **Chama AI SDK** com schema apropriado
5. **Valida output** com Zod
6. **Envia evento** para FlowRunner exibir

### Tratamento de Erros

Se a IA falhar, fallbacks são fornecidos:

- **Text**: "Desculpe, não foi possível processar..."
- **Buttons**: Botão "Continuar"
- **Input**: Input genérico de texto
- **Options**: ["Sim", "Não"]

## 📊 Boas Práticas

### ✅ Faça

- Use prompts claros e específicos
- Mencione o contexto disponível
- Especifique o formato desejado
- Teste com diferentes variáveis
- Use temperature baixo para consistência

### ❌ Evite

- Prompts vagos ou genéricos
- Referenciar variáveis que não existem
- Temperature alto em produção
- Prompts muito longos (> 1000 tokens)
- Depender 100% da IA sem fallback

## 🚀 Casos de Uso

1. **E-commerce**: Recomendações de produtos personalizadas
2. **Educação**: Sugestões de cursos baseadas no perfil
3. **Atendimento**: Respostas adaptadas ao problema
4. **Vendas**: Propostas customizadas por lead
5. **Onboarding**: Fluxos que se adaptam ao usuário

## 🛠️ Troubleshooting

### "AI step não funciona"

- ✅ Verifique `OPENAI_API_KEY` no `.env.local`
- ✅ Confirme que a API key é válida
- ✅ Check logs do Inngest Dashboard

### "Output inconsistente"

- Reduza temperature (0.3 - 0.5)
- Seja mais específico no prompt
- Adicione exemplos no prompt

### "Timeout na IA"

- Simplifique o prompt
- Use modelo mais rápido (gpt-4o-mini)
- Verifique limites da API

## 📚 Recursos

- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Structured Outputs Guide](https://sdk.vercel.ai/docs/guides/structured-outputs)
- [Zod Schema Validation](https://zod.dev/)

## 🔮 Roadmap

- [x] ✅ Suporte Gemini 2.0
- [ ] Suporte Anthropic Claude
- [ ] Cache de respostas similares
- [ ] Análise de custos por step
- [ ] Testes A/B de prompts
- [ ] Fallback inteligente entre modelos
