# frozen_string_literal: true

# Pedido minimo do atacado, por tenant.
#
# Cada loja tem a sua regra — a BEFIT trabalha com R$ 300 — e ate agora nada no
# sistema barrava um pedido de R$ 50 pelo link de atacado.
#
# Zero significa sem minimo, que e o comportamento de quem ainda nao configurou.
class AddMinOrderAmountToTenantConfigs < ActiveRecord::Migration[7.2]
  def change
    return if column_exists?(:tenant_configs, :min_order_amount)

    add_column :tenant_configs, :min_order_amount, :decimal, precision: 10, scale: 2, default: 0, null: false
  end
end
