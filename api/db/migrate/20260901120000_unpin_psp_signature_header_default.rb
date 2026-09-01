# frozen_string_literal: true

# Solta o default do cabecalho da assinatura do callback.
#
# A coluna nascia com "X-Gateway-Signature", que nunca foi um dado: era o
# palpite de quem escreveu a migration, porque a documentacao da Orbe diz que o
# callback e assinado com HMAC-SHA256 mas nao diz onde a assinatura viaja. Com o
# default preenchido, a verificacao olhava so aquele cabecalho — se a Casetec
# usar outro nome, toda confirmacao de pagamento e recusada com 401 e o sintoma
# aparece como "pedido pago que nunca consta como pago".
#
# Vazio passa a significar "procure a assinatura nos cabecalhos conhecidos".
# Preenchido continua fixando um nome so, para quando a Casetec confirmar qual e.
class UnpinPspSignatureHeaderDefault < ActiveRecord::Migration[7.2]
  ANTIGO_PALPITE = "X-Gateway-Signature"

  def up
    change_column_default :tenant_configs, :psp_signature_header, from: ANTIGO_PALPITE, to: nil

    # Quem tem exatamente o palpite gravado nao escolheu esse valor: ele veio do
    # default. Limpar libera a busca; e o proprio X-Gateway-Signature continua
    # na lista de candidatos, entao ninguem perde comportamento.
    execute(<<~SQL.squish)
      UPDATE tenant_configs
         SET psp_signature_header = NULL
       WHERE psp_signature_header = '#{ANTIGO_PALPITE}'
    SQL
  end

  def down
    change_column_default :tenant_configs, :psp_signature_header, from: nil, to: ANTIGO_PALPITE
    execute(<<~SQL.squish)
      UPDATE tenant_configs
         SET psp_signature_header = '#{ANTIGO_PALPITE}'
       WHERE psp_signature_header IS NULL
    SQL
  end
end
