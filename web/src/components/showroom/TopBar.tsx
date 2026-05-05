import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Logo } from "./primitives";
import { Icons } from "./icons";
import { useCartStore } from "@/stores/useCartStore";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export function TopBar() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const cartCount = useCartStore((s) => s.totalUnits());
  const openCart  = useCartStore((s) => s.open);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile  = useIsMobile();

  const links = [
    { path: "/",        label: "Início" },
    { path: "/catalog", label: "Catálogo" },
  ];

  const active = (path: string) => pathname === path;

  const handleNavClick = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <>
      {/* ── Banner ─────────────────────────────────────────────── */}
      <div style={{
        background: "var(--brand-foreground)", color: "white",
        fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.12em",
        textTransform: "uppercase", padding: isMobile ? "7px 12px" : "8px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 12,
      }}>
        {isMobile ? (
          <span style={{ fontSize: 9.5, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Drop Solar — Verão 26 · Pedidos até 30/05
          </span>
        ) : (
          <>
            <span style={{ opacity: 0.6 }}>Pedido mínimo 12 peças · R$ 1.500</span>
            <span>Drop Solar — Verão 26 · Pedidos até 30/05</span>
            <span style={{ opacity: 0.6 }}>Entregas: SP • RJ • BH • POA</span>
          </>
        )}
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--brand-background)",
        borderBottom: "1px solid var(--brand-border)",
      }}>
        {isMobile ? (
          /* ── Layout mobile: [hamburger] [logo] [ícones] ── */
          <div style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr auto",
            alignItems: "center",
            padding: "12px 14px",
          }}>
            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              style={{ width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--brand-foreground)" }}
            >
              <HamburgerIcon />
            </button>

            {/* Logo centralizado */}
            <button onClick={() => navigate("/")} style={{ justifySelf: "center" }}>
              <Logo size={16} />
            </button>

            {/* Ícones */}
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
              <IconBtn onClick={() => navigate("/login")} label={cartCount ? undefined : "Lojista"}>
                <Icons.User />
              </IconBtn>
              <IconBtn onClick={openCart} label={cartCount ? String(cartCount) : ""}>
                <Icons.Bag />
              </IconBtn>
            </div>
          </div>
        ) : (
          /* ── Layout desktop: [nav] [logo] [ícones] ── */
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            padding: "18px 32px",
          }}>
            {/* Nav */}
            <nav style={{ display: "flex", gap: 28 }}>
              {links.map(l => (
                <button key={l.path} onClick={() => navigate(l.path)}
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: active(l.path) ? "var(--brand-foreground)" : "var(--brand-muted)",
                    borderBottom: active(l.path) ? "1px solid var(--brand-foreground)" : "1px solid transparent",
                    paddingBottom: 3, fontWeight: 500,
                  }}>
                  {l.label}
                </button>
              ))}
            </nav>

            {/* Logo centrado */}
            <button onClick={() => navigate("/")} style={{ justifySelf: "center" }}>
              <Logo size={22} />
            </button>

            {/* Ações */}
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
              <IconBtn><Icons.Search /></IconBtn>
              <IconBtn onClick={() => navigate("/login")} label="Lojista"><Icons.User /></IconBtn>
              <IconBtn onClick={openCart} label={cartCount ? String(cartCount) : ""}>
                <Icons.Bag />
              </IconBtn>
              <button onClick={() => navigate("/admin/login")} style={{
                marginLeft: 8, padding: "6px 12px",
                fontFamily: "var(--font-mono)", fontSize: 9,
                letterSpacing: "0.12em", textTransform: "uppercase",
                border: "1px solid var(--brand-border)",
                color: "var(--brand-muted)", cursor: "pointer",
                background: "transparent", whiteSpace: "nowrap",
              }}>
                Admin
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Menu Drawer (mobile) ────────────────────────────────── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          role="dialog"
          aria-modal
          aria-label="Menu de navegação"
          style={{
            position: "fixed", inset: 0, zIndex: 140,
            background: "rgba(10,10,10,0.45)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", top: 0, left: 0, bottom: 0,
              width: 280, background: "var(--brand-background)",
              borderRight: "1px solid var(--brand-border)",
              display: "flex", flexDirection: "column", paddingTop: 24,
            }}
          >
            {/* Header do drawer */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "0 24px 20px", borderBottom: "1px solid var(--brand-border)", marginBottom: 8,
            }}>
              <Logo size={18} />
              <button onClick={() => setMenuOpen(false)} aria-label="Fechar menu"
                style={{ color: "var(--brand-muted)" }}>
                <Icons.X />
              </button>
            </div>

            {/* Links */}
            {links.map(l => (
              <button
                key={l.path}
                onClick={() => handleNavClick(l.path)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "16px 24px",
                  fontFamily: "var(--font-mono)", fontSize: 12,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  borderBottom: "1px solid var(--brand-border)",
                  color: active(l.path) ? "var(--brand-foreground)" : "var(--brand-muted)",
                  fontWeight: active(l.path) ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {l.label}
              </button>
            ))}

            {/* Link admin no rodapé */}
            <button
              onClick={() => { navigate("/admin/login"); setMenuOpen(false); }}
              style={{
                marginTop: "auto", padding: "16px 24px",
                fontFamily: "var(--font-mono)", fontSize: 10,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "var(--brand-muted)", borderTop: "1px solid var(--brand-border)",
                cursor: "pointer", background: "transparent", textAlign: "left",
              }}
            >
              Admin
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBtn({
  children, onClick, label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button onClick={onClick}
      style={{ width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {children}
      {label && (
        <span style={{
          position: "absolute", top: 4, right: 4,
          background: "var(--brand-primary)", color: "white",
          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
          minWidth: 16, height: 16, borderRadius: 999,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          padding: "0 4px",
        }}>{label}</span>
      )}
    </button>
  );
}
