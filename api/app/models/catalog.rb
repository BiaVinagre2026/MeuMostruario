# frozen_string_literal: true

class Catalog < ApplicationRecord
  STATUS_VALUES = %w[draft published archived].freeze

  has_many :catalog_items, -> { order(:position) }, dependent: :destroy
  has_many :catalog_links, dependent: :destroy

  validates :name, presence: true
  validates :status, inclusion: { in: STATUS_VALUES }

  default_scope { order(created_at: :desc) }
end
