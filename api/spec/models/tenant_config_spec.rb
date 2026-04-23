# frozen_string_literal: true

require "rails_helper"

RSpec.describe TenantConfig, type: :model do
  describe "constants" do
    it "defines PAYMENT_METHODS" do
      expect(TenantConfig::PAYMENT_METHODS).to include("pix", "boleto", "credit_card")
      expect(TenantConfig::PAYMENT_METHODS).to be_frozen
    end

    it "defines MULTIPLIER_RULES_DEFAULTS" do
      expect(TenantConfig::MULTIPLIER_RULES_DEFAULTS).to be_a(Hash)
      expect(TenantConfig::MULTIPLIER_RULES_DEFAULTS).to be_frozen
      expect(TenantConfig::MULTIPLIER_RULES_DEFAULTS["monthly_payment"]).to be true
      expect(TenantConfig::MULTIPLIER_RULES_DEFAULTS["coin_purchase"]).to be false
    end
  end

  describe "#money_payment_enabled?" do
    it "returns true when allow_money_payment is true" do
      config = TenantConfig.new
      allow(config).to receive(:allow_money_payment).and_return(true)
      expect(config.money_payment_enabled?).to be true
    end

    it "returns false when allow_money_payment is nil" do
      config = TenantConfig.new
      allow(config).to receive(:allow_money_payment).and_return(nil)
      expect(config.money_payment_enabled?).to be false
    end
  end

  describe "#payment_method_enabled?" do
    it "returns true for default methods when enabled_payment_methods is nil" do
      config = TenantConfig.new
      allow(config).to receive(:enabled_payment_methods).and_return(nil)
      expect(config.payment_method_enabled?(:pix)).to be true
      expect(config.payment_method_enabled?(:boleto)).to be true
      expect(config.payment_method_enabled?(:credit_card)).to be true
    end

    it "returns false for methods not in the list" do
      config = TenantConfig.new
      allow(config).to receive(:enabled_payment_methods).and_return(%w[pix])
      expect(config.payment_method_enabled?(:boleto)).to be false
    end
  end

  describe "#coin_packages_list" do
    it "returns symbolized keys" do
      config = TenantConfig.new
      allow(config).to receive(:coin_packages).and_return([{ "coins" => 100, "brl_cents" => 500 }])
      result = config.coin_packages_list
      expect(result.first).to have_key(:coins)
      expect(result.first[:coins]).to eq(100)
    end

    it "returns empty array when nil" do
      config = TenantConfig.new
      allow(config).to receive(:coin_packages).and_return(nil)
      expect(config.coin_packages_list).to eq([])
    end
  end

  describe "#multiplier_rules_config" do
    it "merges custom rules with defaults" do
      config = TenantConfig.new
      allow(config).to receive(:multiplier_rules).and_return({ "monthly_payment" => false })
      result = config.multiplier_rules_config
      expect(result["monthly_payment"]).to be false
      expect(result["complete_profile"]).to be true
    end

    it "uses defaults when multiplier_rules is nil" do
      config = TenantConfig.new
      allow(config).to receive(:multiplier_rules).and_return(nil)
      expect(config.multiplier_rules_config).to eq(TenantConfig::MULTIPLIER_RULES_DEFAULTS)
    end
  end

  describe "#coins_to_brl" do
    it "converts coins to BRL" do
      config = TenantConfig.new
      allow(config).to receive(:coin_brl_rate).and_return(0.10)
      expect(config.coins_to_brl(100)).to eq(10.0)
    end
  end

  describe "#brl_to_coins" do
    it "converts BRL to coins" do
      config = TenantConfig.new
      allow(config).to receive(:coin_brl_rate).and_return(0.10)
      expect(config.brl_to_coins(10)).to eq(100)
    end

    it "returns 0 when rate is zero" do
      config = TenantConfig.new
      allow(config).to receive(:coin_brl_rate).and_return(0)
      expect(config.brl_to_coins(10)).to eq(0)
    end
  end

  describe "#format_brl" do
    it "formats as Brazilian currency" do
      config = TenantConfig.new
      expect(config.format_brl(10.5)).to eq("R$ 10,50")
      expect(config.format_brl(1234.99)).to eq("R$ 1234,99")
    end
  end

  describe "#event_coins and #event_xp" do
    let(:config) { TenantConfig.new }

    before do
      allow(config).to receive(:coin_events).and_return({
        "monthly_payment" => { "coins" => 50, "xp" => 10 }
      })
    end

    it "returns coins for known event" do
      expect(config.event_coins(:monthly_payment)).to eq(50)
    end

    it "returns xp for known event" do
      expect(config.event_xp(:monthly_payment)).to eq(10)
    end

    it "returns 0 for unknown event" do
      expect(config.event_coins(:unknown)).to eq(0)
      expect(config.event_xp(:unknown)).to eq(0)
    end
  end

  describe "#email_configured?" do
    it "returns true for letter_opener" do
      config = TenantConfig.new
      allow(config).to receive(:email_provider).and_return("letter_opener")
      expect(config.email_configured?).to be true
    end

    it "returns true for ses with keys" do
      config = TenantConfig.new
      allow(config).to receive(:email_provider).and_return("ses")
      allow(config).to receive(:ses_access_key_id).and_return("key")
      allow(config).to receive(:ses_secret_key_enc).and_return("secret")
      expect(config.email_configured?).to be true
    end

    it "returns false for unknown provider" do
      config = TenantConfig.new
      allow(config).to receive(:email_provider).and_return("unknown")
      expect(config.email_configured?).to be false
    end
  end

  describe "#psp_configured?" do
    it "returns true when both key and url are present" do
      config = TenantConfig.new
      allow(config).to receive(:psp_api_key_enc).and_return("encrypted_key")
      allow(config).to receive(:psp_api_url).and_return("https://api.psp.com")
      expect(config.psp_configured?).to be true
    end

    it "returns false when key is missing" do
      config = TenantConfig.new
      allow(config).to receive(:psp_api_key_enc).and_return(nil)
      allow(config).to receive(:psp_api_url).and_return("https://api.psp.com")
      expect(config.psp_configured?).to be false
    end
  end

  describe "#s3_configured?" do
    it "returns true when all S3 fields are present" do
      config = TenantConfig.new
      allow(config).to receive(:storage_provider).and_return("s3")
      allow(config).to receive(:s3_bucket).and_return("my-bucket")
      allow(config).to receive(:s3_access_key_id).and_return("key")
      allow(config).to receive(:s3_secret_access_key_enc).and_return("secret")
      expect(config.s3_configured?).to be true
    end

    it "returns false when storage_provider is not s3" do
      config = TenantConfig.new
      allow(config).to receive(:storage_provider).and_return("local")
      expect(config.s3_configured?).to be false
    end
  end

  describe "#s3_base_url" do
    it "uses public url when present" do
      config = TenantConfig.new
      allow(config).to receive(:s3_public_url).and_return("https://cdn.example.com")
      expect(config.s3_base_url).to eq("https://cdn.example.com")
    end

    it "builds URL from bucket and region" do
      config = TenantConfig.new
      allow(config).to receive(:s3_public_url).and_return(nil)
      allow(config).to receive(:s3_bucket).and_return("my-bucket")
      allow(config).to receive(:s3_region).and_return("sa-east-1")
      expect(config.s3_base_url).to eq("https://my-bucket.s3.sa-east-1.amazonaws.com")
    end

    it "defaults region to us-east-1" do
      config = TenantConfig.new
      allow(config).to receive(:s3_public_url).and_return(nil)
      allow(config).to receive(:s3_bucket).and_return("my-bucket")
      allow(config).to receive(:s3_region).and_return(nil)
      expect(config.s3_base_url).to eq("https://my-bucket.s3.us-east-1.amazonaws.com")
    end
  end
end
