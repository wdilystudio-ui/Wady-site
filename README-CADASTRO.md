# Wady — Módulo de Cadastro

Documentação completa do módulo de cadastro da plataforma Wady.

---

## 📁 Arquivos entregues

```
wady-next/
├── app/
│   └── cadastro/
│       └── page.tsx          ← Página de cadastro (Client Component)
├── actions/
│   └── auth.ts               ← Server Actions: cadastro, logout
├── create_perfis_table.sql   ← Script SQL da tabela perfis (com RLS)
└── .env.local.example        ← Template de variáveis de ambiente
```

---

## ⚙️ Configuração do ambiente

### 1. Variáveis de ambiente

Renomeie `.env.local.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

**Onde encontrar:**
1. Acesse [supabase.com](https://supabase.com) → seu projeto
2. Vá em **Project Settings → API**
3. Copie **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
4. Copie **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> ⚠️ **Nunca** exponha a chave `service_role` no frontend. Ela bypassa o RLS.

### 2. Banco de dados

Execute o script `create_perfis_table.sql` no **SQL Editor** do Supabase:

```
Supabase Dashboard → SQL Editor → New query → Cole o conteúdo → Run
```

O script cria:
- Tabela `perfis` com todos os campos necessários
- Índices para performance
- Trigger de `atualizado_em` automático
- Políticas de Row Level Security (RLS)

---

## 🏗️ Arquitetura do módulo

### Fluxo de cadastro

```
Usuário preenche formulário (etapa 1: dados de acesso)
    ↓
Validação client-side (nome, e-mail, senha, confirmação)
    ↓
Usuário preenche formulário (etapa 2: perfil)
    ↓
Validação client-side (bio, categoria, termos)
    ↓
supabase.auth.signUp() → cria usuário no Auth
    ↓
supabase.from('perfis').insert() → salva perfil complementar
    ↓
Sessão ativa? → redirect /dashboard
Sem sessão?  → redirect /login?confirmacao=1 (confirmar e-mail)
```

### Separação de responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `app/cadastro/page.tsx` | UI, estados, validação client-side |
| `actions/auth.ts` | Lógica de integração com Supabase (server-side) |
| `lib/supabase/client.ts` | Cliente Supabase para o browser |
| `lib/supabase/server.ts` | Cliente Supabase para o servidor |
| `create_perfis_table.sql` | Schema do banco de dados |

---

## 🔒 Segurança implementada

### Validações client-side
- Nome: mínimo 3 caracteres
- E-mail: regex de validação
- Senha: mínimo 8 chars + maiúscula + número
- Confirmação de senha: comparação em tempo real
- Bio (profissional): mínimo 20 caracteres
- Categoria (profissional): campo obrigatório
- Aceite de termos: obrigatório

### Segurança no banco
- **RLS habilitado**: usuários só acessam o próprio perfil
- **Constraint unique**: impede perfis duplicados por usuário
- **CHECK constraint**: `tipo_usuario` só aceita `'Cliente'` ou `'Profissional'`
- **Foreign key**: `user_id` referencia `auth.users` com `ON DELETE CASCADE`

### Boas práticas
- E-mail normalizado (`.toLowerCase().trim()`) antes do envio
- Erros do Supabase traduzidos para mensagens amigáveis em PT-BR
- `noValidate` no `<form>` para controle total das validações
- Senha nunca logada ou exposta

---

## 🎨 Interface

### Fluxo em 2 etapas
- **Etapa 1**: Seleção de tipo + dados de acesso (nome, e-mail, senha)
- **Etapa 2**: Perfil complementar (bio e categoria para profissionais; confirmação para clientes)

### Componentes notáveis
- `PasswordStrength`: barra visual de força da senha com requisitos em tempo real
- `CampoTexto`: wrapper com label + erro inline padronizado
- Seletor visual de tipo de usuário (cards clicáveis)
- Indicador de progresso entre etapas

### Responsividade
- Layout mobile-first
- Breakpoints: `sm` (640px+)
- Inputs com `py-3.5` para toque confortável em mobile

---

## 🛠️ Dependências necessárias

Já inclusas no `package.json` do projeto:

```json
"@supabase/ssr": "^0.5.x",
"@supabase/supabase-js": "^2.x",
"next": "15.x",
"tailwindcss": "^4.x"
```

---

## 📋 Checklist de integração

- [ ] Renomear `.env.local.example` → `.env.local` e preencher as chaves
- [ ] Executar `create_perfis_table.sql` no Supabase SQL Editor
- [ ] Copiar `app/cadastro/page.tsx` para o projeto
- [ ] Copiar `actions/auth.ts` para o projeto (pasta `actions/`)
- [ ] Verificar que `lib/supabase/client.ts` e `server.ts` existem
- [ ] Testar cadastro de Cliente
- [ ] Testar cadastro de Profissional
- [ ] Verificar dados na tabela `perfis` no Supabase Dashboard
- [ ] Verificar e-mail de confirmação (se habilitado no projeto)
