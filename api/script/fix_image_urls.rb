# frozen_string_literal: true
# rails runner script/fix_image_urls.rb
#
# Updates product_images.urls with correct Unsplash URLs.
# Uses raw SQL to guarantee JSONB is written correctly.

PHOTOS = {
  "ESS-001" => %w[1515886657613-9f3515b0c78f 1539109861962-2a3e7f56f84d],
  "ESS-002" => %w[1544005313-94ddf0286df2 1469334031925-33d463b1be5e],
  "ESS-011" => %w[1558618666-fcd25c85cd64 1483985988355-763728e1935b],
  "ESS-012" => %w[1509631179647-0177331693ae 1434389677669-e08b4cac3105],
  "ESS-021" => %w[1594938298870-0be01fc5a8c6 1485230895905-ec40ba36b9bc],
  "ESS-022" => %w[1536766820879-059fec98ec0a 1544005313-94ddf0286df2],
  "DES-031" => %w[1572804013427-4d7ca7268217 1515886657613-9f3515b0c78f],
  "DES-032" => %w[1558618666-fcd25c85cd64 1469334031925-33d463b1be5e],
  "MOV-041" => %w[1571019613454-1cb2f99b2d8b 1518310383802-640c2de311b2],
  "MOV-042" => %w[1594737625785-a6cbdabd333c 1571019613454-1cb2f99b2d8b],
  "MOV-043" => %w[1518310383802-640c2de311b2 1594737625785-a6cbdabd333c],
  "MOV-044" => %w[1539109861962-2a3e7f56f84d 1515886657613-9f3515b0c78f],
  "DES-051" => %w[1590736969955-71cc94901144 1548036328-c9fa89d128fa],
  "DES-052" => %w[1509631179647-0177331693ae 1434389677669-e08b4cac3105],
  "DES-053" => %w[1483985988355-763728e1935b 1544005313-94ddf0286df2],
}

def unsplash_json(photo_id)
  base = "https://images.unsplash.com/photo-#{photo_id}"
  {
    thumb:   "#{base}?w=200&q=60&fit=crop&auto=format",
    small:   "#{base}?w=400&q=70&fit=crop&auto=format",
    regular: "#{base}?w=800&q=80&fit=crop&auto=format",
    full:    "#{base}?w=1600&q=90&auto=format",
  }.to_json
end

conn = ActiveRecord::Base.connection
demo = Tenant.find_by!(slug: "demo")
TenantSwitcher.switch!(demo.schema_name)

updated = 0
skipped = 0

PHOTOS.each do |sku, photo_ids|
  result = conn.execute("SELECT id FROM products WHERE sku = '#{sku}' LIMIT 1")
  if result.ntuples == 0
    puts "  [MISS] #{sku}"
    next
  end
  product_id = result.first["id"]

  images = conn.execute("SELECT id, position FROM product_images WHERE product_id = #{product_id} ORDER BY position")
  if images.ntuples == 0
    # No images at all — insert them
    photo_ids.each_with_index do |photo_id, idx|
      urls_json = unsplash_json(photo_id)
      conn.execute(<<~SQL)
        INSERT INTO product_images (product_id, urls, is_cover, alt_text, position, created_at)
        VALUES (#{product_id}, '#{conn.quote_string(urls_json)}'::jsonb, #{idx == 0}, 'imagem #{idx + 1}', #{idx + 1}, NOW())
      SQL
      puts "  [INS]  #{sku} img #{idx + 1}"
    end
    updated += 1
    next
  end

  images.each_with_index do |img, idx|
    photo_id = photo_ids[idx]
    next unless photo_id

    urls_json = unsplash_json(photo_id)
    conn.execute(<<~SQL)
      UPDATE product_images
      SET urls = '#{conn.quote_string(urls_json)}'::jsonb
      WHERE id = #{img["id"]}
    SQL
    puts "  [UPD]  #{sku} img #{idx + 1} → photo #{photo_id[0..8]}…"
    updated += 1
  end
  skipped += 0
end

TenantSwitcher.reset!
puts "\nDone. #{updated} images updated."
