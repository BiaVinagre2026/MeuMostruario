class JwtService
  class TokenExpiredError < StandardError; end
  class InvalidTokenError < StandardError; end

  SECRET    = if Rails.env.production?
                ENV.fetch("JWT_SECRET")
              else
                ENV.fetch("JWT_SECRET", "template_dev_secret_min_32_chars_only_for_dev")
              end
  ALGORITHM = "HS256"
  EXPIRY    = 7.days

  MOBILE_ACCESS_EXPIRY  = 1.hour
  REFRESH_TOKEN_EXPIRY  = 30.days

  # Member tokens
  def self.encode(payload, expiry: EXPIRY)
    payload = payload.merge(
      exp: expiry.from_now.to_i,
      iat: Time.current.to_i
    )
    JWT.encode(payload, SECRET, ALGORITHM)
  end

  def self.decode(token)
    JWT.decode(token, SECRET, true, { algorithm: ALGORITHM }).first
  rescue JWT::ExpiredSignature
    raise TokenExpiredError, "Token has expired"
  rescue JWT::DecodeError => e
    raise InvalidTokenError, "Invalid token: #{e.message}"
  end

  # Mobile access token (short-lived)
  def self.encode_mobile_access(payload)
    encode(payload.merge("type" => "access"), expiry: MOBILE_ACCESS_EXPIRY)
  end

  # Refresh token (long-lived)
  def self.encode_refresh(payload)
    encode(payload.merge("type" => "refresh"), expiry: REFRESH_TOKEN_EXPIRY)
  end

  def self.decode_refresh(token)
    data = JWT.decode(token, SECRET, true, { algorithm: ALGORITHM }).first
    raise InvalidTokenError, "Not a refresh token" unless data["type"] == "refresh"
    data
  rescue JWT::ExpiredSignature
    raise TokenExpiredError, "Refresh token has expired"
  rescue JWT::DecodeError => e
    raise InvalidTokenError, "Invalid token: #{e.message}"
  end

  # Operator tokens
  OPERATOR_EXPIRY = 8.hours

  def self.encode_operator(payload)
    payload = payload.merge(
      type: "operator",
      exp:  OPERATOR_EXPIRY.from_now.to_i,
      iat:  Time.current.to_i
    )
    JWT.encode(payload, SECRET, ALGORITHM)
  end

  def self.decode_operator(token)
    data = JWT.decode(token, SECRET, true, { algorithm: ALGORITHM }).first
    raise InvalidTokenError, "Not an operator token" unless data["type"] == "operator"
    data
  rescue JWT::ExpiredSignature
    raise TokenExpiredError, "Token has expired"
  rescue JWT::DecodeError => e
    raise InvalidTokenError, "Invalid token: #{e.message}"
  end
end
