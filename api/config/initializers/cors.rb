Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    app_domain = ENV.fetch("APP_DOMAIN", "app.local")
    development_origins = Rails.env.development? ? [
      # Development: allow the Vite server when opened from another device on LAN.
      /\Ahttp:\/\/(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?\z/
    ] : []

    origins ENV.fetch("FRONTEND_URL", "http://localhost:8080"),
             "http://localhost:3000",
             "http://localhost:8080",
             # Development: subdomain.app.local:PORT
             /\Ahttp:\/\/[a-z0-9\-]+\.#{Regexp.escape(app_domain)}(:\d+)?\z/,
             # Production: subdomain.yourdomain.com
             /\Ahttps:\/\/([a-z0-9\-]+\.)?#{Regexp.escape(app_domain)}\z/,
             # Additional CORS origins from env (comma-separated)
             *ENV.fetch("CORS_ORIGINS", "").split(",").map(&:strip).reject(&:empty?),
             *development_origins

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      expose: ["X-Total-Count", "X-Page", "X-Per-Page"]
  end
end
