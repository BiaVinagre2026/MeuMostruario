# frozen_string_literal: true

require "spec_helper"

# Atribuicao incondicional, e nao `||=`.
#
# O container exporta RAILS_ENV=development (docker-compose.yml), entao o `||=`
# nunca atribuia nada e a suite inteira rodava contra app_development — o banco
# de trabalho, com os tenants reais dentro. Isso produzia sintomas que pareciam
# outra coisa: "Slug ja esta em uso" (o tenant mare-coral existe de verdade
# la), specs que passavam isoladas e falhavam na suite, e resultados que mudavam
# conforme a ordem. Medido: 13 falhas em development, 0 em test.
#
# Um teste tambem podia apagar dados de trabalho, e so nao apagou por sorte.
ENV["RAILS_ENV"] = "test"
require_relative "../config/environment"

abort("The Rails environment is running in production mode!") if Rails.env.production?

# Segunda tranca: o nome do banco conectado precisa terminar em `_test`.
#
# A linha do RAILS_ENV resolve o caso conhecido, mas nao todos: com
# DATABASE_URL definida, o Rails a mescla na configuracao de teste, e a suite
# roda no banco apontado por ela sem nada reclamar. Comparar o banco conectado
# com o "banco de teste configurado" nao pega isso — os dois viram o mesmo
# valor errado. Medido: a suite rodou inteira em app_development com essa
# comparacao no lugar.
#
# Por isso a regra e sobre o nome, e nao sobre a configuracao: nenhum caminho
# de configuracao consegue fazer app_development terminar em `_test`.
banco_conectado = ActiveRecord::Base.connection_db_config.database.to_s

unless banco_conectado.end_with?("_test")
  abort(<<~ERRO)

    A suite esta conectada no banco '#{banco_conectado}', que nao e um banco de teste.
    Rodar assim contamina dados de trabalho e faz specs falharem por colisao com
    dados reais — foi o que escondeu "Slug ja esta em uso" por dias.
    Confira RAILS_ENV, DATABASE_URL e config/database.yml.

  ERRO
end

require "rspec/rails"

Dir[Rails.root.join("spec/support/**/*.rb")].each { |f| require f }

RSpec.configure do |config|
  config.fixture_paths = [Rails.root.join("spec/fixtures")]
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  config.include FactoryBot::Syntax::Methods
end

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
