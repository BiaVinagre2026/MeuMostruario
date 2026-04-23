# frozen_string_literal: true

class Look < ApplicationRecord
  include HasSlug

  STATUS_VALUES = %w[draft published archived].freeze

  belongs_to :collection, optional: true
  has_many :look_items, -> { order(:position) }, dependent: :destroy
  has_many :products, through: :look_items

  validates :name, presence: true
  validates :status, inclusion: { in: STATUS_VALUES }

  default_scope { order(:position) }

  scope :published, -> { where(status: "published") }

  def slug_source = name

  def published?
    status == "published"
  end
end
