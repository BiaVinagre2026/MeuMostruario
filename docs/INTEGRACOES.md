# Integrações pendentes

Guia para quem vai plugar **pagamento** e **WhatsApp**. As duas foram deixadas por
último de propósito: o resto do fluxo já funciona sem elas.

---

## 1. Pagamento

### O que já existe

| Peça | Onde | Estado |
|---|---|---|
| Modelo `Payment` | `api/app/models/payment.rb` | Pronto |
| Criação da cobrança | `GatewayPaymentService#create_intent!` | **Placeholder** |
| Confirmação por webhook | `GatewayPaymentService#apply_webhook!` | Pronto |
| Endpoint do webhook | `POST /api/v1/payments/webhook` | Pronto, com HMAC |
| Credenciais por tenant | `tenant_configs.psp_api_url` e `psp_api_key_enc` | Colunas já existem |

O pedido criado por um link de atacado com `allow_payment` chama o serviço em
[`catalog_links_controller.rb:61`](../api/app/controllers/api/v1/catalog_links_controller.rb).

### O que falta

`create_intent!` hoje **não chama PSP nenhum**. Ele grava um `Payment` com
`gateway_reference: "local-<hex>"` e `raw_response.mode = "local_placeholder"`, e devolve
sucesso. Ou seja: o pedido fecha, mas ninguém paga.

O ponto de entrada é só esse método. O contrato que o resto do sistema espera:

1. Chamar o PSP e criar a cobrança.
2. Persistir um `Payment` com `status: "pending"` e **`gateway_reference` igual ao id que
   o PSP devolveu** — é por esse campo que o webhook reencontra o pagamento.
3. Guardar a resposta crua em `raw_response` (útil para QR code do Pix, URL de checkout).
4. Deixar `order.payment_status` como `"pending"`.

O serviço já recebe o `TenantConfig` do tenant e tem `config.psp_configured?`, que checa
se `psp_api_url` e `psp_api_key_enc` estão preenchidos. Use isso para decidir entre
chamar o PSP e cair no placeholder.

### Webhook

Já funciona ponta a ponta e não precisa mudar, desde que o `gateway_reference` bata.

- Assinatura: HMAC-SHA256 do corpo cru, com o segredo em `GATEWAY_WEBHOOK_SECRET`,
  comparada contra o header `X-Gateway-Signature`. Sem a variável, o endpoint responde 503.
- Status aceitos e como são traduzidos: `paid`/`approved`/`confirmed` → `paid`;
  `failed`/`rejected`/`denied` → `failed`; `cancelled`/`canceled` → `cancelled`;
  `expired` → `expired`; qualquer outro → `pending`.
- Ao virar `paid`, grava `paid_at` e atualiza `order.payment_status`.

Testes em `api/spec/requests/api/v1/payments_spec.rb`, incluindo assinatura inválida.

### Dado sensível

Regra do produto: **dados de cartão nunca são armazenados**. O pedido guarda snapshot dos
valores comerciais, não do meio de pagamento. Mantenha o cartão no PSP.

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

### Referência que já funciona

[`web/src/components/cart/CartDrawer.tsx`](../web/src/components/cart/CartDrawer.tsx) faz
isso corretamente hoje: normaliza o número com `extractWhatsappNumber` (aceita tanto
`wa.me/55...` quanto texto com máscara), monta a mensagem do pedido e abre
`https://wa.me/<numero>?text=<mensagem>`. Vale copiar a abordagem.

Ele também trata o caso do número não configurado, mostrando um aviso em vez de quebrar.

### Onde falta plugar

| Arquivo | Situação |
|---|---|
| `web/src/pages/CatalogLinkPage.tsx` | Não envia por WhatsApp. **É o principal** — é a tela do comprador atacado. |
| `web/src/components/showroom/Footer.tsx` | Usa `alert()` com número estático de `@/data/catalog` |
| `web/src/pages/ProductDetail.tsx` | Idem |

Os dois últimos são do showroom legado, que ainda tem conteúdo da fase anterior.

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
