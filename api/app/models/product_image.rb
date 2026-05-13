# frozen_string_literal: true

class ProductImage < ApplicationRecord
  belongs_to :product
  belongs_to :photo, optional: true

  validates :product, presence: true
  validates :urls, presence: true

  default_scope { order(:position) }

  before_save :ensure_single_cover

  def original_url = urls["original"]
  def thumb_url    = urls["thumb"]
  def card_url     = urls["card"]
  def zoom_url     = urls["zoom"]
  def og_url       = urls["og"]
  def pantone      = visual_metadata&.dig("pantone")
  def approved_color = visual_metadata&.dig("approved_color")
  def size_group   = visual_metadata&.dig("size_group")

  private

  def ensure_single_cover
    return unless is_cover && is_cover_changed?

    product.images.where.not(id: id).update_all(is_cover: false)
  end
end
