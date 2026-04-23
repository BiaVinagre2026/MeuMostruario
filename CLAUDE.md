# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is **MeuMostruário** — a multi-tenant, white-label SaaS platform for fashion showrooms (mostruários) in Brazil. It is being built on top of an existing CCNF base template (`multitenant-whitelabel-base.tar.gz`). The platform lets boutiques, influencers, and fitness brands publish professional product catalogs without technical staff.

The repo is a **monorepo** with two top-level folders:
- `api/` — Rails 7.2 API-only backend (Ruby 3.3)
- `web/` — React 18 + Vite SPA (admin panel)

Public storefront pages (for SEO) will be served by Rails ERB + Tailwind (not React), following the dual-render architecture decided in the RFC documents.

---

## Commands

### API (Rails)

Run all commands from the `api/` directory.

```bash
# Setup
bundle install
bin/rails db:create db:schema:load db:seed

# Start server
bin/rails server

# Start Sidekiq
bundle exec sidekiq

# Run all tests
bundle exec rspec

# Run a single test file
bundle exec rspec spec/models/tenant_spec.rb

# Run a single example by line
bundle exec rspec spec/models/tenant_spec.rb:42

# Lint
bundle exec rubocop

# Lint with auto-fix
bundle exec rubocop -a

# Generate a migration
bin/rails generate migration AddSlugToProducts slug:string:uniq

# Apply migrations
bin/rails db:migrate

# Security scan
bundle exec brakeman
```

### Web (React/Vite)

Run all commands from the `web/` directory.

```bash
npm install

# Start dev server (port 8080 by default via Vite proxy)
npm run dev

# Build for production
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint
```

### Docker (Production image)

The API Dockerfile bundles Redis + Sidekiq + Puma in a single container via supervisord. PostgreSQL is the only external dependency.

```bash
docker build -t mostruario-api ./api
docker run -e DATABASE_URL=... -e JWT_SECRET=... mostruario-api
```

---

## Architecture

### Multi-tenancy: Schema-per-Tenant

**This is the most critical architectural detail.** The app uses PostgreSQL schema isolation, not row-level multi-tenancy:

- The `public` schema holds **global tables**: `tenants`, `operators`, `partners`, `tenant_configs`, `tenant_partner_authorizations`.
- Each tenant gets its own schema (e.g., `tenant_carolboutique`) containing **tenant-scoped tables**: `members`, `imports`, `notifications`, `webhook_endpoints`, `webhook_deliveries`.
- `TenantProvisioner` (`api/app/services/tenant_provisioner.rb`) creates the schema and runs the DDL from `TenantSchemaSql` when a new tenant is onboarded.
- `TenantSwitcher` (`api/app/services/tenant_switcher.rb`) changes the PostgreSQL `search_path` for each request to route queries to the correct schema.
- `TenantResolver` middleware (`api/app/middleware/tenant_resolver.rb`) resolves the tenant from (in priority order): `X-Admin-Tenant-Slug` header (super-admin targeting), `X-Tenant-ID` header, subdomain, then custom domain. It sets `env["app.tenant"]` and calls `TenantSwitcher.switch!`.

When adding new tenant-scoped tables, add DDL to `TenantSchemaSql` and provision them on existing tenants via a migration.

### Authentication & Three Actor Types

There are three independent actor types with separate JWT tokens (all HS256, stored as signed cookies):

| Actor | Token method | Expiry | Cookie |
|-------|-------------|--------|--------|
| **Member** (tenant user) | `JwtService.encode` | 7 days | `app_token` |
| **Operator** (admin/super-admin) | `JwtService.encode_operator` | 8 hours | `app_operator_token` |
| **Partner** (B2B, API key) | API key in `X-Partner-API-Key` header | — | — |

`ApplicationController` requires a resolved tenant on every request. Auth is opt-in via `before_action :require_auth!` (members) or the `OperatorAuthenticatable` concern (operators). Super-admin operators have `tenant_id: nil`; tenant-scoped operators are restricted to their tenant.

### API Namespace Structure

```
/api/v1/
  auth/*                    → member login/logout/refresh/password reset
  tenant/config             → public branding (white-label theming, no auth)
  profile                   → authenticated member profile
  partner/auth/*            → partner login
  partner/profile           → partner profile + API key regeneration
  admin/auth/*              → operator login
  admin/tenants             → CRUD for all tenants (super-admin)
  admin/tenant/config       → per-tenant branding/email/storage/AI config
  admin/members             → member management + import/export
  admin/upload              → file uploads (S3 or local per tenant config)
  admin/imports/*           → AI-powered CSV/XLSX import workflow
```

### Frontend SPA (`web/`)

The React SPA serves the **admin panel only** — both tenant admins and super-admin operators. Key patterns:

- **State**: Zustand stores (`useAuthStore`, `useOperatorStore`, `usePartnerStore`) for auth state; React Query for server state.
- **Tenant branding**: `TenantProvider` fetches `/api/v1/tenant/config` on load and injects brand colors/fonts. The `TenantResolver` middleware identifies the tenant from the host, so the SPA works correctly on any subdomain or custom domain.
- **Routing**: react-router-dom v6. Member routes are under `ProtectedRoute`; operator routes are under `AdminRoute`.
- **UI components**: shadcn/ui (Radix UI primitives + Tailwind). Add new components from shadcn rather than building from scratch.
- **Forms**: react-hook-form + Zod for validation.
- **API client**: `web/src/lib/api/client.ts` — wraps fetch with base URL from `VITE_API_URL` env var (empty = use Vite proxy in dev).

### Per-Tenant Configuration

`TenantConfig` (one per tenant, in `public` schema) stores all customizable settings as columns: colors, fonts, logo URLs, SMTP/SES credentials (encrypted), S3 credentials (encrypted), OpenRouter model, PSP credentials. Sensitive fields ending in `_enc` are encrypted at rest.

### Background Jobs

Sidekiq workers live in `api/app/jobs/`. Key jobs:
- `SendEmailJob` — uses `EmailDispatcher` which reads per-tenant SMTP/SES config.
- `AnalyzeImportJob` — AI-powered CSV/XLSX analysis via `ImportAnalyzerService` → `AiService` (OpenRouter).
- `MarkOverdueMembersJob` — scheduled via sidekiq-cron.

### Adding New Domain Tables (for MeuMostruário)

When adding product catalog tables (products, collections, looks, etc.):
1. Decide if they are **tenant-scoped** (go in `TenantSchemaSql`) or **global** (go in a standard Rails migration).
2. Catalog tables belong in the tenant schema — add their DDL to `TenantSchemaSql` and write a migration that iterates existing tenants and executes the DDL in each schema.
3. Models for tenant-schema tables use raw SQL or switch the search_path before querying — they do NOT have Rails migrations in the conventional sense.

---

## Environment Variables

### API (`api/.env`)

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | Signing key (min 32 chars in production) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Default AI model for tenants without custom config |
| `FRONTEND_URL` | CORS allowlist |
| `APP_DOMAIN` | Used by TenantResolver to extract subdomains (e.g., `mostruario.app`) |
| `REDIS_URL` | Sidekiq + cache |
| `SMTP_*` | Default mailer (overridden per-tenant by TenantConfig) |

### Web (`web/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | API base URL; leave empty in dev (Vite proxy handles it) |

---

## Coding Conventions

- **Ruby**: rubocop-rails-omakase style (no custom overrides). Run `bundle exec rubocop -a` before committing.
- **TypeScript**: strict mode. All new files use `.tsx` for components, `.ts` for utilities/hooks/types.
- **Tests**: RSpec + FactoryBot for backend; Vitest + Testing Library for frontend. Every new service or model needs a spec.
- **Tenant isolation tests**: Every new tenant-scoped resource must have a test asserting that tenant A cannot access tenant B's data.
