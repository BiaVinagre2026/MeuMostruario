import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Eye, EyeOff, Loader2, Save, Webhook } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { updateAdminConfig, type AdminConfig } from "@/lib/api/config";
import { useOperatorStore } from "@/stores/useOperatorStore";

const DEFAULT_API_URL = "https://api.casetec.com.br";
const DEFAULT_SIGNATURE_HEADER = "X-Gateway-Signature";

function Section({ title, icon, description, children }: {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-start gap-2.5 px-5 py-3 bg-muted/40 border-b">
        <span className="mt-0.5">{icon}</span>
        <div>
          <h2 className="font-medium text-sm">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-start gap-2 md:gap-4">
      <div className="md:pt-2">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SecretInput({ value, onChange, isSet, label }: {
  value: string;
  onChange: (v: string) => void;
  isSet: boolean;
  label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        placeholder={isSet ? "••••••••  (já configurado — deixe em branco para manter)" : "Cole o valor aqui"}
        className="pr-10 font-mono text-xs"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-label={show ? `Ocultar ${label}` : `Mostrar ${label}`}
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function PaymentSettings({ config }: { config?: AdminConfig }) {
  const queryClient = useQueryClient();
  const tenantSlug = useOperatorStore((state) => state.activeTenantSlug);

  const [apiUrl, setApiUrl] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [callbackSecret, setCallbackSecret] = useState("");
  const [signatureHeader, setSignatureHeader] = useState(DEFAULT_SIGNATURE_HEADER);

  useEffect(() => {
    if (!config) return;
    setApiUrl(config.psp_api_url || "");
    setMerchantId(config.psp_merchant_id || "");
    setSignatureHeader(config.psp_signature_header || DEFAULT_SIGNATURE_HEADER);
  }, [config]);

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        psp_api_url: apiUrl.trim() || null,
        psp_merchant_id: merchantId.trim() || null,
        psp_signature_header: signatureHeader.trim() || DEFAULT_SIGNATURE_HEADER,
      };
      // Segredo em branco significa "manter o que já está salvo".
      if (apiKey.trim()) payload.psp_api_key_enc = apiKey.trim();
      if (callbackSecret.trim()) payload.psp_callback_secret_enc = callbackSecret.trim();
      return updateAdminConfig(payload);
    },
    onSuccess: () => {
      toast.success("Gateway salvo.");
      setApiKey("");
      setCallbackSecret("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "config"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Erro ao salvar."),
  });

  const configured = config?.psp_configured ?? false;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Credenciais da Orbe PSP. Cada tenant cobra pela própria conta.
        </p>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Salvar
        </Button>
      </div>

      <div
        className={[
          "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
          configured ? "border-emerald-600/30 bg-emerald-500/10" : "border-amber-600/30 bg-amber-500/10",
        ].join(" ")}
      >
        {configured ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
        <span>
          {configured
            ? "Gateway conectado. Links de atacado com pagamento vão gerar cobrança real."
            : "Gateway não conectado. O pedido fecha, mas nenhuma cobrança é emitida."}
        </span>
      </div>

      <Section
        title="Conexão"
        icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
        description="Obtidas no painel da Orbe PSP, em credenciais do merchant."
      >
        <Field label="URL da API" hint="Ambiente de produção da Orbe">
          <Input
            value={apiUrl}
            aria-label="URL da API"
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder={DEFAULT_API_URL}
            className="font-mono text-xs"
          />
        </Field>

        <Field label="Merchant" hint="Identificador da sua conta no gateway">
          <Input
            value={merchantId}
            aria-label="Merchant"
            onChange={(event) => setMerchantId(event.target.value)}
            placeholder="ex.: mrc_01H..."
            className="font-mono text-xs"
          />
        </Field>

        <Field label="Chave de API" hint="Enviada como Bearer em cada cobrança">
          <SecretInput
            label="Chave de API"
            value={apiKey}
            onChange={setApiKey}
            isSet={config?.psp_api_key_set ?? false}
          />
        </Field>
      </Section>

      <Section
        title="Confirmação de pagamento"
        icon={<Webhook className="h-4 w-4 text-muted-foreground" />}
        description="O gateway avisa este endereço a cada mudança de status da cobrança."
      >
        <Field label="Endereço do callback" hint="Enviado automaticamente em cada cobrança">
          <Input
            readOnly
            aria-label="Endereço do callback"
            value={`${window.location.origin}/api/v1/payments/webhook/${tenantSlug ?? ""}`}
            className="font-mono text-xs bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">
            O tenant vai no fim do endereço — é ele que diz de quem é a cobrança.
            Em produção, aponte <code className="bg-muted px-1 rounded">PSP_CALLBACK_BASE_URL</code> para
            um endereço que o gateway alcance: localhost não recebe.
          </p>
        </Field>

        <Field label="Segredo do callback" hint="Usado para conferir a assinatura HMAC-SHA256">
          <SecretInput
            label="Segredo do callback"
            value={callbackSecret}
            onChange={setCallbackSecret}
            isSet={config?.psp_callback_secret_set ?? false}
          />
        </Field>

        <Field
          label="Header da assinatura"
          hint="Nome do cabeçalho onde o gateway envia a assinatura"
        >
          <Input
            value={signatureHeader}
            aria-label="Header da assinatura"
            onChange={(event) => setSignatureHeader(event.target.value)}
            placeholder={DEFAULT_SIGNATURE_HEADER}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Confirme o nome com a Casetec. Se estiver errado, toda confirmação de pagamento é recusada.
          </p>
        </Field>
      </Section>
    </div>
  );
}
