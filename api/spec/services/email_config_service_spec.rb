# frozen_string_literal: true

require "rails_helper"

RSpec.describe EmailConfigService do
  def mock_config(attrs = {})
    defaults = {
      email_provider: "smtp",
      email_configured?: true,
      smtp_host: "smtp.example.com",
      smtp_port: 587,
      smtp_username: "user",
      smtp_password_enc: "pass",
      smtp_authentication: "plain",
      smtp_enable_starttls: true,
      ses_access_key_id: nil,
      ses_secret_key_enc: nil,
      ses_region: "us-east-1",
      tenant: double(slug: "demo")
    }
    double("TenantConfig", defaults.merge(attrs))
  end

  describe ".delivery_settings" do
    context "with letter_opener provider" do
      it "returns letter_opener_web in development" do
        allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("development"))
        config = mock_config(email_provider: "letter_opener")
        result = described_class.delivery_settings(config)
        expect(result[:delivery_method]).to eq(:letter_opener_web)
      end

      it "raises in production" do
        allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production"))
        config = mock_config(email_provider: "letter_opener")
        expect { described_class.delivery_settings(config) }
          .to raise_error(EmailConfigService::EmailNotConfiguredError, /letter_opener/)
      end
    end

    context "when email is not configured" do
      it "falls back to letter_opener in development" do
        allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("development"))
        config = mock_config(email_configured?: false)
        result = described_class.delivery_settings(config)
        expect(result[:delivery_method]).to eq(:letter_opener_web)
      end

      it "raises in production with tenant slug" do
        allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production"))
        config = mock_config(email_configured?: false)
        expect { described_class.delivery_settings(config) }
          .to raise_error(EmailConfigService::EmailNotConfiguredError, /demo/)
      end
    end

    context "with SMTP provider" do
      it "returns smtp settings" do
        config = mock_config
        result = described_class.delivery_settings(config)
        expect(result[:delivery_method]).to eq(:smtp)
        expect(result[:smtp_settings][:address]).to eq("smtp.example.com")
        expect(result[:smtp_settings][:port]).to eq(587)
      end
    end

    context "with Gmail provider" do
      it "forces smtp.gmail.com address" do
        config = mock_config(email_provider: "gmail")
        result = described_class.delivery_settings(config)
        expect(result[:smtp_settings][:address]).to eq("smtp.gmail.com")
      end
    end

    context "with SES provider" do
      it "uses SES SMTP endpoint" do
        config = mock_config(
          email_provider: "ses",
          ses_access_key_id: "AKIA123",
          ses_secret_key_enc: "secret",
          ses_region: "sa-east-1"
        )
        result = described_class.delivery_settings(config)
        expect(result[:smtp_settings][:address]).to eq("email-smtp.sa-east-1.amazonaws.com")
        expect(result[:smtp_settings][:authentication]).to eq(:login)
      end

      it "defaults region to us-east-1" do
        config = mock_config(
          email_provider: "ses",
          ses_access_key_id: "AKIA123",
          ses_secret_key_enc: "secret",
          ses_region: nil
        )
        result = described_class.delivery_settings(config)
        expect(result[:smtp_settings][:address]).to eq("email-smtp.us-east-1.amazonaws.com")
      end
    end
  end
end
