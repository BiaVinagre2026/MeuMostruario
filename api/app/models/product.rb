# frozen_string_literal: true

class Product < ApplicationRecord
  include HasSlug

  STATUS_VALUES = %w[draft published archived sold_out].freeze

  belongs_to :category, optional: true
  belongs_to :collection, optional: true
  has_many :variants, class_name: "ProductVariant", dependent: :destroy
  has_many :images, class_name: "ProductImage", -> { order(:position) }, dependent: :destroy
  has_many :look_items, dependent: :destroy
  has_many :looks, through: :look_items
  has_many :leads, dependent: :nullify
  has_many :waitlists, dependent: :nullify

  validates :name, presence: true
  validates :status, inclusion: { in: STATUS_VALUES }
  validates :currency, presence: true, length: { is: 3 }
  validates :price_retail, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :price_wholesale, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  default_scope { order(:position) }

  scope :published, -> { where(status: "published") }
  scope :by_collection, ->(id) { where(collection_id: id) }
  scope :search, ->(q) { where("name ILIKE ?", "%#{sanitize_sql_like(q)}%") if q.present? }

  def slug_source = name

  def cover_image
    images.find_by(is_cover: true) || images.first
  end

  def published?
    status == "published"
  end
end
