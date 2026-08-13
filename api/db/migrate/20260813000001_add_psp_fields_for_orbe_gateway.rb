# frozen_string_literal: true

# Prepara o terreno para a integracao com a Orbe PSP.
#
# No schema publico: cada tenant e um merchant proprio no gateway, entao alem da
# chave de API ja existente ele precisa guardar o identificador do merchant e o
# segredo usado para assinar o callback. O nome do header da assinatura tambem
# fica configuravel porque a documentacao do PSP nao o especifica.
#
# Nos schemas de tenant: o comprador passa a informar CPF ou CNPJ, exigido pelo
# gateway na criacao da cobranca, e o pagamento guarda a Idempotency-Key para que
# uma retentativa reaproveite a mesma chave em vez de gerar cobranca duplicada.
class AddPspFieldsForOrbeGateway < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  DEFAULT_SIGNATURE_HEADER = "X-Gateway-Signature"

  def up
    add_column :tenant_configs, :psp_merchant_id, :string unless column_exists?(:tenant_configs, :psp_merchant_id)
    add_column :tenant_configs, :psp_callback_secret_enc, :string unless column_exists?(:tenant_configs, :psp_callback_secret_enc)

    unless column_exists?(:tenant_configs, :psp_signature_header)
      add_column :tenant_configs, :psp_signature_header, :string, default: DEFAULT_SIGNATURE_HEADER
    end

    each_tenant_schema do |schema|
      connection.execute(<<~SQL)
        ALTER TABLE orders   ADD COLUMN IF NOT EXISTS buyer_document  VARCHAR(20);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
          ON payments (idempotency_key) WHERE idempotency_key IS NOT NULL;
      SQL
      Rails.logger.info("[Migration] #{schema}: campos do PSP provisionados")
    end
  end

  def down
    each_tenant_schema do |schema|
      connection.execute(<<~SQL)
        DROP INDEX IF EXISTS idx_payments_idempotency_key;
        ALTER TABLE payments DROP COLUMN IF EXISTS idempotency_key;
        ALTER TABLE orders   DROP COLUMN IF EXISTS buyer_document;
      SQL
      Rails.logger.info("[Migration] #{schema}: revertido")
    end

    remove_column :tenant_configs, :psp_signature_header, if_exists: true
    remove_column :tenant_configs, :psp_callback_secret_enc, if_exists: true
    remove_column :tenant_configs, :psp_merchant_id, if_exists: true
  end

  private

  def each_tenant_schema
    Tenant.find_each do |tenant|
      TenantSwitcher.switch!(tenant.schema_name)
      yield tenant.schema_name
    rescue => e
      Rails.logger.warn("[Migration] #{tenant.schema_name}: #{e.message}")
    ensure
      TenantSwitcher.reset! rescue nil
    end
  ensure
    TenantSwitcher.reset! rescue nil
  end
end
