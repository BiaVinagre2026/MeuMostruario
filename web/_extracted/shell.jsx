// shell.jsx — Top nav, footer, minimum-order strip

function TopBar({ screen, setScreen, cartCount, onOpenCart, onOpenLogin }) {
  const links = [
    { id: "home", label: "Início" },
    { id: "catalog", label: "Catálogo" },
    { id: "lookbook", label: "Lookbook" },
    { id: "admin", label: "Admin" },
  ];
  return (
    <>
      {/* Announcement bar */}
      <div style={{
        background: "var(--brand-foreground)", color: "white",
        fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.12em",
        textTransform: "uppercase", padding: "8px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>Drop Solar — Verão 26 · Pedidos até 30/05</span>
        <span style={{ opacity: 0.6 }}>Pedido mínimo {window.TENANT.minOrder.units} peças · R$ {window.TENANT.minOrder.amount.toLocaleString("pt-BR")}</span>
        <span style={{ opacity: 0.6 }}>Entregas: SP • RJ • BH • POA</span>
      </div>

      {/* Main nav */}
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
              <button key={l.id} onClick={() => setScreen(l.id)}
                style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: screen === l.id ? "var(--brand-foreground)" : "var(--brand-muted)",
                  borderBottom: screen === l.id ? "1px solid var(--brand-foreground)" : "1px solid transparent",
                  paddingBottom: 3, fontWeight: 500,
                }}>
                {l.label}
              </button>
            ))}
          </nav>
          <button onClick={() => setScreen("home")} style={{ justifySelf: "center" }}>
            <Logo size={22}/>
          </button>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
            <IconBtn><I.Search/></IconBtn>
            <IconBtn onClick={onOpenLogin} label="Lojista"><I.User/></IconBtn>
            <IconBtn onClick={onOpenCart} label={cartCount ? String(cartCount) : ""}>
              <I.Bag/>
            </IconBtn>
          </div>
        </div>
      </header>
    </>
  );
}

function IconBtn({ children, onClick, label }) {
  return (
    <button onClick={onClick}
      style={{
        width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
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

function Footer({ setScreen }) {
  const cols = [
    { title: "Vendas", items: ["Como comprar", "Pedido mínimo", "Formas de pagamento", "Representantes", "Devoluções"] },
    { title: "Coleções", items: window.COLLECTIONS.map(c => c.name) },
    { title: "Atelier", items: ["Sobre", "Processo", "Matérias-primas", "Sustentabilidade", "Contato"] },
  ];
  return (
    <footer style={{ background: "var(--brand-foreground)", color: "white", padding: "80px 32px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, maxWidth: 1440, margin: "0 auto" }}>
        <div>
          <Logo size={28}/>
          <p className="display" style={{ fontSize: 40, lineHeight: 1, marginTop: 32, maxWidth: 380 }}>
            Moda feita em <em>pequenos lotes</em>, para multimarcas curadas.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <Btn variant="accent" icon={<I.Whats/>} onClick={() => alert("Abre WhatsApp: " + window.TENANT.whatsapp)}>Falar com o atacado</Btn>
          </div>
        </div>
        {cols.map(c => (
          <div key={c.title}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5, marginBottom: 20 }}>
              {c.title}
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {c.items.map(i => <li key={i} style={{ fontSize: 14 }}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{
        maxWidth: 1440, margin: "64px auto 0", paddingTop: 24,
        borderTop: "1px solid rgba(255,255,255,0.15)",
        display: "flex", justifyContent: "space-between",
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
        opacity: 0.5,
      }}>
        <span>{window.TENANT.name} Atelier · {window.TENANT.cnpj}</span>
        <span>São Paulo · Brasil</span>
        <span>Powered by Mostruário — SaaS white-label</span>
      </div>
    </footer>
  );
}

Object.assign(window, { TopBar, Footer, IconBtn });
