# frozen_string_literal: true

# Liga o estoque da Mare Coral as mudancas de situacao de pedido.
#
# Este arquivo existe para manter a Mare Coral fora do caminho de pagamento do
# Catalogo Atacado: apagar este arquivo tira a operacao dela do fluxo por
# completo, sem tocar em GatewayPaymentService nem no admin de pedidos.
#
# O proprio MareCoralInventoryService devolve sem fazer nada quando o pedido nao
# e do canal dela, entao pedido do Catalogo Atacado passa reto.
Rails.application.config.to_prepare do
  # Recarregamento em desenvolvimento roda este bloco de novo; registrar pelo
  # mesmo nome substitui em vez de empilhar.
  OrderFulfillment.register(:mare_coral_inventory) do |order, evento|
    case evento
    when :confirmado then MareCoralInventoryService.commit!(order)
    when :cancelado  then MareCoralInventoryService.release!(order)
    end
  end
end
