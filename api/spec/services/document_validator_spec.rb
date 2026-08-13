# frozen_string_literal: true

require "rails_helper"

RSpec.describe DocumentValidator do
  describe ".valid?" do
    it "aceita CPF valido com e sem mascara" do
      expect(described_class.valid?("52998224725")).to be(true)
      expect(described_class.valid?("529.982.247-25")).to be(true)
    end

    it "aceita CNPJ valido com e sem mascara" do
      expect(described_class.valid?("11222333000181")).to be(true)
      expect(described_class.valid?("11.222.333/0001-81")).to be(true)
    end

    it "recusa documento com digito verificador errado" do
      expect(described_class.valid?("52998224724")).to be(false)
      expect(described_class.valid?("11222333000182")).to be(false)
    end

    it "recusa sequencia repetida, que passa no calculo mas nao existe" do
      expect(described_class.valid?("11111111111")).to be(false)
      expect(described_class.valid?("11111111111111")).to be(false)
    end

    it "recusa tamanho que nao e de CPF nem de CNPJ" do
      expect(described_class.valid?("123")).to be(false)
      expect(described_class.valid?("529982247251")).to be(false)
      expect(described_class.valid?(nil)).to be(false)
      expect(described_class.valid?("")).to be(false)
    end
  end

  describe ".kind" do
    it "identifica o tipo pelo tamanho" do
      expect(described_class.kind("529.982.247-25")).to eq("cpf")
      expect(described_class.kind("11.222.333/0001-81")).to eq("cnpj")
      expect(described_class.kind("123")).to be_nil
    end
  end

  describe ".format" do
    it "formata CPF e CNPJ" do
      expect(described_class.format("52998224725")).to eq("529.982.247-25")
      expect(described_class.format("11222333000181")).to eq("11.222.333/0001-81")
    end

    it "devolve os digitos quando nao reconhece o formato" do
      expect(described_class.format("123")).to eq("123")
    end
  end
end
