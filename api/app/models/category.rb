# frozen_string_literal: true

class Category < ApplicationRecord
  include HasSlug

  belongs_to :parent, class_name: "Category", optional: true
  has_many :subcategories, class_name: "Category", foreign_key: :parent_id, dependent: :nullify
  has_many :products, dependent: :nullify

  validates :name, presence: true

  default_scope { order(:position) }

  def slug_source = name

  def root?
    parent_id.nil?
  end
end
