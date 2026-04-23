# frozen_string_literal: true

require "rails_helper"

RSpec.describe CpfValidator do
  describe ".clean" do
    it "removes non-digit characters" do
      expect(described_class.clean("123.456.789-09")).to eq("12345678909")
    end

    it "handles already clean input" do
      expect(described_class.clean("12345678909")).to eq("12345678909")
    end

    it "handles nil by converting to empty string" do
      expect(described_class.clean(nil)).to eq("")
    end

    it "handles integers" do
      expect(described_class.clean(12345678909)).to eq("12345678909")
    end

    it "removes spaces, dots, and dashes" do
      expect(described_class.clean(" 123 456 789 09 ")).to eq("12345678909")
    end
  end

  describe ".format" do
    it "formats a clean CPF string" do
      expect(described_class.format("12345678909")).to eq("123.456.789-09")
    end

    it "formats a CPF with existing punctuation" do
      expect(described_class.format("123.456.789-09")).to eq("123.456.789-09")
    end

    it "returns unformatted string when length is not 11" do
      expect(described_class.format("1234")).to eq("1234")
    end

    it "returns empty string for nil" do
      expect(described_class.format(nil)).to eq("")
    end
  end

  describe ".valid?" do
    context "with valid CPFs" do
      # Known valid CPFs (generated with valid check digits)
      %w[
        529.982.247-25
        52998224725
        11144477735
        86400087796
      ].each do |cpf|
        it "returns true for #{cpf}" do
          expect(described_class.valid?(cpf)).to be true
        end
      end
    end

    context "with invalid CPFs" do
      it "returns false when length is not 11" do
        expect(described_class.valid?("1234567890")).to be false
        expect(described_class.valid?("123456789012")).to be false
      end

      it "returns false for all same digits" do
        (0..9).each do |digit|
          cpf = digit.to_s * 11
          expect(described_class.valid?(cpf)).to be false
        end
      end

      it "returns false when first check digit is wrong" do
        # 529.982.247-25 is valid; change first check digit
        expect(described_class.valid?("52998224735")).to be false
      end

      it "returns false when second check digit is wrong" do
        # 529.982.247-25 is valid; change second check digit
        expect(described_class.valid?("52998224726")).to be false
      end

      it "returns false for nil" do
        expect(described_class.valid?(nil)).to be false
      end

      it "returns false for empty string" do
        expect(described_class.valid?("")).to be false
      end

      it "returns false for random invalid CPF" do
        expect(described_class.valid?("12345678901")).to be false
      end
    end
  end
end
