// ui.jsx — Shared UI primitives: Photo placeholders, Logo, Buttons, Badges
// Photos are tonal placeholders built from CSS — designed to be swapped for real editorial shots later.

function Logo({ size = 20 }) {
  // Custom wordmark — original, not a logo rip
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1"/>
        <path d="M7 12 L17 12 M12 7 L12 17" stroke="currentColor" strokeWidth="1"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
      <span className="display" style={{ fontSize: size * 1.25, letterSpacing: "-0.04em" }}>
        {window.TENANT.name}
      </span>
    </div>
  );
}

// Tonal "photo" — an editorial placeholder with a garment illustration.
function Photo({ tone = "sand", ratio = "3/4", subject, caption, children, style = {}, grainy = true, product, view = "front" }) {
  const t = window.TONE[tone] || window.TONE.sand;
  return (
    <div className="photo" style={{
      position: "relative",
      aspectRatio: ratio,
      background: t.bg,
      color: t.fg,
      overflow: "hidden",
      ...style,
    }}>
      {/* Soft tonal gradient to imply light */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,0.35), transparent 60%),
                     radial-gradient(100% 80% at 80% 100%, rgba(0,0,0,0.22), transparent 55%)`,
        pointerEvents: "none",
      }}/>
      {/* Subtle grain */}
      {grainy && (
        <div style={{
          position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: 0.35,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
          pointerEvents: "none",
        }}/>
      )}
      {/* Garment illustration (preferred) or abstract glyph */}
      {product ? (
        <GarmentRender product={product} tone={tone} view={view}/>
      ) : (
        <SubjectGlyph subject={subject} color={t.fg} />
      )}
      {/* caption */}
      {caption && (
        <div style={{
          position: "absolute", left: 12, bottom: 12, right: 12,
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
          textTransform: "uppercase", color: t.fg, opacity: 0.7,
          display: "flex", justifyContent: "space-between",
        }}>
          <span>{caption}</span>
          <span>{tone.toUpperCase()}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function GarmentRender({ product, tone, view = "front" }) {
  const t = window.TONE[tone] || window.TONE.sand;
  const type = window.garmentTypeFor(product);
  // Slightly mix garment color with tone for cohesion
  const garmentColor = mixColor(t.bg, t.fg, 0.35);
  const rotations = { front: 0, detail: 8, back: -6, movement: 4 };
  const scales = { front: 1, detail: 1.35, back: 0.95, movement: 1.1 };
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      transform: `rotate(${rotations[view] || 0}deg) scale(${scales[view] || 1})`,
      transition: "transform var(--dur-3) var(--ease)",
    }}>
      <window.Garment type={type} color={garmentColor} accent={t.fg} size="62%" style={{ width: "62%", height: "auto" }}/>
    </div>
  );
}

function mixColor(a, b, amount) {
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa.r * (1-amount) + pb.r * amount);
  const g = Math.round(pa.g * (1-amount) + pb.g * amount);
  const bl = Math.round(pa.b * (1-amount) + pb.b * amount);
  return `rgb(${r}, ${g}, ${bl})`;
}
function parseHex(h) {
  if (h.startsWith("rgb")) {
    const m = h.match(/\d+/g);
    return { r: +m[0], g: +m[1], b: +m[2] };
  }
  const s = h.replace("#", "");
  return { r: parseInt(s.slice(0,2),16), g: parseInt(s.slice(2,4),16), b: parseInt(s.slice(4,6),16) };
}

// Simple geometric silhouette hints for each subject type — NOT realistic drawings.
// Abstract shapes only (bars, circles) that suggest scale & framing.
function SubjectGlyph({ subject, color }) {
  if (!subject) return null;
  const style = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.18 };
  // All abstract — nothing figurative.
  const common = { fill: "none", stroke: color, strokeWidth: 1 };
  switch (subject) {
    case "top":
      return <div style={style}><svg viewBox="0 0 100 140" width="60%"><rect x="30" y="35" width="40" height="8" {...common}/><rect x="25" y="50" width="50" height="22" {...common}/></svg></div>;
    case "bottom":
      return <div style={style}><svg viewBox="0 0 100 140" width="60%"><rect x="30" y="50" width="40" height="30" {...common}/></svg></div>;
    case "full":
      return <div style={style}><svg viewBox="0 0 100 140" width="55%"><rect x="30" y="30" width="40" height="80" {...common}/></svg></div>;
    case "body":
      return <div style={style}><svg viewBox="0 0 100 140" width="45%"><circle cx="50" cy="30" r="10" {...common}/><rect x="36" y="44" width="28" height="70" {...common}/></svg></div>;
    case "accessory":
      return <div style={style}><svg viewBox="0 0 100 140" width="40%"><circle cx="50" cy="70" r="22" {...common}/></svg></div>;
    default:
      return null;
  }
}

function Btn({ variant = "primary", size = "md", children, onClick, style = {}, icon, disabled }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em",
    textTransform: "uppercase", fontWeight: 500,
    transition: "all var(--dur-1) var(--ease)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
  };
  const sizes = {
    sm: { padding: "8px 14px", minHeight: 32 },
    md: { padding: "12px 20px", minHeight: 40 },
    lg: { padding: "16px 28px", minHeight: 52 },
  };
  const variants = {
    primary: { background: "var(--brand-foreground)", color: "white", border: "1px solid var(--brand-foreground)" },
    accent:  { background: "var(--brand-primary)", color: "white", border: "1px solid var(--brand-primary)" },
    outline: { background: "transparent", color: "var(--brand-foreground)", border: "1px solid var(--brand-foreground)" },
    ghost:   { background: "transparent", color: "var(--brand-foreground)", border: "1px solid transparent" },
    subtle:  { background: "var(--brand-surface)", color: "var(--brand-foreground)", border: "1px solid var(--brand-border)" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={e => { if (variant === "primary" && !disabled) e.currentTarget.style.background = "var(--brand-primary)"; }}
      onMouseLeave={e => { if (variant === "primary" && !disabled) e.currentTarget.style.background = "var(--brand-foreground)"; }}
    >
      {icon}{children}
    </button>
  );
}

function Tag({ children, tone = "muted", style = {} }) {
  const variants = {
    muted:  { background: "var(--brand-surface)", color: "var(--brand-foreground)" },
    accent: { background: "var(--brand-primary)", color: "white" },
    outline:{ background: "transparent", color: "var(--brand-foreground)", border: "1px solid var(--brand-border)" },
    dark:   { background: "var(--brand-foreground)", color: "white" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px",
      fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
      textTransform: "uppercase", fontWeight: 500,
      ...variants[tone], ...style,
    }}>{children}</span>
  );
}

// BRL currency
function brl(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Icons — minimal line set (original)
const I = {
  Arrow: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M1 7h12m0 0L8 2m5 5L8 12" stroke="currentColor" strokeWidth="1"/></svg>,
  Search: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1"/><path d="m11 11 4 4" stroke="currentColor" strokeWidth="1"/></svg>,
  Bag: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 5h10l-1 9H4L3 5Z" stroke="currentColor" strokeWidth="1"/><path d="M6 5V3a2 2 0 1 1 4 0v2" stroke="currentColor" strokeWidth="1"/></svg>,
  User: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1"/><path d="M2 14c1-3 3.5-4 6-4s5 1 6 4" stroke="currentColor" strokeWidth="1"/></svg>,
  Whats: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 1.5a6.5 6.5 0 0 0-5.6 9.7L1.5 14.5l3.4-.9A6.5 6.5 0 1 0 8 1.5Z" stroke="currentColor" strokeWidth="1"/><path d="M5.5 6c.5 2 2 3.5 4 4l1-1 1.5.5-.3 1.3c-1.8.3-5.5-.8-6.8-4.8L5.5 5l1.3.5L6.3 7 5.5 6Z" fill="currentColor"/></svg>,
  Plus: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1"/></svg>,
  Minus: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M1 7h12" stroke="currentColor" strokeWidth="1"/></svg>,
  X: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1"/></svg>,
  Upload: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 11V2m0 0L4 6m4-4 4 4M2 12v2h12v-2" stroke="currentColor" strokeWidth="1"/></svg>,
  Camera: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="1.5" y="4" width="13" height="9" stroke="currentColor" strokeWidth="1"/><circle cx="8" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1"/><path d="M5 4V2.5h6V4" stroke="currentColor" strokeWidth="1"/></svg>,
  Check: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.2"/></svg>,
  Sparkle: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="0.7"/></svg>,
  Grid: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1"/><rect x="8" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1"/><rect x="1" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1"/><rect x="8" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1"/></svg>,
  List: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1"/></svg>,
  Filter: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1"/></svg>,
  Settings: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M3 3l1.5 1.5M9.5 9.5 11 11M3 11l1.5-1.5M9.5 4.5 11 3" stroke="currentColor" strokeWidth="1"/></svg>,
};

Object.assign(window, { Logo, Photo, Btn, Tag, brl, I });
