# frozen_string_literal: true

namespace :storefront do
  desc "Compile storefront Tailwind CSS → public/assets/storefront.css"
  task :css do
    require "tailwindcss/ruby"
    binary = Tailwindcss::Ruby.executable
    sh binary,
       "-i", "app/assets/stylesheets/storefront.css",
       "-c", "config/tailwind.storefront.config.js",
       "-o", "public/assets/storefront.css",
       "--minify"
  end

  desc "Watch storefront Tailwind CSS (desenvolvimento)"
  task :watch do
    require "tailwindcss/ruby"
    binary = Tailwindcss::Ruby.executable
    sh binary,
       "-i", "app/assets/stylesheets/storefront.css",
       "-c", "config/tailwind.storefront.config.js",
       "-o", "public/assets/storefront.css",
       "--watch"
  end
end
