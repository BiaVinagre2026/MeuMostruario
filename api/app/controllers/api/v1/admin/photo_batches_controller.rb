# frozen_string_literal: true

module Api
  module V1
    module Admin
      class PhotoBatchesController < BaseController
        def index
          batches = paginate(PhotoBatch.includes(:photos))
          render json: {
            photo_batches: batches.map { |batch| batch_json(batch) },
            meta: pagination_meta(batches)
          }
        end

        def show
          batch = PhotoBatch.includes(photos: [:product, :product_variant, :photo_analyses]).find(params[:id])
          render json: { photo_batch: batch_json(batch, include_photos: true) }
        end

        def create
          files = Array(params[:files] || params[:file]).compact
          photo_payloads = Array(params[:photos])

          if files.empty? && photo_payloads.empty?
            return render json: { errors: ["envie files[] ou photos[]"] }, status: :unprocessable_entity
          end

          batch = PhotoBatch.create!(
            name: params[:name].presence || "Lote #{Time.current.strftime('%d/%m/%Y %H:%M')}",
            status: "uploading",
            created_by_id: current_operator&.id
          )

          files.each { |file| create_photo_from_file!(batch, file) }
          photo_payloads.each { |payload| create_photo_from_payload!(batch, payload) }

          batch.refresh_counts!
          ProcessPhotoBatchJob.perform_later(batch.id)

          render json: { photo_batch: batch_json(batch.reload, include_photos: true) }, status: :created
        end

        private

        def create_photo_from_file!(batch, file)
          url = ImageStorageService.store(file, current_tenant.slug, current_tenant.tenant_config)
          batch.photos.create!(
            original_filename: file.original_filename,
            urls: build_urls(url),
            status: "uploaded"
          )
        end

        def create_photo_from_payload!(batch, payload)
          data = payload.respond_to?(:to_unsafe_h) ? payload.to_unsafe_h : payload.to_h
          url = data["url"] || data[:url]
          return if url.blank?

          batch.photos.create!(
            original_filename: data["original_filename"] || data[:original_filename],
            urls: build_urls(url),
            status: "uploaded",
            metadata: data["metadata"] || data[:metadata] || {}
          )
        end

        def build_urls(url)
          { "original" => url, "regular" => url, "card" => url, "thumb" => url }
        end

        def batch_json(batch, include_photos: false)
          json = {
            id: batch.id,
            name: batch.name,
            status: batch.status,
            total_count: batch.total_count,
            processed_count: batch.processed_count,
            error_count: batch.error_count,
            created_at: batch.created_at,
            updated_at: batch.updated_at
          }
          json[:photos] = batch.photos.map { |photo| photo_json(photo) } if include_photos
          json
        end

        def photo_json(photo)
          {
            id: photo.id,
            photo_batch_id: photo.photo_batch_id,
            product_id: photo.product_id,
            product_name: photo.product&.name,
            product_variant_id: photo.product_variant_id,
            original_filename: photo.original_filename,
            urls: photo.urls,
            display_url: photo.display_url,
            thumb_url: photo.thumb_url,
            status: photo.status,
            suggested_color: photo.suggested_color,
            approved_color: photo.approved_color,
            suggested_pantone: photo.suggested_pantone,
            approved_pantone: photo.approved_pantone,
            suggested_model: photo.suggested_model,
            approved_model: photo.approved_model,
            suggested_size_group: photo.suggested_size_group,
            approved_size_group: photo.approved_size_group,
            suggested_sku: photo.metadata&.dig("suggested_sku"),
            suggestion_source: photo.metadata&.dig("suggestion_source"),
            suggestion_group: photo.metadata&.dig("suggestion_group"),
            confidence_score: photo.confidence_score,
            low_confidence: photo.low_confidence?,
            latest_analysis: photo.photo_analyses.max_by(&:created_at)&.slice(:id, :status, :confidence, :error_message),
            created_at: photo.created_at,
            updated_at: photo.updated_at
          }
        end
      end
    end
  end
end
