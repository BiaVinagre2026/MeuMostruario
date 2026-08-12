# frozen_string_literal: true

class PhotoAnalysisService
  DEFAULT_CONFIDENCE = 0.25

  def initialize(ai_service: AiService.new(max_tokens: 700))
    @ai_service = ai_service
  end

  def analyze!(photo)
    photo.update!(status: "processing")
    suggestions = ai_suggestions(photo)

    analysis = photo.photo_analyses.create!(
      provider: "openrouter",
      model: ENV.fetch("OPENROUTER_MODEL", AiService::DEFAULT_MODEL),
      status: "completed",
      suggestions: suggestions,
      raw_response: { "suggestions" => suggestions },
      confidence: normalize_confidence(suggestions["confidence"])
    )

    apply_suggestions!(photo, suggestions)

    analysis
  rescue => e
    # A chamada de IA falhou, mas a heuristica local por nome de arquivo continua
    # valendo: e melhor entregar a sugestao dela do que devolver a foto em branco
    # para o admin classificar do zero.
    suggestions = fallback_suggestions(photo)

    photo.photo_analyses.create!(
      provider: "openrouter",
      model: ENV["OPENROUTER_MODEL"],
      status: "error",
      suggestions: suggestions,
      raw_response: {},
      confidence: normalize_confidence(suggestions["confidence"]),
      error_message: e.message
    )

    apply_suggestions!(photo, suggestions, extra_metadata: { "analysis_error" => e.message })
  ensure
    photo.photo_batch&.refresh_counts!
  end

  private

  # A triagem nunca aprova sozinha: toda foto analisada volta para revisao do
  # admin, independente da confianca. O score serve para priorizar a fila.
  def apply_suggestions!(photo, suggestions, extra_metadata: {})
    metadata = {
      "suggested_sku" => suggestions["sku"],
      "suggestion_source" => suggestions["source"],
      "suggestion_group" => suggestions["group_key"]
    }.compact.merge(extra_metadata)

    photo.update!(
      status: "needs_review",
      suggested_color: suggestions["color"],
      suggested_pantone: suggestions["pantone"],
      suggested_model: suggestions["model"],
      suggested_size_group: valid_size_group(suggestions["size_group"]),
      confidence_score: normalize_confidence(suggestions["confidence"]),
      metadata: (photo.metadata || {}).merge(metadata)
    )
  end

  def ai_suggestions(photo)
    return fallback_suggestions(photo) if ENV["OPENROUTER_API_KEY"].blank?

    response = @ai_service.complete(prompt_for(photo), timeout: 45)
    parsed = JSON.parse(response)
    fallback_suggestions(photo).merge(parsed.slice("color", "pantone", "model", "size_group", "confidence"))
  rescue JSON::ParserError
    fallback_suggestions(photo)
  end

  def prompt_for(photo)
    image_url = photo.display_url
    <<~PROMPT
      Analise a foto de moda abaixo como sugestao para triagem comercial.
      URL: #{image_url}

      Responda somente JSON valido com as chaves:
      color, pantone, model, size_group, confidence.

      size_group deve ser exatamente um destes: P/M, M/G, Unico, Plus 1, Plus 2.
      confidence deve ser numero entre 0 e 1.
      Pantone pode ser aproximado.
    PROMPT
  end

  def fallback_suggestions(photo)
    heuristic = LocalPhotoGrouping.assignment_for(photo.original_filename)
    return local_grouping_suggestions(heuristic) if heuristic.present?

    name = photo.original_filename.to_s.downcase
    {
      "color" => color_from_filename(name),
      "pantone" => nil,
      "model" => model_from_filename(name),
      "size_group" => "Unico",
      "confidence" => DEFAULT_CONFIDENCE
    }
  end

  def color_from_filename(name)
    {
      "preto" => "Preto",
      "branco" => "Branco",
      "azul" => "Azul",
      "verde" => "Verde",
      "rosa" => "Rosa",
      "vermelho" => "Vermelho",
      "amarelo" => "Amarelo"
    }.find { |key, _| name.include?(key) }&.last
  end

  def model_from_filename(name)
    return "Biquini" if name.include?("biquini") || name.include?("bikini")
    return "Vestido" if name.include?("vestido")
    return "Top" if name.include?("top")
    return "Conjunto" if name.include?("conjunto")
    nil
  end

  def local_grouping_suggestions(heuristic)
    {
      "color" => heuristic[:color],
      "pantone" => heuristic[:pantone],
      "model" => heuristic[:model_name],
      "size_group" => heuristic[:size_group],
      "sku" => heuristic[:sku],
      "source" => heuristic[:source],
      "group_key" => heuristic[:key],
      "confidence" => heuristic[:confidence]
    }
  end

  def normalize_confidence(value)
    [[value.to_d, 0].max, 1].min
  end

  def valid_size_group(value)
    Photo::SIZE_GROUPS.include?(value) ? value : nil
  end
end
