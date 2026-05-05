TenantSwitcher.switch!("tenant_demo")

# 1. Para cada coleção, pegar a primeira imagem uploaded de um produto da coleção
Collection.all.each do |col|
  products = Product.where(collection: col).order(:position)

  cover = nil
  products.each do |p|
    img = ProductImage
            .where(product_id: p.id)
            .order(:position)
            .find { |i| i.urls.is_a?(Hash) && i.urls.values.any? { |u| u.to_s.include?("/uploads/") } }
    if img
      cover = img.urls["regular"] || img.urls["small"] || img.urls["thumb"] || img.urls.values.compact.first
      break
    end
  end

  if cover
    col.update_column(:cover_url, cover)
    puts "  #{col.slug}: cover → #{cover}"
  else
    puts "  #{col.slug}: nenhuma foto uploaded encontrada"
  end
end

# 2. Remover todas as product_images com URLs do Unsplash
unsplash_imgs = ProductImage.all.select do |i|
  i.urls.is_a?(Hash) && i.urls.values.any? { |u| u.to_s.include?("unsplash.com") }
end

if unsplash_imgs.any?
  ids = unsplash_imgs.map(&:id)
  ProductImage.where(id: ids).delete_all
  puts "\n  #{ids.size} imagens Unsplash removidas do banco"
else
  puts "\n  Nenhuma imagem Unsplash encontrada no banco"
end

# 3. Limpar cover_url de coleções que ainda apontem para Unsplash
Collection.where("cover_url LIKE '%unsplash.com%'").update_all(cover_url: nil)
puts "  cover_url Unsplash das coleções removidos"

# 4. Limpar image_url de variantes que apontem para Unsplash
count = ProductVariant.where("image_url LIKE '%unsplash.com%'").update_all(image_url: nil)
puts "  #{count} image_url Unsplash de variantes removidos"

TenantSwitcher.reset!
puts "\nConcluído."
