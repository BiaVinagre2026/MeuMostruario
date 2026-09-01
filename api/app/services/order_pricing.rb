# frozen_string_literal: true

# Faixas de desconto por volume do atacado.
#
# Elas existiam so no frontend (`web/src/data/catalog.ts`), e o backend gravava
# o desconto que o cliente dissesse ter direito. Aqui viram regra do servidor:
# quem decide o percentual e a quantidade de pecas do pedido, nao a requisicao.
class OrderPricing
  FAIXAS = [
    { min: 1,   max: 11,  pct: 0 },
    { min: 12,  max: 35,  pct: 5 },
    { min: 36,  max: 99,  pct: 10 },
    { min: 100, max: nil, pct: 15 }
  ].freeze

  def self.discount_pct_for(units)
    pecas = units.to_i
    faixa = FAIXAS.find { |f| pecas >= f[:min] && (f[:max].nil? || pecas <= f[:max]) }
    faixa ? faixa[:pct] : 0
  end
end
