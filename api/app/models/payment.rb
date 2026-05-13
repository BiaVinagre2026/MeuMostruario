# frozen_string_literal: true

class Payment < ApplicationRecord
  STATUS_VALUES = %w[pending paid failed cancelled expired].freeze

  belongs_to :order

  validates :status, inclusion: { in: STATUS_VALUES }
  validates :amount, numericality: { greater_than_or_equal_to: 0 }
end
