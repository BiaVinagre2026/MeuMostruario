# frozen_string_literal: true

class ProductImage < ApplicationRecord
  belongs_to :product

  validates :product, presence: true
  validates :urls, presence: true

  default_scope { order(:position) }

  before_save :ensure_single_cover

  def original_url = urls["original"]
  def thumb_url    = urls["thumb"]
  def card_url     = urls["card"]
  def zoom_url     = urls["zoom"]
  def og_url       = urls["og"]

  private

  def ensure_single_cover
    return unless is_cover && is_cover_changed?

    product.images.where.not(id: id).update_all(is_cover: false)
  end
end
