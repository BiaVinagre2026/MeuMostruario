# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_08_27_000001) do
  create_schema "tenant_demo"
  create_schema "tenant_mare-coral"

  # These are extensions that must be enabled in order to support this database
  enable_extension "citext"
  enable_extension "pg_trgm"
  enable_extension "plpgsql"
  enable_extension "unaccent"

  create_table "catalog_items", force: :cascade do |t|
    t.bigint "catalog_id", null: false
    t.bigint "product_id"
    t.bigint "photo_id"
    t.integer "position", default: 0, null: false
    t.boolean "visible", default: true, null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["catalog_id", "position"], name: "idx_catalog_items_catalog"
    t.index ["photo_id"], name: "idx_catalog_items_photo"
    t.index ["product_id"], name: "idx_catalog_items_product"
  end

  create_table "catalog_links", force: :cascade do |t|
    t.bigint "catalog_id", null: false
    t.bigint "parent_catalog_link_id"
    t.string "token", limit: 80, null: false
    t.string "slug", limit: 120
    t.string "link_type", limit: 30, default: "public_client", null: false
    t.boolean "show_prices", default: false, null: false
    t.boolean "allow_order", default: false, null: false
    t.boolean "allow_payment", default: false, null: false
    t.datetime "expires_at", precision: nil
    t.bigint "created_by_id"
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["catalog_id"], name: "idx_catalog_links_catalog"
    t.index ["token"], name: "idx_catalog_links_token"
    t.check_constraint "link_type::text = ANY (ARRAY['public_client'::character varying, 'wholesale_buyer'::character varying, 'selection'::character varying]::text[])", name: "catalog_links_type_check"
    t.unique_constraint ["token"], name: "catalog_links_token_unique"
  end

  create_table "catalogs", force: :cascade do |t|
    t.string "name", limit: 255, null: false
    t.text "description"
    t.string "status", limit: 30, default: "draft", null: false
    t.string "source", limit: 60, default: "admin", null: false
    t.jsonb "metadata", default: {}, null: false
    t.bigint "created_by_id"
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["created_at"], name: "idx_catalogs_created", order: :desc
    t.index ["status"], name: "idx_catalogs_status"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying]::text[])", name: "catalogs_status_check"
  end

  create_table "categories", force: :cascade do |t|
    t.bigint "parent_id"
    t.string "name", limit: 100, null: false
    t.string "slug", limit: 120, null: false
    t.integer "position", default: 0, null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["parent_id"], name: "idx_categories_parent"
    t.index ["position"], name: "idx_categories_position"
    t.unique_constraint ["slug"], name: "categories_slug_unique"
  end

  create_table "collections", force: :cascade do |t|
    t.string "name", limit: 255, null: false
    t.string "slug", limit: 120, null: false
    t.text "description"
    t.string "cover_url", limit: 500
    t.string "status", limit: 20, default: "draft", null: false
    t.integer "position", default: 0, null: false
    t.date "launched_at"
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["position"], name: "idx_collections_position"
    t.index ["slug"], name: "idx_collections_slug"
    t.index ["status"], name: "idx_collections_status"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying]::text[])", name: "collections_status_check"
    t.unique_constraint ["slug"], name: "collections_slug_unique"
  end

  create_table "members", force: :cascade do |t|
    t.string "cpf", limit: 11, null: false
    t.string "full_name", limit: 255, null: false
    t.string "email", limit: 255, null: false
    t.string "password_digest", limit: 255, null: false
    t.string "phone", limit: 20
    t.date "birthdate"
    t.string "gender", limit: 10
    t.string "status", limit: 20, default: "active", null: false
    t.string "plan_status", limit: 20, default: "active", null: false
    t.string "plan_category", limit: 100
    t.string "role", limit: 20, default: "member", null: false
    t.date "association_date", default: -> { "CURRENT_DATE" }, null: false
    t.date "last_payment_date"
    t.jsonb "address", default: {}
    t.text "tags", default: [], array: true
    t.jsonb "custom_fields", default: {}
    t.string "import_source", limit: 50
    t.string "reset_password_token", limit: 255
    t.datetime "reset_password_sent_at", precision: nil
    t.bigint "level_id"
    t.string "referral_code", limit: 20
    t.datetime "profile_completed_at", precision: nil
    t.integer "coin_balance", default: 0
    t.integer "xp_total", default: 0
    t.decimal "engagement_score", precision: 5, scale: 2, default: "0.0"
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index "lower((email)::text)", name: "idx_members_email"
    t.index ["level_id"], name: "idx_members_level_id"
    t.index ["plan_status"], name: "idx_members_plan_status"
    t.index ["referral_code"], name: "idx_members_referral_code"
    t.index ["status"], name: "idx_members_status"
    t.check_constraint "plan_status::text = ANY (ARRAY['active'::character varying, 'overdue'::character varying, 'cancelled'::character varying]::text[])", name: "members_plan_status_check"
    t.check_constraint "role::text = ANY (ARRAY['member'::character varying, 'admin'::character varying]::text[])", name: "members_role_check"
    t.check_constraint "status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'blocked'::character varying]::text[])", name: "members_status_check"
    t.unique_constraint ["cpf"], name: "members_cpf_unique"
    t.unique_constraint ["email"], name: "members_email_unique"
    t.unique_constraint ["referral_code"], name: "members_referral_code_unique"
  end

  create_table "operators", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "role", default: "admin", null: false
    t.bigint "tenant_id"
    t.string "status", default: "active", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_operators_on_email", unique: true
    t.index ["role"], name: "index_operators_on_role"
    t.index ["status"], name: "index_operators_on_status"
    t.index ["tenant_id"], name: "index_operators_on_tenant_id"
  end

  create_table "order_items", force: :cascade do |t|
    t.bigint "order_id", null: false
    t.bigint "product_id"
    t.string "product_name", limit: 255, null: false
    t.string "product_sku", limit: 100
    t.string "color", limit: 60
    t.string "size", limit: 30
    t.integer "qty", default: 1, null: false
    t.decimal "unit_price", precision: 10, scale: 2
    t.decimal "subtotal", precision: 10, scale: 2
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["order_id"], name: "idx_order_items_order"
  end

  create_table "orders", force: :cascade do |t|
    t.bigint "member_id", null: false
    t.string "status", limit: 20, default: "pending", null: false
    t.text "notes"
    t.integer "total_units", default: 0, null: false
    t.decimal "total_value", precision: 10, scale: 2, default: "0.0", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["created_at"], name: "idx_orders_created", order: :desc
    t.index ["member_id"], name: "idx_orders_member"
    t.index ["status"], name: "idx_orders_status"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'shipped'::character varying, 'cancelled'::character varying]::text[])", name: "orders_status_check"
  end

  create_table "partners", force: :cascade do |t|
    t.string "name", limit: 255, null: false
    t.string "email", limit: 255, null: false
    t.string "password_digest", limit: 255, null: false
    t.string "phone", limit: 20
    t.string "contact_name", limit: 255
    t.string "website", limit: 500
    t.text "description"
    t.string "status", limit: 30, default: "pending_approval", null: false
    t.string "api_key", limit: 64
    t.jsonb "metadata", default: {}
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.string "document_type", limit: 10, default: "cpf", null: false
    t.string "document_number", limit: 20
    t.string "legal_name", limit: 255
    t.string "logo_url"
    t.decimal "default_commission_percent", precision: 5, scale: 2
    t.bigint "approved_by"
    t.datetime "approved_at"
    t.index "lower((email)::text)", name: "idx_partners_email_lower", unique: true
    t.index ["api_key"], name: "idx_partners_api_key", unique: true, where: "(api_key IS NOT NULL)"
    t.index ["status"], name: "idx_partners_status"
    t.check_constraint "status::text = ANY (ARRAY['pending_approval'::character varying::text, 'active'::character varying::text, 'inactive'::character varying::text, 'suspended'::character varying::text, 'rejected'::character varying::text])", name: "chk_partners_status"
  end

  create_table "photo_analyses", force: :cascade do |t|
    t.bigint "photo_id", null: false
    t.string "provider", limit: 60, default: "openrouter", null: false
    t.string "model", limit: 120
    t.string "status", limit: 30, default: "pending", null: false
    t.jsonb "suggestions", default: {}, null: false
    t.jsonb "raw_response", default: {}, null: false
    t.decimal "confidence", precision: 5, scale: 4
    t.text "error_message"
    t.integer "cost_cents", default: 0
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["photo_id"], name: "idx_photo_analyses_photo"
    t.index ["status"], name: "idx_photo_analyses_status"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'completed'::character varying, 'error'::character varying]::text[])", name: "photo_analyses_status_check"
  end

  create_table "photo_batches", force: :cascade do |t|
    t.string "name", limit: 255
    t.string "status", limit: 30, default: "draft", null: false
    t.integer "total_count", default: 0, null: false
    t.integer "processed_count", default: 0, null: false
    t.integer "error_count", default: 0, null: false
    t.jsonb "metadata", default: {}, null: false
    t.bigint "created_by_id"
    t.datetime "started_at", precision: nil
    t.datetime "completed_at", precision: nil
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["created_at"], name: "idx_photo_batches_created", order: :desc
    t.index ["status"], name: "idx_photo_batches_status"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'uploading'::character varying, 'processing'::character varying, 'review'::character varying, 'reviewed'::character varying, 'published'::character varying, 'error'::character varying]::text[])", name: "photo_batches_status_check"
  end

  create_table "photos", force: :cascade do |t|
    t.bigint "photo_batch_id"
    t.bigint "product_id"
    t.bigint "product_variant_id"
    t.string "original_filename", limit: 255
    t.string "storage_key", limit: 500
    t.jsonb "urls", default: {}, null: false
    t.string "status", limit: 30, default: "uploaded", null: false
    t.string "suggested_color", limit: 80
    t.string "approved_color", limit: 80
    t.string "suggested_pantone", limit: 40
    t.string "approved_pantone", limit: 40
    t.string "suggested_model", limit: 120
    t.string "approved_model", limit: 120
    t.string "suggested_size_group", limit: 30
    t.string "approved_size_group", limit: 30
    t.decimal "confidence_score", precision: 5, scale: 4
    t.jsonb "metadata", default: {}, null: false
    t.datetime "reviewed_at", precision: nil
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["approved_color"], name: "idx_photos_color"
    t.index ["approved_size_group"], name: "idx_photos_size_group"
    t.index ["photo_batch_id"], name: "idx_photos_batch"
    t.index ["product_id"], name: "idx_photos_product"
    t.index ["status"], name: "idx_photos_status"
    t.check_constraint "approved_size_group IS NULL OR (approved_size_group::text = ANY (ARRAY['P/M'::character varying, 'M/G'::character varying, 'Unico'::character varying, 'Plus 1'::character varying, 'Plus 2'::character varying]::text[]))", name: "photos_size_group_check"
    t.check_constraint "status::text = ANY (ARRAY['uploaded'::character varying, 'processing'::character varying, 'needs_review'::character varying, 'approved'::character varying, 'published'::character varying, 'error'::character varying]::text[])", name: "photos_status_check"
  end

  create_table "product_images", force: :cascade do |t|
    t.bigint "product_id", null: false
    t.bigint "photo_id"
    t.jsonb "urls", default: {}, null: false
    t.jsonb "visual_metadata", default: {}, null: false
    t.integer "position", default: 0, null: false
    t.boolean "is_cover", default: false, null: false
    t.string "alt_text", limit: 255
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["photo_id"], name: "idx_product_images_photo"
    t.index ["product_id", "position"], name: "idx_product_images_product"
  end

  create_table "product_variants", force: :cascade do |t|
    t.bigint "product_id", null: false
    t.string "size", limit: 30
    t.string "color", limit: 60
    t.string "color_hex", limit: 7
    t.string "pantone", limit: 40
    t.string "size_group", limit: 30
    t.string "sku", limit: 100
    t.integer "stock_qty", default: 0
    t.decimal "price_override", precision: 10, scale: 2
    t.string "image_url", limit: 500
    t.integer "position", default: 0, null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["product_id", "position"], name: "idx_product_variants_product"
  end

  create_table "products", force: :cascade do |t|
    t.bigint "category_id"
    t.bigint "collection_id"
    t.string "name", limit: 255, null: false
    t.string "slug", limit: 120, null: false
    t.text "description"
    t.decimal "price_retail", precision: 10, scale: 2
    t.decimal "price_wholesale", precision: 10, scale: 2
    t.string "currency", limit: 3, default: "BRL", null: false
    t.string "sku", limit: 100
    t.string "status", limit: 20, default: "draft", null: false
    t.integer "position", default: 0, null: false
    t.text "tags", default: [], array: true
    t.string "fabric_composition", limit: 255
    t.text "care_instructions"
    t.jsonb "size_guide", default: {}
    t.jsonb "custom_fields", default: {}
    t.text "whatsapp_message"
    t.string "made_in", limit: 100
    t.integer "min_order_qty", default: 1
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["category_id"], name: "idx_products_category"
    t.index ["collection_id"], name: "idx_products_collection"
    t.index ["position"], name: "idx_products_position"
    t.index ["slug"], name: "idx_products_slug"
    t.index ["status"], name: "idx_products_status"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying, 'sold_out'::character varying]::text[])", name: "products_status_check"
    t.unique_constraint ["slug"], name: "products_slug_unique"
  end

  create_table "selection_items", force: :cascade do |t|
    t.bigint "selection_id", null: false
    t.bigint "catalog_item_id"
    t.bigint "product_id"
    t.bigint "photo_id"
    t.integer "qty", default: 1, null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["photo_id"], name: "idx_selection_items_photo"
    t.index ["selection_id"], name: "idx_selection_items_selection"
  end

  create_table "selections", force: :cascade do |t|
    t.bigint "catalog_link_id"
    t.bigint "generated_catalog_link_id"
    t.string "contact_name", limit: 255
    t.string "contact_phone", limit: 30
    t.string "contact_email", limit: 255
    t.string "status", limit: 30, default: "new", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["catalog_link_id"], name: "idx_selections_catalog_link"
    t.index ["created_at"], name: "idx_selections_created", order: :desc
    t.check_constraint "status::text = ANY (ARRAY['new'::character varying, 'sent'::character varying, 'converted'::character varying, 'archived'::character varying]::text[])", name: "selections_status_check"
  end

  create_table "tenant_configs", force: :cascade do |t|
    t.bigint "tenant_id", null: false
    t.string "logo_url"
    t.string "logo_compact_url"
    t.string "color_primary", default: "#1E40AF", null: false
    t.string "color_secondary", default: "#F97316", null: false
    t.string "color_accent", default: "#10B981", null: false
    t.string "font_primary", default: "Inter"
    t.string "font_heading", default: "Inter"
    t.string "coin_name", default: "Coins", null: false
    t.string "coin_symbol", default: "⭐"
    t.string "coin_icon_url"
    t.string "company_name"
    t.string "company_cnpj"
    t.text "company_address"
    t.string "company_phone"
    t.string "company_email"
    t.string "company_website"
    t.text "footer_text"
    t.text "terms_url"
    t.text "privacy_url"
    t.string "social_instagram"
    t.string "social_facebook"
    t.string "social_tiktok"
    t.string "social_youtube"
    t.string "social_linkedin"
    t.string "social_whatsapp"
    t.string "social_twitter"
    t.string "social_telegram"
    t.integer "overdue_days", default: 30, null: false
    t.string "timezone", default: "America/Sao_Paulo"
    t.string "locale", default: "pt-BR"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "color_header_text", default: "#64748B"
    t.string "color_header_text_hover", default: "#1E40AF"
    t.string "color_footer_text", default: "#94A3B8"
    t.string "color_footer_text_hover", default: "#0F172A"
    t.string "color_header_bg", default: "#FFFFFF"
    t.string "logo_mono_url"
    t.string "email_provider", default: "smtp"
    t.string "smtp_host"
    t.integer "smtp_port", default: 587
    t.string "smtp_username"
    t.string "smtp_password_enc"
    t.string "smtp_from_name"
    t.string "smtp_from_email"
    t.string "smtp_authentication", default: "plain"
    t.boolean "smtp_enable_starttls", default: true
    t.string "ses_access_key_id"
    t.string "ses_secret_key_enc"
    t.string "ses_region", default: "us-east-1"
    t.string "storage_provider", default: "local"
    t.string "s3_bucket"
    t.string "s3_region", default: "us-east-1"
    t.string "s3_access_key_id"
    t.string "s3_secret_access_key_enc"
    t.string "s3_public_url"
    t.string "openrouter_model"
    t.string "favicon_url"
    t.string "favicon_mode", default: "auto", null: false
    t.integer "refund_deadline_days", default: 30, null: false
    t.string "coin_expiry_policy", default: "never", null: false
    t.decimal "coin_brl_rate", precision: 10, scale: 4
    t.string "psp_api_url"
    t.string "psp_api_key_enc"
    t.jsonb "coin_packages", default: []
    t.jsonb "coin_events", default: {}
    t.jsonb "enabled_payment_methods", default: []
    t.boolean "allow_money_payment", default: false
    t.jsonb "multiplier_rules", default: {}
    t.string "announcement_bar_text"
    t.string "psp_merchant_id"
    t.string "psp_callback_secret_enc"
    t.string "psp_signature_header", default: "X-Gateway-Signature"
    t.decimal "min_order_amount", precision: 10, scale: 2, default: "0.0", null: false
    t.index ["tenant_id"], name: "index_tenant_configs_on_tenant_id", unique: true
  end

  create_table "tenant_partner_authorizations", force: :cascade do |t|
    t.bigint "tenant_id", null: false
    t.bigint "partner_id", null: false
    t.string "status", default: "active", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["partner_id"], name: "index_tenant_partner_authorizations_on_partner_id"
    t.index ["tenant_id", "partner_id"], name: "idx_tpa_tenant_partner", unique: true
  end

  create_table "tenants", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "custom_domain"
    t.string "plan", default: "starter", null: false
    t.string "status", default: "active", null: false
    t.string "schema_name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["custom_domain"], name: "index_tenants_on_custom_domain", unique: true, where: "(custom_domain IS NOT NULL)"
    t.index ["schema_name"], name: "index_tenants_on_schema_name", unique: true
    t.index ["slug"], name: "index_tenants_on_slug", unique: true
    t.index ["status"], name: "index_tenants_on_status"
  end

  create_table "test_trgm_check", id: false, force: :cascade do |t|
    t.text "name"
  end

  add_foreign_key "catalog_items", "catalogs", name: "catalog_items_catalog_id_fkey", on_delete: :cascade
  add_foreign_key "catalog_items", "photos", name: "catalog_items_photo_id_fkey", on_delete: :nullify
  add_foreign_key "catalog_items", "products", name: "catalog_items_product_id_fkey", on_delete: :nullify
  add_foreign_key "catalog_links", "catalog_links", column: "parent_catalog_link_id", name: "catalog_links_parent_catalog_link_id_fkey", on_delete: :nullify
  add_foreign_key "catalog_links", "catalogs", name: "catalog_links_catalog_id_fkey", on_delete: :cascade
  add_foreign_key "categories", "categories", column: "parent_id", name: "categories_parent_id_fkey", on_delete: :nullify
  add_foreign_key "operators", "tenants"
  add_foreign_key "order_items", "orders", name: "order_items_order_id_fkey", on_delete: :cascade
  add_foreign_key "partners", "operators", column: "approved_by"
  add_foreign_key "photo_analyses", "photos", name: "photo_analyses_photo_id_fkey", on_delete: :cascade
  add_foreign_key "photos", "photo_batches", name: "photos_photo_batch_id_fkey", on_delete: :nullify
  add_foreign_key "photos", "product_variants", name: "photos_product_variant_id_fkey", on_delete: :nullify
  add_foreign_key "photos", "products", name: "photos_product_id_fkey", on_delete: :nullify
  add_foreign_key "product_images", "products", name: "product_images_product_id_fkey", on_delete: :cascade
  add_foreign_key "product_variants", "products", name: "product_variants_product_id_fkey", on_delete: :cascade
  add_foreign_key "products", "categories", name: "products_category_id_fkey", on_delete: :nullify
  add_foreign_key "products", "collections", name: "products_collection_id_fkey", on_delete: :nullify
  add_foreign_key "selection_items", "catalog_items", name: "selection_items_catalog_item_id_fkey", on_delete: :nullify
  add_foreign_key "selection_items", "photos", name: "selection_items_photo_id_fkey", on_delete: :nullify
  add_foreign_key "selection_items", "products", name: "selection_items_product_id_fkey", on_delete: :nullify
  add_foreign_key "selection_items", "selections", name: "selection_items_selection_id_fkey", on_delete: :cascade
  add_foreign_key "selections", "catalog_links", column: "generated_catalog_link_id", name: "selections_generated_catalog_link_id_fkey", on_delete: :nullify
  add_foreign_key "selections", "catalog_links", name: "selections_catalog_link_id_fkey", on_delete: :nullify
  add_foreign_key "tenant_configs", "tenants"
  add_foreign_key "tenant_partner_authorizations", "partners"
  add_foreign_key "tenant_partner_authorizations", "tenants"
end
