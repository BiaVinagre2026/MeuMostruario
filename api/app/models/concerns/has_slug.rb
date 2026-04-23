# frozen_string_literal: true

module HasSlug
  extend ActiveSupport::Concern

  included do
    before_validation :generate_slug, if: -> { slug.blank? }
    validates :slug, presence: true,
                     uniqueness: true,
                     format: { with: /\A[a-z0-9\-]+\z/ }
  end

  private

  def generate_slug
    base = slugify(slug_source)
    candidate = base
    suffix = 1
    while self.class.where(slug: candidate).where.not(id: id).exists?
      candidate = "#{base}-#{suffix}"
      suffix += 1
    end
    self.slug = candidate
  end

  def slugify(str)
    str.to_s
       .unicode_normalize(:nfd)
       .encode("ASCII", invalid: :replace, undef: :replace, replace: "")
       .downcase
       .gsub(/[^a-z0-9\s\-]/, "")
       .gsub(/\s+/, "-")
       .gsub(/-+/, "-")
       .strip
       .first(100)
  end
end
