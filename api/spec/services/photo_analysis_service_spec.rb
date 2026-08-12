# frozen_string_literal: true

require "rails_helper"

RSpec.describe PhotoAnalysisService do
  let!(:tenant) { provision_test_tenant }

  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("OPENROUTER_MODEL", AiService::DEFAULT_MODEL).and_return("openrouter/test")
  end

  def create_photo(filename:)
    within_tenant(tenant) do
      batch = PhotoBatch.create!(name: "Lote IA", status: "processing")
      batch.photos.create!(
        original_filename: filename,
        status: "uploaded",
        urls: { "original" => "https://cdn.example.com/#{filename}" }
      )
    end
  end

  it "uses fallback suggestions when the API key is missing" do
    allow(ENV).to receive(:[]).with("OPENROUTER_API_KEY").and_return(nil)
    photo = create_photo(filename: "vestido_preto.jpg")

    analysis = within_tenant(tenant) do
      described_class.new(ai_service: instance_double(AiService)).analyze!(photo.reload)
    end

    within_tenant(tenant) do
      expect(analysis.status).to eq("completed")
      expect(photo.reload.status).to eq("needs_review")
      expect(photo.suggested_color).to eq("Preto")
      expect(photo.suggested_model).to eq("Vestido")
      expect(photo.suggested_size_group).to eq("Unico")
      expect(photo.photo_batch.reload.processed_count).to eq(1)
    end
  end

  it "uses local grouping heuristics for known whatsapp photo sessions" do
    allow(ENV).to receive(:[]).with("OPENROUTER_API_KEY").and_return(nil)
    photo = create_photo(filename: "WhatsApp Image 2026-04-28 at 16.59.55 (4).jpeg")

    analysis = within_tenant(tenant) do
      described_class.new(ai_service: instance_double(AiService)).analyze!(photo.reload)
    end

    within_tenant(tenant) do
      reloaded = photo.reload

      expect(analysis.status).to eq("completed")
      expect(reloaded.suggested_color).to eq("Vinho Intenso")
      expect(reloaded.suggested_model).to eq("Conjunto Pulse Legging Plus")
      expect(reloaded.suggested_size_group).to eq("Plus 1")
      expect(reloaded.metadata).to include(
        "suggested_sku" => "FIT-103",
        "suggestion_source" => "local_filename_grouping"
      )
      expect(reloaded.confidence_score.to_d).to eq(LocalPhotoGrouping::HIGH_CONFIDENCE.to_d)
    end
  end

  it "records an error analysis without breaking the batch" do
    allow(ENV).to receive(:[]).with("OPENROUTER_API_KEY").and_return("test-key")
    ai_service = instance_double(AiService)
    allow(ai_service).to receive(:complete).and_raise(StandardError, "timeout")
    photo = create_photo(filename: "biquini_rosa.jpg")

    within_tenant(tenant) do
      described_class.new(ai_service: ai_service).analyze!(photo.reload)
    end

    within_tenant(tenant) do
      analysis = photo.reload.photo_analyses.order(:id).last

      expect(analysis.status).to eq("error")
      expect(analysis.error_message).to eq("timeout")
      expect(photo.status).to eq("needs_review")
      expect(photo.metadata["analysis_error"]).to eq("timeout")
      expect(photo.confidence_score.to_d).to eq(PhotoAnalysisService::DEFAULT_CONFIDENCE.to_d)
      expect(photo.photo_batch.reload.processed_count).to eq(1)
    end
  end

  it "mantem a sugestao da heuristica quando a chamada de IA falha" do
    allow(ENV).to receive(:[]).with("OPENROUTER_API_KEY").and_return("chave-invalida")
    ai_service = instance_double(AiService)
    allow(ai_service).to receive(:complete).and_raise(StandardError, "OpenRouter returned 401")
    photo = create_photo(filename: "vestido_preto.jpg")

    within_tenant(tenant) do
      described_class.new(ai_service: ai_service).analyze!(photo.reload)
    end

    within_tenant(tenant) do
      reloaded = photo.reload

      expect(reloaded.metadata["analysis_error"]).to include("401")
      expect(reloaded.suggested_color).to eq("Preto")
      expect(reloaded.suggested_model).to eq("Vestido")
      expect(reloaded.suggested_size_group).to eq("Unico")
    end
  end

  it "mantem o agrupamento local quando a IA falha em foto de sessao conhecida" do
    allow(ENV).to receive(:[]).with("OPENROUTER_API_KEY").and_return("chave-invalida")
    ai_service = instance_double(AiService)
    allow(ai_service).to receive(:complete).and_raise(StandardError, "timeout")
    photo = create_photo(filename: "WhatsApp Image 2026-04-28 at 16.59.55 (4).jpeg")

    within_tenant(tenant) do
      described_class.new(ai_service: ai_service).analyze!(photo.reload)
    end

    within_tenant(tenant) do
      reloaded = photo.reload

      expect(reloaded.suggested_model).to eq("Conjunto Pulse Legging Plus")
      expect(reloaded.metadata["suggested_sku"]).to eq("FIT-103")
      expect(reloaded.confidence_score.to_d).to eq(LocalPhotoGrouping::HIGH_CONFIDENCE.to_d)
    end
  end
end
