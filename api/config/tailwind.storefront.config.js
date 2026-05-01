/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/views/layouts/storefront.html.erb",
    "./app/views/public/**/*.html.erb",
    "./app/helpers/storefront_helper.rb",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
