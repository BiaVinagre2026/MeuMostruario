# frozen_string_literal: true
# rails runner script/add_colors_and_grades.rb
#
# Adiciona 10 cores + grade completa em todos os produtos do tenant demo.
# Idempotente: pula variantes que já existem.

CORES = [
  { color: "Preto",        color_hex: "#1C1C1C" },
  { color: "Off-white",    color_hex: "#F5F0E8" },
  { color: "Bege",         color_hex: "#C9B99A" },
  { color: "Caramelo",     color_hex: "#C68B4A" },
  { color: "Terracota",    color_hex: "#B05E3A" },
  { color: "Bordô",        color_hex: "#6B1E2E" },
  { color: "Verde Sage",   color_hex: "#7A9E7E" },
  { color: "Azul Marinho", color_hex: "#1A2744" },
  { color: "Cinza Mescla", color_hex: "#A8A8A4" },
  { color: "Rosa Antigo",  color_hex: "#C9908A" },
].freeze

GRADE_ROUPAS     = %w[PP P M G GG].freeze
GRADE_ACESSORIOS = %w[Único].freeze
CATEGORIAS_ACESSORIO = %w[acessorios].freeze

demo = Tenant.find_by!(slug: "demo")
TenantSwitcher.switch!(demo.schema_name)

products = Product.includes(:category, :variants).all
puts "\n[Adicionando cores e grade — #{products.count} produtos]\n\n"

products.each do |product|
  cat_slug = product.category&.slug.to_s
  grade    = CATEGORIAS_ACESSORIO.include?(cat_slug) ? GRADE_ACESSORIOS : GRADE_ROUPAS

  added   = 0
  skipped = 0

  CORES.each_with_index do |cor, ci|
    grade.each_with_index do |size, si|
      variant = ProductVariant.find_or_initialize_by(
        product: product,
        color:   cor[:color],
        size:    size
      )

      if variant.new_record?
        variant.color_hex = cor[:color_hex]
        variant.stock_qty = rand(20..80)
        variant.position  = ci * 10 + si
        variant.save!
        added += 1
      else
        skipped += 1
      end
    end
  end

  puts "  #{product.sku.to_s.ljust(10)} #{product.name.ljust(35)} +#{added} novas  #{skipped} já existiam"
end

TenantSwitcher.reset!
puts "\nPronto! Cada produto agora tem #{CORES.size} cores × grade #{GRADE_ROUPAS.join("/")} (ou Único para acessórios)."
