# frozen_string_literal: true

# Valida o documento do comprador, que pode ser CPF (lojista pessoa fisica) ou
# CNPJ (loja pessoa juridica). O PSP exige customer_document na cobranca e
# recusa documento invalido, entao vale barrar aqui antes de gastar a chamada.
class DocumentValidator
  CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].freeze
  CNPJ_SECOND_WEIGHTS = [6, *CNPJ_FIRST_WEIGHTS].freeze

  def self.valid?(document)
    digits = clean(document)

    case digits.length
    when 11 then CpfValidator.valid?(digits)
    when 14 then valid_cnpj?(digits)
    else false
    end
  end

  def self.clean(document)
    document.to_s.gsub(/\D/, "")
  end

  def self.kind(document)
    case clean(document).length
    when 11 then "cpf"
    when 14 then "cnpj"
    end
  end

  def self.format(document)
    digits = clean(document)

    case digits.length
    when 11 then CpfValidator.format(digits)
    when 14 then "#{digits[0..1]}.#{digits[2..4]}.#{digits[5..7]}/#{digits[8..11]}-#{digits[12..13]}"
    else digits
    end
  end

  def self.valid_cnpj?(cnpj)
    return false if cnpj.chars.uniq.length == 1

    first = check_digit(cnpj, CNPJ_FIRST_WEIGHTS)
    return false unless cnpj[12].to_i == first

    cnpj[13].to_i == check_digit(cnpj, CNPJ_SECOND_WEIGHTS)
  end

  def self.check_digit(cnpj, weights)
    sum = cnpj.chars.first(weights.length).zip(weights).sum { |digit, weight| digit.to_i * weight }
    remainder = sum % 11
    remainder < 2 ? 0 : 11 - remainder
  end

  private_class_method :valid_cnpj?, :check_digit
end
