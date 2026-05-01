# frozen_string_literal: true
# rails runner script/fix_product_images.rb
#
# Adds Unsplash cover images to any demo-tenant products that are missing them.
# Safe to re-run: skips products that already have images.

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

def unsplash_urls(photo_id)
  base = "https://images.unsplash.com/photo-#{photo_id}"
  {
    "thumb"   => "#{base}?w=200&q=60&fit=crop&auto=format",
    "small"   => "#{base}?w=400&q=70&fit=crop&auto=format",
    "regular" => "#{base}?w=800&q=80&fit=crop&auto=format",
    "full"    => "#{base}?w=1600&q=90&auto=format",
  }
end

demo = Tenant.find_by!(slug: "demo")
TenantSwitcher.switch!(demo.schema_name)

added = 0
skipped = 0

PHOTOS.each do |sku, photo_ids|
  product = Product.find_by(sku: sku)
  unless product
    puts "  [MISS] #{sku} — product not found"
    next
  end

  if product.images.any?
    skipped += 1
    puts "  [SKIP] #{sku} — #{product.images.count} image(s) already present"
    next
  end

  photo_ids.each_with_index do |photo_id, idx|
    product.images.create!(
      urls:     unsplash_urls(photo_id),
      is_cover: idx == 0,
      alt_text: "#{product.name} — imagem #{idx + 1}",
      position: idx + 1,
    )
  end
  added += 1
  puts "  [ADD]  #{sku} — #{product.name} (#{photo_ids.size} images)"
end

TenantSwitcher.reset!

puts "\nDone. #{added} products updated, #{skipped} skipped."
