class TenantProvisioner
  def self.provision!(tenant)
    raise ArgumentError, "Tenant must be persisted" unless tenant.persisted?

    schema_name = tenant.schema_name

    ActiveRecord::Base.transaction do
      ActiveRecord::Base.connection.execute(
        "CREATE SCHEMA IF NOT EXISTS #{ActiveRecord::Base.connection.quote_column_name(schema_name)}"
      )

      TenantSwitcher.switch!(schema_name)

      ActiveRecord::Base.connection.execute(TenantSchemaSql.tables_sql)

      Rails.logger.info("Provisioned tenant schema: #{schema_name}")
    end

    TenantSwitcher.reset!
  end
end
