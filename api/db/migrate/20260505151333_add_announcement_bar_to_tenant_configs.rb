class AddAnnouncementBarToTenantConfigs < ActiveRecord::Migration[7.2]
  def change
    add_column :tenant_configs, :announcement_bar_text, :string
  end
end
