# frozen_string_literal: true

# AnalyzeImportJob
#
# Runs ImportAnalyzerService in background to propose a column mapping
# for an uploaded spreadsheet.
class AnalyzeImportJob < ApplicationJob
  queue_as :imports

  def perform(tenant_id, import_id)
    tenant = Tenant.find(tenant_id)
    llm_model = tenant.tenant_config&.openrouter_model

    TenantSwitcher.switch(tenant) do
      import = Import.find(import_id)

      unless import.pending? || import.analyzing?
        Rails.logger.info("[AnalyzeImportJob] import=#{import_id} already in status=#{import.status}, skipping")
        return
      end

      import.update_columns(status: "analyzing", updated_at: Time.current)

      service = ImportAnalyzerService.new(
        headers:     import.raw_headers,
        sample_rows: import.sample_rows,
        model:       llm_model
      )
      mapping = service.call

      import.update_columns(
        status:         "awaiting_confirmation",
        column_mapping: import.column_mapping.merge("proposed_mapping" => mapping.to_json),
        updated_at:     Time.current
      )

      Rails.logger.info("[AnalyzeImportJob] import=#{import_id} analyzed, #{mapping.size} columns mapped")
    end
  rescue => e
    tenant_id_safe = tenant_id
    begin
      tenant = Tenant.find(tenant_id_safe)
      TenantSwitcher.switch(tenant) do
        Import.where(id: import_id).update_all(
          status:        "failed",
          error_message: "AI analysis error: #{e.message.truncate(300)}",
          updated_at:    Time.current
        )
      end
    rescue => inner_e
      Rails.logger.error("[AnalyzeImportJob] Could not mark import as failed: #{inner_e.message}")
    end
    raise
  end
end
