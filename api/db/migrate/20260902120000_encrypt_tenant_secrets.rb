# frozen_string_literal: true

# Cifra os segredos que ja estao gravados em texto puro.
#
# As colunas `_enc` existiam desde o inicio, mas nada as cifrava. Agora que o
# modelo declara `encrypts`, os valores antigos continuam legiveis por causa de
# `support_unencrypted_data`, mas continuam expostos no banco. Esta migracao
# reescreve cada um para que passe a valer a cifragem.
#
# Reescrever pelo modelo, e nao por UPDATE em SQL, e o ponto: e o modelo que
# sabe cifrar. Um UPDATE direto so copiaria o texto puro de volta.
class EncryptTenantSecrets < ActiveRecord::Migration[7.2]
  def up
    cifrados = 0

    TenantConfig.find_each do |config|
      pendentes = TenantConfig::ATRIBUTOS_SECRETOS.select do |atributo|
        config.read_attribute_before_type_cast(atributo).present? &&
          !ja_cifrado?(config, atributo)
      end
      next if pendentes.empty?

      # Reatribuir o mesmo valor nao adianta: o controle de alteracoes ve que
      # nada mudou e o save nao escreve nada — a primeira versao desta migracao
      # relatou sucesso sem cifrar coisa alguma. E preciso marcar o atributo
      # como alterado para forcar a gravacao, que e onde a cifragem acontece.
      #
      # `update_columns` tambem nao serve: passa por cima do type cast, que e
      # justamente quem cifra.
      pendentes.each { |atributo| config.public_send("#{atributo}_will_change!") }
      config.save!(validate: false)
      cifrados += 1
    end

    say "#{cifrados} tenant_config(s) com segredos cifrados"
  end

  # Sem volta: decifrar de propria vontade devolveria os segredos ao texto puro.
  # Quem precisar reverter tem o backup anterior a esta migracao.
  def down
    raise ActiveRecord::IrreversibleMigration,
          "reverter devolveria os segredos dos tenants ao texto puro"
  end

  private

  # O valor cifrado e gravado como um JSON com cabecalho proprio do Rails; texto
  # puro nunca tem esse formato.
  def ja_cifrado?(config, atributo)
    bruto = config.read_attribute_before_type_cast(atributo).to_s
    bruto.start_with?("{") && bruto.include?('"p"')
  end
end
