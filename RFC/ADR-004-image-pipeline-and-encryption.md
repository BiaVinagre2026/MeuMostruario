# ADR-004 — Pipeline de Imagens e Criptografia de Campos Sensíveis

**Status:** Aceito  
**Data:** 2026-04-20  
**Autores:** Tech Lead

---

## Contexto

### Imagens
O projeto precisa processar imagens de produto com múltiplos tamanhos (thumb, card, zoom). O `ImageStorageService` atual faz upload direto ao S3/local sem gerar variants. A gem `image_processing` e a lib `libvips` estão **ausentes do Gemfile**, porém `libvips` **já está instalado no Dockerfile** (`apt-get install libvips`).

### Criptografia
`TenantConfig` possui campos `*_enc` (SMTP password, S3 secret key, PSP credentials) que são **colunas `string` simples** — sem criptografia at-rest. Isso é um risco de segurança para credenciais de produção.

---

## Decisão — Pipeline de Imagens

**Adicionar `image_processing` gem + processar variants no upload de produto.**

### Gems a adicionar ao Gemfile
```ruby
gem "image_processing", "~> 1.2"   # wraps libvips/ImageMagick
```

`libvips` já está no Dockerfile — nenhuma mudança de infraestrutura necessária.

### Variants definidos por tipo de uso

| Variant | Dimensões | Uso |
|---------|-----------|-----|
| `thumb` | 200×200 crop center | Grid de listagem, admin |
| `card` | 400×600 fit | Cards do storefront mobile |
| `zoom` | 1200×1800 fit | Lightbox / detalhe |
| `og` | 1200×630 crop | Open Graph / share |

### Fluxo

1. Upload recebe arquivo via `admin/uploads` (controller existente) → armazena original em S3/local
2. `ProcessProductImageJob` (novo job Sidekiq) é enfileirado após o upload
3. Job usa `ImageProcessing::Vips` para gerar os 4 variants e armazenar no mesmo bucket com sufixo `_thumb`, `_card`, `_zoom`, `_og`
4. `product_images` table armazena `{ original_url, thumb_url, card_url, zoom_url, og_url }` em coluna JSONB `urls`

### DDL (adicionado ao `TenantSchemaSql`)
```sql
CREATE TABLE IF NOT EXISTS product_images (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  urls        JSONB         NOT NULL DEFAULT '{}',
  position    INTEGER       NOT NULL DEFAULT 0,
  is_cover    BOOLEAN       NOT NULL DEFAULT false,
  alt_text    VARCHAR(255),
  created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id, position);
```

---

## Decisão — Criptografia de Campos Sensíveis

**Usar `ActiveRecord::Encryption` (nativo no Rails 7+) para colunas `*_enc` em `TenantConfig`.**

### Justificativa
- Nativo no Rails 7.2 — zero gems adicionais
- Transparente para o código: `tenant_config.smtp_password_enc` lê/escreve como string normal
- Criptografia AES-256-GCM com chave derivada de `config/credentials.yml.enc`

### Implementação

```ruby
# config/application.rb
config.active_record.encryption.primary_key = Rails.application.credentials.ar_encryption_primary_key
config.active_record.encryption.deterministic_key = Rails.application.credentials.ar_encryption_deterministic_key
config.active_record.encryption.key_derivation_salt = Rails.application.credentials.ar_encryption_key_derivation_salt

# app/models/tenant_config.rb
class TenantConfig < ApplicationRecord
  encrypts :smtp_password_enc
  encrypts :s3_secret_key_enc
  encrypts :psp_credentials_enc
  encrypts :openrouter_api_key_enc
end
```

### Geração das chaves (executar uma vez no setup)
```bash
bin/rails db:encryption:init
# Copia output para config/credentials.yml.enc via:
bin/rails credentials:edit
```

### Migration de dados existentes
Campos `*_enc` que já tenham valor em plaintext precisam ser re-encriptados:
```bash
bin/rails runner "TenantConfig.find_each(&:encrypt)"
```

### Variáveis de ambiente (produção / Docker)
```
RAILS_MASTER_KEY=<master_key>
```
A `RAILS_MASTER_KEY` decripta o `credentials.yml.enc` que contém as chaves do `ActiveRecord::Encryption`.

---

## Consequências Combinadas

- Gemfile receberá apenas 1 gem nova: `image_processing`
- Dockerfile não muda (libvips já presente)
- `TenantConfig` model precisará de `encrypts` declarado antes de salvar credenciais reais
- `ProcessProductImageJob` é um novo job — seguir padrão de `SendEmailJob` para error handling e retry
- Testes de `ProcessProductImageJob` devem usar `ImageProcessing::Vips.stub` em CI (sem libvips no runner do GitHub Actions → usar `image_processing` em modo stub ou checar `SKIP_IMAGE_PROCESSING=true`)
