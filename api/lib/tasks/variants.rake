# frozen_string_literal: true

namespace :variants do
  desc "Gera imagens de cor por IA para um produto. Ex: bin/rails variants:generate_colors[conjunto-linho-marta]"
  task :generate_colors, [:slug] => :environment do |_, args|
    slug = args[:slug]
    abort "Informe o slug do produto: bin/rails variants:generate_colors[slug]" if slug.blank?

    product = Product.find_by(slug: slug)
    abort "Produto não encontrado: #{slug}" unless product

    puts "Gerando variantes de cor para: #{product.name}"
    ColorVariantGeneratorService.new(product).call
    puts "Concluído."
  end

  desc "Gera imagens de cor para todos os produtos publicados (usa REPLICATE_API_KEY)"
  task generate_all_colors: :environment do
    Product.published.find_each do |product|
      puts "→ #{product.name}"
      ColorVariantGeneratorService.new(product).call
    rescue => e
      puts "  ERRO: #{e.message}"
    end
  end
end
