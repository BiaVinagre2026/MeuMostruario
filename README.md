# MeuMostruário

Plataforma white-label multitenant para catálogos de fotos no atacado. Cada tenant é uma
marca, fábrica ou operação comercial com catálogo, branding, compradores e links próprios.

O fluxo central é: **subir um lote de fotos → revisar a triagem automática → virar produto →
montar catálogo → gerar link → receber interesse ou pedido**.

- **Link público** (cliente final): nunca mostra preço, só registra interesse.
- **Link de atacado** (lojista B2B): mostra preço, monta carrinho e fecha pedido.
- **Super-admin**: cria, suspende e reativa tenants.

## Onde está o código

> O desenvolvimento acontece na branch **`feature/catalogo-fotos-fabrica`**.
> A `main` ainda não recebeu este trabalho — quem ficar nela não vê o produto de catálogo de fotos.

```bash
git clone https://github.com/BiaVinagre2026/MeuMostruario.git
cd MeuMostruario
git checkout feature/catalogo-fotos-fabrica
```

## Stack

| | |
|---|---|
| `api/` | Rails 7.2 API-only, Ruby 3.3, PostgreSQL (schema-per-tenant), Redis, Sidekiq |
| `web/` | React 18 + Vite + TypeScript |
| Local | Docker e Docker Compose; frontend roda fora do Docker |

## Subindo o ambiente

Precisa de **Docker**, **Docker Compose** e **Node 20+**.

### 1. Variáveis de ambiente

O `docker compose` exige `api/.env` — sem ele a API não sobe.

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env
```

Para desenvolvimento local os valores padrão já servem. Duas observações:

- `SECRET_KEY_BASE` pode ficar vazio em desenvolvimento.
- `OPENROUTER_API_KEY` é opcional. Sem chave, a triagem de fotos usa uma heurística
  local por nome de arquivo em vez da IA — o fluxo funciona igual.

### 2. Backend

```bash
docker compose up postgres redis api -d
```

A primeira subida instala as gems e roda as migrations, o que leva alguns minutos.
Acompanhe com `docker compose logs -f api` e espere o Puma. Confira em <http://localhost:8000/up>.

### 3. Dados de demonstração

Popula dois tenants, produtos, lotes de fotos, catálogos e links:

```bash
docker compose exec api bin/rails db:seed
```

As fotos vêm de `api/public/uploads/seed_source/`, que é versionada. O seed copia para
uma pasta por tenant e imprime no final os links públicos e de atacado gerados —
**os tokens são aleatórios a cada execução**, então use os que aparecerem no seu terminal.

### 4. Frontend

Rode **fora do Docker**. No Windows o hot reload não funciona com o volume montado.

```bash
cd web
npm install
npm run dev
```

Abra <http://localhost:3000>.

## Acessos de demonstração

Senha de todos: `password123`.

| Perfil | Entrar em | Tenant | E-mail |
|---|---|---|---|
| Super-admin | `/admin/login` | `demo` | `super@admin.com` |
| Admin do tenant | `/admin/login` | `demo` | `admin@demo.com` |
| Admin do tenant | `/admin/login` | `acme` | `admin@acme.com` |
| Comprador B2B | `/login` | `demo` | CPF `52998224725` |

Os tenants `demo` e `acme` são operações isoladas — servem para conferir que um não
enxerga o catálogo, os compradores nem os pedidos do outro.

## Roteiro de avaliação

1. Entre no admin como `admin@demo.com` e abra **Catálogos**.
2. Em qualquer catálogo, gere um **link público** e um **link de atacado**.
3. Abra os dois em aba anônima. O público não mostra preço nem botão de pedido; o de
   atacado mostra preço, aceita quantidade por tamanho e fecha pedido.
4. Envie um pedido pelo link de atacado e veja ele aparecer em **Pedidos** no admin.
5. Em **Fotos**, suba um lote e acompanhe a triagem sugerir cor, Pantone, modelo e tamanho.
6. Em **Configurações → Identidade visual**, troque a cor primária e envie um logo. A
   prévia responde na hora e a mudança vale para o admin e para os links públicos.
7. Em **Configurações → Pagamento**, veja onde o tenant conecta o próprio gateway.
8. Entre como `super@admin.com` para ver o painel global e o CRUD de tenants.

## Comandos

```bash
# Testes do backend
docker compose exec api bundle exec rspec

# Testes e tipos do frontend
cd web && npm test
cd web && npx tsc --noEmit

# Build de produção do frontend
cd web && npm run build
```

## Problemas comuns

**A API sobe mas não responde, e o log diz `A server is already running`.**
PID travado — acontece com frequência neste projeto.

```bash
rm -f api/tmp/pids/server.pid
docker compose restart api
```

**Porta ocupada.** `docker compose down` libera as portas antes de subir de novo.

**Imagens quebradas no catálogo.** O `db:seed` não rodou, ou rodou sem
`api/public/uploads/seed_source/` presente.

## O que ainda não está pronto

> Pagamento e WhatsApp têm guia próprio: **[docs/INTEGRACOES.md](docs/INTEGRACOES.md)**.

- **Pagamento**: integrado com a Orbe PSP (Pix), mas ainda **não validado contra o gateway
  real** — falta credencial de merchant e um endereço público para o callback.
- **WhatsApp**: integrado apenas no carrinho do showroom legado; o catálogo por link
  ainda não envia. O número já é editável em Configurações.
- **Storefront SSR** (`api/app/views/public/`): conteúdo ainda é o do showroom de moda
  anterior, não o de fábrica.

Para o contexto de produto e as decisões de arquitetura, veja [CLAUDE.md](CLAUDE.md).
