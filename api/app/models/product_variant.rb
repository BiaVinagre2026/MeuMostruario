# frozen_string_literal: true

class ProductVariant < ApplicationRecord
  belongs_to :product

  validates :product, presence: true
  validates :stock_qty, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :price_override, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :color_hex, format: { with: /\A#[0-9A-Fa-f]{6}\z/ }, allow_blank: true

  default_scope { order(:position) }
end
