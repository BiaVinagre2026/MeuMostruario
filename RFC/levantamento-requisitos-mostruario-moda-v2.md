# Levantamento de Requisitos — Plataforma de Mostruário de Moda
### Multi-tenant · White-label · Moda feminina, fitness, praia & acessórios

> **Autor:** Gerente de Marketing Criativo (perspectiva estratégica)
> **Cliente:** Beatriz Santos Maia Vinagre
> **Versão:** 2.0 — Stack tecnológico do CCNF integrado
> **Data:** 20/04/2026

---

## 1. Resumo Executivo

Criar uma plataforma SaaS que permite que **marcas, boutiques, influenciadoras e sacoleiras digitais** publiquem um mostruário profissional de suas coleções — roupas, biquínis, moda fitness e acessórios — em poucos minutos, sem depender de equipe técnica.

A plataforma é:
- **Multi-tenant**: cada cliente (marca) tem seu espaço isolado, com seus dados, produtos, clientes e métricas.
- **White-label**: cada marca aparece com sua própria identidade visual — logo, cores, tipografia, domínio próprio. O consumidor final **não vê** a marca da plataforma.
- **Mostruário-first, não e-commerce**: o foco inicial é **apresentar, encantar e gerar lead qualificado** (WhatsApp, formulário, reserva). Evolução para checkout integrado fica em fase 2.
- **Reaproveitamento forte do stack CCNF**: Rails 7.2 API + PostgreSQL + Redis + Sidekiq + S3 — já dominado e rodando em produção. Nova camada de views públicas (SSR com ERB + Tailwind) e painel React SPA.

**Tagline interna de trabalho:** *"Sua coleção merece uma vitrine à altura. Em 15 minutos. Sem programador."*

---

## 2. Posicionamento & Pilares Criativos de Marca

### 2.1 Proposta de valor (um só parágrafo)
Para marcas de moda que querem vender online sem as dores de um e-commerce completo, a plataforma entrega uma **vitrine digital profissional, personalizável e independente** — onde cada peça é apresentada com o cuidado visual de uma editorial e cada cliente é encaminhado para o canal de venda preferido da marca (WhatsApp, Instagram, marketplace, loja física).

### 2.2 Pilares criativos
1. **Editorial, não catálogo.** A foto é a protagonista. O design serve à peça, não compete com ela.
2. **Identidade, não template.** Cada marca precisa parecer única — nunca um clone da anterior.
3. **Velocidade com alma.** Subir uma coleção em 15 minutos, mas com acabamento que pareça ter levado semanas.
4. **Mobile-first, obsessivamente.** 80%+ do tráfego de moda vem do celular. A experiência mobile **é** o produto.
5. **Conversa antes de conversão.** Priorizamos o lead qualificado e a relação com a cliente — não o carrinho automatizado.

### 2.3 Territórios de comunicação
- **Empoderamento estético**: mulher dona da própria vitrine.
- **Praticidade premium**: tecnologia que some para deixar o produto brilhar.
- **Comunidade de marcas**: acesso a rede, benchmarks, tendências.

---

## 3. Personas

### 3.1 Tenants (clientes B2B que contratam a plataforma)

#### Persona A — "Carol, a Boutique Multimarca"
- 32–45 anos, dona de boutique física em bairro nobre, quer digitalizar sem perder o toque curatorial.
- **Dor:** Instagram não mostra preço nem grade. Cliente pede catálogo no WhatsApp o dia todo.
- **Precisa de:** Catálogo elegante, organizado por coleção/estação, com botão direto pro WhatsApp.

#### Persona B — "Júlia, a Influencer-Marca"
- 22–30 anos, 50k–500k seguidores, lança cápsulas de biquíni/fitness com fornecedor privado.
- **Dor:** Shopee/Amazon descaracterizam sua marca. Shopify é caro e complexo.
- **Precisa de:** Landing de lançamento estilo drop, contagem regressiva, lista de espera.

#### Persona C — "Renata, a Marca Fitness Autoral"
- Marca pequena-média de moda fitness, 3–15 SKUs por coleção.
- **Dor:** Precisa mostrar caimento, tecido, grade de tamanhos, medidas reais.
- **Precisa de:** Fichas técnicas ricas, vídeo curto da peça no corpo, guia de medidas.

#### Persona D — "Patrícia, a Sacoleira Digital"
- Revende biquínis e acessórios, catálogo rotativo semanal.
- **Dor:** Gasta horas montando PDF no Canva toda semana.
- **Precisa de:** Upload em massa, reordenação rápida, link único pra compartilhar no status.

### 3.2 Consumidoras finais (B2C — visitantes do mostruário)

#### Persona E — "A Compradora Visual"
- 18–40 anos, scrolla por inspiração. Decisão guiada por estética.
- **Precisa de:** Fotos grandes, zoom, looks montados, navegação fluida.

#### Persona F — "A Compradora Técnica"
- Quer saber medida, composição, caimento, devolução antes de contatar a marca.
- **Precisa de:** Ficha completa, tabela de medidas, FAQ, avaliações.

---

## 4. Requisitos Funcionais

### 4.1 Arquitetura multi-tenant

| # | Requisito | Prioridade |
|---|-----------|------------|
| MT-01 | Isolamento lógico de dados por tenant via `acts_as_tenant` (row-level) — nenhum tenant vê dados de outro | 🔴 Must |
| MT-02 | Onboarding self-service: criar conta → escolher plano → personalizar → publicar | 🔴 Must |
| MT-03 | Super-admin (a Bia) com visão consolidada de todos os tenants, MRR, uso | 🔴 Must |
| MT-04 | Planos/assinaturas diferentes (Free, Starter, Pro, Enterprise) com limites por plano (nº SKUs, domínio próprio, analytics avançado) | 🔴 Must |
| MT-05 | Billing recorrente integrado via gem `pay` (Stripe / Pagar.me / Asaas) | 🟡 Should |
| MT-06 | Suspensão/reativação automática por inadimplência via Sidekiq-Cron | 🟡 Should |
| MT-07 | Migração e exportação de dados do tenant (LGPD + portabilidade) via caxlsx | 🟡 Should |

### 4.2 White-label / personalização

| # | Requisito | Prioridade |
|---|-----------|------------|
| WL-01 | Upload de logotipo (claro/escuro), favicon, imagem de capa via Active Storage | 🔴 Must |
| WL-02 | Paleta de cores editável (primária, secundária, fundo, texto) com preview ao vivo | 🔴 Must |
| WL-03 | Escolha de tipografia entre curadoria de 12–20 fontes Google Fonts | 🔴 Must |
| WL-04 | Seleção de tema/template base (mínimo 3–5 estilos: minimalista, editorial, fitness, praia) | 🔴 Must |
| WL-05 | Domínio próprio (ex.: `loja.carolboutique.com.br`) com SSL automático via Let's Encrypt | 🔴 Must |
| WL-06 | Subdomínio padrão da plataforma para quem não quer custom (`carolboutique.suaplataforma.com`) | 🔴 Must |
| WL-07 | Meta-tags, OG image e título editáveis por tenant (SEO + compartilhamento) | 🔴 Must |
| WL-08 | Zero exibição da marca-mãe no site público do tenant (exceto plano Free, com selo discreto) | 🟡 Should |
| WL-09 | E-mails transacionais saindo com o domínio e branding do tenant (ActionMailer + Postmark) | 🟢 Could |

### 4.3 Catálogo / Mostruário — core do produto

| # | Requisito | Prioridade |
|---|-----------|------------|
| CT-01 | Cadastro de produto com: nome, descrição, preço, preço promocional, grade de tamanhos, cores, composição, tags | 🔴 Must |
| CT-02 | Upload de **até 8 fotos por produto** + 1 vídeo curto (até 30s) via Active Storage → S3 | 🔴 Must |
| CT-03 | Organização por **coleções** (Verão 26, Drop Fitness, Cápsula Praia) e **categorias** (tops, shorts, biquínis, acessórios) | 🔴 Must |
| CT-04 | **Looks montados**: combinar múltiplos produtos em um "look completo" clicável | 🔴 Must |
| CT-05 | Upload em massa via CSV/Excel (caxlsx na leitura) — processamento assíncrono via Sidekiq | 🟡 Should |
| CT-06 | Status do produto: rascunho, publicado, esgotado, arquivado | 🔴 Must |
| CT-07 | Produtos ocultos / acesso por link (drops privados, pré-venda VIP) | 🟡 Should |
| CT-08 | Reordenação drag-and-drop da vitrine | 🔴 Must |
| CT-09 | Busca interna com `pg_search` + filtros por tamanho/cor/categoria/preço via Pagy | 🔴 Must |
| CT-10 | Badges automáticos: "Novo", "Últimas peças", "Mais vendido", "Queridinho" | 🟢 Could |

### 4.4 Features específicas por vertical

#### Biquínis & moda praia
- Separação de **partes de cima** e **partes de baixo** como produtos independentes, mas com "combina com".
- Fotos em body diverso (incentivar diversidade visual é valor de marca).
- Campos: bojo removível? tipo de alça? conteúdo UV?

#### Moda fitness
- **Tabela de medidas interativa**: cliente insere altura/peso/medidas e sistema sugere tamanho.
- Campos técnicos: compressão, tecido (suplex, poliamida), atividade indicada (yoga, musculação, corrida).
- Vídeo da peça em movimento (essencial para caimento).

#### Roupas em geral
- Ficha de caimento: "veste o tamanho X, mede Y".
- Guia de lavagem com ícones.
- Ocasião: casual, trabalho, festa, praia.

#### Acessórios
- Dimensões físicas (cm).
- Materiais e alergênicos (banho de ouro, níquel-free).
- "Peças que combinam" (cross-sell visual).

### 4.5 Conversão & contato (sem checkout na fase 1)

| # | Requisito | Prioridade |
|---|-----------|------------|
| CV-01 | Botão "Comprar no WhatsApp" com mensagem pré-formatada (produto, tamanho, cor) | 🔴 Must |
| CV-02 | Formulário de interesse/lead capture com integração via Faraday (RD Station / Mailchimp / webhook próprio) | 🔴 Must |
| CV-03 | Link para Instagram, TikTok, Shopee, Mercado Livre da marca | 🔴 Must |
| CV-04 | Lista de espera para produto esgotado ou drop futuro — notificação via Sidekiq | 🟡 Should |
| CV-05 | Cupom/voucher exibido com código copiável | 🟡 Should |
| CV-06 | Integração com Pixel do Meta e Google Tag Manager (remarketing) | 🔴 Must |

### 4.6 Painel administrativo do tenant (React 19 SPA)

- Dashboard com: visitantes, produtos mais vistos, cliques no WhatsApp, leads capturados.
- Gestão de produtos, coleções, looks.
- Customização visual (ver 4.2) com preview em tempo real.
- Gestão de usuários internos (tenant com múltiplos logins — dono + social media + fotógrafa) usando Pundit para RBAC.
- Central de integrações (chaves criptografadas com Lockbox).
- Faturamento e plano.

### 4.7 Painel super-admin (Bia) — React 19 SPA

- Visão de todos os tenants: MRR, churn, uso por plano, tickets.
- Onboarding manual assistido (para clientes enterprise).
- Gestão de templates globais, fontes disponíveis, categorias pré-definidas.
- Logs de auditoria (Lograge + filtro por `tenant_id`).
- Feature flags (liberar features beta por tenant) — simples tabela + cache Redis.

---

## 5. Requisitos Não-Funcionais

| Categoria | Requisito |
|-----------|-----------|
| **Performance** | LCP < 2.5s, TBT < 200ms no mobile 4G. Lighthouse ≥ 90. Páginas públicas com cache agressivo (Rails fragment cache + Redis + CDN). |
| **Disponibilidade** | SLA 99,9% na página pública do tenant. |
| **Escalabilidade** | Suportar de 1 a 10.000 tenants sem refactor (acts_as_tenant escala bem com indexação correta em `tenant_id`). |
| **Segurança** | LGPD compliance, Lockbox para dados sensíveis, 2FA opcional (ROTP), Rack::Attack contra brute force, rate limiting por tenant. |
| **SEO** | SSR nativo via Rails + ERB nas páginas públicas (ver decisão 10.3). Sitemap dinâmico por tenant, structured data schema.org/Product. |
| **Acessibilidade** | WCAG AA (contraste, teclado, aria-labels). |
| **Internacionalização** | PT-BR primeiro. Rails I18n estrutura PT/EN/ES do dia 1. |
| **Mobile** | Mobile-first. PWA como evolução (instalável, offline leve). |
| **Observabilidade** | Lograge + Sentry (tag por `tenant_id`), métricas de uso no super-admin, alertas por tenant crítico. |

---

## 6. UX / UI — Diretrizes

- **Grid editorial**: layouts tipo revista, não Mercado Livre.
- **Tipografia expressiva**: headline grande, serifa ou display moderno.
- **Animações discretas** (scroll reveal, hover sutil) — nunca estridentes.
- **Fotos em destaque absoluto**: sem borda, sem moldura, sem badge coberto.
- **Navegação pelo polegar** no mobile (botões principais na metade inferior).
- **Zero fricção**: cliente não precisa criar conta para ver o catálogo.
- **Dark mode opcional** por tenant (tendência em marcas fitness e luxo).
- **Tailwind 4** em ambas as camadas (Rails views + React SPA) → tokens de design compartilhados.

---

## 7. SEO, Conteúdo & Crescimento Orgânico

- URLs amigáveis: `marca.com/colecao/verao-26/biquini-torino-verde` (Rails routes com slug).
- Blog/lookbook opcional por tenant (conteúdo alimenta SEO).
- Sitemap e robots por tenant gerados dinamicamente.
- Compartilhamento social otimizado (preview rico no WhatsApp, IG, TikTok).
- Rich snippets (preço, disponibilidade, avaliação) via JSON-LD.

---

## 8. Integrações previstas

| Categoria | Ferramentas | Tecnologia |
|-----------|-------------|-----------|
| Pagamento (fase 2) | Stripe, Pagar.me, Asaas, Pix | gem `pay` + webhooks Rails |
| CRM / E-mail | RD Station, Mailchimp, Brevo | Faraday + Sidekiq |
| Logística (fase 2) | Melhor Envio, Correios API | Faraday + faraday-retry |
| Analytics | GA4, Meta Pixel, TikTok Pixel | snippets no layout público |
| WhatsApp | WhatsApp Business API, link direto wa.me | Faraday |
| Social | Instagram Basic Display (feed embarcado), TikTok embed | OAuth + tokens Lockbox |
| Marketplace sync (fase 3) | Shopee, Mercado Livre, Magalu | Faraday + Sidekiq |
| Storage de mídia | AWS S3 (sa-east-1) | Active Storage |

---

## 9. Jornadas principais (happy paths)

### 9.1 Onboarding do tenant (novo cliente)
1. Descobre plataforma via anúncio / indicação / busca orgânica.
2. Cria conta com e-mail + Google (OAuth via Rails).
3. Wizard de setup (5 passos):
    - Nome da marca + logo
    - Paleta + fonte
    - Template base
    - Primeiros 3 produtos (ou upload em massa)
    - Domínio (custom ou padrão)
4. Pré-visualização em tempo real.
5. Publicar → compartilha primeiro link.

### 9.2 Visitante → Lead
1. Chega por link do Instagram/WhatsApp.
2. Navega pelo mostruário (home → coleção → produto) — páginas servidas por Rails com cache Redis.
3. Clica em "Comprar no WhatsApp" **ou** "Me avise quando chegar" **ou** entra em lista de desejos.
4. Marca recebe lead qualificado com contexto (qual produto, tamanho, cor).

---

## 10. Stack Tecnológico — Arquitetura Baseada no CCNF

### 10.1 Visão geral da arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUÁRIOS                                │
│   Compradoras (público)     │     Admins tenant / super-admin   │
└──────────────┬──────────────┴──────────────┬────────────────────┘
               │                             │
               ▼                             ▼
     ┌─────────────────────┐       ┌─────────────────────┐
     │   PÁGINAS PÚBLICAS  │       │   PAINEL ADMIN      │
     │  Rails ERB + Tailwind│       │  React 19 + Vite    │
     │  (SSR nativo, SEO)  │       │  (SPA, JWT, Tailwind)│
     └──────────┬──────────┘       └──────────┬──────────┘
                │                             │
                │       Nginx (reverse proxy) │
                │   - Wildcard *.mostruario.app
                │   - Domínios custom com SSL (Let's Encrypt)
                └──────────────┬──────────────┘
                               ▼
                ┌─────────────────────────────┐
                │   Rails 7.2 API + Views     │
                │   - acts_as_tenant          │
                │   - Pundit policies         │
                │   - Blueprinter serializers │
                │   - Rack::Attack            │
                └──────────────┬──────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌─────────────┐       ┌──────────────┐       ┌────────────────┐
│ PostgreSQL  │       │   Redis 7    │       │  Sidekiq +     │
│ 16 (multi-  │       │ (cache +     │       │  Sidekiq-Cron  │
│ tenant RLS) │       │  filas)      │       │  (workers)     │
└─────────────┘       └──────────────┘       └────────┬───────┘
                                                      │
                                              ┌───────▼────────┐
                                              │  AWS S3        │
                                              │  (sa-east-1)   │
                                              │  Active Storage│
                                              └────────────────┘
```

### 10.2 Decisão arquitetural crítica: SEO + SPA

O stack CCNF usa **React 19 SPA (Vite)** no frontend. SPAs são tradicionalmente hostis a SEO, e mostruário de moda **depende** de busca orgânica ("biquíni Torino verde marca Júlia"). Três opções foram avaliadas:

| Opção | Descrição | Prós | Contras |
|-------|-----------|------|---------|
| **A (✅ recomendada)** | **Dual-render**: páginas públicas do tenant em Rails ERB + Tailwind 4 (SSR nativo). React SPA só para painéis admin. | SEO perfeito de graça; reaproveita 100% do backend; Tailwind compartilhado; cache agressivo com fragment cache; zero JS no crítico path | Duas camadas de view a manter |
| B | **Vite SSR** (Vike) ou migrar para Next.js | Código único | Foge do padrão CCNF; complexidade de deploy; time aprende nova stack |
| C | **SPA + Prerendering** (Prerender.io / Rendertron) | Mantém stack 100% | Custo extra; latência; serviço a mais para manter |

**Recomendação: Opção A.** É a mesma arquitetura de Shopify, GitHub, Basecamp e Gitlab — Rails SSR para o que o Google precisa ver, SPA para o que o admin precisa operar. A separação é saudável: o público é *otimizado para ler e compartilhar*, o admin é *otimizado para editar*.

### 10.3 Modelo de multi-tenancy

- **Row-level via gem `acts_as_tenant`** (preferencial):
    - Coluna `tenant_id` em toda tabela tenant-scoped
    - Escopo automático em todas as queries
    - Backup/restore simples, migrações globais
    - Escala bem até dezenas de milhares de tenants
- **Middleware Rails** resolve o tenant a partir de:
    1. Host da request (subdomínio `carolboutique.mostruario.app` ou domínio custom `loja.carolboutique.com.br`)
    2. Header `X-Tenant-Slug` (painel super-admin operando em outro tenant)
    3. Token JWT (que carrega `tenant_id` no payload)
- **Pundit** recebe `current_tenant` no contexto — cada policy valida tanto o papel do usuário quanto a afinidade com o tenant.
- **Testes de isolamento obrigatórios** em RSpec — cada operação CRUD tem teste "tenant A não enxerga dado de tenant B".

### 10.4 Domínios customizados + SSL automático

- Nginx com wildcard `*.mostruario.app` + SNI para domínios próprios.
- Provisionamento de certificado via Let's Encrypt (`certbot` + `nginx-proxy/acme-companion` no Docker Compose).
- Fluxo do tenant:
    1. Tenant configura CNAME do seu domínio → `proxy.mostruario.app`
    2. Rails valida DNS (Sidekiq worker testa resolução)
    3. Ao validar, dispara job que registra domínio no Nginx e solicita SSL
    4. Domínio ativo em < 5 minutos

### 10.5 Mapeamento CCNF → Mostruário (o que reaproveita)

| Ativo CCNF | Reúso no Mostruário |
|------------|---------------------|
| **Rails 7.2 API-only** | Base do novo backend; pasta `api/` continua igual, `web/` nova para views públicas |
| **JWT HS256 + BCrypt** | Auth de admins tenant e super-admin — mesmo padrão |
| **Pundit** | Copiar estrutura de policies; adicionar scope multi-tenant |
| **Active Storage + S3 sa-east-1** | Fotos e vídeos dos produtos — configuração e bucket reaproveitados |
| **Sidekiq + Sidekiq-Cron** | Processamento de imagens, CSV imports, e-mails, relatórios, limpeza de leads antigos |
| **Blueprinter** | Serializers da API do painel admin (padrão CCNF) |
| **Pagy** | Paginação de catálogos grandes, lista de leads, relatórios |
| **caxlsx** | Exportação de leads, relatórios e catálogos em Excel |
| **Lockbox** | Criptografia de credenciais de integração por tenant (tokens WhatsApp, Meta, Mailchimp) |
| **Rack::Attack** | Rate limiting — adicionar regras por `tenant_id` |
| **Faraday + faraday-retry** | Todas as integrações externas (WhatsApp, CRM, marketplaces, pagamento) |
| **Lograge + Sentry** | Observabilidade; adicionar tag `tenant_slug` em todos os logs/erros |
| **RSpec + FactoryBot + VCR** | Suite de testes; factories precisam aceitar `:tenant` como parâmetro |
| **Docker Compose** | Dev local idêntico; prod evoluiu para mesmo esquema por tenant |
| **Nginx + Docker** | Reverse proxy reaproveitado, agora com wildcard + domínios custom |
| **Vite 7 + React 19 + TS 5.9** | Base do painel admin e super-admin |
| **react-router-dom 7, react-hook-form 7, lucide-react, js-cookie** | Stack completa do SPA admin |
| **TailwindCSS 4** | Design system unificado entre views Rails e SPA |

### 10.6 Que **não se aplica** do CCNF

| Ativo CCNF | Razão |
|------------|-------|
| **Control ID Max (reconhecimento facial)** | Fora de escopo; produto é mostruário, não controle de acesso |

### 10.7 Adições necessárias que o stack CCNF não cobre

| Gap | Solução sugerida | Prioridade |
|-----|------------------|------------|
| **Multi-tenancy row-level** | gem `acts_as_tenant` | 🔴 Must (MVP) |
| **Processamento de imagens** | Active Storage variants + `image_processing` + libvips | 🔴 Must (MVP) |
| **Processamento de vídeo** | `streamio-ffmpeg` para thumbnail; serviço externo (Mux/Cloudinary) se crescer | 🟡 V1 |
| **E-mail transacional** | ActionMailer + Postmark (confiabilidade) ou Brevo (custo) | 🔴 Must (MVP) |
| **Busca fulltext** | `pg_search` (MVP) → Meilisearch se precisar facetas avançadas | 🔴 Must (MVP) |
| **Billing SaaS recorrente** | gem `pay` (suporta Stripe, Paddle, Lemon Squeezy) | 🟡 V1 |
| **Domínios custom + SSL auto** | `nginx-proxy/acme-companion` ou Caddy | 🔴 Must (MVP) |
| **Slugs amigáveis** | gem `friendly_id` | 🔴 Must (MVP) |
| **Feature flags** | gem `flipper` com UI + Redis adapter | 🟡 V1 |
| **Auditoria de mudanças** | gem `paper_trail` | 🟡 V1 |
| **Soft delete** | gem `discard` | 🟡 V1 |
| **2FA** | gem `rotp` | 🟢 V2 |

### 10.8 Modelagem de dados (esboço inicial)

```
plans (id, name, price_cents, limits_jsonb)
tenants (id, slug, custom_domain, plan_id, branding_jsonb,
         status, created_at, ...)
subscriptions (id, tenant_id, plan_id, status, current_period_end)
users (id, tenant_id, role, email, encrypted_password, jti, ...)

categories (id, tenant_id, name, slug, parent_id)
collections (id, tenant_id, name, slug, cover_image, status)
products (id, tenant_id, collection_id, category_id, name, slug,
          description, price_cents, promo_price_cents, status,
          metadata_jsonb, position)
product_variants (id, product_id, size, color, sku, stock)
looks (id, tenant_id, name, cover_image)
look_items (look_id, product_id, position)

media_assets (id, tenant_id, attachable_type, attachable_id,
              storage_blob_id, position, kind)
leads (id, tenant_id, product_id, name, phone, email, message,
       source, created_at)
waitlists (id, tenant_id, product_id, email, phone, notified_at)

integrations (id, tenant_id, kind, encrypted_credentials, enabled)
audit_logs (id, tenant_id, user_id, action, target_type,
            target_id, diff_jsonb, created_at)
```

**Índices críticos:** todos os campos `tenant_id` + composto com FK mais consultada (ex: `(tenant_id, slug)`, `(tenant_id, status)`).

### 10.9 Ambientes e pipeline

| Ambiente | Infra |
|----------|-------|
| **Dev** | Docker Compose local (Rails + Postgres + Redis + Sidekiq + Vite em hot-reload) |
| **Staging** | VPS único (Hetzner / DigitalOcean) com mesmo Docker Compose |
| **Prod inicial** | VPS único containerizado (padrão CCNF); S3 sa-east-1 para mídia |
| **Prod escala** | Migração para Kubernetes (EKS ou K3s gerenciado) quando passar de ~100 tenants ativos |

**CI/CD**: GitHub Actions → lint (RuboCop + ESLint) → testes (RSpec + Vitest) → build Docker → push registry → deploy staging automático → tag manual para prod.

### 10.10 Observabilidade e segurança específicas de multi-tenant

- **Sentry**: tags `tenant_slug` e `tenant_plan` em todos os eventos → filtros por cliente.
- **Lograge**: formato JSON com `tenant_id` em toda linha → agregação por tenant.
- **Métricas no super-admin**: MAU, storage usado, requests/min, leads/mês — agregados por tenant.
- **Lockbox**: criptografa `integrations.encrypted_credentials`, `users.personal_notes`, campos pessoais sensíveis.
- **Rack::Attack**: rate limit por IP **e** por `tenant_id` (evita um tenant derrubar a aplicação).
- **Testes de isolamento**: matriz em RSpec — `it "does not leak data across tenants"` em cada resource.

---

## 11. Roadmap sugerido

### 🚀 MVP (0–3 meses) — Validar proposta de valor
- Fork/clone do backend CCNF → limpar domínio country club → adicionar `acts_as_tenant`.
- Rails views públicas (home, coleção, produto) com Tailwind 4 + cache Redis.
- Painel admin React 19 (Vite + Vite 7 boilerplate CCNF) com gestão de produtos e branding.
- Multi-tenant básico (subdomínio `.mostruario.app`).
- 2 templates base.
- White-label essencial (logo, 2 cores, fonte).
- Catálogo com até 50 produtos, 5 fotos por produto, Active Storage → S3.
- Botão WhatsApp + formulário de lead.
- Super-admin mínimo.
- Plano Free + Starter.

### 🏗️ V1 (3–6 meses) — Profissionalizar
- Domínios próprios com SSL automático (nginx-proxy/acme-companion).
- 5 templates + customização avançada.
- Looks montados, coleções, drops privados.
- Upload em massa via caxlsx + Sidekiq.
- Billing recorrente via gem `pay`.
- Integrações: GA4, Meta Pixel, Mailchimp (Faraday workers).
- Plano Pro.
- Analytics por tenant.
- Feature flags via `flipper`.

### 💎 V2 (6–12 meses) — Monetização & ecossistema
- Checkout integrado (opcional, add-on).
- Integração com marketplaces e logística.
- App PWA.
- IA: descrição automática de produto, tradução EN/ES, recomendação visual (ferramentas externas via Faraday).
- Programa de afiliados entre tenants.
- Plano Enterprise (white-label 100% + SLA dedicado).
- Migração para Kubernetes conforme escala.

---

## 12. KPIs de sucesso

### KPIs de negócio (super-admin)
- MRR e ARR
- Número de tenants ativos
- Churn mensal
- LTV / CAC
- Tempo médio de onboarding
- NPS dos tenants

### KPIs por tenant (painel do cliente)
- Visitantes únicos / mês
- Taxa de clique em "Comprar no WhatsApp"
- Leads capturados
- Produtos mais vistos
- Tempo médio na página
- Conversão de lista de desejos → contato

---

## 13. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Customização excessiva gera manutenção pesada | Limitar via tokens Tailwind, não CSS livre; branding vira config, não código |
| Mídia pesada (fotos/vídeos) explode custo S3 | Active Storage variants + CDN (CloudFront); compressão client-side antes do upload; plano por volume |
| Tenant pede feature exclusiva | Política clara: só entra no core se beneficia ≥ 30% dos tenants; resto vira plano Enterprise pago |
| Concorrência com Shopify/Nuvemshop | Posicionar como "mostruário", não "loja" — nicho diferente |
| LGPD com dados de múltiplos tenants | Contrato de operador claro, DPO, consentimento granular, Lockbox, testes de isolamento |
| Domínio próprio com SSL falha | Automatizar com acme-companion + monitoramento Sentry + alertas Sidekiq-Cron |
| Vazamento cross-tenant | `acts_as_tenant` + Pundit + testes obrigatórios + audit_logs |
| SPA sem SEO | Resolvido pela Opção A (SSR Rails para público) — decisão 10.2 |

---

## 14. Próximos passos propostos

1. ✅ **Este documento v2** — aprovação / ajustes de escopo.
2. 🔜 **Decidir Opção A (SSR Rails)** — ou alternativa — formalmente.
3. 🔜 **Wireframes de baixa fidelidade** das 6 telas-chave: home pública, produto, coleção, onboarding, painel tenant, painel super-admin.
4. 🔜 **Moodboard visual** dos 3–5 templates base.
5. 🔜 **Refinar modelagem de dados** (ver 10.8) com diagrama ER completo.
6. 🔜 **Protótipo navegável** (Figma) antes de linha 1 de código.
7. 🔜 **Definir estrutura do repositório**: monorepo (seguindo padrão CCNF: `/backend` + `/frontend`) ou repos separados.
8. 🔜 **Backlog priorizado** (MoSCoW → épicos → histórias → tasks) em ferramenta de gestão.

---

## 15. Perguntas em aberto para a próxima sessão

1. Qual é a **persona primária** do MVP — Carol, Júlia, Renata ou Patrícia? *Foco em uma acelera product-market fit.*
2. Já existe um nome de marca / domínio para a plataforma-mãe?
3. Modelo comercial: **freemium** (com marca da plataforma no Free) ou **trial pago**?
4. Haverá curadoria / aprovação manual de novos tenants ou onboarding 100% self-service?
5. E-commerce completo (fase 2) é ambição de curto prazo ou só se houver demanda?
6. Existe parceiro fotográfico / de conteúdo para apoiar tenants novos?
7. O CCNF continuará sendo um projeto paralelo ou o mostruário será o foco principal do stack?
8. Concordância com a **Opção A** (dual render Rails + React) como arquitetura oficial?

---

*Documento vivo — versiona após cada rodada de alinhamento.*
