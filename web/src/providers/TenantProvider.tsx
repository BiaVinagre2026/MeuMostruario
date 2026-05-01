import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { updateFavicon, type FaviconMode } from "@/lib/favicon";
import { setActiveTenantSlug } from "@/lib/tenantContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SocialNetwork =
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "youtube"
  | "tiktok"
  | "linkedin"
  | "twitter"
  | "telegram";

/** Coins + XP awarded for one gamification event (mirrors coin_events JSONB). */
export interface CoinEventConfig {
  coins: number;
  xp: number;
}

export interface TenantConfig {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorHeaderBg: string;
  colorHeaderText: string;
  colorHeaderTextHover: string;
  colorFooterText: string;
  colorFooterTextHover: string;
  fontPrimary: string;
  fontHeading: string;
  coinName: string;
  coinSymbol: string;
  coinIconUrl: string | null;
  logoUrl: string | null;
  logoCompactUrl: string | null;
  logoMonoUrl: string | null;
  faviconUrl: string | null;
  faviconMode: FaviconMode;
  companyName: string | null;
  companyCnpj: string | null;
  companyAddress: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
  tenantSlug: string;
  tenantName: string;
  footerText: string | null;
  social: Partial<Record<SocialNetwork, string>>;
  coinEvents: Record<string, CoinEventConfig>;
  allowMoneyPayment: boolean;
  coinBrlRate: number;
  coinPackages: Array<{ coins: number; brl_cents: number; label: string; popular?: boolean }>;
  enabledPaymentMethods: string[];
}

const defaultConfig: TenantConfig = {
  colorPrimary: "#1E40AF",
  colorSecondary: "#F97316",
  colorAccent: "#10B981",
  colorHeaderBg: "#FFFFFF",
  colorHeaderText: "#64748B",
  colorHeaderTextHover: "#1E40AF",
  colorFooterText: "#94A3B8",
  colorFooterTextHover: "#0F172A",
  fontPrimary: "Inter",
  fontHeading: "Inter",
  coinName: "Coins",
  coinSymbol: "⭐",
  coinIconUrl: null,
  logoUrl: null,
  logoCompactUrl: null,
  logoMonoUrl: null,
  faviconUrl: null,
  faviconMode: "auto",
  companyName: "App",
  tenantSlug: "demo",
  tenantName: "App",
  footerText: null,
  social: {},
  coinEvents: {},
  allowMoneyPayment: false,
  coinBrlRate: 0,
  coinPackages: [],
  enabledPaymentMethods: ["pix", "boleto", "credit_card"],
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TenantContext = createContext<TenantConfig>(defaultConfig);

export function useTenant(): TenantConfig {
  return useContext(TenantContext);
}

export const tenantBrandingKey = ["tenant", "branding"] as const;

// ---------------------------------------------------------------------------
// Raw API response shape
// ---------------------------------------------------------------------------

type RawBrandingResponse = {
  tenant: { slug: string; name: string; plan: string };
  config: {
    color_primary: string;
    color_secondary: string;
    color_accent: string;
    color_header_bg: string;
    color_header_text: string;
    color_header_text_hover: string;
    color_footer_text: string;
    color_footer_text_hover: string;
    font_primary: string;
    font_heading: string;
    coin_name: string;
    coin_symbol: string;
    coin_icon_url: string | null;
    logo_url: string | null;
    logo_compact_url: string | null;
    logo_mono_url: string | null;
    favicon_url: string | null;
    favicon_mode: string | null;
    company_name: string | null;
    company_cnpj: string | null;
    company_address: string | null;
    company_email: string | null;
    company_phone: string | null;
    company_website: string | null;
    terms_url: string | null;
    privacy_url: string | null;
    footer_text: string | null;
    social: Partial<Record<SocialNetwork, string>>;
    coin_events: Record<string, { coins: number; xp: number }>;
    allow_money_payment: boolean;
    coin_brl_rate: number | null;
    coin_packages: Array<{ coins: number; brl_cents: number; label: string; popular?: boolean }>;
    enabled_payment_methods: string[] | null;
  };
};

// ---------------------------------------------------------------------------
// Hex → HSL conversion (for Tailwind CSS variable injection)
// ---------------------------------------------------------------------------

function hexToHsl(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "0 0% 0%";

  let r = parseInt(m[1], 16) / 255;
  let g = parseInt(m[2], 16) / 255;
  let b = parseInt(m[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// ---------------------------------------------------------------------------
// CSS variable injection
// ---------------------------------------------------------------------------

function injectCssVars(c: {
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_header_bg: string;
  color_header_text: string;
  color_header_text_hover: string;
  color_footer_text: string;
  color_footer_text_hover: string;
}): void {
  const root      = document.documentElement;
  const primary   = hexToHsl(c.color_primary);
  const secondary = hexToHsl(c.color_secondary);
  const accent    = hexToHsl(c.color_accent);

  root.style.setProperty("--primary",   primary);
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--accent",    accent);
  root.style.setProperty("--header-bg", c.color_header_bg);
  root.style.setProperty("--ring",            primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-ring",    primary);
  root.style.setProperty("--header-text",       c.color_header_text);
  root.style.setProperty("--header-text-hover", c.color_header_text_hover);
  root.style.setProperty("--footer-text",       c.color_footer_text);
  root.style.setProperty("--footer-text-hover", c.color_footer_text_hover);

  // Gradient and shadow CSS vars
  root.style.setProperty("--gradient-primary",   `linear-gradient(135deg, hsl(${primary}), hsl(${primary} / 0.75))`);
  root.style.setProperty("--gradient-secondary", `linear-gradient(135deg, hsl(${secondary}), hsl(${accent}))`);
  root.style.setProperty("--shadow-primary",     `0 4px 30px hsl(${primary} / 0.15)`);
  root.style.setProperty("--shadow-secondary",   `0 4px 30px hsl(${secondary} / 0.15)`);
}

// ---------------------------------------------------------------------------
// Google Fonts loader
// ---------------------------------------------------------------------------

function loadGoogleFont(fontName: string): void {
  if (fontName === "Inter") return;
  const id = `gfont-${fontName.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    fontName
  )}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// ---------------------------------------------------------------------------
// Tenant resolution from subdomain
// ---------------------------------------------------------------------------

function resolveTenantId(): string | undefined {
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 2) {
    const slug = parts[0];
    if (slug && !["www", "api", "admin", "app", "localhost"].includes(slug)) {
      return slug;
    }
  }
  return undefined;
}

function fetchBranding(): Promise<RawBrandingResponse> {
  const tenantId = resolveTenantId() ?? (import.meta.env.VITE_TENANT_SLUG as string | undefined);
  const apiUrl = (import.meta.env.VITE_API_URL as string) ?? "";

  const headers: Record<string, string> = { Accept: "application/json" };
  if (tenantId) headers["X-Tenant-ID"] = tenantId;

  return fetch(`${apiUrl}/api/v1/tenant/config`, { credentials: "include", headers }).then((r) => {
    if (!r.ok) throw new Error(`Tenant config fetch failed: ${r.status}`);
    return r.json() as Promise<RawBrandingResponse>;
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery<RawBrandingResponse>({
    queryKey: tenantBrandingKey,
    queryFn: fetchBranding,
    staleTime: 5 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  const config = useMemo<TenantConfig>(() => {
    if (!data) {
      setActiveTenantSlug(defaultConfig.tenantSlug);
      return defaultConfig;
    }
    const c = data.config;
    const t = data.tenant;
    setActiveTenantSlug(t.slug);
    return {
      colorPrimary: c.color_primary,
      colorSecondary: c.color_secondary,
      colorAccent: c.color_accent,
      colorHeaderBg: c.color_header_bg ?? "#FFFFFF",
      colorHeaderText: c.color_header_text ?? "#64748B",
      colorHeaderTextHover: c.color_header_text_hover ?? "#1E40AF",
      colorFooterText: c.color_footer_text ?? "#94A3B8",
      colorFooterTextHover: c.color_footer_text_hover ?? "#0F172A",
      fontPrimary: c.font_primary,
      fontHeading: c.font_heading,
      coinName: c.coin_name,
      coinSymbol: c.coin_symbol,
      coinIconUrl: c.coin_icon_url,
      logoUrl: c.logo_url,
      logoCompactUrl: c.logo_compact_url,
      logoMonoUrl: c.logo_mono_url,
      faviconUrl: c.favicon_url,
      faviconMode: (c.favicon_mode as FaviconMode) || "auto",
      companyName: c.company_name,
      companyCnpj: c.company_cnpj,
      companyAddress: c.company_address,
      companyEmail: c.company_email,
      companyPhone: c.company_phone,
      companyWebsite: c.company_website,
      termsUrl: c.terms_url,
      privacyUrl: c.privacy_url,
      tenantSlug: t.slug,
      tenantName: t.name,
      footerText: c.footer_text,
      social: c.social ?? {},
      coinEvents: c.coin_events ?? {},
      allowMoneyPayment: c.allow_money_payment ?? false,
      coinBrlRate: Number(c.coin_brl_rate) || 0,
      coinPackages: c.coin_packages ?? [],
      enabledPaymentMethods: c.enabled_payment_methods ?? ["pix", "boleto", "credit_card"],
    };
  }, [data]);

  useEffect(() => {
    if (!data) {
      updateFavicon({
        mode: "auto",
        name: "App",
        primaryColor: "#1E40AF",
        secondaryColor: "#FFFFFF",
      });
      return;
    }
    const c = data.config;
    const t = data.tenant;

    injectCssVars({
      color_primary: c.color_primary,
      color_secondary: c.color_secondary,
      color_accent: c.color_accent,
      color_header_bg: c.color_header_bg ?? "#FFFFFF",
      color_header_text: c.color_header_text ?? "#64748B",
      color_header_text_hover: c.color_header_text_hover ?? "#1E40AF",
      color_footer_text: c.color_footer_text ?? "#94A3B8",
      color_footer_text_hover: c.color_footer_text_hover ?? "#0F172A",
    });

    loadGoogleFont(c.font_primary);
    if (c.font_heading !== c.font_primary) {
      loadGoogleFont(c.font_heading);
      document.documentElement.style.setProperty(
        "--font-heading",
        `'${c.font_heading}', sans-serif`
      );
    }
    if (c.font_primary !== "Inter") {
      document.documentElement.style.setProperty(
        "--font-primary",
        `'${c.font_primary}', sans-serif`
      );
    }

    if (t.name) {
      document.title = t.name;
    }

    updateFavicon({
      mode: (c.favicon_mode as FaviconMode) || "auto",
      faviconUrl: c.favicon_url,
      coinSymbol: c.coin_symbol,
      name: t.name || t.slug || "A",
      primaryColor: c.color_primary || "#1E40AF",
      secondaryColor: c.color_secondary || "#FFFFFF",
    });
  }, [data]);

  return (
    <TenantContext.Provider value={config}>{children}</TenantContext.Provider>
  );
}
