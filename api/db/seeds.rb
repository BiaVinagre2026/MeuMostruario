# frozen_string_literal: true

# ===========================================================================
# Seeds for multitenant-whitelabel-base
#
# Usage:
#   rails db:create db:schema:load db:seed
#
# This creates:
#   1. Super admin operator (global, can manage all tenants)
#   2. Two demo tenants with full branding config
#   3. Tenant-scoped admin operators (one per tenant)
#   4. Demo members inside each tenant schema
#   5. A demo partner
# ===========================================================================

puts "=" * 60
puts " Seeding multitenant-whitelabel-base"
puts "=" * 60

# ---------------------------------------------------------------------------
# 1. Super Admin (global, no tenant)
# ---------------------------------------------------------------------------
super_admin = Operator.find_or_create_by!(email: "super@admin.com") do |op|
  op.name = "Super Admin"
  op.password = "password123"
  op.role = "super_admin"
  op.status = "active"
end
puts "\n[Operators]"
puts "  Super admin: #{super_admin.email} / password123 (role: super_admin)"

# ---------------------------------------------------------------------------
# 2. Tenants
# ---------------------------------------------------------------------------
puts "\n[Tenants]"

tenants_data = [
  {
    slug: "demo",
    name: "Demo Company",
    plan: "growth",
    config: {
      color_primary: "#1E40AF",
      color_secondary: "#F97316",
      color_accent: "#10B981",
      color_header_bg: "#FFFFFF",
      color_header_text: "#64748B",
      color_header_text_hover: "#1E40AF",
      color_footer_text: "#94A3B8",
      color_footer_text_hover: "#0F172A",
      font_primary: "Inter",
      font_heading: "Inter",
      coin_name: "Coins",
      coin_symbol: "C",
      company_name: "Demo Company Ltda",
      company_email: "hello@demo.com",
      company_phone: "(11) 99999-0000",
      footer_text: "Demo Company - Template Base",
      email_provider: "letter_opener",
      favicon_mode: "auto",
      overdue_days: 30,
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
    admin: { email: "admin@demo.com", name: "Demo Admin" },
    members: [
      { cpf: "52998224725", full_name: "Alice Silva", email: "alice@demo.com" },
      { cpf: "11144477735", full_name: "Bob Santos", email: "bob@demo.com" },
      { cpf: "98765432100", full_name: "Carol Oliveira", email: "carol@demo.com" },
    ],
  },
  {
    slug: "acme",
    name: "Acme Corp",
    plan: "enterprise",
    config: {
      color_primary: "#7C3AED",
      color_secondary: "#EC4899",
      color_accent: "#F59E0B",
      color_header_bg: "#1E1B4B",
      color_header_text: "#E0E7FF",
      color_header_text_hover: "#FFFFFF",
      color_footer_text: "#A5B4FC",
      color_footer_text_hover: "#FFFFFF",
      font_primary: "Poppins",
      font_heading: "Space Grotesk",
      coin_name: "Points",
      coin_symbol: "P",
      company_name: "Acme Corporation",
      company_email: "contact@acme.com",
      company_phone: "(21) 3333-4444",
      footer_text: "Acme Corp - Powered by Template Base",
      email_provider: "letter_opener",
      favicon_mode: "auto",
      overdue_days: 15,
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
    admin: { email: "admin@acme.com", name: "Acme Admin" },
    members: [
      { cpf: "71428793020", full_name: "Dave Pereira", email: "dave@acme.com" },
      { cpf: "25312829070", full_name: "Eva Costa", email: "eva@acme.com" },
    ],
  },
]

tenants_data.each do |td|
  # Create tenant
  tenant = Tenant.find_or_create_by!(slug: td[:slug]) do |t|
    t.name = td[:name]
    t.plan = td[:plan]
    t.status = "active"
  end
  puts "  Tenant: #{tenant.name} (slug: #{tenant.slug}, plan: #{tenant.plan})"

  # Create tenant config
  TenantConfig.find_or_create_by!(tenant: tenant) do |config|
    td[:config].each { |key, value| config.send("#{key}=", value) }
  end
  puts "    Config: colors #{td[:config][:color_primary]}/#{td[:config][:color_secondary]}/#{td[:config][:color_accent]}"

  # Provision tenant schema (creates tables inside tenant schema)
  begin
    TenantProvisioner.provision!(tenant)
    puts "    Schema provisioned: #{tenant.schema_name}"
  rescue => e
    puts "    Schema exists or error: #{e.message}"
  end

  # Create tenant-scoped admin operator
  admin = Operator.find_or_create_by!(email: td[:admin][:email]) do |op|
    op.name = td[:admin][:name]
    op.password = "password123"
    op.role = "admin"
    op.tenant = tenant
    op.status = "active"
  end
  puts "    Admin: #{admin.email} / password123"

  # Create demo members inside the tenant schema
  TenantSwitcher.switch!(tenant.schema_name)

  td[:members].each do |md|
    exists = ActiveRecord::Base.connection.execute(
      "SELECT COUNT(*) FROM members WHERE cpf = '#{md[:cpf]}'"
    ).first["count"].to_i > 0

    unless exists
      password_digest = BCrypt::Password.create("password123")
      ActiveRecord::Base.connection.execute(<<~SQL)
        INSERT INTO members (cpf, full_name, email, password_digest, status, plan_status, role, association_date)
        VALUES ('#{md[:cpf]}', '#{md[:full_name]}', '#{md[:email]}', '#{password_digest}', 'active', 'active', 'member', CURRENT_DATE)
      SQL
      puts "    Member: #{md[:full_name]} (CPF: #{md[:cpf]}) / password123"
    end
  end

  TenantSwitcher.reset!
end

# ---------------------------------------------------------------------------
# 3. Partner
# ---------------------------------------------------------------------------
puts "\n[Partners]"

partner = Partner.find_or_create_by!(email: "partner@example.com") do |p|
  p.name = "Demo Partner"
  p.password = "password123"
  p.contact_name = "Partner Contact"
  p.phone = "(11) 98888-7777"
  p.status = "active"
  p.description = "A demo partner for testing the partner portal"
end
puts "  Partner: #{partner.email} / password123 (status: #{partner.status})"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
puts "\n" + "=" * 60
puts " Seeding complete!"
puts "=" * 60

puts "\n Credentials (all passwords: password123)"
puts " ─────────────────────────────────────────"
puts ""
puts " ADMIN PANEL (http://localhost:8080/admin/login)"
puts "   Super admin:  super@admin.com"
puts "   Demo admin:   admin@demo.com     (tenant: demo)"
puts "   Acme admin:   admin@acme.com     (tenant: acme)"
puts ""
puts " MEMBER PORTAL"
puts "   Demo tenant:  http://demo.app.local:8080/login"
puts "     Alice:  CPF 529.982.247-25"
puts "     Bob:    CPF 111.444.777-35"
puts "     Carol:  CPF 987.654.321-00"
puts "   Acme tenant:  http://acme.app.local:8080/login"
puts "     Dave:   CPF 714.287.930-20"
puts "     Eva:    CPF 253.128.290-70"
puts ""
puts " PARTNER PORTAL (http://localhost:8080/partner/login)"
puts "   Partner:  partner@example.com"
puts ""
puts " EMAILS (development)"
puts "   http://localhost:3000/letter_opener"
puts ""
puts " NOTE: Add to /etc/hosts for subdomain tenant resolution:"
puts "   127.0.0.1  demo.app.local acme.app.local"
puts ""
