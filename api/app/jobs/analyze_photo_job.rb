# frozen_string_literal: true

class AnalyzePhotoJob < ApplicationJob
  queue_as :default

  def perform(photo_id)
    PhotoAnalysisService.new.analyze!(Photo.find(photo_id))
  end
end
