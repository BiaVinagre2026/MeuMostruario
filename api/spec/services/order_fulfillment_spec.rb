# frozen_string_literal: true

require "rails_helper"

RSpec.describe OrderFulfillment do
  # Os ouvintes sao estado global, registrados no boot da aplicacao. Salvar e
  # recolocar mantem os specs seguintes com o que a aplicacao realmente tem,
  # sem reexecutar os blocos de inicializacao.
  around do |exemplo|
    originais = described_class.send(:ouvintes).dup
    described_class.reset!
    exemplo.run
    described_class.reset!
    originais.each { |nome, reacao| described_class.register(nome, &reacao) }
  end

  it "nao exige ouvinte nenhum: o Catalogo Atacado nao reage a nada" do
    expect { described_class.apply(order: nil, evento: :confirmado) }.not_to raise_error
  end

  it "entrega o evento a quem registrou" do
    recebidos = []
    described_class.register(:teste) { |order, evento| recebidos << [order, evento] }

    described_class.apply(order: :pedido, evento: :confirmado)
    described_class.apply(order: :pedido, evento: :cancelado)

    expect(recebidos).to eq([[:pedido, :confirmado], [:pedido, :cancelado]])
  end

  it "substitui o ouvinte de mesmo nome em vez de empilhar" do
    chamadas = 0
    2.times { described_class.register(:teste) { chamadas += 1 } }

    described_class.apply(order: :pedido, evento: :confirmado)

    # Sem isso, o recarregamento em desenvolvimento baixaria o estoque duas
    # vezes para a mesma confirmacao.
    expect(chamadas).to eq(1)
  end

  it "recusa evento que ninguem anuncia, em vez de passar batido" do
    expect { described_class.apply(order: :pedido, evento: :entregue) }
      .to raise_error(ArgumentError, /entregue/)
  end

  it "a recusa do estoque chega como recusa da plataforma" do
    # Quem confirma um pedido trata a recusa sem conhecer a operacao que
    # recusou — e o que tira a Mare Coral do caminho do Catalogo Atacado.
    expect(MareCoralInventoryService::StockError.new).to be_a(described_class::Rejected)
  end
end
