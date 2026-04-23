require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module Api
  class Application < Rails::Application
    config.load_defaults 7.2

    config.autoload_lib(ignore: %w[assets tasks])

    config.api_only = true

    # Cookie and session support (needed for httpOnly auth cookies)
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::CookieStore

    # Multi-tenancy: resolve tenant from X-Tenant-ID header, subdomain, or custom domain
    require Rails.root.join("app/middleware/tenant_resolver")
    config.middleware.use TenantResolver

    # Background jobs
    config.active_job.queue_adapter = :sidekiq

    # Timezone and locale
    config.time_zone = "America/Sao_Paulo"
    config.i18n.default_locale = :'pt-BR'
  end
end
