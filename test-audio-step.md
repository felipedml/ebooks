# 🔍 Teste do Step de Áudio

## Instruções para Diagnóstico

### 1. Abra o DevTools do Navegador (F12)
- Vá para a aba **Console**
- Mantenha aberto enquanto testa

### 2. Configure um Step de Áudio
1. Acesse `/config`
2. Selecione ou crie um fluxo
3. Clique em "Adicionar Step"
4. Selecione tipo: "Áudio"
5. Escolha modo: "Gravar" (ícone de microfone vermelho)
6. Configure duração máxima: 60 segundos
7. Adicione texto explicativo (opcional)
8. Clique em "Salvar"

### 3. Ative o Fluxo e Teste
1. Ative o fluxo
2. Acesse a página inicial (/)
3. Aguarde o fluxo chegar no step de áudio

### 4. Verifique os Logs no Console

Procure pelos seguintes logs:

```
[FlowRunner] Loading flow: X
[FlowRunner] Loading audio step with content: { mode: "record", ...}
[FlowRunner] Audio step parsed: { type: "audio", mode: "record", ... }
[FlowRunner] Flow steps loaded: [...]
[FlowRunner] displayInteractiveStep called with step: { type: "audio", ... }
[FlowRunner] Audio step detected in displayInteractiveStep
[FlowRunner] Rendering interaction, currentStepIndex: X
[FlowRunner] Current step: { type: "audio", ... }
[FlowRunner] Step type: audio
```

### 5. O que pode estar errado:

#### Se não aparecer "Loading audio step":
❌ O step não foi salvo no banco ou não foi carregado

#### Se aparecer "Loading audio step" mas não "Audio step parsed":
❌ Erro no parsing do JSON

#### Se aparecer "Audio step parsed" mas não "displayInteractiveStep":
❌ O step não está sendo processado no fluxo

#### Se aparecer "displayInteractiveStep" mas não "Audio step detected":
❌ O tipo do step não é "audio"

#### Se aparecer "Audio step detected" mas não "Rendering interaction":
❌ A mensagem não está sendo renderizada

#### Se aparecer "Rendering interaction" mas Step type não é "audio":
❌ currentStepIndex está incorreto

### 6. Solução Rápida - Verificar Banco de Dados

Execute no terminal:

```bash
cd /Users/brunohenrique/Local\ Documents/geracao-livros-automacao
sqlite3 sqlite.db "SELECT id, fluxoId, tipo, conteudo FROM steps WHERE tipo='audio';"
```

Isso mostrará todos os steps de áudio salvos no banco.

### 7. Cole os Logs Aqui

Copie e cole todos os logs que começam com `[FlowRunner]` para análise.
