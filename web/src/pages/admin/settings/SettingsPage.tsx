import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Eye, EyeOff, CheckCircle2, Mail, Database } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdminConfig, updateAdminConfig, type AdminConfig } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";
import BrandingSettings from "./BrandingSettings";
import PaymentSettings from "./PaymentSettings";

type EmailProvider = "letter_opener" | "smtp" | "gmail" | "ses";
type Tab = "identidade" | "pagamento" | "email";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "identidade", label: "Identidade visual" },
  { id: "pagamento", label: "Pagamento" },
  { id: "email", label: "E-mail" },
];

const PROVIDER_LABELS: Record<EmailProvider, string> = {
  letter_opener: "Desativado (dev local)",
  smtp:          "SMTP personalizado",
  gmail:         "Gmail (SMTP via Google)",
  ses:           "AWS SES",
};

const SES_REGIONS = [
  "us-east-1", "us-west-2", "eu-west-1", "eu-central-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "sa-east-1",
];

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 bg-muted/40 border-b">
        {icon}
        <h2 className="font-medium text-sm">{title}</h2>
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

function PasswordInput({ value, onChange, placeholder, isSet }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  isSet: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSet ? "••••••••  (já configurado — deixe em branco para manter)" : placeholder}
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("identidade");

  const { data: config, isLoading } = useQuery({
    queryKey: ["admin", "config"],
    queryFn: getAdminConfig,
  });

  // Email form state
  const [provider,       setProvider]       = useState<EmailProvider>("letter_opener");
  const [smtpHost,       setSmtpHost]       = useState("");
  const [smtpPort,       setSmtpPort]       = useState("587");
  const [smtpUser,       setSmtpUser]       = useState("");
  const [smtpPass,       setSmtpPass]       = useState("");
  const [smtpFromName,   setSmtpFromName]   = useState("");
  const [smtpFromEmail,  setSmtpFromEmail]  = useState("");
  const [smtpAuth,       setSmtpAuth]       = useState("plain");
  const [smtpTls,        setSmtpTls]        = useState(true);
  const [sesKeyId,       setSesKeyId]       = useState("");
  const [sesSecret,      setSesSecret]      = useState("");
  const [sesRegion,      setSesRegion]      = useState("us-east-1");

  useEffect(() => {
    if (!config) return;
    setProvider((config.email_provider as EmailProvider) || "letter_opener");
    setSmtpHost(config.smtp_host || "");
    setSmtpPort(String(config.smtp_port || 587));
    setSmtpUser(config.smtp_username || "");
    setSmtpFromName(config.smtp_from_name || "");
    setSmtpFromEmail(config.smtp_from_email || "");
    setSmtpAuth(config.smtp_authentication || "plain");
    setSmtpTls(config.smtp_enable_starttls !== false);
    setSesKeyId(config.ses_access_key_id || "");
    setSesRegion(config.ses_region || "us-east-1");
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateAdminConfig>[0]) => updateAdminConfig(payload),
    onSuccess: () => {
      toast.success("Configurações salvas.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "config"] });
      // clear password fields after save
      setSmtpPass("");
      setSesSecret("");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar."),
  });

  function handleSave() {
    const payload: Record<string, unknown> = { email_provider: provider };

    if (provider === "smtp" || provider === "gmail") {
      payload.smtp_host            = smtpHost;
      payload.smtp_port            = parseInt(smtpPort, 10) || 587;
      payload.smtp_username        = smtpUser;
      payload.smtp_from_name       = smtpFromName;
      payload.smtp_from_email      = smtpFromEmail;
      payload.smtp_authentication  = smtpAuth;
      payload.smtp_enable_starttls = smtpTls;
      if (smtpPass) payload.smtp_password_enc = smtpPass;
    }

    if (provider === "ses") {
      payload.ses_access_key_id = sesKeyId;
      payload.ses_region        = sesRegion;
      if (sesSecret) payload.ses_secret_key_enc = sesSecret;
    }

    saveMutation.mutate(payload);
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center flex-1 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const smtpPasswordSet = config?.smtp_password_set ?? false;
  const sesSecretSet    = config?.ses_secret_key_set ?? false;

  return (
    <AdminLayout>
      <div className="px-4 md:px-6 pt-3 md:pt-4 border-b">
        <h1 className="text-base md:text-lg font-semibold">Configurações</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Identidade da marca e integrações do tenant</p>
        <div className="flex gap-1 mt-3" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={[
                "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                tab === item.id
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto">
        <div className="max-w-2xl space-y-4 md:space-y-6">

          {tab === "identidade" && <BrandingSettings config={config} />}

          {tab === "pagamento" && <PaymentSettings config={config} />}

          {tab === "email" && (
          <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Como os e-mails do tenant são enviados.</p>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                : <Save className="h-4 w-4 mr-1.5" />}
              Salvar
            </Button>
          </div>

          {/* Email provider */}
          <Section title="E-mail transacional" icon={<Mail className="h-4 w-4 text-muted-foreground" />}>
            <Field label="Provedor" hint="Como os e-mails de pedidos serão enviados">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PROVIDER_LABELS) as EmailProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={[
                      "flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm text-left transition-colors",
                      provider === p
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-input text-muted-foreground hover:bg-accent",
                    ].join(" ")}
                  >
                    {provider === p && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
                    {PROVIDER_LABELS[p]}
                  </button>
                ))}
              </div>
              {provider === "letter_opener" && (
                <p className="text-xs text-amber-600 mt-2">
                  Modo desenvolvimento — e-mails não são entregues. Ative SMTP ou SES para uso real.
                </p>
              )}
            </Field>

            {/* SMTP / Gmail fields */}
            {(provider === "smtp" || provider === "gmail") && (
              <>
                {provider === "smtp" && (
                  <Field label="Servidor SMTP" hint="Host do servidor de e-mail">
                    <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.seuservidor.com" />
                  </Field>
                )}
                {provider === "gmail" && (
                  <Field label="Servidor" hint="Fixo para Gmail">
                    <Input value="smtp.gmail.com" disabled className="bg-muted text-muted-foreground" />
                  </Field>
                )}

                <Field label="Porta" hint="587 (STARTTLS) ou 465 (SSL)">
                  <Input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-28"
                  />
                </Field>

                <Field label="Usuário" hint={provider === "gmail" ? "Seu endereço Gmail" : "Login SMTP"}>
                  <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder={provider === "gmail" ? "seuemail@gmail.com" : "usuario@servidor.com"} />
                </Field>

                <Field
                  label="Senha / App Password"
                  hint={provider === "gmail" ? "Senha de app Google (16 dígitos)" : "Senha SMTP"}
                >
                  <PasswordInput value={smtpPass} onChange={setSmtpPass}
                    placeholder="Digite para configurar" isSet={smtpPasswordSet} />
                  {provider === "gmail" && !smtpPasswordSet && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie em: Conta Google → Segurança → Verificação em 2 etapas → Senhas de app
                    </p>
                  )}
                </Field>

                <Field label="Nome do remetente">
                  <Input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Meu Mostruário" />
                </Field>

                <Field label="E-mail do remetente">
                  <Input value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="noreply@seudominio.com" />
                </Field>

                {provider === "smtp" && (
                  <>
                    <Field label="Autenticação">
                      <select
                        value={smtpAuth}
                        onChange={(e) => setSmtpAuth(e.target.value)}
                        className="flex h-9 w-full max-w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="plain">plain</option>
                        <option value="login">login</option>
                        <option value="cram_md5">cram_md5</option>
                      </select>
                    </Field>
                    <Field label="STARTTLS">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={smtpTls} onChange={(e) => setSmtpTls(e.target.checked)}
                          className="h-4 w-4 rounded border-input" />
                        <span className="text-sm text-muted-foreground">Ativar STARTTLS automático</span>
                      </label>
                    </Field>
                  </>
                )}
              </>
            )}

            {/* AWS SES fields */}
            {provider === "ses" && (
              <>
                <Field label="Região AWS" hint="Região onde o SES está habilitado">
                  <select
                    value={sesRegion}
                    onChange={(e) => setSesRegion(e.target.value)}
                    className="flex h-9 w-full max-w-[220px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    {SES_REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Access Key ID" hint="Chave de acesso IAM com permissão SES">
                  <Input value={sesKeyId} onChange={(e) => setSesKeyId(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE" className="font-mono text-xs" />
                </Field>

                <Field label="Secret Access Key">
                  <PasswordInput value={sesSecret} onChange={setSesSecret}
                    placeholder="Digite para configurar" isSet={sesSecretSet} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Crie um usuário IAM com política <code className="bg-muted px-1 rounded">AmazonSESFullAccess</code> ou escopo mínimo <code className="bg-muted px-1 rounded">ses:SendRawEmail</code>.
                  </p>
                </Field>

                <Field label="E-mail do remetente" hint="Deve estar verificado no SES">
                  <Input value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="noreply@seudominio.com" />
                </Field>
                <Field label="Nome do remetente">
                  <Input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Meu Mostruário" />
                </Field>
              </>
            )}
          </Section>

          {/* Storage hint */}
          <Section title="Armazenamento de arquivos" icon={<Database className="h-4 w-4 text-muted-foreground" />}>
            <p className="text-sm text-muted-foreground">
              Configurações de S3/armazenamento estão disponíveis via painel super-admin.
              O armazenamento local (uploads em disco) está ativo por padrão.
            </p>
          </Section>
          </>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}
