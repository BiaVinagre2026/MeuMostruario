import { useNavigate, useLocation } from "react-router-dom";
import { Logo } from "./primitives";
import { Icons } from "./icons";
import { useCartStore } from "@/stores/useCartStore";

export function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cartCount = useCartStore((s) => s.totalUnits());
  const openCart = useCartStore((s) => s.open);

  const links = [
    { path: "/",          label: "Início" },
    { path: "/catalog",   label: "Catálogo" },
    { path: "/lookbook",  label: "Lookbook" },
  ];

  const active = (path: string) => pathname === path;

  return (
    <>
      <div style={{
        background: "var(--brand-foreground)", color: "white",
        fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.12em",
        textTransform: "uppercase", padding: "8px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>Drop Solar — Verão 26 · Pedidos até 30/05</span>
        <span style={{ opacity: 0.6 }}>Pedido mínimo 12 peças · R$ 1.500</span>
        <span style={{ opacity: 0.6 }}>Entregas: SP • RJ • BH • POA</span>
      </div>

      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--brand-background)",
        borderBottom: "1px solid var(--brand-border)",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center", padding: "18px 32px",
        }}>
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

          <button onClick={() => navigate("/")} style={{ justifySelf: "center" }}>
            <Logo size={22}/>
          </button>

          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
            <IconBtn><Icons.Search/></IconBtn>
            <IconBtn onClick={() => navigate("/login")} label="Lojista"><Icons.User/></IconBtn>
            <IconBtn onClick={openCart} label={cartCount ? String(cartCount) : ""}>
              <Icons.Bag/>
            </IconBtn>
            <button onClick={() => navigate("/admin/login")} style={{
              marginLeft: 8,
              padding: "6px 12px",
              fontFamily: "var(--font-mono)", fontSize: 9,
              letterSpacing: "0.12em", textTransform: "uppercase",
              border: "1px solid var(--brand-border)",
              color: "var(--brand-muted)",
              cursor: "pointer",
              background: "transparent",
              whiteSpace: "nowrap",
            }}>
              Admin
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label?: string }) {
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
