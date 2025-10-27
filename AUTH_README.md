# 🔐 Sistema de Autenticação

## Visão Geral

O projeto possui um sistema de autenticação simples baseado em sessões para proteger as áreas administrativas.

## 🔒 Páginas Protegidas

- **`/`** - Página inicial (listagem de fluxos)
- **`/config`** - Configuração de fluxos e steps
- **`/admin`** - Qualquer rota administrativa

## 🌐 Páginas Públicas

- **`/login`** - Página de login
- **`/flow/[id]`** - Execução de fluxos (público para usuários finais)

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env` ou `.env.local`:

```env
# Autenticação (OBRIGATÓRIO)
SESSION_SECRET=change-this-to-a-long-random-string-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 2. Gerar SESSION_SECRET

Para produção, gere um secret seguro:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Valores Padrão (Desenvolvimento)

Se não configurar as variáveis, os valores padrão são:

- **Username**: `admin`
- **Password**: `admin123`
- **Secret**: `change-this-in-production-please`

⚠️ **IMPORTANTE**: Sempre altere estes valores em produção!

## 🚀 Como Usar

### Login

1. Acesse `http://localhost:3000`
2. Será redirecionado para `/login`
3. Entre com:
   - **Usuário**: o valor de `ADMIN_USERNAME` (padrão: `admin`)
   - **Senha**: o valor de `ADMIN_PASSWORD` (padrão: `admin123`)

### Logout

Clique no botão "Sair" no canto superior direito nas páginas `/` ou `/config`.

## 🔧 Arquitetura

### Middleware (`middleware.ts`)

Intercepta todas as requisições e verifica se:
- A rota é protegida
- O usuário possui sessão válida
- Redireciona para `/login` se não autenticado

### API Routes

#### `POST /api/auth/login`
Valida credenciais e cria sessão

```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### `POST /api/auth/logout`
Destroi a sessão atual

#### `GET /api/auth/me`
Verifica se usuário está autenticado

### Lib de Auth (`lib/auth.ts`)

Funções principais:
- `validateCredentials()` - Valida username/password
- `createSession()` - Cria cookie de sessão
- `validateSession()` - Valida sessão existente
- `destroySession()` - Remove sessão

## 🍪 Cookies

- **Nome**: `admin_session`
- **HttpOnly**: `true`
- **Secure**: `true` (apenas HTTPS em produção)
- **SameSite**: `lax`
- **MaxAge**: 7 dias

## 🔐 Segurança

### Implementado

✅ Cookies HttpOnly (não acessíveis via JavaScript)  
✅ Hash de senhas com HMAC-SHA256  
✅ Secure cookies em produção (HTTPS only)  
✅ Proteção CSRF via SameSite  
✅ Sessões com expiração  

### Recomendações Futuras

- [ ] Rate limiting no login
- [ ] Múltiplos usuários (banco de dados)
- [ ] 2FA (Two-Factor Authentication)
- [ ] Logs de acesso
- [ ] Reset de senha
- [ ] Tokens JWT para API

## 🧪 Testando

### Desenvolvimento

```bash
# 1. Configure .env
echo "ADMIN_USERNAME=admin" >> .env.local
echo "ADMIN_PASSWORD=admin123" >> .env.local

# 2. Inicie o servidor
pnpm dev

# 3. Acesse http://localhost:3000
# Será redirecionado para /login
```

### Produção

```bash
# Gere um SESSION_SECRET forte
export SESSION_SECRET=$(openssl rand -hex 32)

# Configure credenciais seguras
export ADMIN_USERNAME=seu_usuario
export ADMIN_PASSWORD=SenhaForte123!@#

# Build e deploy
pnpm build
pnpm start
```

## 📝 Exemplos de Uso

### Verificar Autenticação no Frontend

```typescript
// Qualquer componente client
const checkAuth = async () => {
  const response = await fetch('/api/auth/me');
  const data = await response.json();
  
  if (data.authenticated) {
    console.log('Usuário autenticado:', data.user);
  } else {
    router.push('/login');
  }
};
```

### Proteger API Route Customizada

```typescript
// app/api/minha-rota/route.ts
import { validateSession } from '@/lib/auth';

export async function GET() {
  const isAuthenticated = await validateSession();
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }
  
  // Sua lógica aqui
  return NextResponse.json({ data: 'ok' });
}
```

## 🚨 Troubleshooting

### "Não consigo fazer login"
- Verifique se `.env.local` existe
- Confirme valores de `ADMIN_USERNAME` e `ADMIN_PASSWORD`
- Limpe cookies do navegador
- Reinicie o servidor

### "Redirecionado para login após autenticar"
- Verifique se `SESSION_SECRET` está configurado
- Certifique-se de que cookies estão habilitados
- Em produção, use HTTPS

### "Logout não funciona"
- Limpe cache do navegador
- Verifique console do navegador por erros
- Tente em aba anônima

## 📚 Referências

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [Web Security Best Practices](https://owasp.org/www-project-web-security-testing-guide/)

---

**Nota**: Este é um sistema de autenticação básico para testes e desenvolvimento. Para produção, considere usar soluções mais robustas como NextAuth.js, Auth0, ou Clerk.
