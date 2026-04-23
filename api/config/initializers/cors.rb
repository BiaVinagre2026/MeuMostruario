Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    app_domain = ENV.fetch("APP_DOMAIN", "app.local")

    origins ENV.fetch("FRONTEND_URL", "http://localhost:8080"),
             "http://localhost:3000",
             "http://localhost:8080",
             # Development: subdomain.app.local:PORT
             /\Ahttp:\/\/[a-z0-9\-]+\.#{Regexp.escape(app_domain)}(:\d+)?\z/,
             # Production: subdomain.yourdomain.com
             /\Ahttps:\/\/([a-z0-9\-]+\.)?#{Regexp.escape(app_domain)}\z/,
             # Additional CORS origins from env (comma-separated)
             *ENV.fetch("CORS_ORIGINS", "").split(",").map(&:strip).reject(&:empty?)

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      expose: ["X-Total-Count", "X-Page", "X-Per-Page"]
  end
end
