# frozen_string_literal: true

class Collection < ApplicationRecord
  include HasSlug

  STATUS_VALUES = %w[draft published archived].freeze

  has_many :products, dependent: :nullify
  has_many :looks, dependent: :nullify
  has_many :waitlists, dependent: :nullify

  validates :name, presence: true
  validates :status, inclusion: { in: STATUS_VALUES }

  default_scope { order(:position) }

  scope :published, -> { where(status: "published") }

  def slug_source = name

  def published?
    status == "published"
  end
end
