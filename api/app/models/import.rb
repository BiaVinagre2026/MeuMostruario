# frozen_string_literal: true

class Import < ApplicationRecord
  STATUS_VALUES = %w[pending analyzing awaiting_confirmation confirmed processing completed failed].freeze

  belongs_to :uploaded_by, class_name: "Operator", foreign_key: :uploaded_by, optional: true

  validates :filename, presence: true
  validates :status, inclusion: { in: STATUS_VALUES }

  scope :recent, -> { order(created_at: :desc) }

  def pending?         = status == "pending"
  def analyzing?       = status == "analyzing"
  def awaiting?        = status == "awaiting_confirmation"
  def confirmed?       = status == "confirmed"
  def processing?      = status == "processing"
  def completed?       = status == "completed"
  def failed?          = status == "failed"

  def raw_headers
    Array(column_mapping["headers"])
  end

  def sample_rows
    Array(column_mapping["sample_rows"])
  end

  def proposed_mapping
    return {} if column_mapping["proposed_mapping"].blank?

    JSON.parse(column_mapping["proposed_mapping"])
  rescue JSON::ParserError
    {}
  end
end
