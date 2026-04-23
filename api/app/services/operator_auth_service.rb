# frozen_string_literal: true

class OperatorAuthService
  def self.authenticate(email:, password:)
    operator = Operator.active.find_by(email: email.to_s.downcase.strip)
    return nil unless operator&.authenticate(password)
    operator
  end

  def self.token_for(operator)
    JwtService.encode_operator(
      "operator_id" => operator.id,
      "role"        => operator.role,
      "tenant_id"   => operator.tenant_id
    )
  end
end
