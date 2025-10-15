# 🚗 Espaço Braite - Sistema de Ordens de Serviço

Sistema SaaS multi-tenant para gerenciamento de lava-rápido e estética automotiva, desenvolvido com Next.js, PostgreSQL e autenticação JWT.

## 🎨 Características

- **Multi-tenant**: Cada lava-rápido tem sua própria conta isolada
- **Autenticação JWT**: Login seguro com tokens de acesso e refresh
- **RBAC**: 4 níveis de permissão (owner, manager, attendant, viewer)
- **Dashboard**: Faturamento em tempo real (Hoje, 15 dias, 30 dias)
- **Ordens de Serviço**: Criação e gerenciamento de O.S. completas
- **Geração de PDF**: Download de O.S. em PDF com logo e branding
- **Gestão de Clientes**: Cadastro completo com veículo e contato
- **Catálogo de Serviços**: Preços e descrições personalizados
- **Convites por Email**: Sistema de convite para novos membros (Nodemailer + Ethereal)
- **Tema Braite**: Interface branca com azul #0071CE
- **Timezone Brasil**: Todos os relatórios em America/Sao_Paulo
- **Responsivo**: Funciona em desktop, tablet e celular

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Node.js
- **Banco de Dados**: PostgreSQL (Railway)
- **Autenticação**: JWT (jsonwebtoken), bcryptjs
- **PDF**: Puppeteer
- **Email**: Nodemailer (Ethereal para dev)

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL (Railway ou local)
- Yarn

## 🚀 Instalação e Configuração

### 1. Clone e instale dependências

```bash
cd /app
yarn install
```

### 2. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Database (obrigatório)
DATABASE_URL=postgresql://user:pass@host:5432/database

# JWT (opcional - valores padrão incluídos)
JWT_SECRET=espaco-braite-jwt-secret-2024-production-change-this
JWT_REFRESH_SECRET=espaco-braite-refresh-secret-2024-production-change-this

# Email (opcional - usa Ethereal test account por padrão)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@espacobraite.com

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Execute as migrações e seed

```bash
# Via API (recomendado)
curl http://localhost:3000/api/setup

# Ou aguarde o servidor iniciar e acesse:
# http://localhost:3000/api/setup
```

Isso criará:
- Todas as tabelas PostgreSQL
- Tenant demo: "Espaço Braite Demo"
- Usuário admin: `admin1` / senha: `123` (email: admin1@braite.test)
- 5 serviços de exemplo
- 1 cliente de exemplo
- 1 ordem paga de exemplo

### 4. Inicie o servidor

```bash
yarn dev
# Servidor rodará em http://localhost:3000
```

## 🔐 Credenciais Demo

```
Usuário: admin1
Senha: 123
```

ou

```
Email: admin1@braite.test
Senha: 123
```

## 📊 Estrutura do Banco de Dados

### Tabelas

- `tenants` - Lava-rápidos (multi-tenant)
- `users` - Usuários do sistema
- `user_tenants` - Relação usuários ↔ tenants com roles
- `clients` - Clientes (isolados por tenant)
- `catalog_items` - Serviços do catálogo
- `orders` - Ordens de serviço
- `order_items` - Itens das ordens
- `invite_tokens` - Convites pendentes (7 dias de validade)
- `audit_logs` - Log de auditoria

### Roles (RBAC)

1. **owner**: Controle total
2. **manager**: Gerencia O.S., serviços, equipe (exceto owner)
3. **attendant**: Cria/edita O.S., marca pagamentos
4. **viewer**: Apenas visualização

## 🎯 Funcionalidades Principais

### Dashboard
- **Card "Hoje"**: Faturamento do dia (timezone America/Sao_Paulo)
- **Card "Últimos 15 Dias"**: Soma de ordens pagas nos últimos 15 dias
- **Card "Últimos 30 Dias"**: Soma de ordens pagas nos últimos 30 dias
- Lista de ordens recentes

### Ordens de Serviço
- Criação com múltiplos serviços
- Seleção de cliente
- Status: Pendente, Em Andamento, Concluído, Pago, Cancelado
- Forma de pagamento
- Observações
- Download em PDF com logo Braite

### Clientes
- Cadastro completo
- Dados do veículo (placa e modelo)
- Histórico de ordens

### Serviços
- Nome, descrição, preço
- Duração estimada
- Catálogo por tenant

### Equipe
- Convite por email (token expira em 7 dias)
- Gerenciamento de roles
- Lista de membros

## 📄 API Endpoints

### Públicos
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar token
- `GET /api/setup` - Executar migrations + seed

### Protegidos (requer JWT)
- `GET /api/me` - Dados do usuário logado
- `GET /api/dashboard` - Dashboard analytics
- `GET /api/clients` - Listar clientes
- `POST /api/clients` - Criar cliente
- `GET /api/services` - Listar serviços
- `POST /api/services` - Criar serviço
- `GET /api/orders` - Listar ordens
- `POST /api/orders` - Criar ordem
- `PUT /api/orders/:id` - Atualizar ordem
- `GET /api/orders/:id/pdf` - Download PDF
- `GET /api/team` - Listar equipe
- `POST /api/team/invite` - Convidar membro

## 🖼️ Logo e Branding

O logo oficial da Espaço Braite está localizado em:
```
/public/assets/logo/teste.png
```

É usado em:
- Tela de login
- Sidebar do dashboard
- PDFs das ordens de serviço

Cor primária Braite: `#0071CE`

## 📧 Sistema de Email

Por padrão, usa **Ethereal** (email de teste) para convites.

Para produção, configure no `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=noreply@espacobraite.com
```

## 🐛 Troubleshooting

### Erro de conexão PostgreSQL
Verifique se o `DATABASE_URL` está correto e acessível.

### Migrations não executadas
Execute manualmente:
```bash
curl http://localhost:3000/api/setup
```

### PDF não gera
Puppeteer precisa de dependências do sistema. Em produção, pode ser necessário instalar:
```bash
apt-get install -y chromium
```

## 🔄 Timezone

Todos os cálculos de faturamento usam timezone `America/Sao_Paulo` para garantir precisão nos relatórios.

## 📦 Dependências Principais

```json
{
  "bcryptjs": "^3.0.2",
  "jsonwebtoken": "^9.0.2",
  "pg": "^8.16.3",
  "puppeteer": "^24.25.0",
  "nodemailer": "^7.0.9",
  "date-fns-tz": "^3.2.0",
  "next": "14.2.3",
  "react": "^18",
  "tailwindcss": "^3.4.1"
}
```

## 📝 Notas de Desenvolvimento

- UUIDs são usados como chaves primárias (não ObjectID do MongoDB)
- Tokens JWT expiram em 15 minutos (access) e 7 dias (refresh)
- PDFs são gerados server-side com Puppeteer
- Multi-tenant via `tenant_id` em todas as queries
- RBAC checado em cada endpoint protegido

## 🚀 Deploy

O sistema está pronto para deploy em:
- Vercel (Next.js nativo)
- Railway (com PostgreSQL)
- AWS / Google Cloud

Configure as variáveis de ambiente adequadamente no painel de deploy.

## 📞 Suporte

Sistema desenvolvido para Espaço Braite - Lava-Rápido e Estética Automotiva.

---

**Desenvolvido com Next.js 14 + PostgreSQL + Tailwind CSS**
