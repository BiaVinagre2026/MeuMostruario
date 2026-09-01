# frozen_string_literal: true

# Reacoes a mudanca de situacao de um pedido.
#
# O fluxo de pagamento e o admin de pedidos sao compartilhados por todas as
# operacoes da plataforma, entao nenhum dos dois pode citar as regras de uma
# operacao especifica: a confirmacao de Pix do Catalogo Atacado nao tem por que
# saber que existe controle de estoque de outra loja. Cada operacao registra
# aqui a propria reacao, e quem confirma um pedido so anuncia o que aconteceu.
#
# Ficar sem ouvinte nenhum e um estado valido: o Catalogo Atacado nao reage a
# nada hoje. Um ouvinte que nao reconhece o pedido devolve sem fazer nada.
class OrderFulfillment
  # Recusa de regra de negocio de um ouvinte — estoque insuficiente, por
  # exemplo. Quem chama trata como 422 sem precisar saber qual operacao
  # recusou nem por que. Erro de programacao continua estourando cru.
  class Rejected < StandardError; end

  # Situacoes anunciadas. Quem escuta decide o que fazer com cada uma.
  EVENTOS = %i[confirmado cancelado].freeze

  class << self
    # @param nome [Symbol] identifica o ouvinte; registrar de novo substitui,
    #   para o recarregamento em desenvolvimento nao empilhar duplicatas.
    def register(nome, &reacao)
      ouvintes[nome] = reacao
    end

    def apply(order:, evento:)
      raise ArgumentError, "evento desconhecido: #{evento}" unless EVENTOS.include?(evento)

      ouvintes.each_value { |reacao| reacao.call(order, evento) }
    end

    def reset!
      @ouvintes = {}
    end

    def registered
      ouvintes.keys
    end

    private

    def ouvintes
      @ouvintes ||= {}
    end
  end
end
