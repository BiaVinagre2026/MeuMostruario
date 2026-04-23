# frozen_string_literal: true

require "net/http"
require "json"

# AiService
#
# Generic OpenRouter API client for AI-powered features.
# Configurable model per-tenant via TenantConfig.openrouter_model.
#
# ENV vars:
#   OPENROUTER_API_KEY  - required
#   OPENROUTER_MODEL    - optional default, per-tenant override via TenantConfig
class AiService
  OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
  DEFAULT_MODEL  = "meta-llama/llama-3.3-70b-instruct"

  def initialize(model: nil, temperature: 0.1, max_tokens: 1000)
    @model       = model.presence || ENV.fetch("OPENROUTER_MODEL", DEFAULT_MODEL)
    @temperature = temperature
    @max_tokens  = max_tokens
  end

  # Sends a chat completion request and returns the response content string.
  def chat(messages, **options)
    api_key = ENV["OPENROUTER_API_KEY"]
    raise "OPENROUTER_API_KEY not configured" if api_key.blank?

    uri = URI(OPENROUTER_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.read_timeout = options[:timeout] || 30
    http.open_timeout = 10

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"]  = "application/json"
    request["Authorization"] = "Bearer #{api_key}"
    request["HTTP-Referer"]  = ENV.fetch("APP_URL", "http://localhost:3000")
    request["X-Title"]       = ENV.fetch("APP_NAME", "Multitenant App")

    body = {
      model: options[:model] || @model,
      messages: messages,
      temperature: options[:temperature] || @temperature,
      max_tokens: options[:max_tokens] || @max_tokens
    }

    request.body = body.to_json
    Rails.logger.info("[AiService] Calling OpenRouter model=#{body[:model]}")

    response = http.request(request)

    unless response.is_a?(Net::HTTPSuccess)
      raise "OpenRouter returned #{response.code}: #{response.body.truncate(300)}"
    end

    data = JSON.parse(response.body)
    content = data.dig("choices", 0, "message", "content") || ""
    Rails.logger.info("[AiService] Response received (#{content.length} chars)")
    content
  end

  # Convenience method for single-prompt calls
  def complete(prompt, **options)
    chat([{ role: "user", content: prompt }], **options)
  end
end
