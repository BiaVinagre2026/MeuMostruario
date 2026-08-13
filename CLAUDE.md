# CLAUDE.md

Guia operacional para trabalhar neste repositório.

## Contexto Atual

**MeuMostruário** voltou ao trilho de produto **white-label multitenant**. Cada tenant representa uma marca, fábrica ou operação comercial que usa o catálogo para vender no atacado com identidade própria.

O objetivo é permitir que cada tenant:

- faça upload de muitas fotos de uma vez;
- revise uma triagem automática por cor, Pantone, modelo e tamanho;
- vincule várias fotos ao mesmo produto;
- gere links públicos sem preço para o cliente final do cliente;
- gere links de atacado com preço, pedido e pagamento para compradores/lojistas B2B;
- receba interesses e pedidos no admin do tenant;
- envie seleções e pedidos por WhatsApp.

Existe também um papel de **super-admin**, responsável por criar, ativar, suspender e acompanhar tenants.

## Stack

- `api/`: Rails 7.2 API-only, PostgreSQL, Redis, Sidekiq.
- `web/`: React 18 + Vite + TypeScript.
- Desenvolvimento local: Windows 11, WSL, Docker e Docker Compose.
- Frontend atual permanece em Vite; Next.js fica fora desta fase.

## Decisões de Produto

- Base correta para esta fase: commit `7be55ba5` (`versão 1 pronta`).
- Alterações feitas em 12/05/2026 não devem ser reaproveitadas.
- Manter o produto como white-label multitenant, aproveitando a base herdada.
- Cada tenant deve enxergar apenas seu próprio catálogo, branding, compradores, pedidos e links.
- Super-admin tem visão global e CRUD de tenants.
- Lookbook continua fora do fluxo principal.
- Login do comprador atacado pode continuar fase futura; o MVP aceita acesso por link com token.
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
- Link que cobra exige CPF ou CNPJ do comprador: o gateway recusa cobrança sem documento.
- Falha ao emitir cobrança não invalida o pedido — o pedido vale mais que a cobrança.

## Arquitetura Mantida

A base usa schema-per-tenant:

- `TenantResolver` resolve tenant por header/subdomínio.
- `TenantSwitcher` altera `search_path`.
- `TenantSchemaSql` provisiona tabelas de domínio tenant-scoped.

Nesta fase, isso deixa de ser apenas compatibilidade e volta a ser parte do produto. Novas tabelas de domínio continuam sendo adicionadas em `TenantSchemaSql` e migradas para schemas existentes.

## Principais Áreas

- Admin de tenants: `api/app/controllers/api/v1/admin/tenants_controller.rb`.
- Admin de produtos: `web/src/pages/admin/products/`.
- Admin de pedidos: `web/src/pages/admin/orders/`.
- Admin shell: `web/src/components/admin/AdminLayout.tsx`.
- Catálogo público/atacado web: `web/src/pages/`.
- API pública: `api/app/controllers/api/v1/`.
- API admin: `api/app/controllers/api/v1/admin/`.
- Modelos tenant-scoped: `api/app/models/`.
- DDL tenant-scoped: `api/app/services/tenant_schema_sql.rb`.
- Gateway de pagamento: `api/app/services/gateway_payment_service.rb` e `docs/INTEGRACOES.md`.

## Fluxos do MVP

1. Super-admin cria ou ativa um tenant.
2. Tenant recebe branding e operação isolada.
3. Admin do tenant sobe lote de fotos.
4. Backend cria `photo_batch` e `photos`.
5. Jobs processam triagem e salvam sugestões.
6. Admin revisa/corrige fotos em massa.
7. Admin vincula fotos a produtos ou cria produto a partir de foto.
8. Admin cria catálogo e links.
9. Cliente final acessa link público sem valores e registra interesse.
10. Comprador atacado acessa link com valores, informa CPF/CNPJ e envia pedido.
11. Pedido aparece no admin do tenant e gera cobrança Pix na Orbe PSP, quando o tenant tem
    gateway configurado. O comprador recebe QR Code e copia-e-cola na própria tela.
12. A Orbe avisa `POST /api/v1/payments/webhook/:tenant_slug` a cada mudança de status.

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
