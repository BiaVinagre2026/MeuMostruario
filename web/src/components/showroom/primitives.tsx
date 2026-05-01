import type { CSSProperties, ReactNode } from "react";
import { TONE } from "@/data/catalog";
import { useTenant } from "@/providers/TenantProvider";
import { Garment, garmentTypeFor } from "./Garment";
import type { Product } from "@/types/catalog";

// ─── Logo ────────────────────────────────────────────────────────────────────

export function Logo({ size = 20 }: { size?: number }) {
  const { tenantName } = useTenant();
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1"/>
        <path d="M7 12 L17 12 M12 7 L12 17" stroke="currentColor" strokeWidth="1"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
      <span className="display" style={{ fontSize: size * 1.25, letterSpacing: "-0.04em" }}>
        {tenantName}
      </span>
    </div>
  );
}

// ─── Photo ───────────────────────────────────────────────────────────────────

interface PhotoProps {
  tone?: string;
  ratio?: string;
  caption?: string;
  children?: ReactNode;
  style?: CSSProperties;
  grainy?: boolean;
  product?: Product;
  view?: "front" | "detail" | "back" | "movement";
  imageUrl?: string;
  alt?: string;
}

export function Photo({ tone = "sand", ratio = "3/4", caption, children, style = {}, grainy = true, product, view = "front", imageUrl, alt }: PhotoProps) {
  const t = TONE[tone] ?? TONE.sand;
  return (
    <div className="photo" style={{ position: "relative", aspectRatio: ratio, background: t.bg, color: t.fg, overflow: "hidden", ...style }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt ?? caption ?? ""}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
          loading="lazy"
        />
      ) : (
        <>
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,0.35), transparent 60%),
                         radial-gradient(100% 80% at 80% 100%, rgba(0,0,0,0.22), transparent 55%)`,
            pointerEvents: "none",
          }}/>
          {grainy && (
            <div style={{
              position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: 0.35,
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
              pointerEvents: "none",
            }}/>
          )}
          {product ? <GarmentRender product={product} tone={tone} view={view}/> : null}
        </>
      )}
      {caption && (
        <div style={{
          position: "absolute", left: 12, bottom: 12, right: 12,
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
          textTransform: "uppercase", color: imageUrl ? "white" : t.fg, opacity: 0.85,
          display: "flex", justifyContent: "space-between",
          textShadow: imageUrl ? "0 1px 4px rgba(0,0,0,0.6)" : "none",
        }}>
          <span>{caption}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function mixColor(a: string, b: string, amount: number): string {
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa.r * (1 - amount) + pb.r * amount);
  const g = Math.round(pa.g * (1 - amount) + pb.g * amount);
  const bl = Math.round(pa.b * (1 - amount) + pb.b * amount);
  return `rgb(${r}, ${g}, ${bl})`;
}
function parseHex(h: string): { r: number; g: number; b: number } {
  if (h.startsWith("rgb")) {
    const m = h.match(/\d+/g)!;
    return { r: +m[0], g: +m[1], b: +m[2] };
  }
  const s = h.replace("#", "");
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}

function GarmentRender({ product, tone, view = "front" }: { product: Product; tone: string; view?: string }) {
  const t = TONE[tone] ?? TONE.sand;
  const type = garmentTypeFor(product);
  const garmentColor = mixColor(t.bg, t.fg, 0.35);
  const rotations: Record<string, number> = { front: 0, detail: 8, back: -6, movement: 4 };
  const scales: Record<string, number> = { front: 1, detail: 1.35, back: 0.95, movement: 1.1 };
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      transform: `rotate(${rotations[view] ?? 0}deg) scale(${scales[view] ?? 1})`,
      transition: "transform var(--dur-3) var(--ease)",
    }}>
      <Garment type={type} color={garmentColor} accent={t.fg} size="62%" style={{ width: "62%", height: "auto" }}/>
    </div>
  );
}

// ─── Btn ─────────────────────────────────────────────────────────────────────

interface BtnProps {
  variant?: "primary" | "accent" | "outline" | "ghost" | "subtle";
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  icon?: ReactNode;
  disabled?: boolean;
}

export function Btn({ variant = "primary", size = "md", children, onClick, style = {}, icon, disabled }: BtnProps) {
  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em",
    textTransform: "uppercase", fontWeight: 500,
    transition: "all var(--dur-1) var(--ease)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
  };
  const sizes: Record<string, CSSProperties> = {
    sm: { padding: "8px 14px", minHeight: 32 },
    md: { padding: "12px 20px", minHeight: 40 },
    lg: { padding: "16px 28px", minHeight: 52 },
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: "var(--brand-foreground)", color: "white", border: "1px solid var(--brand-foreground)" },
    accent:  { background: "var(--brand-primary)",    color: "white", border: "1px solid var(--brand-primary)" },
    outline: { background: "transparent", color: "var(--brand-foreground)", border: "1px solid var(--brand-foreground)" },
    ghost:   { background: "transparent", color: "var(--brand-foreground)", border: "1px solid transparent" },
    subtle:  { background: "var(--brand-surface)",    color: "var(--brand-foreground)", border: "1px solid var(--brand-border)" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {icon}{children}
    </button>
  );
}

// ─── Tag ─────────────────────────────────────────────────────────────────────

interface TagProps {
  children: ReactNode;
  tone?: "muted" | "accent" | "outline" | "dark";
  style?: CSSProperties;
}

export function Tag({ children, tone = "muted", style = {} }: TagProps) {
  const variants: Record<string, CSSProperties> = {
    muted:   { background: "var(--brand-surface)",    color: "var(--brand-foreground)" },
    accent:  { background: "var(--brand-primary)",    color: "white" },
    outline: { background: "transparent",             color: "var(--brand-foreground)", border: "1px solid var(--brand-border)" },
    dark:    { background: "var(--brand-foreground)", color: "white" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
      textTransform: "uppercase", fontWeight: 500,
      ...variants[tone], ...style,
    }}>{children}</span>
  );
}
