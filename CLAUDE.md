# CLAUDE.md

Guia operacional para trabalhar neste repositório.

## Contexto Atual

**MeuMostruário** agora é uma plataforma de catálogo de fotos para uma fábrica vender no atacado.

O objetivo é permitir que a fábrica:

- faça upload de muitas fotos de uma vez;
- revise uma triagem automática por cor, Pantone, modelo e tamanho;
- vincule várias fotos ao mesmo produto;
- gere links públicos sem preço para o cliente final do cliente;
- gere links de atacado com preço, pedido e pagamento para lojistas compradores;
- receba interesses e pedidos no admin;
- envie seleções e pedidos por WhatsApp.

O lojista acessa como **comprador da fábrica no atacado**. O MVP não é multiempresa/multitenant como produto, embora a base técnica schema-per-tenant seja mantida por compatibilidade com a versão anterior.

## Stack

- `api/`: Rails 7.2 API-only, PostgreSQL, Redis, Sidekiq.
- `web/`: React 18 + Vite + TypeScript.
- Desenvolvimento local: Windows 11, WSL, Docker e Docker Compose.
- Frontend atual permanece em Vite; Next.js fica fora desta fase.

## Decisões de Produto

- Base correta para esta fase: commit `7be55ba5` (`versão 1 pronta`).
- Alterações feitas em 12/05/2026 não devem ser reaproveitadas.
- Não implementar SaaS multiempresa no MVP.
- Manter um tenant/fábrica padrão internamente para reduzir risco técnico.
- Não exibir gestão de tenants, billing SaaS, planos, white-label multiempresa ou super-admin como fluxo de produto.
- Lookbook está fora do MVP.
- Login do comprador de atacado fica para fase futura; no MVP o acesso é por link com token.
- ERP fica para fase futura.
- Estoque real está previsto, mas não bloqueia o início.

## Regras Comerciais

- Link público de cliente final nunca exibe preço, carrinho, checkout ou pagamento.
- Link público registra apenas interesse.
- Link de atacado pode exibir preço, carrinho, pedido, WhatsApp e pagamento.
- Preço fica no produto.
- Fotos e variantes carregam atributos visuais: cor, Pantone, modelo, tamanho e disponibilidade.
- Tamanhos fixos do MVP: `P/M`, `M/G`, `Unico`, `Plus 1`, `Plus 2`.
- Uma foto pode existir sem produto no início.
- Várias fotos podem representar o mesmo produto, normalmente em cores diferentes.
- Triagem por IA é sempre sugestão; admin precisa revisar/aprovar.
- Pedidos guardam snapshot dos dados comerciais no momento da compra.
- Dados sensíveis de cartão nunca são armazenados.

## Arquitetura Mantida

A base antiga usa schema-per-tenant:

- `TenantResolver` resolve tenant por header/subdomínio.
- `TenantSwitcher` altera `search_path`.
- `TenantSchemaSql` provisiona tabelas de domínio.

Nesta fase, tratar isso como detalhe de compatibilidade. Novas tabelas de domínio continuam sendo adicionadas em `TenantSchemaSql` e migradas para schemas existentes, mas a UX deve falar em fábrica, admin e comprador.

## Principais Áreas

- Admin de produtos: `web/src/pages/admin/products/`.
- Admin de pedidos: `web/src/pages/admin/orders/`.
- Admin shell: `web/src/components/admin/AdminLayout.tsx`.
- Catálogo público/atacado web: `web/src/pages/`.
- API pública: `api/app/controllers/api/v1/`.
- API admin: `api/app/controllers/api/v1/admin/`.
- Modelos tenant-scoped: `api/app/models/`.
- DDL tenant-scoped: `api/app/services/tenant_schema_sql.rb`.

## Fluxos do MVP

1. Admin sobe lote de fotos.
2. Backend cria `photo_batch` e `photos`.
3. Jobs processam triagem e salvam sugestões.
4. Admin revisa/corrige fotos em massa.
5. Admin vincula fotos a produtos ou cria produto a partir de foto.
6. Admin cria catálogo e links.
7. Cliente final acessa link público sem valores e registra interesse.
8. Comprador atacado acessa link com valores e envia pedido.
9. Pedido aparece no admin e pode iniciar pagamento via gateway próprio.

## Comandos

Backend:

```bash
docker compose up postgres redis api -d
docker compose exec api bin/rails db:migrate
docker compose exec api bundle exec rspec
```

Frontend:

```bash
cd web
npm install
npm run dev
npm run build
npx tsc --noEmit
npm test
```

## Versionamento

- Usar commits pequenos e descritivos.
- Registrar no commit o que foi produzido no dia.
- Tag sugerida: `dev-YYYY-MM-DD-catalogo-fotos`.
