class TenantSwitcher
  class TenantNotFound < StandardError; end

  def self.switch(tenant)
    raise TenantNotFound, "Tenant is nil" unless tenant
    raise TenantNotFound, "Tenant is not active" unless tenant.active?

    previous_path = current_search_path

    begin
      set_search_path(tenant.schema_name)
      yield
    ensure
      restore_search_path(previous_path)
    end
  end

  def self.switch!(schema_name)
    set_search_path(schema_name)
  end

  def self.reset!
    ActiveRecord::Base.connection.execute("SET search_path TO public")
  end

  def self.current_schema
    result = ActiveRecord::Base.connection.execute("SHOW search_path").first
    result["search_path"]
  end

  private

  def self.set_search_path(schema_name)
    ActiveRecord::Base.connection.execute(
      "SET search_path TO #{ActiveRecord::Base.connection.quote_column_name(schema_name)}, public"
    )
  end

  def self.current_search_path
    ActiveRecord::Base.connection.execute("SHOW search_path").first["search_path"]
  end

  def self.restore_search_path(path)
    conn = ActiveRecord::Base.connection
    safe_path = path.split(",").map { |s| conn.quote_column_name(s.strip) }.join(", ")
    conn.execute("SET search_path TO #{safe_path}")
  rescue StandardError => e
    Rails.logger.error("Failed to restore search_path: #{e.message}")
  end
end
