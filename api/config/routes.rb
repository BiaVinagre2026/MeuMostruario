Rails.application.routes.draw do
  mount LetterOpenerWeb::Engine, at: "/letter_opener" if Rails.env.development?

  namespace :api do
    namespace :v1 do
      # Auth (member)
      post   "auth/login",    to: "auth#login"
      delete "auth/logout",   to: "auth#logout"
      get    "auth/me",       to: "auth#me"
      post   "auth/refresh",                to: "auth#refresh"
      post   "auth/request_password_reset", to: "auth#request_password_reset"
      post   "auth/reset_password",         to: "auth#reset_password"

      # Tenant config (public - for white-label theming)
      get "tenant/config", to: "tenants#branding"

      # Member profile (authenticated)
      get   "profile",          to: "members#show"
      patch "profile",          to: "members#update"
      patch "profile/password", to: "members#change_password"

      # Partner namespace
      namespace :partner do
        post   "auth/login",  to: "auth#login"
        delete "auth/logout", to: "auth#logout"
        get    "auth/me",     to: "auth#me"

        get   "profile", to: "profile#show"
        patch "profile", to: "profile#update"
        post  "api/regenerate_key", to: "profile#regenerate_api_key"
      end

      # Admin namespace
      namespace :admin do
        # Operator authentication
        post   "auth/login",  to: "auth#login"
        delete "auth/logout", to: "auth#logout"
        get    "auth/me",     to: "auth#me"

        # Super-admin: full tenant management (CRUD)
        resources :tenants, only: [:index, :show, :create, :update, :destroy]

        # Tenant configuration - branding, email, storage, AI
        get   "tenant/config", to: "tenant_config#show"
        patch "tenant/config", to: "tenant_config#update"

        # Members (simplified)
        resources :members, only: [:index, :show, :update, :destroy] do
          collection do
            post :import
            get  :export
            get  :stats
          end
        end

        # Uploads
        post "upload", to: "uploads#create"

        # Imports (AI-powered)
        namespace :imports do
          post   "/",            to: "imports#create"
          get    "/:id",         to: "imports#show"
          get    "/:id/status",  to: "imports#show"
          post   "/:id/confirm", to: "imports#confirm"
        end
      end
    end
  end

  # Health check
  get "up", to: proc { [200, {}, ["OK"]] }
end
