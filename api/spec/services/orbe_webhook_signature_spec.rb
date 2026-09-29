# frozen_string_literal: true

require "rails_helper"

RSpec.describe OrbeWebhookSignature do
  let(:secret) { "whsec_somente_fixture_de_teste" }
  let(:body) { '{ "data": { "id": 42, "status": "paid" } }' }
  let(:now) { Time.at(1_788_400_000) }

  def signature_header(timestamp: now.to_i, with: secret, raw_body: body)
    signature = OpenSSL::HMAC.hexdigest("SHA256", with, "#{timestamp}.#{raw_body}")
    "t=#{timestamp},v1=#{signature}"
  end

  def valid?(header = signature_header, raw_body: body, with: secret)
    described_class.valid?(header: header, secret: with, body: raw_body, now: now)
  end

  it "verifica o timestamp e o corpo bruto conforme o contrato 1.1.0" do
    expect(valid?).to be(true)
  end

  it "aceita qualquer v1 valida durante a rotacao, sem confiar na primeira" do
    expect(valid?("t=#{now.to_i},v1=#{'0' * 64},#{signature_header.split(',').last}")).to be(true)
  end

  it "aceita espaco depois da virgula e ignora versoes desconhecidas" do
    expect(valid?(signature_header.sub(",", ", ") + ",v2=outra-versao")).to be(true)
  end

  [-300, 300].each do |offset|
    it "aceita o limite de tolerancia de #{offset} segundos" do
      expect(valid?(signature_header(timestamp: now.to_i + offset))).to be(true)
    end
  end

  [-301, 301].each do |offset|
    it "recusa timestamp fora da tolerancia de #{offset} segundos" do
      expect(valid?(signature_header(timestamp: now.to_i + offset))).to be(false)
    end
  end

  it "recusa corpo alterado, inclusive apenas a formatacao do JSON" do
    expect(valid?(raw_body: JSON.parse(body).to_json)).to be(false)
  end

  it "recusa assinatura gerada com segredo de outro tenant" do
    expect(valid?(signature_header(with: "whsec_outro_tenant"))).to be(false)
  end

  it "recusa HMAC somente do corpo, mesmo dentro do envelope novo" do
    legacy = OpenSSL::HMAC.hexdigest("SHA256", secret, body)
    expect(valid?("t=#{now.to_i},v1=#{legacy}")).to be(false)
  end

  it "recusa timestamp repetido para evitar interpretacao ambigua" do
    expect(valid?(signature_header + ",t=#{now.to_i}")).to be(false)
  end

  [nil, "", "invalida", "v1=#{'0' * 64}", "t=1788400000", "t=abc,v1=abc", "t=1788400000,v1", "t=1788400000,v1=abc"].each_with_index do |header, index|
    it "recusa cabecalho malformado ou incompleto #{index + 1}" do
      expect(valid?(header)).to be(false)
    end
  end

  it "recusa segredo ausente em vez de verificar com chave vazia" do
    expect(valid?(with: nil)).to be(false)
    expect(valid?(with: "")).to be(false)
  end
end
