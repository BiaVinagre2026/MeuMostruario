# frozen_string_literal: true

class Selection < ApplicationRecord
  STATUS_VALUES = %w[new sent converted archived].freeze

  belongs_to :catalog_link, optional: true
  belongs_to :generated_catalog_link, class_name: "CatalogLink", optional: true
  has_many :selection_items, dependent: :destroy

  validates :status, inclusion: { in: STATUS_VALUES }

  default_scope { order(created_at: :desc) }
end
