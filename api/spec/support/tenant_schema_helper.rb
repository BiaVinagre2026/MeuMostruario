# frozen_string_literal: true

module TenantSchemaHelper
  def with_tenant_schemas(*schema_names)
    schema_names.each { |schema| recreate_tenant_schema(schema) }

    yield
  ensure
    TenantSwitcher.reset!
    schema_names.each { |schema| drop_tenant_schema(schema) }
  end

  def recreate_tenant_schema(schema_name)
    drop_tenant_schema(schema_name)
    TenantSchemaSql.ensure_pg_trgm!(connection)
    connection.execute(%(CREATE SCHEMA #{connection.quote_table_name(schema_name)}))
    connection.execute(%(SET search_path TO #{connection.quote_table_name(schema_name)}, public))
    connection.execute(TenantSchemaSql.tables_sql)
    TenantSwitcher.reset!
  end

  def drop_tenant_schema(schema_name)
    TenantSwitcher.reset!
    connection.execute(%(DROP SCHEMA IF EXISTS #{connection.quote_table_name(schema_name)} CASCADE))
  end

  def connection
    ActiveRecord::Base.connection
  end
end

RSpec.configure do |config|
  config.include TenantSchemaHelper
end
