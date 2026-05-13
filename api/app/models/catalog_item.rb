# frozen_string_literal: true

class CatalogItem < ApplicationRecord
  belongs_to :catalog
  belongs_to :product, optional: true
  belongs_to :photo, optional: true

  has_many :selection_items, dependent: :nullify

  validates :catalog, presence: true
  validate :product_or_photo_present

  default_scope { order(:position) }

  private

  def product_or_photo_present
    return if product_id.present? || photo_id.present?
    errors.add(:base, "produto ou foto deve ser informado")
  end
end
