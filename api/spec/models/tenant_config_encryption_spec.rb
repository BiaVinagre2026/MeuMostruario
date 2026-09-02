# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Segredos do TenantConfig", type: :model do
  let!(:tenant) { provision_test_tenant }
  let(:config) { tenant.tenant_config }

  def coluna_crua(campo)
    ActiveRecord::Base.connection.select_value(
      "SELECT #{campo} FROM tenant_configs WHERE id = #{config.id}"
    ).to_s
  end

  it "nao grava a chave do gateway em texto puro" do
    config.update!(psp_api_key_enc: "sk-chave-do-merchant")

    # tenant_configs e do schema publico: um unico dump entregava a chave de
    # todos os tenants de uma vez.
    expect(coluna_crua("psp_api_key_enc")).not_to include("sk-chave-do-merchant")
    expect(config.reload.psp_api_key_enc).to eq("sk-chave-do-merchant")
  end

  it "cifra todos os segredos declarados, nao so o do gateway" do
    valores = TenantConfig::ATRIBUTOS_SECRETOS.index_with { |campo| "segredo-de-#{campo}" }
    config.update!(valores)

    TenantConfig::ATRIBUTOS_SECRETOS.each do |campo|
      expect(coluna_crua(campo)).not_to include(valores[campo]), "#{campo} vazou em texto puro"
      expect(config.reload.public_send(campo)).to eq(valores[campo])
    end
  end

  it "continua enxergando o gateway como configurado" do
    # A cifragem e transparente: quem so pergunta se ha credencial nao muda.
    config.update!(psp_api_key_enc: "sk-teste", psp_api_url: "https://api.exemplo.test")

    expect(config.reload.psp_configured?).to be(true)
  end

  it "ainda le linha antiga em texto puro, para nenhum ambiente esquecido quebrar" do
    config.update_columns(smtp_password_enc: "senha-antiga-sem-cifra")

    expect(config.reload.smtp_password_enc).to eq("senha-antiga-sem-cifra")
  end
end
