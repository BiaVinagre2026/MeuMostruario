# frozen_string_literal: true

class ProcessPhotoBatchJob < ApplicationJob
  queue_as :default

  def perform(photo_batch_id)
    batch = PhotoBatch.find(photo_batch_id)
    batch.update!(status: "processing", started_at: Time.current)

    batch.photos.find_each do |photo|
      AnalyzePhotoJob.perform_later(photo.id)
    end

    batch.update!(status: "review")
  rescue => e
    batch&.update!(status: "error", metadata: (batch.metadata || {}).merge("error" => e.message))
    raise
  end
end
