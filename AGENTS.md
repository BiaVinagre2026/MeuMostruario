# AGENTS.md

Este arquivo orienta agentes Codex neste repositório. Para contexto completo, leia também `CLAUDE.md`.

## Produto

MeuMostruário é uma plataforma de catálogo de fotos para uma fábrica vender no atacado. O admin da fábrica faz upload em lote, revisa triagem automática por cor/Pantone/modelo/tamanho, monta catálogos e gera links por público.

## O Que Implementar

- Catálogo público sem valores para cliente final.
- Catálogo de atacado com valores para lojista comprador.
- Upload de muitas fotos de uma vez.
- Triagem automática como sugestão revisável.
- Seleções de fotos e links derivados.
- Pedidos por WhatsApp e lista no admin.
- Integração com gateway próprio.

## O Que Não Implementar No MVP

- Produto SaaS multiempresa/multitenant na UX.
- Gestão comercial de tenants.
- Planos, billing SaaS ou super-admin multiempresa.
- Login obrigatório do comprador de atacado.
- Lookbook.
- ERP.
- Migração para Next.js.

## Arquitetura

Mantenha Rails API-only + React/Vite. A camada schema-per-tenant existente continua por compatibilidade técnica, usando uma fábrica/tenant padrão internamente. Não remova `TenantResolver`, `TenantSwitcher` ou `TenantProvider` nesta fase.

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

## Base Git

Base correta desta fase: `7be55ba5` (`versão 1 pronta`). Alterações de 12/05/2026 devem ser ignoradas salvo instrução explícita.
