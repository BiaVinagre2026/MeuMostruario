# frozen_string_literal: true

class SelectionItem < ApplicationRecord
  belongs_to :selection
  belongs_to :catalog_item, optional: true
  belongs_to :product, optional: true
  belongs_to :photo, optional: true

  validates :selection, presence: true
  validates :qty, numericality: { greater_than: 0, only_integer: true }
end
