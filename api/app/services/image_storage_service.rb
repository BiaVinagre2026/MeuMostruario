# frozen_string_literal: true

class ImageStorageService
  ALLOWED_TYPES = %w[image/jpeg image/png image/webp image/gif image/svg+xml].freeze
  MAX_SIZE      = 10.megabytes

  def self.store(uploaded_file, tenant_slug, tenant_config)
    validate!(uploaded_file)
    ext      = File.extname(uploaded_file.original_filename.to_s).downcase
    ext      = ".bin" if ext.blank?
    filename = "#{SecureRandom.uuid}#{ext}"

    if tenant_config.s3_configured?
      store_s3(uploaded_file, filename, tenant_config)
    else
      store_local(uploaded_file, filename, tenant_slug)
    end
  end

  private

  def self.validate!(file)
    raise "File type not allowed" unless ALLOWED_TYPES.include?(file.content_type)
    raise "File too large (max 10 MB)" if file.size > MAX_SIZE
  end

  def self.store_local(file, filename, tenant_slug)
    dir  = Rails.root.join("public", "uploads", tenant_slug.to_s)
    FileUtils.mkdir_p(dir)
    dest = dir.join(filename)
    FileUtils.cp(file.tempfile.path, dest)
    "/uploads/#{tenant_slug}/#{filename}"
  end

  def self.store_s3(file, filename, tc)
    require "aws-sdk-s3"
    key = "uploads/#{filename}"
    s3  = Aws::S3::Client.new(
      region:            tc.s3_region.presence || "us-east-1",
      access_key_id:     tc.s3_access_key_id,
      secret_access_key: tc.s3_secret_access_key_enc
    )
    s3.put_object(
      bucket:       tc.s3_bucket,
      key:          key,
      body:         file.tempfile,
      content_type: file.content_type,
      acl:          "public-read"
    )
    "#{tc.s3_base_url}/#{key}"
  end
end
