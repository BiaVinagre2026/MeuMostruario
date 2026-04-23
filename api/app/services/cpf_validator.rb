# frozen_string_literal: true

class CpfValidator
  def self.valid?(cpf)
    cpf = clean(cpf)
    return false unless cpf.match?(/\A\d{11}\z/)
    return false if cpf.chars.uniq.length == 1

    valid_digit?(cpf, 9) && valid_digit?(cpf, 10)
  end

  def self.clean(cpf)
    cpf.to_s.gsub(/\D/, "")
  end

  def self.format(cpf)
    c = clean(cpf)
    return c unless c.length == 11
    "#{c[0..2]}.#{c[3..5]}.#{c[6..8]}-#{c[9..10]}"
  end

  private

  def self.valid_digit?(cpf, position)
    weights = (position + 1).downto(2).to_a
    sum = cpf[0...position].chars.zip(weights).sum { |d, w| d.to_i * w }
    remainder = sum % 11
    expected = remainder < 2 ? 0 : 11 - remainder
    cpf[position].to_i == expected
  end
end
