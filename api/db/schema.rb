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

ActiveRecord::Schema[7.2].define(version: 2026_03_17_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

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

  add_foreign_key "operators", "tenants"
  add_foreign_key "partners", "operators", column: "approved_by"
  add_foreign_key "tenant_configs", "tenants"
  add_foreign_key "tenant_partner_authorizations", "partners"
  add_foreign_key "tenant_partner_authorizations", "tenants"
end
