# frozen_string_literal: true

class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :product, optional: true

  validates :qty, numericality: { greater_than: 0, only_integer: true }
  validates :product_name, presence: true

  before_save :compute_subtotal

  private

  def compute_subtotal
    return unless qty.present? && unit_price.present?
    self.subtotal = qty * unit_price
  end
end
