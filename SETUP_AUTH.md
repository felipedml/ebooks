# 🔐 Configuração de Autenticação - Guia Rápido

## ✅ O que foi implementado

Sistema de autenticação completo para proteger as páginas administrativas do projeto.

### Arquivos Criados/Modificados

#### Novos Arquivos:
- ✅ `lib/auth.ts` - Funções de autenticação
- ✅ `middleware.ts` - Proteção de rotas
- ✅ `app/api/auth/login/route.ts` - Endpoint de login
- ✅ `app/api/auth/logout/route.ts` - Endpoint de logout
- ✅ `app/api/auth/me/route.ts` - Verificação de sessão
- ✅ `app/login/page.tsx` - Página de login
- ✅ `.env.example` - Exemplo de configuração
- ✅ `AUTH_README.md` - Documentação completa

#### Arquivos Modificados:
- ✅ `app/page.tsx` - Adicionado botão de logout
- ✅ `app/config/page.tsx` - Adicionado botões de logout e home

---

## 🚀 Como Usar (Início Rápido)

### 1. Configure as Variáveis de Ambiente

Crie ou edite o arquivo `.env.local`:

```bash
# Copie do exemplo
cp .env.example .env.local

# Ou crie manualmente
touch .env.local
```

Adicione as seguintes linhas no `.env.local`:

```env
# Autenticação
SESSION_SECRET=seu-secret-aqui-com-no-minimo-32-caracteres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SuaSenhaForte123!
```

#### Gerar SESSION_SECRET:

```bash
# Opção 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opção 2: OpenSSL
openssl rand -hex 32

# Opção 3: Use qualquer string aleatória longa (mínimo 32 chars)
```

### 2. Inicie o Servidor

```bash
pnpm dev
```

### 3. Acesse a Aplicação

1. Abra `http://localhost:3000`
2. Você será redirecionado para `/login`
3. Entre com as credenciais configuradas:
   - **Usuário**: valor de `ADMIN_USERNAME`
   - **Senha**: valor de `ADMIN_PASSWORD`

---

## 🔒 Páginas e Segurança

### ✅ Páginas Protegidas (Requerem Login)

- `/` - Página inicial (listagem de fluxos)
- `/config` - Configuração de fluxos
- `/admin` - Área administrativa

### 🌐 Páginas Públicas

- `/login` - Login
- `/flow/[id]` - Execução de fluxos (para usuários finais)
- Todas as APIs de fluxo

---

## 🎯 Funcionalidades

### ✅ Implementado

- ✅ Login com username/password
- ✅ Logout funcional
- ✅ Sessões com cookies seguros (HttpOnly)
- ✅ Middleware para proteger rotas automaticamente
- ✅ Redirecionamento automático para login
- ✅ Interface moderna e responsiva
- ✅ Validação de sessão em todas as páginas protegidas
- ✅ Botões de logout em páginas admin

### 🔐 Segurança

- ✅ Cookies HttpOnly (não acessíveis via JavaScript)
- ✅ Hash de senhas com HMAC-SHA256
- ✅ Secure cookies em produção (HTTPS only)
- ✅ Proteção CSRF via SameSite
- ✅ Sessões com expiração (7 dias)
- ✅ Credenciais via variáveis de ambiente

---

## 📝 Exemplo de Configuração Completa

### `.env.local` (Desenvolvimento)

```env
# Database
DATABASE_URL=file:sqlite.db

# Autenticação (OBRIGATÓRIO)
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# AI (Opcional - pode configurar na UI)
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Canva (Opcional)
NEXT_PUBLIC_CANVA_CLIENT_ID=...
CANVA_CLIENT_SECRET=...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

### `.env` (Produção)

```env
# Database Turso
DATABASE_URL=libsql://sua-database.turso.io
DATABASE_AUTH_TOKEN=seu-token-turso

# Autenticação (CRÍTICO - Valores Fortes!)
SESSION_SECRET=GERE-UM-SECRET-FORTE-ALEATÓRIO-COM-64-CARACTERES-NO-MINIMO
ADMIN_USERNAME=administrador
ADMIN_PASSWORD=SenhaUltraForte!@#$123XYZ

# Resto da configuração...
```

---

## 🧪 Testando

### Teste Manual

1. **Sem autenticação**:
   ```bash
   # Acesse direto a home
   curl http://localhost:3000
   # Deve redirecionar para /login
   ```

2. **Com autenticação**:
   ```bash
   # Faça login
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}' \
     -c cookies.txt

   # Acesse rota protegida com cookie
   curl http://localhost:3000 -b cookies.txt
   # Deve retornar a página
   ```

3. **Logout**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
   ```

### Fluxo do Usuário

```
┌─────────────────────────────────────────────────────┐
│ 1. Usuário acessa http://localhost:3000             │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. Middleware verifica se há cookie de sessão       │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   [Sem Cookie]          [Com Cookie]
        │                     │
        ▼                     ▼
┌──────────────┐    ┌─────────────────┐
│ Redireciona  │    │ Permite Acesso  │
│ para /login  │    │ à Página        │
└──────┬───────┘    └─────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 3. Usuário faz login         │
│    - Username: admin         │
│    - Password: admin123      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 4. API valida credenciais    │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    [Válido]     [Inválido]
        │             │
        ▼             ▼
┌──────────────┐ ┌──────────┐
│ Cria Cookie  │ │ Erro 401 │
│ de Sessão    │ └──────────┘
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ 5. Redireciona para /        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 6. Usuário vê página admin   │
│    Botão "Sair" disponível   │
└──────────────────────────────┘
```

---

## 🔧 Personalização

### Alterar Tempo de Expiração da Sessão

Edite `lib/auth.ts`:

```typescript
maxAge: 60 * 60 * 24 * 7, // 7 dias (padrão)
maxAge: 60 * 60 * 24 * 30, // 30 dias
maxAge: 60 * 60 * 8, // 8 horas
```

### Adicionar Novas Rotas Protegidas

Edite `middleware.ts`:

```typescript
const PROTECTED_ROUTES = [
  '/', 
  '/config', 
  '/admin',
  '/analytics', // Nova rota
  '/relatorios' // Nova rota
];
```

### Proteger API Route Específica

```typescript
// app/api/minha-api/route.ts
import { validateSession } from '@/lib/auth';

export async function GET() {
  const isAuth = await validateSession();
  
  if (!isAuth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Sua lógica aqui
}
```

---

## 🚨 Troubleshooting

### Problema: "Não consigo fazer login"

**Solução**:
1. Verifique se `.env.local` existe
2. Confirme valores de `ADMIN_USERNAME` e `ADMIN_PASSWORD`
3. Reinicie o servidor: `Ctrl+C` e depois `pnpm dev`
4. Limpe cookies do navegador (F12 > Application > Cookies)

### Problema: "Loop infinito de redirect"

**Solução**:
1. Verifique se `SESSION_SECRET` está definido
2. Limpe todos os cookies do localhost
3. Tente em aba anônima
4. Verifique logs do servidor no terminal

### Problema: "Cookie não é salvo"

**Solução**:
1. Em desenvolvimento, use `http://localhost:3000` (não HTTPS)
2. Cookies estão em `HttpOnly`, não aparecem no JavaScript
3. Verifique em: DevTools > Application > Cookies > localhost

---

## 📚 Documentação Adicional

- **`AUTH_README.md`** - Documentação técnica completa
- **`.env.example`** - Todas as variáveis de ambiente
- **`lib/auth.ts`** - Código fonte da autenticação

---

## ⚠️ Importante para Produção

### Checklist de Deploy:

- [ ] Alterar `SESSION_SECRET` para valor forte e aleatório
- [ ] Alterar `ADMIN_PASSWORD` para senha forte
- [ ] Considerar `ADMIN_USERNAME` menos óbvio
- [ ] Usar HTTPS (cookies Secure automático)
- [ ] Habilitar rate limiting no login
- [ ] Monitorar logs de acesso
- [ ] Considerar 2FA para camada extra de segurança

### Gerando Valores Fortes:

```bash
# SESSION_SECRET (64 caracteres hex)
openssl rand -hex 32

# Password forte
openssl rand -base64 24
```

---

## 🎉 Pronto!

Agora você tem um sistema de autenticação funcional protegendo sua aplicação!

Para mais detalhes técnicos, veja `AUTH_README.md`.
