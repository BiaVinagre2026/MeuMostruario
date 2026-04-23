# frozen_string_literal: true

module EmailDispatcher
  def self.dispatch(tenant, mailer_klass, method, *args)
    job_args = [ tenant.slug, mailer_klass.name, method.to_s, *args ]

    if Rails.env.production?
      SendEmailJob.perform_later(*job_args)
    else
      SendEmailJob.perform_now(*job_args)
    end
  rescue => e
    Rails.logger.error "[EmailDispatcher] Failed #{mailer_klass}##{method} (tenant=#{tenant.slug}): #{e.message}"
    Rails.logger.error e.backtrace.first(10).join("\n") if e.backtrace
    raise
  end
end
