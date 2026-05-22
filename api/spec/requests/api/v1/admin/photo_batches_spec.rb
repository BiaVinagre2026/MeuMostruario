# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Admin::PhotoBatches", type: :request do
  include ActiveJob::TestHelper

  let!(:tenant) { provision_test_tenant }
  let(:headers) { tenant_headers(tenant) }
  let(:operator) { instance_double(Operator, id: 77) }

  before do
    ActiveJob::Base.queue_adapter = :test
    clear_enqueued_jobs

    allow_any_instance_of(Api::V1::Admin::PhotoBatchesController)
      .to receive(:require_operator_auth!)
      .and_return(true)
    allow_any_instance_of(Api::V1::Admin::PhotoBatchesController)
      .to receive(:current_operator)
      .and_return(operator)
  end

  it "creates a batch with up to 100 photos and enqueues processing" do
    payloads = Array.new(100) do |index|
      {
        url: "https://cdn.example.com/foto-#{index + 1}.jpg",
        original_filename: "foto-#{index + 1}.jpg"
      }
    end

    post "/api/v1/admin/photo_batches",
         params: {
           name: "Lote 100 fotos",
           photos: payloads
         },
         headers: headers

    expect(response).to have_http_status(:created)
    expect(json_response.dig("photo_batch", "photos").size).to eq(100)
    expect(enqueued_jobs.map { |job| job[:job] }).to include(ProcessPhotoBatchJob)

    within_tenant(tenant) do
      batch = PhotoBatch.order(:id).last
      expect(batch.name).to eq("Lote 100 fotos")
      expect(batch.total_count).to eq(100)
      expect(batch.photos.count).to eq(100)
      expect(batch.created_by_id).to eq(77)
    end
  end
end
