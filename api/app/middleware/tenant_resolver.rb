class TenantResolver
  def initialize(app)
    @app = app
  end

  SKIP_PATHS = %w[/up /health].freeze

  def call(env)
    return @app.call(env) if SKIP_PATHS.include?(env["PATH_INFO"])

    request = ActionDispatch::Request.new(env)
    tenant = resolve_tenant(request)

    if tenant
      env["app.tenant"] = tenant
      env["app.tenant_config"] = tenant.tenant_config
      TenantSwitcher.switch!(tenant.schema_name)
    end

    @app.call(env)
  ensure
    TenantSwitcher.reset! rescue nil
  end

  private

  def resolve_tenant(request)
    # Priority 0: X-Admin-Tenant-Slug header (super-admin targeting a specific tenant)
    if request.path.start_with?("/api/v1/admin")
      admin_slug = request.headers["X-Admin-Tenant-Slug"]
      if admin_slug.present?
        tenant = Tenant.active.find_by(slug: admin_slug)
        return tenant if tenant
      end
    end

    # Priority 1: X-Tenant-ID header
    tenant_id = request.headers["X-Tenant-ID"]
    if tenant_id.present?
      return Tenant.active.find_by(slug: tenant_id) ||
             Tenant.active.find_by(id: tenant_id.to_i)
    end

    # Priority 2: Subdomain
    host = request.host
    subdomain = extract_subdomain(host)
    if subdomain.present? && !excluded_subdomain?(subdomain)
      tenant = Tenant.active.find_by(slug: subdomain)
      return tenant if tenant
    end

    # Priority 3: Custom domain
    Tenant.active.find_by(custom_domain: host)
  end

  def extract_subdomain(host)
    app_domain = ENV.fetch("APP_DOMAIN", "app.local")
    parts = host.split(".")
    return nil if parts.length <= 1
    return parts.first if host.end_with?(".#{app_domain}")
    return parts.first if parts.length >= 3
    nil
  end

  def excluded_subdomain?(subdomain)
    %w[www api admin app].include?(subdomain)
  end
end
