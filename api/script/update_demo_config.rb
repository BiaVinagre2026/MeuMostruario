TenantSwitcher.switch!("tenant_demo")

[
  ["essencial", "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80&fit=crop&auto=format"],
  ["movimento", "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=800&q=80&fit=crop&auto=format"],
  ["destaque",  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80&fit=crop&auto=format"]
].each do |slug, url|
  c = Collection.find_by(slug: slug)
  if c
    c.update_column(:cover_url, url)
    puts "  #{slug}: updated"
  else
    puts "  #{slug}: not found"
  end
end

TenantSwitcher.reset!

tc = TenantConfig.joins(:tenant).where("tenants.slug = 'demo'").first
if tc
  tc.update_columns(
    company_email:   "bvinagre@yahoo.com",
    company_phone:   "+55 21 98153-8334",
    social_whatsapp: "https://wa.me/5521981538334"
  )
  puts "TenantConfig: updated"
else
  puts "TenantConfig: not found"
end
