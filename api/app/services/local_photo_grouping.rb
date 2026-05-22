# frozen_string_literal: true

class LocalPhotoGrouping
  GROUP_DEFINITIONS = [
    {
      key: :shape_short_p_m,
      matchers: ["16.58.05", "16.58.06", "16.58.07"],
      sku: "FIT-101",
      color: "Preto",
      size_group: "P/M",
      model_name: "Conjunto Shape Short",
      pantone_prefix: 17,
      pantone_suffix: 5600
    },
    {
      key: :pulse_rosa,
      matchers: ["16.58.49", "16.58.50"],
      sku: "FIT-102",
      color: "Rosa Energia",
      size_group: "P/M",
      model_name: "Conjunto Pulse Ombro Unico",
      pantone_prefix: 27,
      pantone_suffix: 5620
    },
    {
      key: :shape_short_m_g,
      matchers: ["16.59.32", "16.59.33", "16.59.34"],
      sku: "FIT-101",
      color: "Preto",
      size_group: "M/G",
      model_name: "Conjunto Shape Short",
      pantone_prefix: 37,
      pantone_suffix: 5640
    },
    {
      key: :pulse_vinho_plus,
      matchers: ["16.59.54", "16.59.55", "16.59.56"],
      sku: "FIT-103",
      color: "Vinho Intenso",
      size_group: "Plus 1",
      size_group_cycle: ["Plus 1", "Plus 2"],
      model_name: "Conjunto Pulse Legging Plus",
      pantone_prefix: 47,
      pantone_suffix: 5660
    }
  ].freeze

  HIGH_CONFIDENCE = 0.91

  def self.assignment_for(filename)
    normalized_name = filename.to_s
    group = GROUP_DEFINITIONS.find do |definition|
      definition.fetch(:matchers).any? { |matcher| normalized_name.include?(matcher) }
    end
    return nil unless group

    sequence = sequence_for(normalized_name)
    size_group =
      if group[:size_group_cycle].present?
        group.fetch(:size_group_cycle)[sequence % group.fetch(:size_group_cycle).length]
      else
        group.fetch(:size_group)
      end

    {
      key: group.fetch(:key).to_s,
      source: "local_filename_grouping",
      sku: group.fetch(:sku),
      color: group.fetch(:color),
      size_group: size_group,
      model_name: group.fetch(:model_name),
      pantone: format("PANTONE %<prefix>d-%<suffix>d TPX", prefix: group.fetch(:pantone_prefix) + (sequence % 10), suffix: group.fetch(:pantone_suffix) + sequence),
      confidence: HIGH_CONFIDENCE
    }
  end

  def self.sequence_for(filename)
    number = filename.to_s[/\((\d+)\)/, 1]
    return number.to_i if number.present?

    0
  end
end
