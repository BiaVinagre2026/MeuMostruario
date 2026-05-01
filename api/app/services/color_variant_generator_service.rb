# frozen_string_literal: true

# Gera imagens de variante de cor via Replicate (Stable Diffusion img2img).
# Troca apenas a cor da peça na foto, preservando modelo, fundo e composição.
#
# Pré-requisitos:
#   REPLICATE_API_KEY=r8_xxxx  (em api/.env)
#
# Uso via rake:
#   bin/rails variants:generate_colors[conjunto-linho-marta]
class ColorVariantGeneratorService
  REPLICATE_MODEL = "stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca31d4af4b51ad9a6f69b75de1e42b97af1bdcc"

  def initialize(product)
    @product = product
    @api_key = ENV["REPLICATE_API_KEY"]
  end

  def call
    raise "REPLICATE_API_KEY não configurado" if @api_key.blank?

    base_image = base_image_url
    raise "Produto sem imagem base" if base_image.blank?

    color_groups.each do |color_name, color_hex|
      next if color_name.blank?
      Rails.logger.info "[ColorVariant] Gerando: #{@product.name} — #{color_name}"
      url = generate_image(base_image, color_name, color_hex)
      next unless url

      ProductVariant.where(product: @product, color: color_name)
                    .update_all(image_url: url, updated_at: Time.current)
      Rails.logger.info "[ColorVariant] Salvo: #{color_name} → #{url}"
    end
  end

  private

  def color_groups
    @product.variants.pluck(:color, :color_hex).uniq.to_h
  end

  def base_image_url
    img = @product.cover_image
    img&.urls&.dig("regular") || img&.urls&.values&.first
  end

  def generate_image(base_url, color_name, color_hex)
    prompt = "fashion product photo, the garment is #{color_name} colored (#{color_hex}), " \
             "same model same background same composition, photorealistic, high quality"

    conn = Faraday.new("https://api.replicate.com") do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
    end

    # Criar predição
    resp = conn.post("/v1/predictions") do |req|
      req.headers["Authorization"] = "Token #{@api_key}"
      req.body = {
        version: REPLICATE_MODEL,
        input: {
          image:          base_url,
          prompt:         prompt,
          negative_prompt: "wrong color, artifacts, distorted model, text",
          prompt_strength: 0.35,
          num_outputs:    1,
        },
      }
    end

    return nil unless resp.status == 201

    prediction_id = resp.body["id"]
    poll_result(conn, prediction_id)
  rescue => e
    Rails.logger.error "[ColorVariant] Erro: #{e.message}"
    nil
  end

  def poll_result(conn, prediction_id, retries: 30, interval: 3)
    retries.times do
      sleep interval
      resp = conn.get("/v1/predictions/#{prediction_id}") do |req|
        req.headers["Authorization"] = "Token #{@api_key}"
      end
      body = resp.body
      case body["status"]
      when "succeeded"  then return Array(body["output"]).first
      when "failed"     then return nil
      end
    end
    nil
  end
end
