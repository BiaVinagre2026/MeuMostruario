# frozen_string_literal: true

module SeedPhotoCatalogDemo
  LOCAL_PHOTO_EXTENSIONS = %w[*.jpg *.jpeg *.png *.webp *.JPG *.JPEG *.PNG *.WEBP].freeze
  LOCAL_PHOTO_SOURCE_DIRS = [
    Rails.root.join("public", "uploads", "seed_source"),
    Rails.root.join("..", "Fotos")
  ].freeze
  DEFAULT_COLLECTION_KEY = :movimento
  DEFAULT_CATEGORY_KEY = :fitness

  CATEGORY_DEFINITIONS = [
    { key: :conjuntos, slug: "conjuntos", name: "Conjuntos", position: 1 },
    { key: :vestidos, slug: "vestidos", name: "Vestidos", position: 2 },
    { key: :fitness, slug: "fitness", name: "Fitness", position: 3 },
    { key: :tops, slug: "tops", name: "Tops", position: 4 },
    { key: :acessorios, slug: "acessorios", name: "Acessorios", position: 5 }
  ].freeze

  COLLECTION_DEFINITIONS = [
    { key: :resort, slug: "resort-26", name: "Resort 26", position: 1, description: "Capsula de atacado com foco em resortwear e alfaiataria leve." },
    { key: :movimento, slug: "movimento-26", name: "Movimento 26", position: 2, description: "Linha de performance e conforto para treino e lifestyle." },
    { key: :atelier, slug: "atelier-26", name: "Atelier 26", position: 3, description: "Pecas de imagem para vitrine, editorial e pedido por link." }
  ].freeze

  MEMBER_FIXTURES = {
    "demo" => [
      { cpf: "52998224725", full_name: "Alice Silva", email: "alice@demo.com" },
      { cpf: "11144477735", full_name: "Bob Santos", email: "bob@demo.com" },
      { cpf: "98765432100", full_name: "Carol Oliveira", email: "carol@demo.com" }
    ],
    "acme" => [
      { cpf: "71428793020", full_name: "Dave Pereira", email: "dave@acme.com" },
      { cpf: "25312829070", full_name: "Eva Costa", email: "eva@acme.com" }
    ]
  }.freeze

  CURATED_PRODUCTS = [
    {
      sku: "FIT-101",
      name: "Conjunto Shape Short",
      collection: :movimento,
      category: :fitness,
      price_w: 129,
      price_r: 259,
      position: 1,
      description: "Conjunto fitness texturizado com top reto e short de cintura alta para giro rapido no atacado.",
      fabric: "90% Poliamida / 10% Elastano",
      tags: ["Fitness", "Short", "Texturizado"],
      variants: [
        { color: "Preto", color_hex: "#111111", sizes: ["P/M", "M/G", "Plus 1"] }
      ]
    },
    {
      sku: "FIT-102",
      name: "Conjunto Pulse Ombro Unico",
      collection: :movimento,
      category: :fitness,
      price_w: 149,
      price_r: 289,
      position: 2,
      description: "Conjunto fitness com top de ombro unico e legging de alta compressao.",
      fabric: "88% Poliamida / 12% Elastano",
      tags: ["Fitness", "Legging", "Ombro unico"],
      variants: [
        { color: "Rosa Energia", color_hex: "#D85A7F", sizes: ["P/M", "M/G"] }
      ]
    },
    {
      sku: "FIT-103",
      name: "Conjunto Pulse Legging Plus",
      collection: :movimento,
      category: :fitness,
      price_w: 159,
      price_r: 309,
      position: 3,
      description: "Conjunto fitness com top amplo e legging longa em grade inclusiva.",
      fabric: "88% Poliamida / 12% Elastano",
      tags: ["Fitness", "Plus", "Legging"],
      variants: [
        { color: "Vinho Intenso", color_hex: "#8E204B", sizes: ["Plus 1", "Plus 2"] }
      ]
    }
  ].freeze

  TENANT_DEMOS = {
    "demo" => {
      batch_name: "Triagem Demo Meu Mostruario",
      catalog_name: "Meu Mostruario | Catalogo Atacado",
      description: "Demo multitenant com catalogo de fotos locais, links publico e atacado."
    },
    "acme" => {
      batch_name: "Triagem Demo Acme",
      catalog_name: "Acme Corp | Wholesale Preview",
      description: "Demo white-label da Acme com buyer link, interesse publico e fotos reais."
    }
  }.freeze

  def self.run!
    source_files = discover_local_photo_files!

    TENANT_DEMOS.map do |tenant_slug, config|
      tenant = Tenant.find_by!(slug: tenant_slug)

      TenantSwitcher.switch!(tenant.schema_name)
      ActiveRecord::Base.connection.clear_cache!
      ensure_minimum_schema!
      ensure_members!(tenant_slug)

      puts "\n[Photo catalog demo - #{tenant.slug}]"

      categories = ensure_categories
      collections = ensure_collections
      curated_products = ensure_curated_products(categories, collections)
      ensure_variant_size_groups!
      staged_assets = stage_local_photo_assets!(tenant.slug, source_files)

      result = seed_catalog_assets!(tenant: tenant, products: curated_products, config: config.merge(photo_assets: staged_assets))

      puts "  Catalogo: #{result[:catalog_name]}"
      puts "  Publico:  #{result[:public_url]}"
      puts "  Atacado:  #{result[:wholesale_url]}"
      result
    ensure
      ActiveRecord::Base.connection.clear_cache!
      TenantSwitcher.reset!
    end
  end

  def self.ensure_minimum_schema!
    sql_blocks = [
      TenantSchemaSql.members_sql,
      TenantSchemaSql.categories_sql,
      TenantSchemaSql.collections_sql,
      safe_products_sql,
      TenantSchemaSql.product_variants_sql,
      TenantSchemaSql.product_images_sql,
      TenantSchemaSql.photo_batches_sql,
      TenantSchemaSql.photos_sql,
      TenantSchemaSql.photo_analyses_sql,
      TenantSchemaSql.catalogs_sql,
      TenantSchemaSql.catalog_items_sql,
      TenantSchemaSql.catalog_links_sql
    ]

    sql_blocks.each do |sql|
      ActiveRecord::Base.connection.execute(sql)
    end
  end

  def self.safe_products_sql
    TenantSchemaSql.products_sql
      .lines
      .reject { |line| line.include?("CREATE EXTENSION IF NOT EXISTS pg_trgm") || line.include?("idx_products_name_trgm") || line.include?("idx_products_description_trgm") }
      .join
  end

  def self.ensure_members!(tenant_slug)
    fixtures = MEMBER_FIXTURES.fetch(tenant_slug, [])
    fixtures.each do |definition|
      next if member_exists?(definition[:cpf])

      password_digest = BCrypt::Password.create("password123")
      ActiveRecord::Base.connection.execute(<<~SQL)
        INSERT INTO members (cpf, full_name, email, password_digest, status, plan_status, role, association_date)
        VALUES ('#{definition[:cpf]}', '#{definition[:full_name]}', '#{definition[:email]}', '#{password_digest}', 'active', 'active', 'member', CURRENT_DATE)
      SQL
    end
  end

  def self.member_exists?(cpf)
    ActiveRecord::Base.connection.execute("SELECT COUNT(*) FROM members WHERE cpf = '#{cpf}'").first["count"].to_i.positive?
  end

  def self.discover_local_photo_files!
    LOCAL_PHOTO_SOURCE_DIRS.each do |dir|
      next unless Dir.exist?(dir)

      files = LOCAL_PHOTO_EXTENSIONS.flat_map { |pattern| Dir.glob(dir.join(pattern)) }.sort
      return files if files.any?
    end

    raise "Nenhuma foto local encontrada em #{LOCAL_PHOTO_SOURCE_DIRS.join(' ou ')}"
  end

  def self.stage_local_photo_assets!(tenant_slug, source_files)
    destination_dir = Rails.root.join("public", "uploads", tenant_slug.to_s)
    FileUtils.mkdir_p(destination_dir)

    source_files.each_with_index.map do |source_file, index|
      ext = File.extname(source_file).downcase
      destination_name = format("catalogo-%<index>03d%<ext>s", index: index + 1, ext: ext.presence || ".jpg")
      destination_file = destination_dir.join(destination_name)
      FileUtils.cp(source_file, destination_file) unless File.exist?(destination_file)
      {
        original_filename: File.basename(source_file),
        source_path: source_file.to_s,
        url: "/uploads/#{tenant_slug}/#{destination_name}"
      }
    end
  end

  def self.ensure_categories
    CATEGORY_DEFINITIONS.each_with_object({}) do |definition, memo|
      memo[definition[:key]] = Category.find_or_create_by!(slug: definition[:slug]) do |category|
        category.name = definition[:name]
        category.position = definition[:position]
      end
    end
  end

  def self.ensure_collections
    COLLECTION_DEFINITIONS.each_with_object({}) do |definition, memo|
      memo[definition[:key]] = Collection.find_or_create_by!(slug: definition[:slug]) do |collection|
        collection.name = definition[:name]
        collection.status = "published"
        collection.position = definition[:position]
        collection.description = definition[:description]
      end
    end
  end

  def self.ensure_curated_products(categories, collections)
    CURATED_PRODUCTS.each_with_object({}) do |definition, memo|
      product = Product.find_or_initialize_by(sku: definition[:sku])
      product.name = definition[:name]
      product.collection = collections.fetch(definition[:collection])
      product.category = categories.fetch(definition[:category])
      product.price_wholesale = definition[:price_w]
      product.price_retail = definition[:price_r]
      product.currency = "BRL"
      product.status = "published"
      product.position = definition[:position]
      product.description = definition[:description]
      product.fabric_composition = definition[:fabric]
      product.tags = definition[:tags]
      product.save!

      definition[:variants].each_with_index do |variant_def, variant_index|
        variant_def[:sizes].each_with_index do |size, size_index|
          variant = ProductVariant.find_or_initialize_by(product: product, color: variant_def[:color], size: size)
          variant.color_hex = variant_def[:color_hex]
          variant.stock_qty = 36
          variant.position = (variant_index * 10) + size_index
          variant.size_group = size
          variant.save!
        end
      end

      puts "  #{product.sku} - #{product.name}"
      memo[definition[:sku]] = product
    end
  end

  def self.ensure_variant_size_groups!
    ProductVariant.find_each do |variant|
      next unless variant.respond_to?(:size_group)
      next if variant.size_group.present?

      variant.update_columns(size_group: normalize_size_group(variant.size))
    end
  end

  def self.normalize_size_group(size)
    case size.to_s
    when "PP", "P", "M", "P/M" then "P/M"
    when "G", "GG", "M/G" then "M/G"
    when "XGG", "Plus 1" then "Plus 1"
    when "Plus 2" then "Plus 2"
    else "Unico"
    end
  end

  def self.seed_catalog_assets!(tenant:, products:, config:)
    batch = PhotoBatch.find_or_create_by!(name: config[:batch_name]) do |photo_batch|
      photo_batch.status = "reviewed"
    end
    batch.update!(status: "reviewed")

    curated_products = products.values
    purge_remote_images!(curated_products)

    config.fetch(:photo_assets).each_with_index do |asset, index|
      assignment = assignment_for_asset(asset, index)
      product = products.fetch(assignment[:sku])
      variant = select_variant_for_seed(product, assignment)
      url = asset.fetch(:url)

      photo = Photo.find_or_initialize_by(
        photo_batch: batch,
        original_filename: asset.fetch(:original_filename)
      )
      photo.product = product
      photo.urls = { "original" => url, "regular" => url, "card" => url, "thumb" => url }
      photo.status = "approved"
      photo.product_variant = variant
      photo.approved_color = assignment[:color]
      photo.approved_pantone = assignment[:pantone]
      photo.approved_model = assignment[:model_name]
      photo.approved_size_group = assignment[:size_group]
      photo.confidence_score = 0.93
      photo.save!

      analysis = photo.photo_analyses.find_or_initialize_by(provider: "openrouter", model: "openrouter/demo-vision")
      analysis.status = "completed"
      analysis.confidence = 0.93
      analysis.cost_cents = 7
      analysis.suggestions = {
        approved_color: photo.approved_color,
        pantone: photo.approved_pantone,
        model: photo.approved_model,
        size_group: photo.approved_size_group
      }
      analysis.raw_response = {
        note: "Seeded automated triage sample",
        tenant: tenant.slug,
        product: product.sku,
        source_file: asset.fetch(:original_filename)
      }
      analysis.save!

      image = product.images.find_or_initialize_by(photo_id: photo.id)
      image.urls = photo.urls
      image.visual_metadata = {
        "approved_color" => photo.approved_color,
        "pantone" => photo.approved_pantone,
        "size_group" => photo.approved_size_group
      }
      image.is_cover = product.images.where(is_cover: true).where.not(id: image.id).none?
      image.position = index
      image.save!
    end

    target_product_ids = curated_products.map(&:id)
    source_filenames = config.fetch(:photo_assets).map { |asset| asset.fetch(:original_filename) }
    batch.photos.where.not(original_filename: source_filenames).destroy_all

    batch.refresh_counts!
    refresh_collection_covers!(curated_products)

    catalog = Catalog.find_or_create_by!(name: config[:catalog_name]) do |item|
      item.description = config[:description]
      item.status = "published"
      item.source = "seed_multitenant_photo_catalog"
    end
    catalog.update!(description: config[:description], status: "published", source: "seed_multitenant_photo_catalog")
    catalog.catalog_items.delete_all

    batch.photos.where(status: %w[approved published]).each_with_index do |photo, index|
      item = catalog.catalog_items.find_or_initialize_by(product: photo.product, photo: photo)
      item.position = index
      item.visible = true
      item.save!
    end

    public_link = catalog.catalog_links.find_or_create_by!(link_type: "public_client") do |link|
      link.show_prices = false
      link.allow_order = false
      link.allow_payment = false
    end
    wholesale_link = catalog.catalog_links.find_or_create_by!(link_type: "wholesale_buyer") do |link|
      link.show_prices = true
      link.allow_order = true
      link.allow_payment = true
    end

    {
      tenant_slug: tenant.slug,
      catalog_name: catalog.name,
      public_url: "/link/#{public_link.token}",
      wholesale_url: "/link/#{wholesale_link.token}"
    }
  end

  def self.assignment_for_asset(asset, index)
    heuristic = LocalPhotoGrouping.assignment_for(asset.fetch(:original_filename))
    return heuristic.slice(:sku, :color, :size_group, :model_name, :pantone) if heuristic.present?

    fallback_product = CURATED_PRODUCTS.first
    {
      sku: fallback_product.fetch(:sku),
      color: fallback_product.fetch(:variants).first.fetch(:color),
      size_group: fallback_product.fetch(:variants).first.fetch(:sizes).first,
      model_name: fallback_product.fetch(:name),
      pantone: format("PANTONE %<prefix>d-%<suffix>d TPX", prefix: 17 + (index % 10), suffix: 5600 + index)
    }
  end

  def self.select_variant_for_seed(product, assignment)
    variants = product.variants.order(:position, :id)
    variants.find { |item| item.color == assignment[:color] && item.size_group == assignment[:size_group] } ||
      variants.find { |item| item.color == assignment[:color] } ||
      variants.find { |item| item.size_group == assignment[:size_group] } ||
      variants.first
  end

  def self.purge_remote_images!(products)
    product_ids = products.map(&:id)
    remote_images = ProductImage.where(product_id: product_ids).select do |image|
      image.urls.is_a?(Hash) && image.urls.values.compact.any? { |value| value.include?("unsplash.com") }
    end
    ProductImage.where(id: remote_images.map(&:id)).delete_all if remote_images.any?

    ProductVariant.where(product_id: product_ids).where("image_url LIKE ?", "%unsplash.com%").update_all(image_url: nil)
    Collection.where(id: products.map(&:collection_id).compact.uniq).where("cover_url LIKE ?", "%unsplash.com%").update_all(cover_url: nil)
  end

  def self.refresh_collection_covers!(products)
    products.group_by(&:collection_id).each_value do |group|
      collection = group.first.collection
      next unless collection

      cover = group.flat_map(&:images).sort_by { |image| [image.position || 0, image.id] }.find do |image|
        image.urls.is_a?(Hash) && image.urls.values.compact.any? { |value| value.start_with?("/uploads/") }
      end
      next unless cover

      cover_url = cover.urls["regular"] || cover.urls["card"] || cover.urls["thumb"] || cover.urls.values.compact.first
      collection.update_column(:cover_url, cover_url)
    end
  end
end
