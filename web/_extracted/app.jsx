// app.jsx — Main shell + screen router + Tweaks
const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primaryColor": "#A67049",
  "backgroundColor": "#FAF7F1",
  "surfaceColor": "#EFE7D7",
  "foregroundColor": "#2B2017",
  "displayFont": "Instrument Serif",
  "tenantName": "Meu Mostruário",
  "showAnnouncementBar": true
}/*EDITMODE-END*/;

function App() {
  const [screen, setScreen] = useState(() => localStorage.getItem("mst_screen") || "home");
  const [productId, setProductId] = useState(() => localStorage.getItem("mst_pid") || "SOL-001");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useEffect(() => { localStorage.setItem("mst_screen", screen); window.scrollTo({ top: 0 }); }, [screen]);
  useEffect(() => { localStorage.setItem("mst_pid", productId); }, [productId]);

  // Apply tweaks to CSS vars
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--brand-primary", tweaks.primaryColor);
    r.setProperty("--brand-background", tweaks.backgroundColor);
    r.setProperty("--brand-surface", tweaks.surfaceColor);
    r.setProperty("--brand-foreground", tweaks.foregroundColor);
    r.setProperty("--font-display", `"${tweaks.displayFont}", serif`);
    window.TENANT.name = tweaks.tenantName;
  }, [tweaks]);

  // Tweak mode protocol
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data?.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const updateTweak = (key, value) => {
    const next = { ...tweaks, [key]: value };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [key]: value } }, "*");
  };

  const addToCart = (item) => {
    setCart(c => [...c, item]);
    setCartOpen(true);
  };
  const removeItem = (i) => setCart(c => c.filter((_, idx) => idx !== i));

  const cartCount = cart.reduce((a, item) => a + item.total, 0);

  return (
    <div data-screen-label={screen}>
      <TopBar screen={screen} setScreen={setScreen}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenLogin={() => setLoginOpen(true)}/>

      <div data-screen-label={`${screen}`}>
        {screen === "home" && <Home setScreen={setScreen} setProductId={setProductId}/>}
        {screen === "catalog" && <Catalog setScreen={setScreen} setProductId={setProductId} addToCart={addToCart}/>}
        {screen === "product" && <Product productId={productId} setScreen={setScreen} addToCart={addToCart}/>}
        {screen === "lookbook" && <Lookbook setScreen={setScreen} setProductId={setProductId}/>}
        {screen === "admin" && <Admin/>}
      </div>

      <Footer setScreen={setScreen}/>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} removeItem={removeItem}/>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)}/>

      {tweaksOpen && <TweaksPanel tweaks={tweaks} updateTweak={updateTweak} onClose={() => setTweaksOpen(false)}/>}
    </div>
  );
}

function TweaksPanel({ tweaks, updateTweak, onClose }) {
  return (
    <div style={{
      position: "fixed", right: 20, bottom: 20, width: 320, zIndex: 300,
      background: "white", border: "1px solid var(--brand-foreground)",
      boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    }}>
      <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--brand-border)", background: "var(--brand-foreground)", color: "white" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Tweaks · White-label</div>
        <button onClick={onClose} style={{ color: "white" }}><I.X/></button>
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflow: "auto" }}>
        <TweakText label="Nome do tenant" value={tweaks.tenantName} onChange={v => updateTweak("tenantName", v)}/>
        <TweakColor label="Cor primária" value={tweaks.primaryColor} onChange={v => updateTweak("primaryColor", v)}/>
        <TweakColor label="Fundo" value={tweaks.backgroundColor} onChange={v => updateTweak("backgroundColor", v)}/>
        <TweakColor label="Surface" value={tweaks.surfaceColor} onChange={v => updateTweak("surfaceColor", v)}/>
        <TweakColor label="Texto" value={tweaks.foregroundColor} onChange={v => updateTweak("foregroundColor", v)}/>
        <TweakSelect label="Fonte display" value={tweaks.displayFont} onChange={v => updateTweak("displayFont", v)}
          options={["Instrument Serif", "Fraunces", "DM Serif Display", "Playfair Display", "Geist"]}/>
        <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--brand-border)" }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand-muted)", marginBottom: 8 }}>Presets</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {[
              { name: "Coral", primary: "#FF5A3C", bg: "#FFFFFF", surface: "#F0EDE8", fg: "#0A0A0A" },
              { name: "Dune", primary: "#B8946A", bg: "#FAF7F1", surface: "#EFE7D7", fg: "#2B2622" },
              { name: "Noir", primary: "#E94A2C", bg: "#0E0E0E", surface: "#1A1A1A", fg: "#F5F2EC" },
            ].map(p => (
              <button key={p.name} onClick={() => {
                updateTweak("primaryColor", p.primary);
                updateTweak("backgroundColor", p.bg);
                updateTweak("surfaceColor", p.surface);
                updateTweak("foregroundColor", p.fg);
              }} style={{ padding: "8px 4px", border: "1px solid var(--brand-border)", fontSize: 11, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 2 }}>
                  <span style={{ width: 10, height: 10, background: p.primary }}/>
                  <span style={{ width: 10, height: 10, background: p.bg, border: "1px solid var(--brand-border)" }}/>
                  <span style={{ width: 10, height: 10, background: p.fg }}/>
                </div>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function TweakText({ label, value, onChange }) {
  return (
    <label>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand-muted)", marginBottom: 4 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--brand-border)", fontSize: 13 }}/>
    </label>
  );
}
function TweakColor({ label, value, onChange }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 36, height: 32, border: "1px solid var(--brand-border)", padding: 2 }}/>
        <input value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--brand-border)", fontFamily: "var(--font-mono)", fontSize: 11 }}/>
      </div>
    </div>
  );
}
function TweakSelect({ label, value, onChange, options }) {
  return (
    <label>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand-muted)", marginBottom: 4 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--brand-border)", fontSize: 13 }}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
