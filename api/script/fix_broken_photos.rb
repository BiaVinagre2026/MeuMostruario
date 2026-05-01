# frozen_string_literal: true
# rails runner script/fix_broken_photos.rb
#
# Substitui foto IDs quebrados (404) por IDs verificados.

SUBSTITUICOES = {
  "1485518994863-ab5c71dc49c5" => "1536766820879-059fec98ec0a",
  "1529139574466-a303027386e4" => "1572804013427-4d7ca7268217",
  "1524504388-a227e82a7688"    => "1594938298870-0be01fc5a8c6",
  "1515562141207-7a88fb7ce338" => "1548036328-c9fa89d128fa",
}.freeze

def build_urls(photo_id)
  base = "https://images.unsplash.com/photo-#{photo_id}"
  { thumb:   "#{base}?w=200&q=60&fit=crop&auto=format",
    small:   "#{base}?w=400&q=70&fit=crop&auto=format",
    regular: "#{base}?w=800&q=80&fit=crop&auto=format",
    full:    "#{base}?w=1600&q=90&auto=format" }.to_json
end

conn = ActiveRecord::Base.connection
demo = Tenant.find_by!(slug: "demo")
TenantSwitcher.switch!(demo.schema_name)

total = 0

SUBSTITUICOES.each do |id_quebrado, id_novo|
  # Busca imagens que contenham o ID quebrado em qualquer chave do JSONB
  rows = conn.execute(<<~SQL)
    SELECT id FROM product_images
    WHERE urls::text LIKE '%#{id_quebrado}%'
  SQL

  if rows.ntuples == 0
    puts "  [SKIP] #{id_quebrado[0..18]}… — nenhuma imagem encontrada"
    next
  end

  novo_json = build_urls(id_novo)
  escaped   = conn.quote_string(novo_json)

  rows.each do |row|
    conn.execute(<<~SQL)
      UPDATE product_images
      SET urls = '#{escaped}'::jsonb
      WHERE id = #{row["id"]}
    SQL
    puts "  [FIX]  imagem ##{row["id"]} — #{id_quebrado[0..18]}… → #{id_novo[0..18]}…"
    total += 1
  end
end

TenantSwitcher.reset!
puts "\nPronto! #{total} imagem(ns) corrigida(s)."
