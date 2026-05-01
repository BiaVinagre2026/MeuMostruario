# frozen_string_literal: true

module StorefrontHelper
  def brand_css_vars
    cfg = tenant_config
    return "" unless cfg

    primary   = cfg.color_primary    || "#000000"
    secondary = cfg.color_secondary  || "#444444"
    accent    = cfg.color_accent     || "#000000"
    fp        = cfg.font_primary     || "Inter"
    fh        = cfg.font_heading     || "Inter"

    {
      "--brand-primary"    => primary,
      "--brand-secondary"  => secondary,
      "--brand-accent"     => accent,
      "--brand-bg"         => "#ffffff",
      "--brand-foreground" => "#0a0a0a",
      "--brand-muted"      => "#888888",
      "--brand-border"     => "#e5e5e5",
      "--brand-surface"    => "#f7f7f7",
      "--font-primary"     => "'#{fp}', system-ui, sans-serif",
      "--font-heading"     => "'#{fh}', system-ui, sans-serif",
      "--font-mono"        => "'IBM Plex Mono', ui-monospace, monospace",
    }.map { |k, v| "#{k}:#{v}" }.join(";")
  end

  def google_fonts_url
    cfg = tenant_config
    fonts = []
    if cfg
      fonts << cfg.font_primary if cfg.font_primary.present?
      fonts << cfg.font_heading  if cfg.font_heading.present? && cfg.font_heading != cfg.font_primary
    end
    fonts << "IBM Plex Mono"
    families = fonts.uniq
                    .map { |f| "family=#{f.gsub(' ', '+')}:wght@300;400;500;600" }
                    .join("&")
    "https://fonts.googleapis.com/css2?#{families}&display=swap"
  end

  def cover_url(product, size: "regular")
    img = product.cover_image
    return nil unless img&.urls.present?
    img.urls[size.to_s] || img.urls["regular"] || img.urls.values.first
  end

  def format_brl(amount)
    return "—" if amount.nil?
    "R$ #{"%.2f" % amount}".gsub(".", ",")
  end

  def whatsapp_url(product)
    base_msg = product.whatsapp_message.presence ||
               "Olá! Tenho interesse no produto *#{product.name}*" \
               "#{product.sku ? " (SKU: #{product.sku})" : ""}"
    "https://wa.me/?text=#{CGI.escape(base_msg)}"
  end

  def product_colors(product)
    product.variants.map { |v| { name: v.color, hex: v.color_hex } }
                    .uniq { |c| c[:name] }
                    .reject { |c| c[:name].blank? }
  end

  def product_colors_with_images(product)
    product.variants
           .sort_by(&:position)
           .group_by(&:color)
           .filter_map do |color_name, variants|
             next if color_name.blank?
             v = variants.first
             { name: color_name, hex: v.color_hex, imageUrl: v.image_url.presence }
           end
  end

  def product_sizes(product)
    product.variants.map(&:size).uniq.compact
  end

  def json_ld_product(product)
    schema = {
      "@context"    => "https://schema.org",
      "@type"       => "Product",
      "name"        => product.name,
      "description" => product.description.to_s,
      "sku"         => product.sku,
    }
    if (img_url = cover_url(product))
      schema["image"] = img_url
    end
    if current_tenant
      schema["brand"] = { "@type" => "Brand", "name" => current_tenant.name }
    end
    if product.price_retail.present?
      schema["offers"] = {
        "@type"         => "Offer",
        "priceCurrency" => product.currency || "BRL",
        "price"         => product.price_retail.to_s,
        "availability"  => "https://schema.org/InStock",
      }
    end
    tag.script(schema.to_json.html_safe, type: "application/ld+json")
  end
end
