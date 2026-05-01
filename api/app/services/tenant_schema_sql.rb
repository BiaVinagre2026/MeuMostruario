# frozen_string_literal: true

# TenantSchemaSql
#
# Provides the SQL to create all tenant-scoped tables within an isolated
# PostgreSQL schema. Called by TenantProvisioner when onboarding a new tenant.
class TenantSchemaSql
  def self.tables_sql
    [
      members_sql,
      imports_sql,
      notifications_sql,
      webhook_endpoints_sql,
      webhook_deliveries_sql,
      categories_sql,
      collections_sql,
      products_sql,
      product_variants_sql,
      product_images_sql,
      looks_sql,
      look_items_sql,
      leads_sql,
      waitlists_sql,
      orders_sql,
      order_items_sql
    ].join("\n\n")
  end

  def self.domain_tables_sql
    [
      categories_sql,
      collections_sql,
      products_sql,
      product_variants_sql,
      product_images_sql,
      looks_sql,
      look_items_sql,
      leads_sql,
      waitlists_sql,
      orders_sql,
      order_items_sql
    ].join("\n\n")
  end

  def self.orders_tables_sql
    [orders_sql, order_items_sql].join("\n\n")
  end

  # ---------------------------------------------------------------------------
  # Members - the core user table within each tenant schema
  # ---------------------------------------------------------------------------
  def self.members_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS members (
        id              BIGSERIAL PRIMARY KEY,
        cpf             VARCHAR(11)    NOT NULL,
        full_name       VARCHAR(255)   NOT NULL,
        email           VARCHAR(255)   NOT NULL,
        password_digest VARCHAR(255)   NOT NULL,
        phone           VARCHAR(20),
        birthdate       DATE,
        gender          VARCHAR(10),
        status          VARCHAR(20)    NOT NULL DEFAULT 'active',
        plan_status     VARCHAR(20)    NOT NULL DEFAULT 'active',
        plan_category   VARCHAR(100),
        role            VARCHAR(20)    NOT NULL DEFAULT 'member',
        association_date DATE          NOT NULL DEFAULT CURRENT_DATE,
        last_payment_date DATE,
        address         JSONB          DEFAULT '{}',
        tags            TEXT[]         DEFAULT '{}',
        custom_fields   JSONB          DEFAULT '{}',
        import_source   VARCHAR(50),
        reset_password_token    VARCHAR(255),
        reset_password_sent_at  TIMESTAMP,
        level_id        BIGINT,
        referral_code   VARCHAR(20),
        profile_completed_at TIMESTAMP,
        coin_balance    INTEGER        DEFAULT 0,
        xp_total        INTEGER        DEFAULT 0,
        engagement_score DECIMAL(5,2)  DEFAULT 0,
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT members_cpf_unique UNIQUE (cpf),
        CONSTRAINT members_email_unique UNIQUE (email),
        CONSTRAINT members_referral_code_unique UNIQUE (referral_code),
        CONSTRAINT members_status_check CHECK (status IN ('active','inactive','blocked')),
        CONSTRAINT members_plan_status_check CHECK (plan_status IN ('active','overdue','cancelled')),
        CONSTRAINT members_role_check CHECK (role IN ('member','admin'))
      );

      CREATE INDEX IF NOT EXISTS idx_members_status ON members (status);
      CREATE INDEX IF NOT EXISTS idx_members_plan_status ON members (plan_status);
      CREATE INDEX IF NOT EXISTS idx_members_email ON members (LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_members_level_id ON members (level_id);
      CREATE INDEX IF NOT EXISTS idx_members_referral_code ON members (referral_code);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Imports - track CSV/XLSX bulk member imports
  # ---------------------------------------------------------------------------
  def self.imports_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS imports (
        id              BIGSERIAL PRIMARY KEY,
        filename        VARCHAR(255)   NOT NULL,
        status          VARCHAR(30)    NOT NULL DEFAULT 'pending',
        total_rows      INTEGER        DEFAULT 0,
        processed_rows  INTEGER        DEFAULT 0,
        success_rows    INTEGER        DEFAULT 0,
        error_rows      INTEGER        DEFAULT 0,
        column_mapping  JSONB          DEFAULT '{}',
        errors_detail   JSONB          DEFAULT '[]',
        uploaded_by     BIGINT,
        started_at      TIMESTAMP,
        completed_at    TIMESTAMP,
        file_path       VARCHAR(500),
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP      NOT NULL DEFAULT NOW()
      );
    SQL
  end

  # ---------------------------------------------------------------------------
  # Notifications
  # ---------------------------------------------------------------------------
  def self.notifications_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS notifications (
        id              BIGSERIAL PRIMARY KEY,
        member_id       BIGINT         NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        title           VARCHAR(255)   NOT NULL,
        body            TEXT,
        notification_type VARCHAR(50)  NOT NULL DEFAULT 'info',
        read_at         TIMESTAMP,
        metadata        JSONB          DEFAULT '{}',
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications (member_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (member_id, read_at);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Webhook endpoints & deliveries
  # ---------------------------------------------------------------------------
  def self.webhook_endpoints_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id              BIGSERIAL PRIMARY KEY,
        url             VARCHAR(500)   NOT NULL,
        events          TEXT[]         DEFAULT '{}',
        secret          VARCHAR(255),
        active          BOOLEAN        DEFAULT true,
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP      NOT NULL DEFAULT NOW()
      );
    SQL
  end

  def self.webhook_deliveries_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id              BIGSERIAL PRIMARY KEY,
        webhook_endpoint_id BIGINT     NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
        event           VARCHAR(100)   NOT NULL,
        payload         JSONB          NOT NULL DEFAULT '{}',
        response_code   INTEGER,
        response_body   TEXT,
        delivered_at    TIMESTAMP,
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries (webhook_endpoint_id);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Categories — hierarchical, optional parent for sub-categories
  # ---------------------------------------------------------------------------
  def self.categories_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS categories (
        id              BIGSERIAL PRIMARY KEY,
        parent_id       BIGINT         REFERENCES categories(id) ON DELETE SET NULL,
        name            VARCHAR(100)   NOT NULL,
        slug            VARCHAR(120)   NOT NULL,
        position        INTEGER        NOT NULL DEFAULT 0,
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT categories_slug_unique UNIQUE (slug)
      );

      CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
      CREATE INDEX IF NOT EXISTS idx_categories_position ON categories (position);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Collections — seasonal or thematic groupings of products
  # ---------------------------------------------------------------------------
  def self.collections_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS collections (
        id              BIGSERIAL PRIMARY KEY,
        name            VARCHAR(255)   NOT NULL,
        slug            VARCHAR(120)   NOT NULL,
        description     TEXT,
        cover_url       VARCHAR(500),
        status          VARCHAR(20)    NOT NULL DEFAULT 'draft',
        position        INTEGER        NOT NULL DEFAULT 0,
        launched_at     DATE,
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT collections_slug_unique UNIQUE (slug),
        CONSTRAINT collections_status_check CHECK (status IN ('draft','published','archived'))
      );

      CREATE INDEX IF NOT EXISTS idx_collections_status ON collections (status);
      CREATE INDEX IF NOT EXISTS idx_collections_position ON collections (position);
      CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections (slug);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Products — core catalog item
  # ---------------------------------------------------------------------------
  def self.products_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS products (
        id                  BIGSERIAL PRIMARY KEY,
        category_id         BIGINT         REFERENCES categories(id) ON DELETE SET NULL,
        collection_id       BIGINT         REFERENCES collections(id) ON DELETE SET NULL,
        name                VARCHAR(255)   NOT NULL,
        slug                VARCHAR(120)   NOT NULL,
        description         TEXT,
        price_retail        DECIMAL(10,2),
        price_wholesale     DECIMAL(10,2),
        currency            VARCHAR(3)     NOT NULL DEFAULT 'BRL',
        sku                 VARCHAR(100),
        status              VARCHAR(20)    NOT NULL DEFAULT 'draft',
        position            INTEGER        NOT NULL DEFAULT 0,
        tags                TEXT[]         DEFAULT '{}',
        fabric_composition  VARCHAR(255),
        care_instructions   TEXT,
        size_guide          JSONB          DEFAULT '{}',
        custom_fields       JSONB          DEFAULT '{}',
        whatsapp_message    TEXT,
        made_in             VARCHAR(100),
        min_order_qty       INTEGER        DEFAULT 1,
        created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT products_slug_unique UNIQUE (slug),
        CONSTRAINT products_status_check CHECK (status IN ('draft','published','archived','sold_out'))
      );

      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
      CREATE INDEX IF NOT EXISTS idx_products_collection ON products (collection_id);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
      CREATE INDEX IF NOT EXISTS idx_products_position ON products (position);
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
      CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING GIN (description gin_trgm_ops);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Product variants — size/color combinations per product
  # ---------------------------------------------------------------------------
  def self.product_variants_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS product_variants (
        id              BIGSERIAL PRIMARY KEY,
        product_id      BIGINT         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        size            VARCHAR(30),
        color           VARCHAR(60),
        color_hex       VARCHAR(7),
        sku             VARCHAR(100),
        stock_qty       INTEGER        DEFAULT 0,
        price_override  DECIMAL(10,2),
        image_url       VARCHAR(500),
        position        INTEGER        NOT NULL DEFAULT 0,
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP      NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id, position);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Product images — multiple per product, with processed variants
  # ---------------------------------------------------------------------------
  def self.product_images_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS product_images (
        id              BIGSERIAL PRIMARY KEY,
        product_id      BIGINT         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        urls            JSONB          NOT NULL DEFAULT '{}',
        position        INTEGER        NOT NULL DEFAULT 0,
        is_cover        BOOLEAN        NOT NULL DEFAULT false,
        alt_text        VARCHAR(255),
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id, position);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Looks — curated visual compositions combining multiple products
  # ---------------------------------------------------------------------------
  def self.looks_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS looks (
        id              BIGSERIAL PRIMARY KEY,
        name            VARCHAR(255)   NOT NULL,
        slug            VARCHAR(120)   NOT NULL,
        description     TEXT,
        cover_url       VARCHAR(500),
        status          VARCHAR(20)    NOT NULL DEFAULT 'draft',
        position        INTEGER        NOT NULL DEFAULT 0,
        collection_id   BIGINT         REFERENCES collections(id) ON DELETE SET NULL,
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT looks_slug_unique UNIQUE (slug),
        CONSTRAINT looks_status_check CHECK (status IN ('draft','published','archived'))
      );

      CREATE INDEX IF NOT EXISTS idx_looks_status ON looks (status);
      CREATE INDEX IF NOT EXISTS idx_looks_collection ON looks (collection_id);
      CREATE INDEX IF NOT EXISTS idx_looks_slug ON looks (slug);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Look items — join between looks and products with position
  # ---------------------------------------------------------------------------
  def self.look_items_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS look_items (
        id              BIGSERIAL PRIMARY KEY,
        look_id         BIGINT         NOT NULL REFERENCES looks(id) ON DELETE CASCADE,
        product_id      BIGINT         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        position        INTEGER        NOT NULL DEFAULT 0,
        note            VARCHAR(255),
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT look_items_unique UNIQUE (look_id, product_id)
      );

      CREATE INDEX IF NOT EXISTS idx_look_items_look ON look_items (look_id, position);
      CREATE INDEX IF NOT EXISTS idx_look_items_product ON look_items (product_id);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Leads — interest capture from storefront visitors
  # ---------------------------------------------------------------------------
  def self.leads_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS leads (
        id              BIGSERIAL PRIMARY KEY,
        product_id      BIGINT         REFERENCES products(id) ON DELETE SET NULL,
        name            VARCHAR(255),
        email           VARCHAR(255),
        phone           VARCHAR(20),
        message         TEXT,
        source          VARCHAR(50)    NOT NULL DEFAULT 'storefront',
        status          VARCHAR(30)    NOT NULL DEFAULT 'new',
        metadata        JSONB          DEFAULT '{}',
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT leads_status_check CHECK (status IN ('new','contacted','converted','discarded'))
      );

      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
      CREATE INDEX IF NOT EXISTS idx_leads_product ON leads (product_id);
      CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Waitlists — pre-launch / drop interest registration
  # ---------------------------------------------------------------------------
  def self.waitlists_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS waitlists (
        id              BIGSERIAL PRIMARY KEY,
        collection_id   BIGINT         REFERENCES collections(id) ON DELETE SET NULL,
        product_id      BIGINT         REFERENCES products(id) ON DELETE SET NULL,
        email           VARCHAR(255)   NOT NULL,
        phone           VARCHAR(20),
        name            VARCHAR(255),
        notified_at     TIMESTAMP,
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT waitlists_email_collection_unique UNIQUE (email, collection_id),
        CONSTRAINT waitlists_email_product_unique UNIQUE (email, product_id)
      );

      CREATE INDEX IF NOT EXISTS idx_waitlists_collection ON waitlists (collection_id);
      CREATE INDEX IF NOT EXISTS idx_waitlists_product ON waitlists (product_id);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Orders — B2B wholesale orders placed by members via the lojistas storefront
  # ---------------------------------------------------------------------------
  def self.orders_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS orders (
        id              BIGSERIAL PRIMARY KEY,
        member_id       BIGINT         NOT NULL,
        status          VARCHAR(20)    NOT NULL DEFAULT 'pending',
        notes           TEXT,
        total_units     INTEGER        NOT NULL DEFAULT 0,
        total_value     DECIMAL(10,2)  NOT NULL DEFAULT 0,
        metadata        JSONB          NOT NULL DEFAULT '{}',
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT orders_status_check CHECK (status IN ('pending','confirmed','processing','shipped','cancelled'))
      );

      CREATE INDEX IF NOT EXISTS idx_orders_member ON orders (member_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
    SQL
  end

  # ---------------------------------------------------------------------------
  # Order items — individual line items belonging to an order
  # ---------------------------------------------------------------------------
  def self.order_items_sql
    <<~SQL
      CREATE TABLE IF NOT EXISTS order_items (
        id              BIGSERIAL PRIMARY KEY,
        order_id        BIGINT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id      BIGINT,
        product_name    VARCHAR(255)   NOT NULL,
        product_sku     VARCHAR(100),
        color           VARCHAR(60),
        size            VARCHAR(30),
        qty             INTEGER        NOT NULL DEFAULT 1,
        unit_price      DECIMAL(10,2),
        subtotal        DECIMAL(10,2),
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
    SQL
  end
end
