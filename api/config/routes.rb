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

      # Public catalog (no auth required)
      resources :products,    only: [:index, :show]
      resources :collections, only: [:index, :show]
      resources :categories,  only: [:index]
      resources :looks,       only: [:index, :show]
      resources :leads,       only: [:create]
      resources :waitlists,   only: [:create]

      # Member profile (authenticated)
      get   "profile",          to: "members#show"
      patch "profile",          to: "members#update"
      patch "profile/password", to: "members#change_password"

      # B2B orders (authenticated member)
      resources :orders, only: [:index, :create]

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

        # Catalog – products, variants, images
        resources :products, only: [:index, :show, :create, :update, :destroy] do
          resources :variants, only: [:create, :update, :destroy], controller: "product_variants"
          resources :images,   only: [:create, :destroy],          controller: "product_images"
        end

        # Catalog – collections & categories
        resources :collections, only: [:index, :show, :create, :update, :destroy]
        resources :categories,  only: [:index, :create, :update, :destroy]

        # B2B orders management
        resources :orders, only: [:index, :show, :update]

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

  # Storefront público SSR (fora do namespace :api)
  scope module: "public" do
    root to: "home#index"
    get    "colecoes/:slug", to: "collections#show", as: :public_collection
    get    "produtos/:slug",  to: "products#show",   as: :public_product
    get    "looks/:slug",     to: "looks#show",      as: :public_look
    get    "carrinho",        to: "cart#show",       as: :cart
    get    "lojistas",        to: "lojistas#index",  as: :lojistas
    post   "pedido",          to: "lojistas#create", as: :pedido
    get    "entrar",          to: "sessions#new",    as: :entrar
    post   "entrar",          to: "sessions#create"
    delete "sair",            to: "sessions#destroy", as: :sair
    post   "leads",           to: "leads#create",    as: :leads
    post   "waitlist",        to: "waitlist#create", as: :waitlist
    get    "sitemap.xml",     to: "sitemaps#show",   defaults: { format: :xml }
  end
end
