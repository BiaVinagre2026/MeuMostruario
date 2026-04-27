# frozen_string_literal: true

# ===========================================================================
# Seeds for multitenant-whitelabel-base
#
# Usage:
#   rails db:create db:schema:load db:seed
#
# This creates:
#   1. Super admin operator (global, can manage all tenants)
#   2. Two demo tenants with full branding config
#   3. Tenant-scoped admin operators (one per tenant)
#   4. Demo members inside each tenant schema
#   5. A demo partner
# ===========================================================================

puts "=" * 60
puts " Seeding multitenant-whitelabel-base"
puts "=" * 60

# Ensure required PostgreSQL extensions exist (idempotent)
%w[pg_trgm unaccent citext].each do |ext|
  ActiveRecord::Base.connection.execute("CREATE EXTENSION IF NOT EXISTS #{ext}")
rescue => e
  puts "  [WARN] Extension #{ext}: #{e.message}"
end

# ---------------------------------------------------------------------------
# 1. Super Admin (global, no tenant)
# ---------------------------------------------------------------------------
super_admin = Operator.find_or_create_by!(email: "super@admin.com") do |op|
  op.name = "Super Admin"
  op.password = "password123"
  op.role = "super_admin"
  op.status = "active"
end
puts "\n[Operators]"
puts "  Super admin: #{super_admin.email} / password123 (role: super_admin)"

# ---------------------------------------------------------------------------
# 2. Tenants
# ---------------------------------------------------------------------------
puts "\n[Tenants]"

tenants_data = [
  {
    slug: "demo",
    name: "Demo Company",
    plan: "growth",
    config: {
      color_primary: "#1E40AF",
      color_secondary: "#F97316",
      color_accent: "#10B981",
      color_header_bg: "#FFFFFF",
      color_header_text: "#64748B",
      color_header_text_hover: "#1E40AF",
      color_footer_text: "#94A3B8",
      color_footer_text_hover: "#0F172A",
      font_primary: "Inter",
      font_heading: "Inter",
      coin_name: "Coins",
      coin_symbol: "C",
      company_name: "Demo Company Ltda",
      company_email: "hello@demo.com",
      company_phone: "(11) 99999-0000",
      footer_text: "Demo Company - Template Base",
      email_provider: "letter_opener",
      favicon_mode: "auto",
      overdue_days: 30,
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
    admin: { email: "admin@demo.com", name: "Demo Admin" },
    members: [
      { cpf: "52998224725", full_name: "Alice Silva", email: "alice@demo.com" },
      { cpf: "11144477735", full_name: "Bob Santos", email: "bob@demo.com" },
      { cpf: "98765432100", full_name: "Carol Oliveira", email: "carol@demo.com" },
    ],
  },
  {
    slug: "acme",
    name: "Acme Corp",
    plan: "enterprise",
    config: {
      color_primary: "#7C3AED",
      color_secondary: "#EC4899",
      color_accent: "#F59E0B",
      color_header_bg: "#1E1B4B",
      color_header_text: "#E0E7FF",
      color_header_text_hover: "#FFFFFF",
      color_footer_text: "#A5B4FC",
      color_footer_text_hover: "#FFFFFF",
      font_primary: "Poppins",
      font_heading: "Space Grotesk",
      coin_name: "Points",
      coin_symbol: "P",
      company_name: "Acme Corporation",
      company_email: "contact@acme.com",
      company_phone: "(21) 3333-4444",
      footer_text: "Acme Corp - Powered by Template Base",
      email_provider: "letter_opener",
      favicon_mode: "auto",
      overdue_days: 15,
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
    admin: { email: "admin@acme.com", name: "Acme Admin" },
    members: [
      { cpf: "71428793020", full_name: "Dave Pereira", email: "dave@acme.com" },
      { cpf: "25312829070", full_name: "Eva Costa", email: "eva@acme.com" },
    ],
  },
]

tenants_data.each do |td|
  # Create tenant
  tenant = Tenant.find_or_create_by!(slug: td[:slug]) do |t|
    t.name = td[:name]
    t.plan = td[:plan]
    t.status = "active"
  end
  puts "  Tenant: #{tenant.name} (slug: #{tenant.slug}, plan: #{tenant.plan})"

  # Create tenant config
  TenantConfig.find_or_create_by!(tenant: tenant) do |config|
    td[:config].each { |key, value| config.send("#{key}=", value) }
  end
  puts "    Config: colors #{td[:config][:color_primary]}/#{td[:config][:color_secondary]}/#{td[:config][:color_accent]}"

  # Provision tenant schema (creates tables inside tenant schema)
  schema_ok = false
  begin
    TenantProvisioner.provision!(tenant)
    puts "    Schema provisioned: #{tenant.schema_name}"
    schema_ok = true
  rescue => e
    puts "    Schema exists or error: #{e.message}"
    # Try switching anyway — schema may already exist from a prior run
    begin
      TenantSwitcher.switch!(tenant.schema_name)
      ActiveRecord::Base.connection.execute("SELECT 1 FROM members LIMIT 1")
      schema_ok = true
      TenantSwitcher.reset!
    rescue
      TenantSwitcher.reset! rescue nil
    end
  end

  # Create tenant-scoped admin operator
  admin = Operator.find_or_create_by!(email: td[:admin][:email]) do |op|
    op.name = td[:admin][:name]
    op.password = "password123"
    op.role = "admin"
    op.tenant = tenant
    op.status = "active"
  end
  puts "    Admin: #{admin.email} / password123"

  # Create demo members inside the tenant schema
  if schema_ok
    TenantSwitcher.switch!(tenant.schema_name)

    td[:members].each do |md|
      exists = ActiveRecord::Base.connection.execute(
        "SELECT COUNT(*) FROM members WHERE cpf = '#{md[:cpf]}'"
      ).first["count"].to_i > 0

      unless exists
        password_digest = BCrypt::Password.create("password123")
        ActiveRecord::Base.connection.execute(<<~SQL)
          INSERT INTO members (cpf, full_name, email, password_digest, status, plan_status, role, association_date)
          VALUES ('#{md[:cpf]}', '#{md[:full_name]}', '#{md[:email]}', '#{password_digest}', 'active', 'active', 'member', CURRENT_DATE)
        SQL
        puts "    Member: #{md[:full_name]} (CPF: #{md[:cpf]}) / password123"
      end
    end

    TenantSwitcher.reset!
  else
    puts "    [SKIP] Members not seeded — schema provisioning failed"
  end
end

# ---------------------------------------------------------------------------
# 3. Partner
# ---------------------------------------------------------------------------
puts "\n[Partners]"

partner = Partner.find_or_create_by!(email: "partner@example.com") do |p|
  p.name = "Demo Partner"
  p.password = "password123"
  p.contact_name = "Partner Contact"
  p.phone = "(11) 98888-7777"
  p.status = "active"
  p.description = "A demo partner for testing the partner portal"
end
puts "  Partner: #{partner.email} / password123 (status: #{partner.status})"

# ---------------------------------------------------------------------------
# 4. Catalog — demo tenant products
# ---------------------------------------------------------------------------
puts "\n[Catalog — demo tenant]"

demo_tenant = Tenant.find_by!(slug: "demo")
TenantSwitcher.switch!(demo_tenant.schema_name)

# Categories
cats = {
  conjuntos:  Category.find_or_create_by!(slug: "conjuntos")   { |c| c.name = "Conjuntos";     c.position = 1 },
  tops:       Category.find_or_create_by!(slug: "tops")        { |c| c.name = "Tops";           c.position = 2 },
  calcas:     Category.find_or_create_by!(slug: "calcas")      { |c| c.name = "Calças";         c.position = 3 },
  vestidos:   Category.find_or_create_by!(slug: "vestidos")    { |c| c.name = "Vestidos";       c.position = 4 },
  fitness:    Category.find_or_create_by!(slug: "fitness")     { |c| c.name = "Fitness";        c.position = 5 },
  acessorios: Category.find_or_create_by!(slug: "acessorios")  { |c| c.name = "Acessórios";     c.position = 6 },
}
puts "  #{cats.size} categorias"

# Collections
cols = {
  essencial: Collection.find_or_create_by!(slug: "essencial") { |c|
    c.name = "Essencial"; c.status = "published"; c.position = 1
    c.description = "Peças atemporais para o dia a dia com acabamento refinado."
  },
  movimento: Collection.find_or_create_by!(slug: "movimento") { |c|
    c.name = "Movimento"; c.status = "published"; c.position = 2
    c.description = "Linha fitness de alta performance para treino e lifestyle."
  },
  destaque:  Collection.find_or_create_by!(slug: "destaque")  { |c|
    c.name = "Destaque"; c.status = "published"; c.position = 3
    c.description = "Peças de impacto e acessórios para compor o look completo."
  },
}
puts "  #{cols.size} coleções"

# Products
products_data = [
  # ── Conjuntos ──────────────────────────────────────────────────────────────
  { sku: "ESS-001", name: "Conjunto Linho Marta",    collection: :essencial, category: :conjuntos,
    price_w: 198, price_r: 389, position: 1,
    description: "Conjunto de calça wide leg e blazer cropped em linho lavado. Caimento fluido, ideal para looks do dia à noite.",
    fabric: "100% Linho", tags: ["Conjunto", "Linho", "Wide leg", "Blazer cropped"],
    variants: [
      { color: "Off-white", color_hex: "#F5F0E8", sizes: %w[P M G GG] },
      { color: "Bege",      color_hex: "#C9B99A", sizes: %w[P M G GG] },
      { color: "Preto",     color_hex: "#1C1C1C", sizes: %w[P M G GG] },
    ] },
  { sku: "ESS-002", name: "Conjunto Ribana Íris",    collection: :essencial, category: :conjuntos,
    price_w: 156, price_r: 299, position: 2,
    description: "Top canelado com decote V e calça de cintura alta em ribana elástica. Conjunto versátil que vai da academia ao casual.",
    fabric: "95% Viscose / 5% Elastano", tags: ["Ribana", "Canelado", "Cintura alta"],
    variants: [
      { color: "Terracota", color_hex: "#B05E3A", sizes: %w[PP P M G] },
      { color: "Verde Sage", color_hex: "#7A9E7E", sizes: %w[PP P M G] },
      { color: "Preto",     color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
    ] },

  # ── Tops ───────────────────────────────────────────────────────────────────
  { sku: "ESS-011", name: "Top Drapeado Lena",       collection: :essencial, category: :tops,
    price_w: 88,  price_r: 169, position: 3,
    description: "Top com drapeado frontal assimétrico em malha fluida. Alças finas ajustáveis, bojo removível.",
    fabric: "92% Poliéster / 8% Elastano", tags: ["Drapeado", "Bojo removível", "Alças finas"],
    variants: [
      { color: "Nude",   color_hex: "#D4A98A", sizes: %w[PP P M G] },
      { color: "Preto",  color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Branco", color_hex: "#F8F6F2", sizes: %w[PP P M G] },
    ] },
  { sku: "ESS-012", name: "Blusa Transpassada Sofia", collection: :essencial, category: :tops,
    price_w: 94,  price_r: 179, position: 4,
    description: "Blusa transpassada com manga longa e amarração lateral. Tecido crepe com caimento impecável.",
    fabric: "100% Crepe de Viscose", tags: ["Transpassada", "Manga longa", "Crepe"],
    variants: [
      { color: "Bordô",     color_hex: "#6B1E2E", sizes: %w[P M G] },
      { color: "Caramelo",  color_hex: "#C68B4A", sizes: %w[P M G GG] },
      { color: "Off-white", color_hex: "#F5F0E8", sizes: %w[P M G] },
    ] },

  # ── Calças ─────────────────────────────────────────────────────────────────
  { sku: "ESS-021", name: "Calça Pantalona Helena",  collection: :essencial, category: :calcas,
    price_w: 148, price_r: 289, position: 5,
    description: "Pantalona de alfaiataria com cinto embutido. Pernas largas e comprimento ras ao chão para silhueta elegante.",
    fabric: "65% Poliéster / 35% Viscose", tags: ["Pantalona", "Alfaiataria", "Cinto embutido"],
    variants: [
      { color: "Preto",   color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Marinho", color_hex: "#1A2744", sizes: %w[PP P M G] },
      { color: "Bege",    color_hex: "#C9B99A", sizes: %w[PP P M G] },
    ] },
  { sku: "ESS-022", name: "Calça Jogger Laura",      collection: :essencial, category: :calcas,
    price_w: 112, price_r: 219, position: 6,
    description: "Jogger de moletom penteado com punho na barra e bolsos laterais funcionais. Conforto para o dia a dia.",
    fabric: "80% Algodão / 20% Poliéster", tags: ["Jogger", "Moletom", "Bolsos"],
    variants: [
      { color: "Cinza Mescla", color_hex: "#A8A8A4", sizes: %w[PP P M G GG] },
      { color: "Preto",        color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Rosa Antigo",  color_hex: "#C9908A", sizes: %w[PP P M G] },
    ] },

  # ── Vestidos ───────────────────────────────────────────────────────────────
  { sku: "DES-031", name: "Vestido Midi Valentina",  collection: :destaque, category: :vestidos,
    price_w: 218, price_r: 429, position: 7,
    description: "Vestido midi com recortes laterais e decote quadrado. Malha maquinetada com textura delicada e leve brilho.",
    fabric: "88% Poliéster / 12% Elastano", tags: ["Midi", "Decote quadrado", "Maquinetado"],
    variants: [
      { color: "Preto",    color_hex: "#1C1C1C", sizes: %w[PP P M G] },
      { color: "Dourado",  color_hex: "#C5A028", sizes: %w[PP P M G] },
    ] },
  { sku: "DES-032", name: "Vestido Chemise Clara",   collection: :destaque, category: :vestidos,
    price_w: 168, price_r: 329, position: 8,
    description: "Chemise longo com botões frontais e cinto destacável. Tecido viscolinho leve e fresco.",
    fabric: "100% Viscolinho", tags: ["Chemise", "Longo", "Cinto"],
    variants: [
      { color: "Cru",      color_hex: "#EDE0CC", sizes: %w[P M G GG] },
      { color: "Listrado", color_hex: "#D4C5A9", sizes: %w[P M G] },
    ] },

  # ── Fitness ────────────────────────────────────────────────────────────────
  { sku: "MOV-041", name: "Top Fitness Compressão Diana", collection: :movimento, category: :fitness,
    price_w: 78,  price_r: 149, position: 9,
    description: "Top de compressão com bojo anatômico removível e alças largas. Tecido com proteção UV50+ e tecnologia dry-fit.",
    fabric: "78% Poliamida / 22% Elastano", tags: ["Compressão", "Bojo removível", "UV50+", "Dry-fit"],
    variants: [
      { color: "Preto",      color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Verde Lima", color_hex: "#7FB236", sizes: %w[PP P M G] },
      { color: "Rosé",       color_hex: "#D4899A", sizes: %w[PP P M G] },
    ] },
  { sku: "MOV-042", name: "Legging Sculpt Bia",          collection: :movimento, category: :fitness,
    price_w: 124, price_r: 239, position: 10,
    description: "Legging de cintura alta com painel sculpt lateral que modela e sustenta. Bolso interno na cintura.",
    fabric: "80% Poliamida / 20% Elastano", tags: ["Cintura alta", "Sculpt", "Bolso interno"],
    variants: [
      { color: "Preto",    color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Grafite",  color_hex: "#4A4A4A", sizes: %w[PP P M G GG] },
      { color: "Terracota",color_hex: "#B05E3A", sizes: %w[PP P M G] },
    ] },
  { sku: "MOV-043", name: "Shorts Run Camila",           collection: :movimento, category: :fitness,
    price_w: 68,  price_r: 129, position: 11,
    description: "Shorts de corrida com bermuda interna e bolsos laterais. Tecido ultra leve com malha respirável.",
    fabric: "87% Poliéster / 13% Elastano", tags: ["Corrida", "Bermuda interna", "Ultra leve"],
    variants: [
      { color: "Preto",    color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Roxo",     color_hex: "#5C3B7A", sizes: %w[PP P M G] },
    ] },
  { sku: "MOV-044", name: "Jaqueta Corta-vento Ana",     collection: :movimento, category: :fitness,
    price_w: 188, price_r: 359, position: 12,
    description: "Corta-vento leve com capuz e bolsos com zíper. Repelente à água, ideal para treinos ao ar livre.",
    fabric: "100% Nylon ripstop", tags: ["Corta-vento", "Capuz", "Repelente à água"],
    variants: [
      { color: "Preto",   color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Marinho", color_hex: "#1A2744", sizes: %w[PP P M G] },
    ] },

  # ── Acessórios ─────────────────────────────────────────────────────────────
  { sku: "DES-051", name: "Bolsa Transversal Mia",    collection: :destaque, category: :acessorios,
    price_w: 128, price_r: 249, position: 13,
    description: "Bolsa transversal em couro ecológico com alça regulável e corrente dourada. Compartimento principal com bolso interno.",
    fabric: "Couro ecológico", tags: ["Transversal", "Couro ecológico", "Corrente"],
    variants: [
      { color: "Preto",   color_hex: "#1C1C1C", sizes: %w[Único] },
      { color: "Caramelo",color_hex: "#C68B4A", sizes: %w[Único] },
      { color: "Nude",    color_hex: "#D4A98A", sizes: %w[Único] },
    ] },
  { sku: "DES-052", name: "Cinto Largo Elástico Lua", collection: :destaque, category: :acessorios,
    price_w: 58,  price_r: 109, position: 14,
    description: "Cinto largo em elástico trançado com fivela dourada. Finalizador de looks que define a cintura.",
    fabric: "Poliéster / Metal dourado", tags: ["Cinto", "Elástico", "Fivela dourada"],
    variants: [
      { color: "Preto",   color_hex: "#1C1C1C", sizes: %w[Único] },
      { color: "Nude",    color_hex: "#D4A98A", sizes: %w[Único] },
    ] },
  { sku: "DES-053", name: "Scrunchie Veludo Pack",    collection: :destaque, category: :acessorios,
    price_w: 38,  price_r: 69, position: 15,
    description: "Kit com 3 scrunchies em veludo macio. Não marca o cabelo e finaliza o look com charme.",
    fabric: "Veludo", tags: ["Scrunchie", "Pack", "Veludo"],
    variants: [
      { color: "Mix Neutros", color_hex: "#C9B99A", sizes: %w[Único] },
      { color: "Mix Colorido",color_hex: "#B05E3A", sizes: %w[Único] },
    ] },
]

products_data.each do |pd|
  product = Product.find_or_create_by!(sku: pd[:sku]) do |p|
    p.name               = pd[:name]
    p.collection         = cols[pd[:collection]]
    p.category           = cats[pd[:category]]
    p.price_wholesale    = pd[:price_w]
    p.price_retail       = pd[:price_r]
    p.currency           = "BRL"
    p.status             = "published"
    p.position           = pd[:position]
    p.description        = pd[:description]
    p.fabric_composition = pd[:fabric]
    p.tags               = pd[:tags] || []
  end

  pd[:variants].each_with_index do |vd, vi|
    vd[:sizes].each_with_index do |size, si|
      ProductVariant.find_or_create_by!(product: product, color: vd[:color], size: size) do |v|
        v.color_hex = vd[:color_hex]
        v.stock_qty = 40
        v.position  = vi * 10 + si
      end
    end
  end

  print "  #{product.sku} — #{product.name}\n"
end

TenantSwitcher.reset!

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
puts "\n" + "=" * 60
puts " Seeding complete!"
puts "=" * 60

puts "\n Credentials (all passwords: password123)"
puts " ─────────────────────────────────────────"
puts ""
puts " ADMIN PANEL (http://localhost:8080/admin/login)"
puts "   Super admin:  super@admin.com"
puts "   Demo admin:   admin@demo.com     (tenant: demo)"
puts "   Acme admin:   admin@acme.com     (tenant: acme)"
puts ""
puts " MEMBER PORTAL"
puts "   Demo tenant:  http://demo.app.local:8080/login"
puts "     Alice:  CPF 529.982.247-25"
puts "     Bob:    CPF 111.444.777-35"
puts "     Carol:  CPF 987.654.321-00"
puts "   Acme tenant:  http://acme.app.local:8080/login"
puts "     Dave:   CPF 714.287.930-20"
puts "     Eva:    CPF 253.128.290-70"
puts ""
puts " PARTNER PORTAL (http://localhost:8080/partner/login)"
puts "   Partner:  partner@example.com"
puts ""
puts " EMAILS (development)"
puts "   http://localhost:3000/letter_opener"
puts ""
puts " NOTE: Add to /etc/hosts for subdomain tenant resolution:"
puts "   127.0.0.1  demo.app.local acme.app.local"
puts ""
