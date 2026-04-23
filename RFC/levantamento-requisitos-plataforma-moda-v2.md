# Levantamento de Requisitos — v2
## Plataforma SaaS Multi-tenant & White-label — Mostruário de Moda, Moda Praia, Fitness e Acessórios

**Versão:** 2.0
**Data:** Abril/2026
**Responsável:** Beatriz Santos Maia Vinagre
**Mudança vs v1:** Revisão da stack tecnológica (backend Ruby API-only, Postgres, Redis, IA via OpenRouter, deploy Vercel + Docker, gateway de pagamento proprietário)
**Natureza:** Documento vivo — deve ser revisado ao final de cada fase

---

## 1. Visão Geral do Produto

Plataforma SaaS que permite a **marcas de moda, moda praia, fitness e acessórios** publicarem um **site de mostruário profissional** (não necessariamente loja virtual transacional) com identidade visual própria, domínio próprio e zero dependência técnica.

**Diferença estratégica entre mostruário e e-commerce:**
A plataforma nasce focada em **vitrine digital + geração de lead/pedido via WhatsApp**, não em checkout completo. Isso reduz complexidade, acelera onboarding e atende a maior dor do lojista pequeno: *"quero um site bonito e rápido, o pagamento eu resolvo no chat"*. A arquitetura, porém, já deve permitir evolução para e-commerce completo em fase futura — com **gateway de pagamento proprietário** como um dos pilares de diferenciação e margem.

### Proposta de valor (um parágrafo de marketing)
> *"Sua marca com site profissional no ar em menos de 24 horas. Você escolhe as cores, a fonte, o domínio e os produtos — a gente entrega a vitrine digital, a velocidade e o SEO. Sem mensalidade de agência, sem depender de desenvolvedor."*

---

## 2. Objetivos de Negócio

| # | Objetivo | Métrica |
|---|----------|---------|
| 1 | Criar receita recorrente previsível (MRR) | MRR mensal crescente |
| 2 | Capturar nichos quentes (moda praia carioca, fitness, autorais) | Tenants ativos por vertical |
| 3 | Ter arquitetura escalável (1 código, N clientes) | Custo de infra por tenant |
| 4 | Entregar tempo de ativação < 24h | Time-to-publish médio |
| 5 | Preservar o brand equity do lojista (white-label verdadeiro) | NPS dos lojistas |
| 6 | Gerar receita adicional via gateway proprietário (MDR) | Take rate por transação |

---

## 3. Personas

### 3.1 Lojista — "Mariana, marca de biquíni em Búzios"
- 32 anos, vende pelo Instagram, tem 12k seguidores
- Hoje usa Linktree + catálogo no WhatsApp Business
- Quer parecer grande marca sem parecer amadora
- Paga até R$ 200/mês se resolver o problema

### 3.2 Lojista — "Carol, marca de roupa fitness"
- 28 anos, atleta, vende em grupos de academia
- Precisa de tabela de medidas, foto com modelo em movimento
- Quer organizar coleções (top + legging combinando)

### 3.3 Lojista — "Rafael, showroom multimarcas"
- 45 anos, atende lojistas B2B, tem representantes
- Precisa de um catálogo visual por coleção para enviar a compradores
- Quer link que não expire e que seja atualizável em tempo real

### 3.4 Cliente final — "Júlia, consumidora"
- 22–40 anos, 80% mobile, descobre pelo Instagram
- Decide em segundos pela foto e pela velocidade do site
- Fecha compra no WhatsApp, não tolera site lento

---

## 4. Arquitetura Multi-tenant

### 4.1 Modelo de isolamento (a decidir em RFC)
Três opções a avaliar tecnicamente, cada uma com trade-offs:

- **Shared DB + tenant_id** (recomendado para MVP): 1 Postgres, coluna `tenant_id` em toda tabela, middleware Rack que injeta o contexto. Barato, simples, exige disciplina. Usar gem `acts_as_tenant` ou similar + Row Level Security no Postgres como segunda camada.
- **Schema por tenant**: isolamento lógico maior via `search_path` do Postgres, migrations mais caras. Gem `apartment` ou implementação própria.
- **DB por tenant**: máximo isolamento (útil para clientes enterprise), alto custo operacional.

### 4.2 Resolução de tenant
- Subdomínio padrão: `marianabeachwear.plataforma.com.br`
- Domínio próprio via **CNAME** com provisionamento automático de SSL (Let's Encrypt via Caddy ou nginx + certbot no container de edge)
- Middleware Rack no Rails resolve o `tenant_id` pelo host da requisição e injeta no contexto da thread

### 4.3 Contexto de segurança
- Toda query deve ser escopada por `tenant_id` — Row Level Security (RLS) do Postgres como rede de segurança, mesmo com `acts_as_tenant` no nível do ORM
- Usuários admins podem pertencer a múltiplos tenants (útil para agências que gerem várias marcas)
- Tokens JWT emitidos pela API contêm o `tenant_id` ativo

---

## 5. Requisitos de White-label

| Elemento | Customizável pelo lojista |
|----------|---------------------------|
| Logo (claro e escuro) | Sim |
| Favicon | Sim (gerado automaticamente a partir do logo) |
| Cor primária e secundária | Sim (seletor de cor) |
| Tipografia | Sim (entre 6–10 fontes curadas) |
| Domínio próprio | Sim (plano pago) |
| Templates de layout | Sim (escolher entre N modelos) |
| Textos institucionais | Sim (Sobre, Política, Trocas, Contato) |
| Redes sociais no rodapé | Sim |
| E-mail transacional "de" | Sim (via domínio verificado) |
| Mensagem pré-formatada do WhatsApp | Sim |
| Página de checkout do gateway | Sim (branding do lojista, não da plataforma) |

**Regra de ouro:** em nenhuma tela pública aparece o nome da plataforma. O site é do lojista, 100%.

---

## 6. Requisitos Funcionais

### 6.1 Painel Super Admin (dono da plataforma)
- Listagem e busca de tenants
- Criar / suspender / excluir tenant
- Gestão de planos e assinaturas
- **Gestão do gateway de pagamento proprietário**: onboarding KYC de lojistas, gestão de antifraude, reprocessamento, chargebacks, split de pagamento, relatórios de MDR
- Métricas agregadas: MRR, churn, tenants ativos, uso de storage, GMV processado, take rate
- Gerenciar templates globais e fontes disponíveis
- Logs de auditoria e suporte (acessar como tenant para debug)
- Feature flags por tenant

### 6.2 Painel do Lojista (tenant admin)
- Onboarding em etapas: logo → cores → domínio → primeiros 5 produtos
- **Onboarding KYC do gateway** (fase 2): documentos, dados bancários, contrato digital
- CRUD de produtos com:
  - Título, descrição rica, SKU, preço, preço promocional
  - Variantes (cor e tamanho) com estoque opcional
  - Múltiplas imagens com ordenação e foto de capa
  - Tags, coleção, categoria
  - SEO (meta title, meta description, slug editável)
- CRUD de categorias e subcategorias (ex.: *Moda Praia > Biquínis > Cortininha*)
- Gestão de coleções (ex.: *Verão 2026*, *Bestsellers*, *Resort*)
- Upload em massa via CSV (a partir da fase 2)
- Gerenciar banners e carrosséis da home
- Gerenciar páginas institucionais (Sobre, Trocas, Frete, Política de Privacidade)
- Dashboard com: produtos mais vistos, origem do tráfego, cliques em WhatsApp, (fase 2) conversão do gateway
- Gerenciar equipe (convidar outros usuários com papéis)

### 6.3 Site público (vitrine do lojista)
- **Home:** banner principal, coleções em destaque, novidades, best sellers, Instagram feed
- **Listagem de categoria:** filtros por tamanho, cor, preço, coleção; ordenação; paginação infinita
- **Busca textual** com autocomplete
- **Página de produto:** galeria com zoom, seletor de variantes (swatches visuais de cor), tabela de medidas, descrição, produtos relacionados, "look completo", CTA WhatsApp
- **Lookbook mode:** apresentação de coleção em formato editorial/revista
- **Wishlist** (local storage na fase 1, conta de usuário na fase 2)
- **Compartilhamento social** por produto
- **Formulário de lead** e newsletter
- **Rodapé institucional** com páginas, redes e contato

### 6.4 Funcionalidades específicas do setor moda
- Tabela de medidas configurável por categoria (biquíni, fitness e roupa social têm grades diferentes)
- Swatches visuais (círculos com a cor real) em vez de texto
- "Combina com" para cross-sell visual (top + calcinha, top + legging)
- Modo lookbook de coleção (storytelling visual)
- Badge visual (Novo, Últimas Peças, Pré-venda, Exclusivo Online)
- Campo de material e instruções de lavagem
- Preview em corpo de modelo com múltiplos biotipos (diferencial de inclusividade)

### 6.5 Funcionalidades de IA (via OpenRouter)
- **Geração de descrição** de produto a partir do título e categoria
- **Sugestão de tags** e categoria automática a partir da imagem
- **Melhoria de SEO** (meta title e description otimizados)
- **Tradução automática** (fase 3) para lojistas que vendem fora do Brasil
- **Recomendação** de produtos relacionados baseada em embeddings (pgvector)

---

## 7. Requisitos Não-Funcionais

| Categoria | Requisito |
|-----------|-----------|
| Performance | LCP < 2,5 s; TTFB < 600 ms; imagens em WebP/AVIF; CDN global |
| SEO | SSR ou SSG no frontend; schema.org `Product`; sitemap por tenant; meta tags editáveis |
| Mobile | Mobile-first; 70%+ do tráfego será mobile |
| Acessibilidade | WCAG 2.1 AA |
| Segurança | HTTPS obrigatório; OWASP Top 10; LGPD; RLS no Postgres; PCI-DSS para o gateway |
| Uptime | SLA 99,9% |
| Backup | Diário automático com retenção de 30 dias; PITR no Postgres |
| Observabilidade | Logs estruturados, métricas e tracing (Sentry + OpenTelemetry) |
| i18n | Preparado para pt-BR na fase 1; ES e EN na fase 3 |

---

## 8. Integrações

### Fase 1 (MVP)
- WhatsApp (link `wa.me` com mensagem pré-preenchida contendo SKU e nome do produto)
- Instagram (embed do feed)
- Google Analytics 4 e Meta Pixel configuráveis por tenant
- **Gateway proprietário** (núcleo) — integra com adquirentes (Cielo, Rede, Stone) e bandeiras; processa cartão, Pix e boleto
- Postmark / SendGrid / AWS SES para e-mail transacional
- **OpenRouter** para orquestração dos modelos de IA (permite trocar entre Claude, GPT, Gemini e open-source sem refatoração)

### Fase 2
- Instagram Shopping
- TikTok Pixel
- **Gateway proprietário:** split de pagamento, recorrência, antifraude próprio ou via Clearsale / Konduto
- Correios / Melhor Envio para cálculo de frete

### Fase 3
- ERPs: Bling, Tiny, Omie, Conta Azul
- E-mail marketing: RD Station, Mailchimp
- CRMs: HubSpot, Pipedrive
- Marketplace: integração de saída para Shopee, Mercado Livre
- Open Finance (fase avançada do gateway)

---

## 9. Stack Tecnológica

### 9.1 Visão geral da arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                 Cloudflare (DNS + CDN)                  │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  Next.js (Vercel)│   │ Painel Admin SPA │
│  — vitrine SSR   │   │   (Vercel)       │
│  — multi-tenant  │   │                  │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
       ┌────────────────────────────┐
       │  Ruby on Rails API-only    │
       │  (Docker em VPS / cloud)   │
       │  — JWT, ActsAsTenant, RLS  │
       └─┬──────────────┬─────────┬─┘
         │              │         │
         ▼              ▼         ▼
    ┌────────┐    ┌─────────┐  ┌──────────────┐
    │Postgres│    │  Redis  │  │  Gateway de  │
    │+pgvector│   │(cache+  │  │  Pagamento   │
    │+ RLS    │   │ Sidekiq)│  │  proprietário │
    └────────┘    └─────────┘  └──────┬───────┘
                                       │
                                       ▼
                             ┌──────────────────┐
                             │  Adquirentes:    │
                             │  Cielo / Rede /  │
                             │  Stone / Pix BCB │
                             └──────────────────┘

          ┌────────────────────┐
          │  OpenRouter (IA)   │
          │  — Claude / GPT /  │
          │    Gemini / Llama  │
          └────────────────────┘
```

### 9.2 Componentes

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend público** | Next.js 14+ (App Router) + Tailwind + shadcn/ui | SSR/SSG para SEO; resolução de tenant por host; deploy simples na Vercel |
| **Painel admin** | React + Vite ou Next.js (mesma base) | SPA autenticada consumindo a API Rails |
| **Backend** | **Ruby on Rails 7+ em modo API-only** | Produtividade altíssima, ecossistema maduro, ActiveRecord robusto para modelagem de domínio complexo (produtos, variantes, coleções) |
| **Autenticação** | Devise + devise-jwt (ou Rodauth) | JWT com `tenant_id` no payload |
| **Multi-tenancy** | Gem `acts_as_tenant` + RLS no Postgres | Dupla camada: ORM escopa + banco rejeita |
| **Banco de dados** | **Postgres 16+** com extensões: `pgvector` (IA), `pg_trgm` (busca), `citext` | Um único stack relacional para OLTP, busca e embeddings |
| **Cache** | **Redis** (managed — Upstash, Redis Cloud ou self-hosted) | Cache de catálogo, rate limiting, sessões, filas do Sidekiq |
| **Filas e jobs** | Sidekiq (padrão Rails + Redis) | Processamento assíncrono: e-mails, geração de thumbnails, webhooks do gateway, jobs de IA |
| **Busca** | Postgres `pg_trgm` + `tsvector` (fase 1) → Meilisearch (fase 2) | Começa barato, escala quando precisar |
| **Storage de imagens** | Active Storage + S3 (AWS ou Cloudflare R2) | Padrão Rails, com CDN na frente |
| **Transformação de imagem** | `image_processing` gem + libvips + CDN com resize on-the-fly (Cloudflare Images ou imgproxy) | Resize/crop sob demanda |
| **IA** | **OpenRouter** como gateway único para LLMs (Claude, GPT, Gemini, Llama) | Um único provider, um único billing, liberdade para trocar modelo por custo/qualidade sem refatorar |
| **Embeddings** | OpenRouter (ou modelo local) armazenados em pgvector | Busca semântica e recomendação |
| **Gateway de pagamento** | **Proprietário, Rails engine isolada**, integrando adquirentes via API | Margem adicional (MDR); controle do fluxo de onboarding e antifraude; pilar de diferenciação competitiva |
| **Antifraude** | Motor de regras próprio + integração Clearsale/Konduto (fase 2) | Proteção contra chargeback |
| **Deploy — frontend** | **Vercel** | Edge network global, ótimo para Next.js |
| **Deploy — backend** | **Docker** em VPS (Hetzner / DigitalOcean / AWS ECS / Fly.io) | Controle total do runtime Ruby; stateful workers (Sidekiq) pedem container persistente; Vercel não é ideal para Rails API |
| **Orquestração** | Docker Compose (dev) + Kamal ou ECS/Fly (produção) | Kamal foi feito pensando em Rails + Docker em VPS |
| **CI/CD** | GitHub Actions | Build de imagem Docker + deploy automatizado |
| **Observabilidade** | Sentry (erros) + Grafana/Prometheus ou Logflare (logs/métricas) + Skylight ou AppSignal (APM do Rails) | Cobertura completa |
| **Secrets** | Rails credentials + Doppler ou AWS Secrets Manager | Gestão centralizada |

### 9.3 Por que essa stack faz sentido para este projeto

- **Rails API-only** brilha em domínios ricos em regras de negócio como e-commerce/mostruário. Associações complexas (produto → variante → estoque → coleção → lookbook) ficam naturais no ActiveRecord.
- **Postgres como centro de gravidade** reduz peças móveis: OLTP, busca textual e embeddings vivem no mesmo banco nas fases iniciais.
- **Redis + Sidekiq** é o combo mais maduro do ecossistema Ruby — zero surpresa em produção.
- **OpenRouter** evita vendor lock-in de IA; permite começar com Claude (melhor para texto comercial em pt-BR) e cair para um modelo mais barato quando o volume crescer.
- **Vercel para o frontend e Docker para o backend** aproveita o melhor dos dois mundos: edge global para o site público (onde a performance importa para SEO e conversão) e controle total do runtime onde há workers, jobs e estado.
- **Gateway proprietário** é decisão estratégica, não tática — transforma um SaaS de R$ 179/mês em um SaaS + fintech com MDR recorrente sobre o GMV de cada lojista. A margem por cliente pode dobrar ou triplicar.

### 9.4 Alertas e trade-offs desta stack

- **Gateway próprio é um produto dentro do produto.** Exige PCI-DSS, compliance do BACEN (para recorrência e split), integração com adquirentes, motor antifraude e um time dedicado de payments. Recomendo planejá-lo para **Fase 2 ou 3**, não Fase 1 — na Fase 1, manter o WhatsApp como checkout e, se precisar de link de pagamento, integrar gateway existente como fallback.
- **Deploy do Rails não é na Vercel.** A Vercel é ótima para o Next.js; o backend Ruby roda em Docker em outra infra. Importante alinhar isso com o time de DevOps desde o início.
- **OpenRouter cobra markup** sobre o preço direto dos modelos. Em volumes grandes, vale reavaliar ir direto no provedor final (Anthropic, OpenAI) — mas a flexibilidade inicial compensa.

---

## 10. Roadmap em Fases

### Fase 1 — MVP (8 a 12 semanas)
Objetivo: primeiro lojista pago no ar.
- 1 template base responsivo (Next.js)
- API Rails com CRUD de produto, categoria, banner
- Autenticação JWT + multi-tenancy
- Subdomínio + domínio próprio via CNAME
- **Checkout por WhatsApp (sem gateway ainda)**
- Painel admin do lojista
- Painel super admin básico
- Billing de assinatura da plataforma (integração simples com gateway existente)
- Deploy: frontend Vercel, backend Docker em VPS

### Fase 2 — Consolidação (3 a 4 meses)
Objetivo: chegar a 50 tenants pagos e lançar o gateway.
- 3 a 5 templates adicionais
- Upload em massa via CSV
- Integração Instagram Shopping
- Analytics por tenant dentro do painel
- Lookbook mode
- Wishlist com conta de usuário
- Programa de indicação entre lojistas
- **Gateway proprietário — MVP:** processa Pix e cartão via 1 adquirente (começar com Cielo ou Stone); onboarding KYC; split simples
- IA via OpenRouter: descrição automática, tags automáticas

### Fase 3 — Escala (6 a 12 meses)
Objetivo: evoluir para e-commerce + expansão + fintech.
- Checkout integrado com o gateway proprietário
- Integrações ERP
- App mobile (PWA)
- IA generativa avançada: recomendação personalizada via pgvector
- Internacionalização (ES e EN) com tradução via OpenRouter
- Marketplace de templates de designers parceiros
- **Gateway proprietário — completo:** multi-adquirente, antifraude, recorrência, chargeback, reconciliação, conta digital para lojista

---

## 11. Modelo de Precificação (sugestão inicial)

| Plano | Mensalidade | Limite de produtos | Domínio próprio | Templates | MDR do gateway (fase 2+) |
|-------|-------------|--------------------|------------------|-----------|--------------------------|
| Starter | R$ 79 | 50 | Não | 1 | 4,99% |
| Pro | R$ 179 | Ilimitado | Sim | Todos | 3,99% |
| Premium | R$ 349 | Ilimitado | Sim | Todos + exclusivos + suporte prioritário | 2,99% |

Setup opcional: pacote de migração / criação assistida de catálogo por R$ 497 (one-shot).

**Observação:** o MDR do gateway é a verdadeira alavanca de receita. Um lojista Pro com GMV de R$ 50 mil/mês a 3,99% gera R$ 1.995/mês em MDR — muito mais que a mensalidade. A mensalidade vira porta de entrada; a fintech vira o negócio.

---

## 12. Métricas de Sucesso

| Métrica | Meta 6 meses | Meta 12 meses |
|---------|--------------|----------------|
| Tenants pagantes | 30 | 150 |
| MRR (assinatura) | R$ 5.000 | R$ 30.000 |
| GMV processado pelo gateway (a partir da Fase 2) | — | R$ 2 MM/mês |
| Receita de MDR | — | R$ 70 mil/mês |
| Churn mensal | < 8% | < 5% |
| Time-to-publish | < 24 h | < 2 h |
| LCP médio (p75) | < 3,0 s | < 2,0 s |
| NPS lojistas | > 40 | > 60 |

---

## 13. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Concorrência com Nuvemshop, Loja Integrada | Alto | Posicionar como *mostruário premium focado em moda*, não e-commerce generalista |
| Complexidade técnica multi-tenant | Alto | Começar com shared DB + RLS, isolar depois |
| **Construção do gateway proprietário** | **Muito alto** | **Fasear: nasce com WhatsApp (F1), depois gateway básico com 1 adquirente (F2), depois multi-adquirente e antifraude (F3). Considerar parceria com PSP já regulamentado em vez de BACEN do zero** |
| Custo de storage de imagens | Médio | Compressão agressiva, CDN, limites por plano |
| Churn de micro-lojistas | Alto | Onboarding assistido + conteúdo de ativação + comunidade |
| Dependência inicial do WhatsApp | Médio | Gateway proprietário resolve isso a partir da Fase 2 |
| Custos de IA via OpenRouter | Médio | Rate limits por plano, cache de respostas no Redis, fallback para modelos mais baratos |
| Dois deploys diferentes (Vercel + Docker) | Baixo | Pipeline CI/CD unificado no GitHub Actions; docs de runbook claros |

---

## 14. Próximos Passos

1. Validar as **3 personas** com ao menos 10 entrevistas qualitativas cada.
2. Decidir **modelo de multi-tenancy** (RFC técnico Rails).
3. Desenhar **wireframes** das 5 telas críticas: home do lojista, página de produto, listagem, painel admin, onboarding.
4. Definir o **template visual inicial** (mood board + design tokens).
5. Elaborar o **backlog priorizado** da fase 1 em formato de histórias de usuário.
6. Desenhar a **landing page de captação de lojistas** e rodar pré-venda antes de escrever a primeira linha de código.
7. **Estudo específico do gateway proprietário:** avaliar se vai ser via parceria com PSP (sub-credenciamento) ou credenciamento direto nas bandeiras — decisão com impacto regulatório e de time-to-market.

---

*Este documento é vivo. Toda decisão técnica ou de produto que mudar um requisito deve ser refletida aqui com data e justificativa.*
