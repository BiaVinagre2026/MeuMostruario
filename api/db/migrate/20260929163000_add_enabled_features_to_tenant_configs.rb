# frozen_string_literal: true

# Capacidade de tenant, e nao mais nome de tenant, como porta de autorizacao.
#
# Ate aqui, a vitrine varejista era liberada por `current_tenant.slug ==
# "mare-coral"`, escrito em 6 lugares do Core. Isso obrigava qualquer teste
# daquele fluxo a criar um tenant com aquele slug exato — e foi a causa raiz de
# "Slug ja esta em uso" quebrando a suite por dias. E impedia o proprio
# produto: um segundo cliente de varejo exigiria mexer no Core, nao ligar uma
# flag.
#
# enabled_features segue o mesmo padrao que enabled_payment_methods ja usa
# nesta tabela: array json, tenant decide o que tem ligado.
class AddEnabledFeaturesToTenantConfigs < ActiveRecord::Migration[7.2]
  def up
    add_column :tenant_configs, :enabled_features, :jsonb, default: [], null: false

    # Quem hoje passa pelo portao hardcoded precisa continuar passando depois
    # que ele virar capacidade. So a mare-coral usa o portao hoje.
    execute(<<~SQL.squish)
      UPDATE tenant_configs
         SET enabled_features = '["retail_storefront"]'::jsonb
        FROM tenants
       WHERE tenants.id = tenant_configs.tenant_id
         AND tenants.slug = 'mare-coral'
    SQL
  end

  def down
    remove_column :tenant_configs, :enabled_features
  end
end
