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

**Contrato de assinatura conferido em 03/09/2026.** A documentação pública Orbe PSP 1.1.0
define `X-PSP-Signature: t=<unix>,v1=<hex>[,v1=<hex>]`. O HMAC-SHA256 usa o segredo do
endpoint do merchant e a mensagem `<timestamp>.<corpo bruto>`. Entregas com diferença
absoluta de horário maior que 300 segundos são rejeitadas; qualquer `v1` válida pode
confirmar a entrega durante uma rotação de segredos. Não reserializar o JSON.

Para ativar esse contrato, configurar `psp_signature_header=X-PSP-Signature` no tenant.
Nesse modo, `OrbeWebhookSignature` exige o segredo exclusivo do tenant e não aceita
segredo global, HMAC legado ou outro header como alternativa. A configuração antiga dos
outros tenants permanece intacta: header vazio ou legado conserva o comportamento
anterior. Não trocar configurações de outro tenant durante a homologação da Maré Coral.

**Callback fora de ordem não rebaixa pagamento confirmado.** O gateway reentrega, e nada
garante a ordem: um `processing` atrasado depois do `paid` devolvia o pedido para pendente
com o estoque já baixado. Do `paid` só se sai por cancelamento.

### Como verificar quando a credencial chegar

```bash
docker compose exec api bin/rails gateway:check TENANT=demo
```

Lista o que falta e imprime o endereço de callback para registrar na Orbe. Com
`COBRAR=1` emite uma cobrança real de R$ 1,00 (ajustável com `VALOR=`) e diz se a Orbe
respondeu com Pix.

### O que ainda não foi validado

A integração tem testes com resposta simulada do gateway (`gateway_payment_service_spec.rb`
e `payments_spec.rb`), mas **nunca falou com a Orbe de verdade**. Falta, e nada disso
depende de código:

- Credenciais reais de um merchant.
- Um endereço público para o callback: `localhost` não recebe. Use túnel (ngrok,
  cloudflared) ou um ambiente publicado, e aponte `PSP_CALLBACK_BASE_URL` para ele.

Na documentação pública consultada em 03/09/2026, somente `https://api.casetec.com.br`
está listado como servidor, explicitamente marcado **Production**. Não tratá-lo como
sandbox. Para Maré Coral, falta acesso administrativo ao PSP para obter a conta merchant,
a API key, o segredo do endpoint de webhook e confirmar um modo/ambiente de homologação.
Não criar túnel, alterar a base compartilhada de callbacks ou emitir cobrança real sem
autorização específica. A tarefa `gateway:check` só é consulta quando `COBRAR` está ausente;
qualquer valor não vazio nessa variável ativa a emissão de cobrança.

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

| `web/src/pages/CatalogLinkPage.tsx` | Envia o pedido do comprador atacado, **depois** de registrado |

### A mensagem do link de atacado

O pedido é registrado no backend primeiro; o WhatsApp é o passo seguinte, nunca o
substituto — assim o pedido não se perde se o comprador fechar a aba.

A mensagem sai com modelo, Pantone, grade e valor. **Foto não vai como anexo**: o `wa.me`
transporta só texto. O WhatsApp monta pré-visualização do primeiro endereço do texto, e só
de um endereço público — por isso a foto entra apenas quando o catálogo estiver publicado
fora da rede local. Em `localhost` ou IP interno ela vira um calhau de texto sem imagem, e
por isso é omitida.

---

## Como validar

```bash
docker compose exec api bundle exec rspec
cd web && npm test
cd web && npx tsc --noEmit
```

Para o fluxo manual, o roteiro de avaliação está no [README](../README.md).
