# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

**MeuMostruário** — plataforma SaaS multi-tenant white-label para showrooms de moda no Brasil. Permite que boutiques, influencers e marcas fitness publiquem catálogos profissionais sem equipe técnica.

O repo é um **monorepo** com duas pastas raiz:
- `api/` — Rails 7.2 API-only backend (Ruby 3.3)
- `web/` — React 18 + Vite SPA (painel admin + showroom B2B)

### Arquitetura de render dual

| Camada | Stack | Finalidade |
|--------|-------|-----------|
| **Showroom B2B (lojista)** | React SPA em `web/` | Catálogo, lookbook, carrinho, login de membro — servido via Vite em dev / build estático em prod |
| **Painel Admin** | React SPA em `web/` | Gestão de produtos, coleções, pedidos, membros — mesmo bundle |
| **Storefront público (SEO)** | Rails ERB + Tailwind em `api/app/controllers/public/` | SSR para buscadores — **esqueleto existe, páginas precisam de conteúdo** |

---

## Ambiente de desenvolvimento local

```
Frontend (Vite):  http://localhost:3000
Backend (Rails):  http://localhost:8000  ← via Docker
```

### Subir o ambiente

```bash
# Backend (rodar na raiz do repo)
docker compose up postgres redis api -d

# Frontend (rodar em web/)
npm run dev
```

> **Tenant em dev**: a resolução de tenant usa subdomínio em produção. Em desenvolvimento local (`localhost`) não há subdomínio, então o tenant é injetado via `VITE_TENANT_SLUG` em `web/.env`. O valor padrão é `demo`. O `TenantProvider` usa esse fallback para enviar `X-Tenant-ID: demo` em todas as requisições.

### Comandos Rails via Docker

```bash
# Migrations
docker compose exec api bin/rails db:migrate

# Console
docker compose exec api bin/rails console

# Testes
docker compose exec api bundle exec rspec

# Lint
docker compose exec api bundle exec rubocop -a

# Seed
docker compose exec api bin/rails db:seed
```

### Comandos Web (rodar em `web/`)

```bash
npm install
npm run dev          # dev server porta 3000
npm run build        # build de produção
npm test             # Vitest
npm run test:watch
npm run lint
npx tsc --noEmit     # type check sem build
```

### Docker (imagem de produção)

```bash
docker build -t mostruario-api ./api
docker run -e DATABASE_URL=... -e JWT_SECRET=... mostruario-api
```

---

## Arquitetura

### Multi-tenancy: Schema-por-Tenant

**Detalhe arquitetural mais crítico.** O app usa isolamento por schema PostgreSQL, não row-level multi-tenancy:

- Schema `public` contém **tabelas globais**: `tenants`, `operators`, `partners`, `tenant_configs`, `tenant_partner_authorizations`.
- Cada tenant tem seu próprio schema (ex.: `tenant_carolboutique`) com **tabelas tenant-scoped**: `members`, `imports`, `notifications`, `webhook_endpoints`, `webhook_deliveries`, `categories`, `collections`, `products`, `product_variants`, `product_images`, `looks`, `look_items`, `leads`, `waitlists`, `orders`, `order_items`.
- `TenantProvisioner` (`api/app/services/tenant_provisioner.rb`) cria o schema e executa o DDL de `TenantSchemaSql` ao onboarding.
- `TenantSwitcher` (`api/app/services/tenant_switcher.rb`) muda o `search_path` do PostgreSQL por request.
- `TenantResolver` middleware (`api/app/middleware/tenant_resolver.rb`) resolve o tenant por (ordem de prioridade): header `X-Admin-Tenant-Slug`, header `X-Tenant-ID`, subdomínio, domínio customizado.

**Ao adicionar tabelas tenant-scoped:**
1. Adicionar DDL em `TenantSchemaSql` (`api/app/services/tenant_schema_sql.rb`).
2. Escrever uma migration que itera os tenants existentes com `TenantSwitcher.switch!(tenant.schema_name)` e executa o DDL.
3. Modelos para tabelas tenant-schema **não usam migrations Rails convencionais**.

### Autenticação: Três tipos de ator

| Ator | Método | Expiração | Cookie |
|------|--------|-----------|--------|
| **Member** (usuário do tenant) | `JwtService.encode` | 7 dias | `app_token` |
| **Operator** (admin/super-admin) | `JwtService.encode_operator` | 8 horas | `app_operator_token` |
| **Partner** (B2B, API key) | `X-Partner-API-Key` header | — | — |

Auth é opt-in: `before_action :require_auth!` (members) ou concern `OperatorAuthenticatable` (operators). Operators super-admin têm `tenant_id: nil`.

### Estrutura de endpoints da API

```
/api/v1/
  auth/*                    → login/logout/refresh/reset de senha do member
  tenant/config             → branding público (sem auth) — usado pelo TenantProvider
  profile                   → perfil do member autenticado

  # Catálogo público (sem auth)
  products          GET /index, /show  → lista e detalhe de produto (por slug)
  collections       GET /index, /show
  categories        GET /index
  looks             GET /index, /show  → lista e detalhe de look (com produtos)
  leads             POST /create       → captura de interesse / pedido WhatsApp
  waitlists         POST /create

  # Member autenticado
  orders            GET /index, POST /create  → pedidos B2B

  # Partner
  partner/auth/*
  partner/profile

  # Admin (operator autenticado)
  admin/auth/*
  admin/tenants             → CRUD de tenants (super-admin)
  admin/tenant/config       → branding/email/storage/AI config
  admin/members             → gestão de membros + import/export
  admin/products            → CRUD + variants + images
  admin/collections         → CRUD
  admin/categories          → CRUD
  admin/orders              → listagem + update de status
  admin/upload              → upload de arquivo (S3 ou local)
  admin/imports/*           → workflow de import AI (CSV/XLSX)
```

---

## Camada Showroom (React SPA — `web/`)

O SPA serve **tanto o showroom B2B quanto o painel admin**, no mesmo bundle.

### Rotas do showroom

| Path | Componente | Descrição |
|------|-----------|-----------|
| `/` | `pages/Home.tsx` | Hero + coleções + destaques + tiers de desconto |
| `/catalog` | `pages/Catalog.tsx` | Tabela wholesale com filtros + carrinho |
| `/product/:id` | `pages/ProductDetail.tsx` | Detalhe de produto + variantes + WhatsApp |
| `/lookbook` | `pages/Lookbook.tsx` | Grid de looks (API) com fallback editorial estático |
| `/login` | `pages/Login.tsx` | Login de membro |
| `/dashboard` | `pages/Dashboard.tsx` | Área do lojista autenticado |

### Layout do showroom

`ShowroomLayout` (`components/showroom/ShowroomLayout.tsx`) envolve as rotas acima com:
- `TopBar` — barra de anúncios + header sticky com logo, nav (Início / Catálogo / Lookbook), ícones de busca / usuário / carrinho / admin
- `CartDrawer` — gaveta de carrinho lateral com pedido mínimo, tiers de desconto e envio via WhatsApp
- Footer

### Hooks de catálogo — `web/src/hooks/useCatalog.ts`

Todos os hooks usam `apiClient` (que injeta `X-Tenant-ID` automaticamente) e `useTenant().tenantSlug` como parte da query key do React Query.

| Hook | Endpoint | Tipo retornado |
|------|----------|---------------|
| `useProducts(params?)` | `GET /api/v1/products` | `Product[]` |
| `useProduct(slug)` | `GET /api/v1/products/:slug` | `Product` |
| `useCollections()` | `GET /api/v1/collections` | `Collection[]` |
| `useCategories()` | `GET /api/v1/categories` | `Category[]` |
| `useLooks()` | `GET /api/v1/looks` | `Look[]` |
| `useLook(slug)` | `GET /api/v1/looks/:slug` | `Look` (com `products[]`) |

### Adaptador de catálogo — `web/src/lib/catalog-adapter.ts`

Mapeia os shapes brutos da API (`ApiProduct`, `ApiCollection`, `ApiLook`, etc.) para os tipos tipados do frontend (`Product`, `Collection`, `Look`). Funções exportadas: `adaptProduct`, `adaptCollection`, `adaptCategory`, `adaptLook`.

### Tipos de catálogo — `web/src/types/catalog.ts`

`Product`, `Collection`, `Category`, `Look`, `LookProduct`, `CartItem`, `Color`, `ProductImage`, `Tier`, `Tenant`, `ToneEntry`, `LookbookStory`.

### API Client — `web/src/lib/api/client.ts`

Wrapper sobre `fetch` com:
- Base URL via `VITE_API_URL` (vazio em dev → Vite proxy)
- Injeção automática de `X-Tenant-ID` (subdomínio → `getActiveTenantSlug()` → `VITE_TENANT_SLUG`)
- Injeção de `X-Admin-Tenant-Slug` para rotas admin scoped
- Auto-logout em 401 por tipo de ator
- Métodos: `apiClient.get`, `.post`, `.patch`, `.del`

### TenantProvider — `web/src/providers/TenantProvider.tsx`

- Busca `/api/v1/tenant/config` no mount
- Injeta variáveis CSS (`--brand-primary`, etc.) no `document.documentElement`
- Carrega fontes do Google Fonts dinamicamente
- Expõe via `useTenant()`: `tenantSlug`, `tenantName`, cores, fontes, config de moedas, social, etc.
- Em dev sem subdomínio, usa `VITE_TENANT_SLUG` como fallback de `X-Tenant-ID`

### Estado global — Zustand

| Store | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| `useAuthStore` | `stores/useAuthStore.ts` | Auth do member (JWT + dados do usuário) |
| `useOperatorStore` | `stores/useOperatorStore.ts` | Auth do operator (admin) |
| `usePartnerStore` | `stores/usePartnerStore.ts` | Auth do partner |
| `useCartStore` | `stores/useCartStore.ts` | Itens do carrinho, abrir/fechar gaveta |

### Dados estáticos de fallback — `web/src/data/catalog.ts`

Exporta `TENANT`, `PRODUCTS`, `LOOKBOOK`, `TIERS`, `TONE`, `brl()`, `activeTier()`. Usado como fallback quando a API não retorna dados ou para o lookbook editorial estático. **Não é a fonte de verdade em produção** — os dados reais vêm da API.

---

## Banco de dados — Tabelas tenant-scoped relevantes

### products

Colunas relevantes adicionadas para MeuMostruário:
- `made_in VARCHAR(100)` — país/região de fabricação
- `min_order_qty INTEGER DEFAULT 1` — MOQ do produto
- `fabric_composition VARCHAR(255)`, `care_instructions TEXT`, `size_guide JSONB`
- `whatsapp_message TEXT` — mensagem customizada de WhatsApp por produto

Migration aplicada: `20260501000001_add_made_in_and_min_order_qty_to_products.rb`

### product_variants

- `color VARCHAR(60)`, `color_hex VARCHAR(7)` — cor e hex para o adaptador de tons
- `image_url VARCHAR(500)` — imagem por variante de cor (usado em `colorImages` no frontend)

### leads

- `source VARCHAR(50)` — valores válidos: `storefront`, `whatsapp`, `instagram`, `other`
- `message TEXT` — corpo da mensagem (não `notes`)
- `metadata JSONB` — campos extras B2B (empresa, CNPJ, endereço) armazenados aqui

### looks / look_items

- `looks`: `name`, `slug`, `description`, `cover_url`, `status`, `position`, `collection_id`
- `look_items`: join entre `looks` e `products` com `position`

---

## Variáveis de ambiente

### API (`api/.env`)

| Variável | Finalidade |
|----------|-----------|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL |
| `JWT_SECRET` | Chave de assinatura (mín. 32 chars em produção) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | IA padrão para import de catálogo |
| `FRONTEND_URL` | CORS allowlist |
| `APP_DOMAIN` | Usado pelo TenantResolver para extrair subdomínios (ex.: `mostruario.app`) |
| `REDIS_URL` | Sidekiq + cache |
| `SMTP_*` | Mailer padrão (sobrescrito por TenantConfig) |

### Web (`web/.env`)

| Variável | Finalidade |
|----------|-----------|
| `VITE_API_URL` | Base URL da API; deixar vazio em dev (Vite proxy) |
| `VITE_TENANT_SLUG` | Slug do tenant em dev local (ex.: `demo`) |

---

## Convenções de código

- **Ruby**: estilo rubocop-rails-omakase. Rodar `bundle exec rubocop -a` antes de commitar.
- **TypeScript**: strict mode. Componentes em `.tsx`, utilitários/hooks/tipos em `.ts`.
- **Sem comentários desnecessários**: só comentar o "por quê" não óbvio.
- **Testes**: RSpec + FactoryBot no backend; Vitest + Testing Library no frontend. Todo serviço ou model novo precisa de spec.
- **Isolamento de tenant**: todo recurso tenant-scoped novo precisa de teste assertando que tenant A não acessa dados do tenant B.

---

## O que está pronto (estado atual)

### Backend (api/)
- [x] Base CCNF: multi-tenancy, auth de 3 atores, jobs, config por tenant
- [x] Catálogo tenant-scoped: `products`, `product_variants`, `product_images`, `categories`, `collections`
- [x] Looks: `looks`, `look_items` — DDL no `TenantSchemaSql`
- [x] `GET /api/v1/looks` e `GET /api/v1/looks/:slug` — controller público sem auth
- [x] `GET /api/v1/products` — inclui `made_in`, `min_order_qty`, `image_url` por variante
- [x] `POST /api/v1/leads` — suporta formulários B2B (campos extras em `metadata`)
- [x] Migration `made_in` + `min_order_qty` aplicada em todos os tenants
- [x] Storefront SSR esqueleto: `public/` controllers existem (home, products, collections, looks, leads, sessions, sitemaps, lojistas, cart, waitlist)

### Frontend (web/)
- [x] ShowroomLayout com TopBar (Início / Catálogo / Lookbook), CartDrawer, Footer
- [x] `Home.tsx` — hero dinâmico, coleções, destaques, tiers, modal "Como Funciona" (provador virtual), modal B2B
- [x] `Catalog.tsx` — tabela wholesale com filtros, `requireAuth` no addToCart/onOpen
- [x] `ProductDetail.tsx` — imagens, variantes, seletor de cor/tamanho/qtd, WhatsApp com mensagem
- [x] `Lookbook.tsx` — grid dinâmico (API) com modal de detalhe; fallback editorial estático
- [x] `useCatalog.ts` — hooks unificados via `apiClient` (useProducts, useProduct, useCollections, useCategories, useLooks, useLook)
- [x] `catalog-adapter.ts` — adaptadores completos incluindo `adaptLook`
- [x] `TenantProvider` — branding dinâmico, injeção de CSS vars, suporte a `VITE_TENANT_SLUG` em dev
- [x] `apiClient` — injeção automática de `X-Tenant-ID`, auto-logout 401, métodos get/post/patch/del

---

## O que ainda falta

### Prioridade alta
- [ ] **SSR controllers públicos** — `api/app/controllers/public/` existe mas as views ERB precisam de conteúdo para SEO real
- [ ] **Testes de isolamento de tenant** para looks, leads e orders
- [ ] **TopBar animada** — link Lookbook adicionado mas banner hardcoded ("Drop Solar") ainda usa dados estáticos

### Prioridade média
- [ ] **Admin de Looks** — CRUD no painel admin (só existe no storefront público)
- [ ] **Contagem de categorias** — `adaptCategory` retorna `count: 0`; a API não retorna product_count por categoria ainda
- [ ] **Paginação no catálogo** — `useProducts` não lida com `meta.pagination` da API ainda
- [ ] Mover scripts de `api/script/` para `api/lib/tasks/`

### Prioridade baixa
- [ ] Testes de frontend (Vitest) para os novos hooks e componentes de showroom
- [ ] Sitemap dinâmico no controller SSR
