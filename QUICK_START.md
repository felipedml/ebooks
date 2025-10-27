# 🚀 Início Rápido - Autenticação

## 📋 Passo a Passo (5 minutos)

### 1️⃣ Copie o arquivo de configuração

```bash
cp .env.local.example .env.local
```

### 2️⃣ Edite o `.env.local`

Abra o arquivo e **mude pelo menos estas 3 linhas**:

```env
SESSION_SECRET=c4f3e8d2b1a9f7e6d5c4b3a2918f7e6d5c4b3a2918f7e6d5c4b3a2918f7e6
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

#### 💡 Dica: Gere um SESSION_SECRET único

```bash
# Opção 1: OpenSSL (recomendado)
openssl rand -hex 32

# Opção 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opção 3: Online
# Acesse: https://randomkeygen.com/
```

Copie o resultado e cole no `SESSION_SECRET`.

### 3️⃣ Inicie o servidor

```bash
pnpm dev
```

### 4️⃣ Acesse a aplicação

Abra no navegador:
```
http://localhost:3000
```

Você será automaticamente redirecionado para a **página de login**.

### 5️⃣ Faça login

Use as credenciais que você configurou:

- **Usuário**: `admin` (ou o que você definiu em `ADMIN_USERNAME`)
- **Senha**: `admin123` (ou o que você definiu em `ADMIN_PASSWORD`)

---

## ✅ Pronto!

Agora você está autenticado e pode:

- ✅ Ver a lista de fluxos em `/`
- ✅ Configurar fluxos em `/config`
- ✅ Fazer logout clicando no botão "Sair"

---

## 🌐 Fluxos Públicos

As URLs de fluxos continuam **públicas** e podem ser compartilhadas:

```
http://localhost:3000/flow/1
http://localhost:3000/flow/2
```

Somente as páginas de **administração** (`/` e `/config`) exigem login.

---

## 🔐 Segurança

### ⚠️ Para Produção

**NUNCA** use `admin` e `admin123` em produção!

Antes de fazer deploy, mude para valores fortes:

```env
SESSION_SECRET=VALOR_ALEATÓRIO_LONGO_DE_64_CARACTERES_NO_MÍNIMO
ADMIN_USERNAME=seu_usuario_unico
ADMIN_PASSWORD=SenhaSuperForte!@#123XYZ
```

### Gere Senha Forte

```bash
# Opção 1: OpenSSL
openssl rand -base64 24

# Opção 2: Online
# https://passwordsgenerator.net/
```

---

## 📚 Documentação Completa

- **`SETUP_AUTH.md`** - Guia completo de configuração
- **`AUTH_README.md`** - Documentação técnica
- **`.env.example`** - Todas as variáveis disponíveis

---

## 🆘 Problemas?

### Não consigo fazer login

1. Verifique se o arquivo `.env.local` existe
2. Confirme que as variáveis estão corretas
3. Reinicie o servidor: `Ctrl+C` → `pnpm dev`
4. Limpe os cookies do navegador

### Loop de redirecionamento

1. Limpe os cookies do navegador
2. Verifique se `SESSION_SECRET` tem pelo menos 32 caracteres
3. Tente em uma aba anônima

### Cookie não é salvo

1. Use `http://localhost:3000` (não `http://127.0.0.1:3000`)
2. Verifique se cookies estão habilitados no navegador
3. Veja os cookies em: DevTools (F12) → Application → Cookies

---

## 💬 Suporte

Em caso de dúvidas, consulte os arquivos de documentação ou abra uma issue no repositório.

---

**Tempo estimado**: 5 minutos ⏱️  
**Dificuldade**: Fácil ⭐
