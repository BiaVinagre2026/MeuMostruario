# frozen_string_literal: true

# Chaves da criptografia de atributos.
#
# Ficam em variavel de ambiente, e nao em credentials, porque o deploy e por
# container: injetar tres variaveis e mais simples do que carregar um master.key
# junto da imagem.
#
# Em producao a ausencia de chave derruba o boot de proposito. O contrario seria
# a aplicacao subir gravando segredo de gateway em texto puro sem ninguem notar
# — que foi exatamente o estado encontrado antes desta mudanca.
#
# Para gerar um conjunto novo:
#   docker compose exec api bin/rails db:encryption:init
module ChavesDeCriptografia
  # Chave de desenvolvimento e teste. Nao protege nada e nao precisa: serve
  # para o mesmo codigo rodar nas duas pontas sem cada pessoa gerar a propria.
  # Producao nunca chega aqui.
  DESENVOLVIMENTO = "MeuMostruarioDesenvolvimentoApenas32b"

  def self.buscar(nome)
    valor = ENV["AR_ENCRYPTION_#{nome}"].presence
    return valor if valor
    return DESENVOLVIMENTO unless Rails.env.production?

    raise "AR_ENCRYPTION_#{nome} nao definida. Sem ela os segredos dos tenants " \
          "seriam gravados em texto puro. Gere com: bin/rails db:encryption:init"
  end
end

Rails.application.configure do
  config.active_record.encryption.primary_key         = ChavesDeCriptografia.buscar("PRIMARY_KEY")
  config.active_record.encryption.deterministic_key   = ChavesDeCriptografia.buscar("DETERMINISTIC_KEY")
  config.active_record.encryption.key_derivation_salt = ChavesDeCriptografia.buscar("KEY_DERIVATION_SALT")

  # Linha em texto puro continua legivel. E preciso durante a migracao dos
  # valores existentes, e depois dela evita que uma linha esquecida em algum
  # ambiente derrube a tela de configuracao com erro de decifragem.
  config.active_record.encryption.support_unencrypted_data = true

  # O texto cifrado nao vaza para o log nem para a saida de inspecao.
  config.active_record.encryption.encrypt_fixtures = false
end
