# ADR-001 — Modelo de Multi-tenancy: Schema-per-Tenant

**Status:** Aceito  
**Data:** 2026-04-20  
**Autores:** Tech Lead

---

## Contexto

A RFC de levantamento de requisitos (v2) sugeriu o uso de `acts_as_tenant` (row-level isolation), gem popular no ecossistema Rails. Entretanto, o template base CCNF já foi implementado com **schema-per-tenant** via PostgreSQL: cada tenant possui seu próprio schema (ex: `tenant_carolboutique`) gerenciado por `TenantProvisioner` e `TenantSchemaSql`. O `ApplicationController` depende de `TenantSwitcher` que altera o `search_path` da conexão.

## Decisão

**Manter schema-per-tenant.** O código implementado vence a sugestão da RFC.

## Consequências

### Positivas
- Isolamento máximo entre tenants — sem risco de vazamento por ausência de `WHERE tenant_id = ?`
- Backup/restore e deleção de tenant são operações de schema (atômicas)
- Performance: sem overhead de índice em `tenant_id` em toda query

### Negativas / Restrições operacionais

| Tópico | Impacto | Mitigação |
|--------|---------|-----------|
| Novas tabelas de domínio | DDL deve ser adicionado a `TenantSchemaSql` **e** migrado em todos os schemas existentes via loop | Migration helper `TenantMigrationHelper` que itera `Tenant.all` e executa DDL em cada schema |
| `pg_search` / full-text | Precisa de configuração por schema (dicionário pt_BR) | Usar `pg_trgm` + índice GIN por ora; `pg_search` em V1 com configuração explícita de schema |
| Analytics cross-tenant | Queries multi-schema são trabalhosas | Tabela de snapshot `public.tenant_metrics` atualizada por job agendado |
| `acts_as_tenant` (gem) | Não usar — incompatível com schema isolation | Já não está no Gemfile |

## Regra para tabelas de domínio

1. Tabelas tenant-scoped (produtos, coleções, looks, leads, etc.) → adicionar SQL em `TenantSchemaSql`
2. Tabelas globais (tenants, operators, partners, tenant_configs) → migration Rails convencional em `db/migrate/`
3. Toda migration que adiciona tabela tenant-scoped **deve** iterar `Tenant.pluck(:schema_name)` e executar o DDL em cada schema
