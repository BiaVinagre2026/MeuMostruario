# frozen_string_literal: true

class AddPhase1Columns < ActiveRecord::Migration[7.2]
  def change
    # ---------------------------------------------------------------
    # tenant_configs — missing columns
    # ---------------------------------------------------------------
    change_table :tenant_configs, bulk: true do |t|
      t.integer :refund_deadline_days, default: 30, null: false
      t.string  :coin_expiry_policy, default: "never", null: false
      t.decimal :coin_brl_rate, precision: 10, scale: 4
      t.string  :psp_api_url
      t.string  :psp_api_key_enc
      t.jsonb   :coin_packages, default: []
      t.jsonb   :coin_events, default: {}
      t.jsonb   :enabled_payment_methods, default: []
      t.boolean :allow_money_payment, default: false
      t.jsonb   :multiplier_rules, default: {}
    end

    # ---------------------------------------------------------------
    # partners — missing columns
    # ---------------------------------------------------------------
    change_table :partners, bulk: true do |t|
      t.string  :document_type, limit: 10, default: "cpf", null: false
      t.string  :document_number, limit: 20
      t.string  :legal_name, limit: 255
      t.string  :logo_url
      t.decimal :default_commission_percent, precision: 5, scale: 2
      t.bigint  :approved_by
      t.datetime :approved_at
    end

    add_foreign_key :partners, :operators, column: :approved_by

    # ---------------------------------------------------------------
    # tenant_partner_authorizations — new table
    # ---------------------------------------------------------------
    create_table :tenant_partner_authorizations do |t|
      t.bigint :tenant_id, null: false
      t.bigint :partner_id, null: false
      t.string :status, default: "active", null: false
      t.timestamps
    end

    add_index :tenant_partner_authorizations, [:tenant_id, :partner_id],
              unique: true, name: "idx_tpa_tenant_partner"
    add_index :tenant_partner_authorizations, :partner_id

    add_foreign_key :tenant_partner_authorizations, :tenants
    add_foreign_key :tenant_partner_authorizations, :partners
  end
end
