# frozen_string_literal: true

class Photo < ApplicationRecord
  STATUS_VALUES = %w[uploaded processing needs_review approved published error].freeze
  SIZE_GROUPS = ["P/M", "M/G", "Unico", "Plus 1", "Plus 2"].freeze

  belongs_to :photo_batch, optional: true
  belongs_to :product, optional: true
  belongs_to :product_variant, optional: true
  has_many :photo_analyses, dependent: :destroy
  has_many :catalog_items, dependent: :nullify
  has_many :selection_items, dependent: :nullify

  validates :status, inclusion: { in: STATUS_VALUES }
  validates :approved_size_group, inclusion: { in: SIZE_GROUPS }, allow_blank: true
  validates :suggested_size_group, inclusion: { in: SIZE_GROUPS }, allow_blank: true
  validates :confidence_score, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 }, allow_nil: true

  default_scope { order(created_at: :desc) }

  def display_url
    urls["card"] || urls["regular"] || urls["original"] || urls.values.compact.first
  end

  def thumb_url
    urls["thumb"] || display_url
  end

  def approved?
    status.in?(%w[approved published])
  end
end
