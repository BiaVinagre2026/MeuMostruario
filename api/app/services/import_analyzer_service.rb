# frozen_string_literal: true

# ImportAnalyzerService
#
# Uses AiService (OpenRouter) to propose column mapping between
# uploaded spreadsheet headers and member model fields.
class ImportAnalyzerService
  MEMBER_FIELDS = {
    "cpf"               => "CPF (required) - 11 numeric digits",
    "full_name"         => "Full name (required)",
    "email"             => "Email (required)",
    "phone"             => "Phone (optional)",
    "association_date"  => "Association/start date (required)",
    "last_payment_date" => "Last payment date (optional)",
    "birthdate"         => "Birth date (optional)",
    "gender"            => "Gender: male/female/other (optional)",
    "plan_category"     => "Plan category (optional)"
  }.freeze

  def initialize(headers:, sample_rows:, model: nil)
    @headers     = headers
    @sample_rows = sample_rows
    @ai          = AiService.new(model: model, temperature: 0.1, max_tokens: 500)
  end

  def call
    prompt = build_prompt
    response_text = @ai.complete(prompt)
    parse_mapping(response_text)
  end

  private

  def build_prompt
    fields_desc = MEMBER_FIELDS.map { |k, v| "  - #{k}: #{v}" }.join("\n")
    headers_list = @headers.map { |h| "\"#{h}\"" }.join(", ")

    sample_table = @sample_rows.first(5).map.with_index do |row, i|
      values = @headers.map { |h| "\"#{row[h] || row[@headers.index(h)]}\"" }.join(", ")
      "  Row #{i + 1}: [#{values}]"
    end.join("\n")

    <<~PROMPT
      You are a data analysis assistant specialized in spreadsheet column mapping.

      Map the spreadsheet columns to the system fields below.

      ## System fields:
      #{fields_desc}

      ## Spreadsheet columns:
      #{headers_list}

      ## Sample data:
      #{sample_table}

      Return ONLY a valid JSON object mapping each spreadsheet column to the corresponding system field.
      Use `null` when there's no match. No text outside the JSON.

      Format:
      {
        "SpreadsheetColumn": "system_field_or_null",
        ...
      }
    PROMPT
  end

  def parse_mapping(text)
    json_str = text.match(/\{[\s\S]*\}/m)&.to_s
    return {} if json_str.blank?

    raw = JSON.parse(json_str)
    valid_fields = MEMBER_FIELDS.keys

    raw.transform_values do |v|
      valid_fields.include?(v) ? v : nil
    end
  rescue JSON::ParserError => e
    Rails.logger.warn("[ImportAnalyzerService] JSON parse error: #{e.message}")
    {}
  end
end
