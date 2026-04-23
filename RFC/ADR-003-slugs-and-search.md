# ADR-003 — Slugs Amigáveis e Estratégia de Busca

**Status:** Aceito  
**Data:** 2026-04-20  
**Autores:** Tech Lead

---

## Contexto

O storefront público precisa de URLs amigáveis para SEO:
- `/produtos/vestido-floral-primavera-2026`
- `/colecoes/verao-2026`

Além disso, o painel admin precisa de busca por texto nos catálogos (produtos, membros, leads).

O Gemfile atual não contém `friendly_id` nem `pg_search`. Contém `nanoid` (~> 2.0).

## Decisão — Slugs

**Slug manual com `nanoid` + coluna `slug` com índice UNIQUE**, sem a gem `friendly_id`.

### Justificativa
- `friendly_id` adiciona ~500 linhas de DSL e uma tabela `friendly_id_slugs` de histórico — complexidade desnecessária no MVP
- `nanoid` já está no Gemfile e é usado em outros pontos do projeto
- Schema-per-tenant: `friendly_id` exige configuração adicional por schema, slug manual é transparente

### Implementação

```ruby
# concern: app/models/concerns/has_slug.rb
module HasSlug
  extend ActiveSupport::Concern

  included do
    before_validation :generate_slug, if: -> { slug.blank? }
    validates :slug, presence: true,
                     uniqueness: true,
                     format: { with: /\A[a-z0-9\-]+\z/ }
  end

  private

  def generate_slug
    base = slugify(slug_source)
    candidate = base
    suffix = 1
    while self.class.where(slug: candidate).where.not(id: id).exists?
      candidate = "#{base}-#{suffix}"
      suffix += 1
    end
    self.slug = candidate
  end

  def slugify(str)
    str.to_s
       .unicode_normalize(:nfd)
       .gsub(/[^\x00-\x7F]/, "")
       .downcase
       .gsub(/[^a-z0-9\s\-]/, "")
       .gsub(/\s+/, "-")
       .gsub(/-+/, "-")
       .strip
       .first(100)
  end
end
```

Cada model define `slug_source`:
```ruby
class Product < ApplicationRecord
  include HasSlug
  def slug_source = name
end
```

DDL para produtos (exemplo):
```sql
slug VARCHAR(120) NOT NULL UNIQUE
```

---

## Decisão — Busca Full-Text

**MVP: `pg_trgm` (PostgreSQL trigram extension) com índice GIN.**  
**V1: Avaliar `pg_search` gem ou Meilisearch cloud.**

### Justificativa
- `pg_trgm` não requer gems adicionais — apenas `CREATE EXTENSION IF NOT EXISTS pg_trgm` via migration
- Índice GIN em colunas `name` + `description` permite `ILIKE '%termo%'` em O(log n)
- Performance suficiente para catálogos MVP (< 10k produtos por tenant)
- Evita dependência de serviço externo no MVP

### DDL indexes (adicionados ao `TenantSchemaSql`)
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- executado no schema público uma vez

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON products USING GIN (description gin_trgm_ops);
```

### Query pattern nos controllers
```ruby
scope = Product.all
scope = scope.where("name ILIKE ?", "%#{params[:q]}%") if params[:q].present?
```

### Critério de upgrade para V1
Migrar para `pg_search` ou Meilisearch quando qualquer tenant superar **5.000 produtos** ou quando buscas combinadas (produto + coleção + look) forem necessárias no mesmo resultado.
