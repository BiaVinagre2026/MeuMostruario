# frozen_string_literal: true
# rails runner script/seed_more_products.rb
#
# Adiciona 8 novos produtos + fotos extras nos existentes.
# Idempotente: usa find_or_create_by! nos produtos e verifica imagens.

def unsplash_json(photo_id)
  base = "https://images.unsplash.com/photo-#{photo_id}"
  { thumb:   "#{base}?w=200&q=60&fit=crop&auto=format",
    small:   "#{base}?w=400&q=70&fit=crop&auto=format",
    regular: "#{base}?w=800&q=80&fit=crop&auto=format",
    full:    "#{base}?w=1600&q=90&auto=format" }.to_json
end

def insert_image(conn, product_id, photo_id, idx, alt)
  urls_json = { thumb:   "https://images.unsplash.com/photo-#{photo_id}?w=200&q=60&fit=crop&auto=format",
                small:   "https://images.unsplash.com/photo-#{photo_id}?w=400&q=70&fit=crop&auto=format",
                regular: "https://images.unsplash.com/photo-#{photo_id}?w=800&q=80&fit=crop&auto=format",
                full:    "https://images.unsplash.com/photo-#{photo_id}?w=1600&q=90&auto=format" }.to_json
  escaped = conn.quote_string(urls_json)
  conn.execute(<<~SQL)
    INSERT INTO product_images (product_id, urls, is_cover, alt_text, position, created_at)
    VALUES (#{product_id}, '#{escaped}'::jsonb, #{idx == 0}, '#{conn.quote_string(alt)}', #{idx + 1}, NOW())
  SQL
end

conn  = ActiveRecord::Base.connection
demo  = Tenant.find_by!(slug: "demo")
TenantSwitcher.switch!(demo.schema_name)

# ── Refs ──────────────────────────────────────────────────────────────────────
essencial = Collection.find_by!(slug: "essencial")
destaque  = Collection.find_by!(slug: "destaque")
movimento = Collection.find_by!(slug: "movimento")

conjuntos  = Category.find_by!(slug: "conjuntos")
tops       = Category.find_by!(slug: "tops")
calcas     = Category.find_by!(slug: "calcas")
vestidos   = Category.find_by!(slug: "vestidos")
fitness    = Category.find_by!(slug: "fitness")
acessorios = Category.find_by!(slug: "acessorios")

# ── Novos produtos ─────────────────────────────────────────────────────────────
new_products = [
  { sku: "DES-061", name: "Vestido Slip Dress Joana",
    collection: destaque, category: vestidos,
    price_w: 188, price_r: 369, position: 16,
    description: "Slip dress em cetim lavado com alças finas e bojo embutido. Comprimento midi, caimento fluido ideal para festas e jantares.",
    fabric: "100% Poliéster cetinado",
    tags: ["Slip dress", "Cetim", "Bojo embutido", "Midi"],
    photos: %w[1517841905240-472988babdf9 1531746020798-e6953c6e8e04],
    variants: [
      { color: "Champagne", color_hex: "#D4B896", sizes: %w[PP P M G] },
      { color: "Preto",     color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Bordô",     color_hex: "#6B1E2E", sizes: %w[PP P M G] },
    ] },

  { sku: "ESS-031", name: "Cardigan Oversized Luna",
    collection: essencial, category: tops,
    price_w: 138, price_r: 269, position: 17,
    description: "Cardigan oversized em tricô com textura canelada e botões de madeira. Versátil para usar aberto como sobreposição ou fechado como blusa.",
    fabric: "60% Algodão / 40% Acrílico",
    tags: ["Cardigan", "Tricô", "Oversized", "Sobreposição"],
    photos: %w[1508214751196-bcfd4ca60f91 1485518994863-ab5c71dc49c5],
    variants: [
      { color: "Off-white",    color_hex: "#F5F0E8", sizes: %w[P M G GG] },
      { color: "Caramelo",     color_hex: "#C68B4A", sizes: %w[P M G] },
      { color: "Cinza Mescla", color_hex: "#A8A8A4", sizes: %w[P M G GG] },
    ] },

  { sku: "DES-062", name: "Saia Midi Plissada Eva",
    collection: destaque, category: calcas,
    price_w: 142, price_r: 279, position: 18,
    description: "Saia midi plissada com cós elástico embutido e forro interno. Tecido fluido que acompanha o movimento, perfeita para o dia ou a noite.",
    fabric: "100% Poliéster plissado",
    tags: ["Saia midi", "Plissada", "Cós elástico", "Forro"],
    photos: %w[1529139574466-a303027386e4 1524504388-a227e82a7688],
    variants: [
      { color: "Preto",   color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Dourado", color_hex: "#C5A028", sizes: %w[PP P M G] },
      { color: "Verde",   color_hex: "#3D6B4F", sizes: %w[PP P M G] },
    ] },

  { sku: "ESS-041", name: "Macaquinho Linho Duda",
    collection: essencial, category: conjuntos,
    price_w: 168, price_r: 329, position: 19,
    description: "Macaquinho de linho com manga longa, decote V profundo e faixa de amarração na cintura. Modelagem ampla e sofisticada.",
    fabric: "100% Linho",
    tags: ["Macaquinho", "Linho", "Manga longa", "Decote V"],
    photos: %w[1494790108377-be9c29b29330 1483985988355-763728e1935b],
    variants: [
      { color: "Cru",      color_hex: "#EDE0CC", sizes: %w[P M G] },
      { color: "Terracota", color_hex: "#B05E3A", sizes: %w[P M G GG] },
    ] },

  { sku: "MOV-051", name: "Conjunto Esportivo Gabi",
    collection: movimento, category: fitness,
    price_w: 198, price_r: 389, position: 20,
    description: "Conjunto top cropped + legging de cintura alta em tecido sculpt. Costuras reforçadas, tecnologia anti-transpirante e toque ultra-macio.",
    fabric: "82% Poliamida / 18% Elastano",
    tags: ["Conjunto fitness", "Cropped", "Cintura alta", "Anti-transpirante"],
    photos: %w[1506629082955-511b1aa562c8 1541534741688-6078c7bfe7b0],
    variants: [
      { color: "Preto",      color_hex: "#1C1C1C", sizes: %w[PP P M G GG] },
      { color: "Verde Sage", color_hex: "#7A9E7E", sizes: %w[PP P M G] },
      { color: "Lilás",      color_hex: "#9B89B4", sizes: %w[PP P M G] },
    ] },

  { sku: "DES-063", name: "Sandália Salto Bloco Lia",
    collection: destaque, category: acessorios,
    price_w: 148, price_r: 289, position: 21,
    description: "Sandália com salto bloco de 7cm em material vegano. Tiras cruzadas ajustáveis e palmilha anatômica acolchoada.",
    fabric: "Material vegano / Salto 7cm",
    tags: ["Sandália", "Salto bloco", "Vegano", "Tiras"],
    photos: %w[1543163521-1bf539c55dd2 1515562141207-7a88fb7ce338],
    variants: [
      { color: "Preto",    color_hex: "#1C1C1C", sizes: %w[Único] },
      { color: "Caramelo", color_hex: "#C68B4A", sizes: %w[Único] },
      { color: "Nude",     color_hex: "#D4A98A", sizes: %w[Único] },
    ] },

  { sku: "DES-064", name: "Colar Elos Dourado Mila",
    collection: destaque, category: acessorios,
    price_w: 78, price_r: 149, position: 22,
    description: "Colar de elos grossos banhado a ouro 18k. Comprimento 45cm com extensor de 5cm. Peça de impacto para elevar qualquer look.",
    fabric: "Latão banhado a ouro 18k",
    tags: ["Colar", "Dourado", "Elos", "Banhado ouro"],
    photos: %w[1515562141207-7a88fb7ce338 1548036161-cb9e8f28f6f4],
    variants: [
      { color: "Dourado", color_hex: "#C5A028", sizes: %w[Único] },
    ] },

  { sku: "ESS-051", name: "Calça Wide Leg Jeans Nat",
    collection: essencial, category: calcas,
    price_w: 178, price_r: 349, position: 23,
    description: "Wide leg jeans de cintura alta com lavagem clara. Corte reto e amplo que alonga a silhueta, cós embutido com elastano no quadril.",
    fabric: "98% Algodão / 2% Elastano",
    tags: ["Jeans", "Wide leg", "Cintura alta", "Lavagem clara"],
    photos: %w[1469334031218-e382a71b716b 1520813792240-56fc4a3765a7],
    variants: [
      { color: "Azul Claro", color_hex: "#6B8FA8", sizes: %w[PP P M G GG] },
      { color: "Azul Médio", color_hex: "#3A5F7A", sizes: %w[PP P M G GG] },
    ] },
]

puts "\n[Novos produtos]"
new_products.each do |pd|
  product = Product.find_or_create_by!(sku: pd[:sku]) do |p|
    p.name               = pd[:name]
    p.collection         = pd[:collection]
    p.category           = pd[:category]
    p.price_wholesale    = pd[:price_w]
    p.price_retail       = pd[:price_r]
    p.currency           = "BRL"
    p.status             = "published"
    p.position           = pd[:position]
    p.description        = pd[:description]
    p.fabric_composition = pd[:fabric]
    p.tags               = pd[:tags]
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

  img_count = conn.execute("SELECT COUNT(*) FROM product_images WHERE product_id = #{product.id}").first["count"].to_i
  if img_count == 0
    pd[:photos].each_with_index do |photo_id, idx|
      insert_image(conn, product.id, photo_id, idx, "#{pd[:name]} — imagem #{idx + 1}")
    end
    puts "  [ADD] #{product.sku} — #{product.name} (#{pd[:photos].size} fotos)"
  else
    puts "  [OK]  #{product.sku} — #{product.name} (já tem #{img_count} foto(s))"
  end
end

# ── Adiciona 3ª foto nos produtos existentes que têm < 3 fotos ─────────────────
EXTRA_PHOTOS = {
  "ESS-001" => "1529139574466-a303027386e4",
  "ESS-002" => "1524504388-a227e82a7688",
  "ESS-011" => "1494790108377-be9c29b29330",
  "ESS-012" => "1508214751196-bcfd4ca60f91",
  "ESS-021" => "1520813792240-56fc4a3765a7",
  "ESS-022" => "1485518994863-ab5c71dc49c5",
  "DES-031" => "1531746020798-e6953c6e8e04",
  "DES-032" => "1517841905240-472988babdf9",
  "MOV-041" => "1506629082955-511b1aa562c8",
  "MOV-042" => "1541534741688-6078c7bfe7b0",
}

puts "\n[Fotos extras nos produtos existentes]"
EXTRA_PHOTOS.each do |sku, photo_id|
  row = conn.execute("SELECT id, name FROM products WHERE sku = '#{sku}' LIMIT 1").first
  next unless row

  img_count = conn.execute("SELECT COUNT(*) FROM product_images WHERE product_id = #{row["id"]}").first["count"].to_i
  next if img_count >= 3

  insert_image(conn, row["id"], photo_id, img_count, "#{row["name"]} — imagem #{img_count + 1}")
  puts "  [ADD] #{sku} — foto #{img_count + 1}"
end

TenantSwitcher.reset!
puts "\nPronto!"
