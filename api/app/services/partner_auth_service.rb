class PartnerAuthService
  class TokenExpiredError < StandardError; end
  class InvalidTokenError < StandardError; end
  class AuthenticationError < StandardError; end

  EXPIRY = 8.hours

  def self.authenticate(email, password)
    partner = Partner.find_by("LOWER(email) = ?", email.downcase)

    raise AuthenticationError, "Invalid credentials" unless partner
    raise AuthenticationError, "Account pending approval" if partner.pending_approval?
    raise AuthenticationError, "Account suspended" if partner.suspended?
    raise AuthenticationError, "Account rejected" if partner.rejected?
    raise AuthenticationError, "Account inactive" if partner.inactive?
    raise AuthenticationError, "Invalid credentials" unless partner.authenticate(password)

    token = encode_token(partner)
    { partner: partner, token: token }
  end

  def self.encode_token(partner)
    payload = {
      partner_id: partner.id,
      email: partner.email,
      type: "partner",
      exp: EXPIRY.from_now.to_i,
      iat: Time.current.to_i
    }
    JWT.encode(payload, JwtService::SECRET, JwtService::ALGORITHM)
  end

  def self.decode_token(token)
    data = JWT.decode(token, JwtService::SECRET, true, { algorithm: JwtService::ALGORITHM }).first
    raise InvalidTokenError, "Not a partner token" unless data["type"] == "partner"
    data
  rescue JWT::ExpiredSignature
    raise TokenExpiredError, "Token has expired"
  rescue JWT::DecodeError => e
    raise InvalidTokenError, "Invalid token: #{e.message}"
  end

  def self.current_partner(token)
    payload = decode_token(token)
    Partner.find_by(id: payload["partner_id"], status: "active")
  end

  def self.authenticate_api_key(api_key)
    Partner.active.find_by(api_key: api_key)
  end
end
