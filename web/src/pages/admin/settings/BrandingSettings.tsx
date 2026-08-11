import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Image as ImageIcon, Loader2, Megaphone, Palette, Save, Share2, Type, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { updateAdminConfig, type AdminConfig } from "@/lib/api/config";
import { uploadAsset } from "@/lib/api/uploads";

const FALLBACK_COLORS = {
  color_primary: "#1E40AF",
  color_secondary: "#F97316",
  color_accent: "#10B981",
  color_header_bg: "#FFFFFF",
  color_header_text: "#64748B",
  color_header_text_hover: "#1E40AF",
  color_footer_text: "#94A3B8",
  color_footer_text_hover: "#0F172A",
} as const;

type ColorKey = keyof typeof FALLBACK_COLORS;

const COLOR_FIELDS: Array<{ key: ColorKey; label: string; hint: string }> = [
  { key: "color_primary", label: "Primária", hint: "Botões, links e destaques" },
  { key: "color_secondary", label: "Secundária", hint: "Apoio e realces" },
  { key: "color_accent", label: "Acento", hint: "Selos e indicadores" },
  { key: "color_header_bg", label: "Fundo do cabeçalho", hint: "Barra do topo" },
  { key: "color_header_text", label: "Texto do cabeçalho", hint: "Links do topo" },
  { key: "color_header_text_hover", label: "Texto do cabeçalho ao passar o mouse", hint: "" },
  { key: "color_footer_text", label: "Texto do rodapé", hint: "" },
  { key: "color_footer_text_hover", label: "Texto do rodapé ao passar o mouse", hint: "" },
];

const FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway",
  "Nunito", "Work Sans", "DM Sans", "Playfair Display", "Cormorant Garamond",
  "Libre Baskerville", "Bebas Neue", "Oswald",
];

const SOCIAL_FIELDS = [
  { key: "social_instagram", label: "Instagram", placeholder: "@suamarca" },
  { key: "social_whatsapp", label: "WhatsApp", placeholder: "+55 11 90000-0000" },
  { key: "social_facebook", label: "Facebook", placeholder: "facebook.com/suamarca" },
  { key: "social_tiktok", label: "TikTok", placeholder: "@suamarca" },
  { key: "social_youtube", label: "YouTube", placeholder: "youtube.com/@suamarca" },
  { key: "social_linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/suamarca" },
  { key: "social_twitter", label: "X / Twitter", placeholder: "@suamarca" },
  { key: "social_telegram", label: "Telegram", placeholder: "@suamarca" },
] as const;

const COMPANY_FIELDS = [
  { key: "company_name", label: "Razão social", placeholder: "Confecções Exemplo Ltda" },
  { key: "company_cnpj", label: "CNPJ", placeholder: "00.000.000/0001-00" },
  { key: "company_address", label: "Endereço", placeholder: "Rua Exemplo, 100 — São Paulo/SP" },
  { key: "company_phone", label: "Telefone", placeholder: "(11) 3000-0000" },
  { key: "company_email", label: "E-mail", placeholder: "contato@suamarca.com.br" },
  { key: "company_website", label: "Site", placeholder: "https://suamarca.com.br" },
] as const;

const TEXT_KEYS = [
  "logo_url", "logo_compact_url", "favicon_url", "favicon_mode",
  "font_primary", "font_heading",
  "footer_text", "announcement_bar_text", "terms_url", "privacy_url",
  ...COMPANY_FIELDS.map((f) => f.key),
  ...SOCIAL_FIELDS.map((f) => f.key),
] as const;

type BrandingForm = Record<(typeof TEXT_KEYS)[number] | ColorKey, string>;

function buildForm(config?: AdminConfig): BrandingForm {
  const form = {} as BrandingForm;
  TEXT_KEYS.forEach((key) => {
    form[key] = (config?.[key] as string | null | undefined) ?? "";
  });
  (Object.keys(FALLBACK_COLORS) as ColorKey[]).forEach((key) => {
    form[key] = normalizeHex(config?.[key] as string | null | undefined) || FALLBACK_COLORS[key];
  });
  if (!form.favicon_mode) form.favicon_mode = "auto";
  if (!form.font_primary) form.font_primary = "Inter";
  if (!form.font_heading) form.font_heading = "Inter";
  return form;
}

/** O input nativo de cor so aceita #rrggbb — devolve string vazia se nao servir. */
function normalizeHex(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "";
}

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

function AssetUpload({ label, hint, value, onChange, aspect }: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  aspect: "wide" | "square";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadAsset(file));
      toast.success(`${label} enviado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no envio.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={[
            "border rounded-md bg-muted/30 grid place-items-center overflow-hidden flex-none",
            aspect === "wide" ? "h-14 w-32" : "h-14 w-14",
          ].join(" ")}
        >
          {value ? (
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />

        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
          {value ? "Trocar" : "Enviar"}
        </Button>

        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <X className="h-4 w-4 mr-1" />
            Remover
          </Button>
        )}
      </div>
    </Field>
  );
}

function ColorField({ label, hint, value, onChange }: {
  label: string;
  hint: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <Field label={label} hint={hint || undefined}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} — seletor`}
          value={normalizeHex(value) || "#000000"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-9 w-12 rounded-md border border-input bg-background p-1 cursor-pointer"
        />
        <Input
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#000000"
          className="w-32 font-mono text-xs uppercase"
        />
      </div>
    </Field>
  );
}

function Preview({ form, tenantName }: { form: BrandingForm; tenantName: string }) {
  const headerBg = normalizeHex(form.color_header_bg) || FALLBACK_COLORS.color_header_bg;
  const headerText = normalizeHex(form.color_header_text) || FALLBACK_COLORS.color_header_text;
  const primary = normalizeHex(form.color_primary) || FALLBACK_COLORS.color_primary;
  const secondary = normalizeHex(form.color_secondary) || FALLBACK_COLORS.color_secondary;
  const accent = normalizeHex(form.color_accent) || FALLBACK_COLORS.color_accent;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 border-b"
        style={{ background: headerBg, color: headerText, fontFamily: `"${form.font_primary}", sans-serif` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {form.logo_url ? (
            <img src={form.logo_url} alt="" className="h-7 max-w-[130px] object-contain" />
          ) : (
            <span className="font-semibold truncate" style={{ fontFamily: `"${form.font_heading}", sans-serif` }}>
              {form.company_name || tenantName}
            </span>
          )}
        </div>
        <span className="text-xs truncate">Catálogo</span>
      </div>

      <div className="px-4 py-4 space-y-3 bg-background">
        {form.announcement_bar_text && (
          <div className="text-xs rounded px-3 py-1.5 text-white" style={{ background: accent }}>
            {form.announcement_bar_text}
          </div>
        )}
        <div style={{ fontFamily: `"${form.font_heading}", sans-serif` }} className="text-lg font-semibold">
          Conjunto Ribana
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-white rounded px-3 py-1.5" style={{ background: primary }}>Ver catálogo</span>
          <span className="text-xs text-white rounded px-3 py-1.5" style={{ background: secondary }}>Pedir</span>
        </div>
      </div>
    </div>
  );
}

export default function BrandingSettings({ config }: { config?: AdminConfig }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BrandingForm>(() => buildForm(config));

  useEffect(() => {
    if (config) setForm(buildForm(config));
  }, [config]);

  function set<K extends keyof BrandingForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {};
      (Object.keys(form) as Array<keyof BrandingForm>).forEach((key) => {
        payload[key] = form[key].trim() === "" ? null : form[key].trim();
      });
      return updateAdminConfig(payload);
    },
    onSuccess: () => {
      toast.success("Identidade visual salva.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "config"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant", "config"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Erro ao salvar."),
  });

  const invalidColors = COLOR_FIELDS.filter(({ key }) => form[key] && !normalizeHex(form[key]));

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Como a marca aparece no catálogo, nos links públicos e nos e-mails.
        </p>
        <Button onClick={() => save.mutate()} disabled={save.isPending || invalidColors.length > 0}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Salvar
        </Button>
      </div>

      {invalidColors.length > 0 && (
        <p className="text-xs text-destructive">
          Use cores no formato #RRGGBB. Corrija: {invalidColors.map((field) => field.label).join(", ")}.
        </p>
      )}

      <Preview form={form} tenantName={config?.tenant_name ?? "Sua marca"} />

      <Section
        title="Marca"
        icon={<ImageIcon className="h-4 w-4 text-muted-foreground" />}
        description="Use PNG ou SVG com fundo transparente."
      >
        <AssetUpload
          label="Logo"
          hint="Aparece no cabeçalho do catálogo"
          aspect="wide"
          value={form.logo_url}
          onChange={(url) => set("logo_url", url)}
        />
        <AssetUpload
          label="Logo compacto"
          hint="Versão reduzida, para telas pequenas"
          aspect="square"
          value={form.logo_compact_url}
          onChange={(url) => set("logo_compact_url", url)}
        />
        <AssetUpload
          label="Favicon"
          hint="Ícone da aba do navegador"
          aspect="square"
          value={form.favicon_url}
          onChange={(url) => set("favicon_url", url)}
        />
        <Field label="Origem do favicon" hint="De onde o ícone da aba é gerado">
          <select
            value={form.favicon_mode}
            aria-label="Origem do favicon"
            onChange={(event) => set("favicon_mode", event.target.value)}
            className="flex h-9 w-full max-w-[240px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="auto">Automático (usa o logo)</option>
            <option value="upload">Arquivo enviado acima</option>
            <option value="coin_symbol">Símbolo configurado</option>
          </select>
        </Field>
      </Section>

      <Section
        title="Cores"
        icon={<Palette className="h-4 w-4 text-muted-foreground" />}
        description="Aplicadas no admin, no catálogo e nos links públicos."
      >
        {COLOR_FIELDS.map((field) => (
          <ColorField
            key={field.key}
            label={field.label}
            hint={field.hint}
            value={form[field.key]}
            onChange={(hex) => set(field.key, hex)}
          />
        ))}
      </Section>

      <Section
        title="Tipografia"
        icon={<Type className="h-4 w-4 text-muted-foreground" />}
        description="As fontes são carregadas do Google Fonts."
      >
        <Field label="Fonte do texto" hint="Corpo e interface">
          <select
            value={form.font_primary}
            aria-label="Fonte do texto"
            onChange={(event) => set("font_primary", event.target.value)}
            className="flex h-9 w-full max-w-[240px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {FONTS.map((font) => <option key={font} value={font}>{font}</option>)}
          </select>
        </Field>
        <Field label="Fonte dos títulos">
          <select
            value={form.font_heading}
            aria-label="Fonte dos títulos"
            onChange={(event) => set("font_heading", event.target.value)}
            className="flex h-9 w-full max-w-[240px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {FONTS.map((font) => <option key={font} value={font}>{font}</option>)}
          </select>
        </Field>
      </Section>

      <Section
        title="Dados da empresa"
        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
        description="Usados no rodapé, nos e-mails e nos documentos do pedido."
      >
        {COMPANY_FIELDS.map((field) => (
          <Field key={field.key} label={field.label}>
            <Input
              value={form[field.key]}
              aria-label={field.label}
              onChange={(event) => set(field.key, event.target.value)}
              placeholder={field.placeholder}
            />
          </Field>
        ))}
      </Section>

      <Section
        title="Textos públicos"
        icon={<Megaphone className="h-4 w-4 text-muted-foreground" />}
      >
        <Field label="Barra de aviso" hint="Faixa no topo do catálogo. Vazio esconde a faixa.">
          <Input
            value={form.announcement_bar_text}
            aria-label="Barra de aviso"
            onChange={(event) => set("announcement_bar_text", event.target.value)}
            placeholder="Pedido mínimo de 6 peças por modelo"
          />
        </Field>
        <Field label="Texto do rodapé">
          <Input
            value={form.footer_text}
            aria-label="Texto do rodapé"
            onChange={(event) => set("footer_text", event.target.value)}
            placeholder="Atacado para lojistas desde 2015"
          />
        </Field>
        <Field label="Termos de uso" hint="Link">
          <Input
            value={form.terms_url}
            aria-label="Termos de uso"
            onChange={(event) => set("terms_url", event.target.value)}
            placeholder="https://suamarca.com.br/termos"
          />
        </Field>
        <Field label="Política de privacidade" hint="Link">
          <Input
            value={form.privacy_url}
            aria-label="Política de privacidade"
            onChange={(event) => set("privacy_url", event.target.value)}
            placeholder="https://suamarca.com.br/privacidade"
          />
        </Field>
      </Section>

      <Section
        title="Redes sociais"
        icon={<Share2 className="h-4 w-4 text-muted-foreground" />}
        description="Aparecem no rodapé do catálogo. Deixe em branco para ocultar."
      >
        {SOCIAL_FIELDS.map((field) => (
          <Field key={field.key} label={field.label}>
            <Input
              value={form[field.key]}
              aria-label={field.label}
              onChange={(event) => set(field.key, event.target.value)}
              placeholder={field.placeholder}
            />
          </Field>
        ))}
      </Section>
    </div>
  );
}
