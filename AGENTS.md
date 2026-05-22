# AGENTS.md

Este arquivo orienta agentes Codex neste repositório. Para contexto completo, leia também `CLAUDE.md`.

## Produto

MeuMostruário é uma plataforma white-label multitenant para catálogos de fotos no atacado. Cada tenant representa uma marca, fábrica ou operação comercial com identidade própria, catálogo próprio, compradores próprios e links próprios.

## O Que Implementar

- Experiência multitenant visível na UX, com tenant branding e gestão de tenants para super-admin.
- Catálogo público sem valores para cliente final do cliente.
- Catálogo de atacado com valores para comprador/lojista B2B.
- Upload de muitas fotos de uma vez.
- Triagem automática como sugestão revisável.
- Seleções de fotos e links derivados.
- Pedidos por WhatsApp e lista no admin do tenant.
- Integração com gateway próprio por tenant.

## O Que Não Implementar No MVP

- Remoção da arquitetura schema-per-tenant.
- Login obrigatório para acesso inicial ao catálogo atacado por link tokenizado.
- Lookbook como fluxo principal.
- ERP.
- Migração para Next.js.

## Arquitetura

Mantenha Rails API-only + React/Vite. A arquitetura schema-per-tenant é parte do produto e deve ser aproveitada. `TenantResolver`, `TenantSwitcher` e `TenantProvider` continuam como pilares da solução.

Novas tabelas de domínio devem ser adicionadas a `TenantSchemaSql` e migradas para schemas existentes.

## Regras Críticas

- Link público nunca mostra preço.
- Link público registra apenas interesse.
- Link atacado pode mostrar preço, carrinho, pedido e pagamento.
- Preço pertence ao produto.
- Fotos podem existir antes de produto.
- Várias fotos podem representar o mesmo produto.
- Tamanhos fixos: `P/M`, `M/G`, `Unico`, `Plus 1`, `Plus 2`.
- Pantone aparece no admin e para comprador quando disponível.
- IA nunca publica sozinha; admin aprova.
- Super-admin gerencia tenants; admin opera dentro do tenant ativo.

## Base Git

Base correta desta fase: `7be55ba5` (`versão 1 pronta`). Alterações de 12/05/2026 devem ser ignoradas salvo instrução explícita.
