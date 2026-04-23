# frozen_string_literal: true

# Marks members as overdue when last_payment_date < today - overdue_days,
# and restores members who paid since the last run.
#
# Runs daily via sidekiq-cron. Can also be triggered manually:
#   MarkOverdueMembersJob.perform_later
class MarkOverdueMembersJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform
    Rails.logger.info("[MarkOverdueJob] Starting — #{Tenant.active.count} active tenants")

    Tenant.active.find_each do |tenant|
      process_tenant(tenant)
    end

    Rails.logger.info("[MarkOverdueJob] Done")
  end

  private

  def process_tenant(tenant)
    config = tenant.tenant_config
    unless config
      Rails.logger.warn("[MarkOverdueJob] tenant=#{tenant.slug} has no tenant_config, skipping")
      return
    end

    cutoff = Date.current - config.overdue_days.days

    TenantSwitcher.switch(tenant) do
      overdue_scope = Member
        .where(status: :active, plan_status: :active)
        .where("last_payment_date < ?", cutoff)

      newly_overdue = overdue_scope.count
      overdue_scope.update_all(plan_status: :overdue) if newly_overdue > 0

      restore_scope = Member
        .where(status: :active, plan_status: :overdue)
        .where("last_payment_date >= ?", cutoff)

      restored = restore_scope.count
      restore_scope.update_all(plan_status: :active) if restored > 0

      Rails.logger.info(
        "[MarkOverdueJob] tenant=#{tenant.slug} " \
        "overdue_days=#{config.overdue_days} cutoff=#{cutoff} " \
        "newly_overdue=#{newly_overdue} restored=#{restored}"
      )
    end
  rescue TenantSwitcher::TenantNotFound => e
    Rails.logger.warn("[MarkOverdueJob] tenant=#{tenant.slug} skipped — #{e.message}")
  rescue => e
    Rails.logger.error("[MarkOverdueJob] tenant=#{tenant.slug} error=#{e.class}: #{e.message}")
    Rails.logger.error(e.backtrace.first(5).join("\n"))
  end
end
