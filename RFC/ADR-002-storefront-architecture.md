# ADR-002 — Arquitetura do Storefront Público (SSR vs. SPA)

**Status:** Aceito  
**Data:** 2026-04-20  
**Autores:** Tech Lead

---

## Contexto

A plataforma precisa de páginas públicas de catálogo (por tenant) indexáveis por buscadores — Google, Bing, Pinterest. São páginas de produto, coleção, look e home do mostruário.

O `ApplicationController` herda de `ActionController::API`, que remove todo o stack de views (sem ERB, sem layouts, sem helpers). O CLAUDE.md define que o storefront usará "Rails ERB + Tailwind", mas não havia decisão formal de como integrar isso a uma app API-only.

## Opções Avaliadas

### Opção A — App Rails separada (segundo processo)
Uma app Rails full-stack independente, somente para o storefront, consumindo a API interna.

- **Prós:** separação total; pode usar Hotwire/Turbo livremente
- **Contras:** duplica infraestrutura; segundo deploy; latência extra por chamar a própria API

### Opção B — Namespace `Public::` dentro da app `api/` com herança dual *(escolhida)*
Manter a app `api/` mas adicionar controllers que herdam de `ActionController::Base` (não de `ApplicationController`). O namespace `Public::` usa views ERB + layout próprio.

- **Prós:** zero infra extra; `TenantResolver` middleware já resolve o tenant antes de qualquer controller; assets Tailwind compilados junto com o build existente
- **Contras:** a app deixa de ser "pura API-only" — aceitável dado que é uma separação de namespace, não de responsabilidade

### Opção C — React SPA com SSG/ISR (ex: Next.js separado)
- **Contras:** terceiro repositório/deploy; fora do escopo decidido

## Decisão

**Opção B — Namespace `Public::` dentro da app `api/`**, com as seguintes especificações:

1. `ApplicationController` continua herdando de `ActionController::API` (sem mudança para rotas `/api/v1/*`)
2. Novo `Public::BaseController < ActionController::Base` — herança explícita, sem relação com `ApplicationController`
3. `Public::BaseController` inclui `before_action :resolve_tenant!` (lê `request.env["app.tenant"]` setado pelo `TenantResolver` middleware, que já roda antes de qualquer controller)
4. Assets: usar `tailwindcss-rails` gem (adicionar ao Gemfile) com config separada `tailwind.storefront.config.js` para não misturar com assets da API
5. Rotas do storefront ficam **fora** do bloco `namespace :api` em `routes.rb`, no escopo raiz

## Estrutura de rotas do storefront

```ruby
# Rotas públicas do storefront (fora do namespace :api)
scope module: "public" do
  root to: "home#index"
  get "colecoes/:slug",        to: "collections#show", as: :public_collection
  get "produtos/:slug",        to: "products#show",    as: :public_product
  get "looks/:slug",           to: "looks#show",       as: :public_look
  post "leads",                to: "leads#create"
  post "waitlist",             to: "waitlist#create"
  get "sitemap.xml",           to: "sitemaps#show", defaults: { format: :xml }
end
```

## Consequências

- `TenantResolver` middleware deve continuar rodando para **todas** as rotas (já é o comportamento atual)
- Cache fragment com Redis: `cache ["storefront/product", product.id, product.updated_at]`
- JSON-LD `schema.org/Product` embutido via helper no layout ERB
- Storefront **não** usa `require_tenant!` do `ApplicationController` — usa lógica própria em `Public::BaseController`
