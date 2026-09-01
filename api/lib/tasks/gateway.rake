# frozen_string_literal: true

namespace :gateway do
  desc "Confere se o tenant esta pronto para cobrar na Orbe. TENANT=demo [COBRAR=1 VALOR=1.00]"
  task check: :environment do
    slug = ENV["TENANT"].presence || abort("Informe o tenant: TENANT=demo")
    tenant = Tenant.find_by(slug: slug) || abort("Tenant '#{slug}' nao encontrado")
    config = tenant.tenant_config || abort("Tenant '#{slug}' nao tem tenant_config")

    puts "Gateway do tenant #{tenant.slug} (#{tenant.name})"
    puts "-" * 60

    faltando = []
    campo = lambda do |rotulo, valor, obrigatorio: true|
      preenchido = valor.present?
      faltando << rotulo if obrigatorio && !preenchido
      puts format("  %-22s %s", rotulo, preenchido ? "ok" : (obrigatorio ? "FALTA" : "vazio"))
    end

    campo.call("URL da API", config.psp_api_url)
    campo.call("Chave de API", config.psp_api_key_enc)
    campo.call("Merchant", config.psp_merchant_id, obrigatorio: false)
    campo.call("Segredo do callback", config.psp_callback_secret_enc)
    # Vazio e o estado bom: o backend procura a assinatura nos cabecalhos
    # conhecidos. Preenchido so vale depois que a Casetec confirmar o nome.
    campo.call("Header da assinatura", config.psp_signature_header, obrigatorio: false)

    base = ENV["PSP_CALLBACK_BASE_URL"].presence || ENV["APP_URL"].presence
    callback = "#{base&.chomp('/')}/api/v1/payments/webhook/#{tenant.slug}"
    puts
    puts "  Callback a registrar na Orbe:"
    puts "    #{base.present? ? callback : '(defina PSP_CALLBACK_BASE_URL)'}"

    if base.blank?
      faltando << "PSP_CALLBACK_BASE_URL"
    elsif base.match?(%r{//(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)})
      faltando << "endereco publico para o callback (o atual e local, a Orbe nao alcanca)"
    end

    puts
    if faltando.empty?
      puts "  Pronto para cobrar."
    else
      puts "  Falta: #{faltando.join(', ')}"
    end

    next unless ENV["COBRAR"].present?

    unless config.psp_configured?
      abort("\nNao da para cobrar: credenciais incompletas.")
    end

    valor = (ENV["VALOR"].presence || "1.00").to_d
    puts
    puts "Emitindo cobranca de teste de R$ #{valor} contra #{config.psp_api_url}..."

    TenantSwitcher.switch(tenant) do
      # Pedido descartavel so para carregar o valor e o documento que o gateway
      # exige. Fica gravado de proposito: se a Orbe confirmar, o callback precisa
      # encontrar o pagamento para atualizar.
      order = Order.create!(
        buyer_name: "Teste de integracao",
        buyer_document: "11222333000181",
        status: "pending",
        payment_status: "pending",
        total_value: valor,
        notes: "Cobranca de teste gerada por gateway:check"
      )

      payment = GatewayPaymentService.new(config: config).create_intent!(order: order)

      puts "  Pedido    ##{order.id}"
      puts "  Pagamento ##{payment.id} — status #{payment.status}"
      puts "  Referencia no gateway: #{payment.gateway_reference.presence || '(nenhuma)'}"

      if payment.status == "failed"
        puts "  ERRO: #{payment.raw_response['message']}"
      elsif payment.pix_qr_code.present?
        puts "  Pix copia e cola recebido (#{payment.pix_qr_code.length} caracteres)."
        puts "  A Orbe falou. Agora confirme se o callback chega em #{callback}"
      else
        puts "  Resposta sem Pix. Conteudo: #{payment.raw_response.inspect[0, 300]}"
      end
    end
  end
end
