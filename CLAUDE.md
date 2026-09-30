# CLAUDE.md

Contexto de produto e decisões deste repositório.

> **Leia [AGENTS.md](AGENTS.md) primeiro.** Ele é a fonte única sobre arquitetura,
> fronteiras Core ↔ tenant, git, Docker, banco e testes — e vale para qualquer agente.
> Este arquivo cobre o contexto de produto. Onde os dois divergirem, vale o AGENTS.md.
>
> Regras que o AGENTS.md carrega e que já custaram caro aqui: a suíte nunca roda contra
> banco de desenvolvimento, o Core nunca cita tenant pelo nome, e `git add -A` varre o
> trabalho do outro agente.

## Contexto Atual

**MeuMostruário** é o Core **white-label multitenant**. Cada tenant representa uma marca, fábrica ou operação comercial com identidade própria — catálogo, branding, compradores e pedidos isolados por schema.

Dois tenants reais rodam sobre o mesmo Core hoje, com propósitos diferentes:

| Tenant | Slug | Modo | Frontend |
|---|---|---|---|
| BEFIT - Fitness | `befit` | atacado (link tokenizado, pedido mínimo, grade por tamanho) | `web/` (neste repositório) |
| Maré Coral | `mare-coral` | varejo (carrinho, checkout, frete) | repositório próprio (`github.com/BiaVinagre2026/MareCoral`) |

O que cada tenant pode fazer é **capacidade**, não identidade — `TenantConfig#feature?(:retail_storefront)`, nunca `slug == "mare-coral"` escrito no Core. Ver AGENTS.md, seção de fronteira.

O objetivo do atacado (BEFIT) é permitir que o tenant:

- faça upload de muitas fotos de uma vez;
- revise uma triagem automática por cor, Pantone, modelo e tamanho;
- vincule várias fotos ao mesmo produto;
- gere links públicos sem preço para o cliente final do cliente;
- gere links de atacado com preço, pedido e pagamento para compradores/lojistas B2B;
- receba interesses e pedidos no admin do tenant;
- envie seleções e pedidos por WhatsApp.

O varejo (Maré Coral) usa o mesmo catálogo de produtos do Core, mas com um admin próprio
(`/admin/storefront`) para escolher **quais** produtos publicados entram na vitrine pública —
publicar um produto no admin não o coloca automaticamente na loja; alguém precisa selecioná-lo
em `/admin/storefront`. Isso é curadoria deliberada: a vitrine tem uma regra de negócio de
5 a 10 produtos por drop (`scripts/validate-catalog-integration.mjs` no repo da Maré Coral).

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
- Vitrine varejista (Maré Coral): `api/app/controllers/api/v1/admin/mare_coral_storefront_controller.rb`
  e `web/src/pages/admin/storefront/MareCoralStorefront.tsx` — seleção de produtos publicados.
- Frontend da Maré Coral: repositório próprio, fora deste. Consome `/api/v1/*` com
  `X-Tenant-ID: mare-coral` e o token do link de atacado (`VITE_MOSTRUARIO_CATALOG_TOKEN`).

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

## Estado Atual

Fluxo completo dos dois tenants validado no navegador, ponta a ponta: upload de foto →
catálogo → link → pedido (BEFIT); catálogo → vitrine curada → carrinho → checkout (Maré
Coral). O que falta para operar de verdade:

- **Pagamento nunca falou com a Orbe de verdade.** O contrato real de assinatura
  (`X-PSP-Signature`, HMAC sobre timestamp+corpo) está implementado e testado com resposta
  simulada — falta credencial de merchant e endereço público para o callback. Rode
  `bin/rails gateway:check TENANT=befit` para ver exatamente o que falta por tenant. Ver
  `docs/INTEGRACOES.md`.
- **Deploy do Core/BEFIT não existe.** O `api/Dockerfile` é de produção e o supervisord
  sobe Puma e Sidekiq, mas `web/` (BEFIT) não tem Dockerfile nem Nginx — é SPA Vite sem
  forma de ser servida. Faltam hospedagem, banco gerenciado, domínio e o DNS curinga que o
  subdomínio por tenant exige. O repositório da Maré Coral **já tem** esse caminho pronto
  (`Dockerfile` + `docker-compose.prod.yml`) — assimetria a resolver quando o BEFIT for
  publicado.

  A imagem exige, e não sobe junto: **Redis externo com persistência** (`REDIS_URL`) e as
  **chaves de criptografia** (`AR_ENCRYPTION_*`) que protegem os segredos dos tenants.
  Sem qualquer uma delas a aplicação não sobe, de propósito. Ver [README](README.md).
- **Sem rate limiting nem observabilidade de erro.** Nada entre a aplicação e um cliente
  mal-comportado (`rack-attack` ausente), e nenhum agregador de erro (Sentry ou
  equivalente). Levantado na auditoria de segurança; não bloqueia demonstração, bloqueia
  produção.

Storefront SSR (`api/app/views/public/`) está funcionando e é dirigido pelos dados do
tenant — não tem conteúdo fixo da fase anterior.

### Fronteira Core ↔ tenant

`current_tenant.slug == "mare-coral"` hardcoded em 6 lugares do Core virou
`current_tenant.feature?(:retail_storefront)` (`enabled_features` jsonb em
`tenant_configs`, mesmo padrão de `enabled_payment_methods`). Isso não foi só limpeza:
era a causa raiz do "Slug já está em uso" que quebrava a suíte de testes — os specs eram
obrigados a criar um tenant com aquele slug exato para passar pelo portão. Continua
havendo arquivos nomeados `mare_coral_*` no Core (`app/services/`, `app/controllers/`);
renomear para `retail_*` é dívida pendente, mecânica, separada desta mudança.

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
npm run lint
npm test
```

Se a API subir e não responder, é o PID travado — acontece com frequência:

```bash
rm -f api/tmp/pids/server.pid && docker compose restart api
```

## Qualidade

- CI em `.github/workflows/ci.yml`: RSpec com postgres e redis, mais tipos, lint, testes e
  build no frontend. Roda em push de qualquer branch e em pull request.
- Isolamento entre tenants tem cobertura dedicada em
  `api/spec/requests/api/v1/tenant_isolation_spec.rb`. Todo teste ali afirma os dois lados:
  o tenant dono responde e o outro não. Sem isso um 404 poderia vir de qualquer motivo.
- `bin/rails catalog:repair_legacy_products TENANT=befit` conserta produtos cujo nome e SKU
  foram sobrescritos por uma importação antiga.
- `bin/rails gateway:check TENANT=<slug>` diz se um tenant está pronto para cobrar na Orbe
  — credencial configurada, endereço de callback alcançável, header de assinatura.

## Versionamento

- Usar commits pequenos e descritivos.
- Registrar no commit o que foi produzido no dia.
- Tag sugerida: `dev-YYYY-MM-DD-catalogo-fotos`.
