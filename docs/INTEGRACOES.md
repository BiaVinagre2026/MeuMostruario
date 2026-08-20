# Integrações

Estado do **pagamento** (Orbe PSP) e do **WhatsApp**.

---

## 1. Pagamento — Orbe PSP

Gateway: **Orbe PSP**, da Casetec. Documentação em <https://psp.casetec.com.br/api-docs>,
spec em `/psp/v1/docs/spec`. Produção em `https://api.casetec.com.br`.

Cada tenant é um **merchant próprio** no gateway: chave, merchant e segredo do callback
vivem em `tenant_configs`, configuráveis em **Configurações → Pagamento** no admin. Sem
credencial, o pedido fecha e o pagamento fica em modo local, sem cobrar ninguém.

### Fluxo implementado

1. Pedido criado por link de atacado com `allow_payment` chama `GatewayPaymentService#create_intent!`.
2. O serviço cria o `Payment` com uma `idempotency_key` **antes** de chamar o gateway.
3. `POST /psp/v1/pix` com `Authorization: Bearer <psp_api_key_enc>` e `Idempotency-Key`.
4. Resposta 201 grava `gateway_reference` (id da cobrança), `pix_qr_code`, `checkout_url`.
5. O gateway avisa `POST /api/v1/payments/webhook/:tenant_slug` a cada mudança de status.
6. O comprador vê QR Code e copia-e-cola na própria tela do link.

### Detalhes que não são óbvios

**O tenant vai na URL do callback.** O PSP não conhece o header `X-Tenant-ID`, e sem saber
o tenant não há como escolher o schema nem o segredo. Por isso o `callback_url` enviado em
cada cobrança termina com o slug. A base vem de `PSP_CALLBACK_BASE_URL` ou, na falta, de
`APP_URL`.

**A Idempotency-Key é persistida, não gerada na hora.** Se a chamada cair no meio e alguém
repetir, o gateway reconhece a mesma operação em vez de abrir uma segunda cobrança.

**Falha na emissão não derruba o pedido.** O pedido vale mais que a cobrança: o `Payment`
fica `failed` com a mensagem do gateway, o pedido continua no admin, e o comprador vê um
aviso explicando que precisa combinar o pagamento.

**`captured` conta como pago.** A Orbe usa `pending`, `processing`, `authorized`,
`captured`, `paid`, `failed`, `cancelled` e `expired`. `captured` significa dinheiro
capturado; antes caía no ramo genérico e virava pendente.

**O header da assinatura é configurável.** A documentação diz que o callback é assinado com
HMAC-SHA256 mas não diz em qual header. O valor fica em `psp_signature_header`, com
`X-Gateway-Signature` como padrão. **Confirme o nome real com a Casetec** — se estiver
errado, toda confirmação de pagamento é recusada com 401.

### O que ainda não foi validado

A integração tem testes com resposta simulada do gateway (`gateway_payment_service_spec.rb`
e `payments_spec.rb`), mas **nunca falou com a Orbe de verdade**. Falta:

- Credenciais reais de um merchant.
- Um endereço público para o callback: `localhost` não recebe. Use túnel (ngrok,
  cloudflared) ou um ambiente publicado, e aponte `PSP_CALLBACK_BASE_URL` para ele.
- Confirmar o nome do header da assinatura.

### Dado sensível

Regra do produto: **dados de cartão nunca são armazenados**. O pedido guarda snapshot dos
valores comerciais, não do meio de pagamento. O CPF/CNPJ do comprador é guardado só com
dígitos e não volta na resposta da API.

---

## 2. WhatsApp

### O número já é configurável

Não precisa criar campo nem migration. O número fica em **Configurações → Identidade
visual → WhatsApp** (`tenant_configs.social_whatsapp`) e chega no frontend assim:

```ts
import { useTenant } from "@/providers/TenantProvider";

const { social } = useTenant();
social.whatsapp; // "https://wa.me/5521981538334" ou "+55 11 90000-0000"
```

O formato é livre — o admin pode digitar link ou número.

### Helpers compartilhados

[`web/src/lib/whatsapp.ts`](../web/src/lib/whatsapp.ts) concentra o tratamento:

- `extractWhatsappNumber(raw)` — aceita link `wa.me/55...` ou texto com máscara
- `whatsappUrl(raw, mensagem)` — monta o endereço, ou string vazia sem número
- `openWhatsapp(raw, mensagem)` — abre em nova aba e **devolve `false`** quando o tenant
  ainda não configurou o número, para quem chamou poder avisar em vez de não fazer nada

### Onde já está ligado

| Arquivo | Situação |
|---|---|
| `web/src/components/cart/CartDrawer.tsx` | Envia o pedido do carrinho |
| `web/src/components/showroom/Footer.tsx` | Botão "Falar com o atacado" |
| `web/src/pages/ProductDetail.tsx` | Botão de interesse na peça |

### Onde falta plugar

| Arquivo | Situação |
|---|---|
| `web/src/pages/CatalogLinkPage.tsx` | Não envia por WhatsApp. **É o principal** — é a tela do comprador atacado. |

### Sugestão para o link de atacado

O pedido já é registrado no backend antes de qualquer coisa — o WhatsApp deve ser o passo
seguinte, não substituto. Depois do `createTokenOrder` responder, monte a mensagem com os
itens e quantidades por tamanho e abra o `wa.me`. Assim o pedido não se perde se o
comprador fechar a aba do WhatsApp.

---

## Como validar

```bash
docker compose exec api bundle exec rspec
cd web && npm test
cd web && npx tsc --noEmit
```

Para o fluxo manual, o roteiro de avaliação está no [README](../README.md).
