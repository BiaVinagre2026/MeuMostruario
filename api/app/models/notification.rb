# frozen_string_literal: true

class Notification < ApplicationRecord
  TYPE_VALUES = %w[info success warning error].freeze

  belongs_to :member

  validates :title, presence: true
  validates :notification_type, inclusion: { in: TYPE_VALUES }

  scope :unread, -> { where(read_at: nil) }
  scope :recent, -> { order(created_at: :desc) }

  def read?
    read_at.present?
  end

  def mark_read!
    update_column(:read_at, Time.current) unless read?
  end
end
