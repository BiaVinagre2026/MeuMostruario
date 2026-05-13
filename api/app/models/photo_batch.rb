# frozen_string_literal: true

class PhotoBatch < ApplicationRecord
  STATUS_VALUES = %w[draft uploading processing review reviewed published error].freeze

  has_many :photos, dependent: :nullify

  validates :status, inclusion: { in: STATUS_VALUES }

  default_scope { order(created_at: :desc) }

  def refresh_counts!
    update!(
      total_count: photos.count,
      processed_count: photos.where(status: %w[needs_review approved published error]).count,
      error_count: photos.where(status: "error").count
    )
  end
end
