# frozen_string_literal: true

# O Redis do Sidekiq e um servico externo, com persistencia propria.
#
# Antes ele subia dentro do container da aplicacao, sem persistencia e com
# despejo por LRU: a fila morria a cada restart e podia ser descartada sob
# pressao de memoria, sem erro nenhum. Fila de trabalho precisa sobreviver ao
# ciclo de vida da aplicacao.
#
# Em producao, faltar REDIS_URL derruba o boot de proposito. O contrario seria
# a aplicacao subir apontando para um localhost que nao existe mais na imagem e
# enfileirar em silencio contra nada.
REDIS_DO_SIDEKIQ = begin
  url = ENV["REDIS_URL"].presence

  if url.nil? && Rails.env.production?
    raise "REDIS_URL nao definida. O Redis deixou de ser embutido na imagem: " \
          "aponte para um Redis externo com persistencia habilitada."
  end

  url || "redis://localhost:6379/0"
end

Sidekiq.configure_server do |config|
  config.redis = { url: REDIS_DO_SIDEKIQ }
end

Sidekiq.configure_client do |config|
  config.redis = { url: REDIS_DO_SIDEKIQ }
end
