# frozen_string_literal: true

class LookItem < ApplicationRecord
  belongs_to :look
  belongs_to :product

  validates :look, presence: true
  validates :product, presence: true
  validates :product_id, uniqueness: { scope: :look_id }

  default_scope { order(:position) }
end
