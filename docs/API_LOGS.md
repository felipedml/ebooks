# 📊 Sistema de Logs da API

## Visão Geral

Todos os endpoints da API agora retornam logs detalhados tanto no console do servidor quanto na resposta HTTP, facilitando o debugging e troubleshooting em produção.

## 🔍 Estrutura de Logs

### Request ID
Cada requisição recebe um ID único no formato:
```
req_[timestamp]_[random]
```

Exemplo: `req_1730332800000_a1b2c3d4e`

Este ID é usado em todos os logs da requisição para facilitar o rastreamento.

## 📝 Formato de Logs no Console

### GET /api/fluxos

#### Sucesso - Listar todos os fluxos:
```
[API /fluxos GET] req_xxx - Iniciando requisição
[API /fluxos GET] req_xxx - Origin: https://exemplo.com
[API /fluxos GET] req_xxx - URL: https://api.com/api/fluxos
[API /fluxos GET] req_xxx - Database OK
[API /fluxos GET] req_xxx - Schema fluxos columns: [...]
[API /fluxos GET] req_xxx - Executando query Drizzle...
[API /fluxos GET] req_xxx - ✅ Query executada em 45ms
[API /fluxos GET] req_xxx - ✅ Total de fluxos encontrados: 5
[API /fluxos GET] req_xxx - Primeiro fluxo: Nome do Fluxo 1
[API /fluxos GET] req_xxx - Último fluxo: Nome do Fluxo 5
```

#### Sucesso - Buscar fluxo específico:
```
[API /fluxos GET] req_xxx - Buscando fluxo específico ID: 1
[API /fluxos GET] req_xxx - ✅ Fluxo encontrado: Nome do Fluxo
```

#### Erro - ID inválido:
```
[API /fluxos GET] req_xxx - ❌ ID inválido: abc
```

#### Erro - Fluxo não encontrado:
```
[API /fluxos GET] req_xxx - ⚠️ Fluxo não encontrado: 999
```

#### Erro - Crítico:
```
[API /fluxos GET] req_xxx - ❌ ERRO CRÍTICO: [error details]
[API /fluxos GET] req_xxx - Error name: DatabaseError
[API /fluxos GET] req_xxx - Error message: Connection timeout
[API /fluxos GET] req_xxx - Error stack: [stack trace]
```

### POST /api/fluxos

```
[API /fluxos POST] req_xxx - Iniciando criação de fluxo
[API /fluxos POST] req_xxx - Origin: https://exemplo.com
[API /fluxos POST] req_xxx - Body recebido: {nome: "...", descricao: "...", ativo: true}
[API /fluxos POST] req_xxx - Inserindo fluxo no banco...
[API /fluxos POST] req_xxx - ✅ Fluxo criado em 23ms - ID: 5
```

### PUT /api/fluxos

```
[API /fluxos PUT] req_xxx - Iniciando atualização de fluxo
[API /fluxos PUT] req_xxx - Body recebido: {id: 5, nome: "...", ativo: false}
[API /fluxos PUT] req_xxx - Atualizando fluxo ID: 5
[API /fluxos PUT] req_xxx - ✅ Fluxo atualizado em 18ms
```

### DELETE /api/fluxos

```
[API /fluxos DELETE] req_xxx - Iniciando deleção de fluxo
[API /fluxos DELETE] req_xxx - ID recebido: 5
[API /fluxos DELETE] req_xxx - Deletando steps associados ao fluxo 5...
[API /fluxos DELETE] req_xxx - Steps deletados
[API /fluxos DELETE] req_xxx - Deletando fluxo 5...
[API /fluxos DELETE] req_xxx - ✅ Fluxo deletado em 32ms
```

## 📤 Formato de Resposta HTTP

### Resposta de Sucesso

```json
{
  "success": true,
  "fluxos": [...],
  "count": 5,
  "requestId": "req_1730332800000_a1b2c3d4e",
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

### Resposta de Erro (Validação)

```json
{
  "success": false,
  "error": "Nome é obrigatório",
  "requestId": "req_1730332800000_a1b2c3d4e",
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

### Resposta de Erro (Not Found)

```json
{
  "success": false,
  "error": "Fluxo não encontrado",
  "details": "Nenhum fluxo encontrado com ID 999",
  "requestId": "req_1730332800000_a1b2c3d4e",
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

### Resposta de Erro (Crítico)

```json
{
  "success": false,
  "error": "Erro interno do servidor ao buscar fluxos",
  "details": "Connection timeout after 5000ms",
  "errorType": "DatabaseError",
  "stack": "Error: Connection timeout...",
  "requestId": "req_1730332800000_a1b2c3d4e",
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

**Nota**: O campo `stack` só é incluído em ambiente de desenvolvimento (`NODE_ENV === 'development'`)

## 🎯 Benefícios

### 1. **Rastreabilidade Completa**
- Cada requisição tem um ID único
- Fácil correlacionar logs do servidor com requisições do cliente
- Timestamp em todas as respostas

### 2. **Performance Monitoring**
- Tempo de execução de queries
- Tempo total de cada operação
- Identifica gargalos facilmente

### 3. **Debugging Facilitado**
- Logs detalhados em cada etapa
- Stack traces completos em desenvolvimento
- Informações de erro estruturadas

### 4. **Produção-Ready**
- Logs sensíveis (stack traces) ocultos em produção
- Mensagens de erro amigáveis para o usuário
- Detalhes técnicos para debugging

## 🔧 Como Usar os Logs

### No Frontend (Client-Side)

```typescript
try {
  const response = await fetch('/api/fluxos');
  const data = await response.json();
  
  if (!data.success) {
    console.error('Request ID:', data.requestId);
    console.error('Error:', data.error);
    console.error('Details:', data.details);
    
    // Reportar erro com requestId para facilitar investigação
    reportError({
      requestId: data.requestId,
      error: data.error,
      timestamp: data.timestamp
    });
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### No Backend (Server-Side)

Os logs aparecem automaticamente no console do servidor. Para filtrar logs de uma requisição específica:

```bash
# Ver todos os logs de uma requisição específica
grep "req_1730332800000_a1b2c3d4e" server.log

# Ver apenas erros
grep "❌" server.log

# Ver timing de operações
grep "✅.*em.*ms" server.log
```

## 🎨 Convenções de Emojis

- ✅ - Operação bem-sucedida
- ❌ - Erro crítico
- ⚠️ - Aviso ou situação não crítica
- 📊 - Informação de dados/estatísticas
- 🔍 - Debug/investigação

## 📈 Próximos Passos

- [ ] Integração com serviço de logging (ex: Datadog, CloudWatch)
- [ ] Alertas automáticos para erros críticos
- [ ] Dashboard de métricas de API
- [ ] Rate limiting com logs
- [ ] Audit trail para operações sensíveis
