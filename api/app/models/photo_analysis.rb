# frozen_string_literal: true

class PhotoAnalysis < ApplicationRecord
  STATUS_VALUES = %w[pending completed error].freeze

  belongs_to :photo

  validates :status, inclusion: { in: STATUS_VALUES }
  validates :confidence, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 }, allow_nil: true
end
