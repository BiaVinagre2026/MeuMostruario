# frozen_string_literal: true

namespace :catalog do
  desc "Repara produtos cujo nome e SKU foram sobrescritos por importacao antiga (ex.: nome 'branco', SKU '1')"
  task repair_legacy_products: :environment do
    slug = ENV["TENANT"]
    tenants = slug.present? ? Tenant.where(slug: slug) : Tenant.all
    abort("Nenhum tenant encontrado#{" para #{slug}" if slug.present?}") if tenants.empty?

    tenants.each do |tenant|
      TenantSwitcher.switch(tenant) do
        reparados = 0

        # O sintoma e SKU puramente numerico: a importacao gravou o indice da
        # linha no lugar do codigo, e a cor no lugar do nome. O slug escapou e e
        # a unica pista confiavel do nome original.
        Product.where("sku ~ ?", "^[0-9]+$").find_each do |product|
          nome = humanize_slug(product.slug)
          next if nome.blank?

          product.update!(
            name: nome,
            sku: "LEG-#{format('%04d', product.id)}"
          )
          reparados += 1
        end

        puts "#{tenant.slug}: #{reparados} produto(s) reparado(s)"
      end
    rescue => e
      warn "#{tenant.slug}: #{e.message}"
    end
  end

  def humanize_slug(slug)
    return nil if slug.blank?

    palavras = slug.to_s.split("-").reject(&:blank?)
    # Um slug de uma palavra so costuma ser a propria cor ("branco"), que e
    # justamente o dado errado — nesse caso nao ha nome a recuperar.
    return nil if palavras.size < 2
    # E um slug so de numeros ("3-1") nao tem nome nenhum a recuperar.
    return nil unless palavras.any? { |palavra| palavra.match?(/[a-z]{3,}/i) }

    palavras.map(&:capitalize).join(" ")
  end
end
