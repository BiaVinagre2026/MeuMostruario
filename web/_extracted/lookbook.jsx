// lookbook.jsx + admin.jsx combined

function Lookbook({ setScreen, setProductId }) {
  const [active, setActive] = React.useState(0);
  const book = window.LOOKBOOK[active];
  return (
    <main>
      <section style={{ padding: "48px 32px 0" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Editorial · 3 histórias</div>
          <h1 className="display" style={{ fontSize: 120, lineHeight: 0.9 }}>Lookbook<em>.</em></h1>
          <div style={{ display: "flex", gap: 32, marginTop: 32, borderBottom: "1px solid var(--brand-border)" }}>
            {window.LOOKBOOK.map((l, i) => (
              <button key={l.id} onClick={() => setActive(i)} style={{
                paddingBottom: 16, fontFamily: "var(--font-mono)", fontSize: 12,
                letterSpacing: "0.12em", textTransform: "uppercase",
                borderBottom: "1px solid " + (active === i ? "var(--brand-foreground)" : "transparent"),
                color: active === i ? "var(--brand-foreground)" : "var(--brand-muted)",
              }}>0{i+1} · {l.title}</button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "64px 32px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 64 }}>
          <div style={{ position: "sticky", top: 130, alignSelf: "start" }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--brand-muted)" }}>Capítulo 0{active+1}</div>
            <h2 className="display" style={{ fontSize: 88, lineHeight: 0.95, margin: "16px 0 24px" }}>{book.title}<em>.</em></h2>
            <p style={{ fontSize: 20, lineHeight: 1.4, color: "var(--brand-muted)" }}>{book.subtitle}</p>
            <div className="mono" style={{ fontSize: 11, marginTop: 32, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)" }}>
              {book.season} · {book.shots} looks · Styling interno
            </div>
            <Btn variant="outline" style={{ marginTop: 32 }} onClick={() => setScreen("catalog")}>Ver peças da história →</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {Array.from({ length: book.shots }).map((_, i) => {
              const spanTwo = i === 0 || i === 3;
              return (
                <Photo key={i} tone={i % 2 === 0 ? book.tone : (i%3===0 ? "cream" : "noir")}
                  ratio="3/4" product={window.PRODUCTS[(i * 3) % window.PRODUCTS.length]}
                  view={["front","detail","back","movement"][i % 4]}
                  caption={`LOOK ${String(i+1).padStart(2,"0")} · ${book.title}`}
                  style={{ gridColumn: spanTwo ? "span 2" : "auto", aspectRatio: spanTwo ? "3/2" : "3/4" }}/>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function Admin() {
  const [primary, setPrimary] = React.useState(getComputedStyle(document.documentElement).getPropertyValue("--brand-primary").trim() || "#FF5A3C");
  const [bg, setBg] = React.useState(getComputedStyle(document.documentElement).getPropertyValue("--brand-background").trim() || "#FFFFFF");
  const [surface, setSurface] = React.useState(getComputedStyle(document.documentElement).getPropertyValue("--brand-surface").trim() || "#F0EDE8");
  const [font, setFont] = React.useState("Instrument Serif");
  const [tenantName, setTenantName] = React.useState(window.TENANT.name);

  const apply = (k, v) => document.documentElement.style.setProperty(k, v);
  React.useEffect(() => { apply("--brand-primary", primary); }, [primary]);
  React.useEffect(() => { apply("--brand-background", bg); }, [bg]);
  React.useEffect(() => { apply("--brand-surface", surface); }, [surface]);
  React.useEffect(() => {
    document.documentElement.style.setProperty("--font-display", `"${font}", serif`);
  }, [font]);

  return (
    <main>
      <section style={{ padding: "48px 32px", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="eyebrow">SaaS · White-label console</div>
          <h1 className="display" style={{ fontSize: 88, marginTop: 12 }}>Admin<em>.</em></h1>
          <p style={{ fontSize: 17, color: "var(--brand-muted)", maxWidth: 620, marginTop: 16 }}>
            Controle como seu mostruário aparece para as lojistas. Mudanças entram em produção em tempo real — sem deploy.
          </p>
        </div>
      </section>

      <section style={{ padding: "48px 32px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "340px 1fr", gap: 64 }}>
          {/* Left — controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <Group title="Identidade">
              <TextInput label="Nome do tenant" value={tenantName} onChange={v => { setTenantName(v); window.TENANT.name = v; }}/>
              <TextInput label="Handle" value={window.TENANT.handle}/>
              <Uploader label="Logo · SVG/PNG"/>
            </Group>
            <Group title="Cores da marca">
              <ColorRow label="Primária (accent)" value={primary} onChange={setPrimary}/>
              <ColorRow label="Fundo" value={bg} onChange={setBg}/>
              <ColorRow label="Surface" value={surface} onChange={setSurface}/>
            </Group>
            <Group title="Tipografia">
              <Select label="Display" value={font} onChange={setFont} options={["Instrument Serif", "Fraunces", "DM Serif Display", "Geist", "Inter"]}/>
              <Select label="Corpo" value="Geist" options={["Geist", "Inter", "Helvetica"]}/>
            </Group>
            <Group title="Regras de pedido">
              <TextInput label="Pedido mínimo (peças)" value={window.TENANT.minOrder.units}/>
              <TextInput label="Pedido mínimo (R$)" value={window.TENANT.minOrder.amount}/>
              <TextInput label="WhatsApp atacado" value={window.TENANT.whatsapp}/>
            </Group>
          </div>

          {/* Right — live preview */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <div className="eyebrow">Preview ao vivo</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--brand-muted)" }}>mostuario.{window.TENANT.id}.app</div>
            </div>
            <div style={{ border: "1px solid var(--brand-border)" }}>
              {/* Fake browser chrome */}
              <div style={{ padding: 12, background: "var(--brand-surface-2)", borderBottom: "1px solid var(--brand-border)", display: "flex", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#E86B59" }}/>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#E8C15A" }}/>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#7AB872" }}/>
              </div>
              <div style={{ background: "var(--brand-background)", padding: 48 }}>
                <Logo size={18}/>
                <h2 className="display" style={{ fontSize: 80, lineHeight: 0.95, marginTop: 48 }}>Solar<em>.</em></h2>
                <div style={{ display: "flex", gap: 8, marginTop: 32 }}>
                  <Btn variant="accent">Ver catálogo</Btn>
                  <Btn variant="outline">Lookbook</Btn>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, marginTop: 48 }}>
                  {window.PRODUCTS.filter(p=>p.featured).slice(0,3).map(p => (
                    <div key={p.id}>
                      <Photo tone={p.colors[0].tone} ratio="3/4" product={p} caption={p.id}/>
                      <div style={{ padding: "12px 0", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span>{p.name}</span>
                        <span className="mono">{brl(p.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <Metric label="Tenants ativos" value="47"/>
              <Metric label="Pedidos semana" value="312"/>
              <Metric label="Try-on usados" value="1.8k"/>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Group({ title, children }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--brand-foreground)" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}
function TextInput({ label, value, onChange }) {
  return (
    <label style={{ display: "block" }}>
      <div className="mono" style={{ fontSize: 10, color: "var(--brand-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <input value={value} onChange={e => onChange?.(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--brand-border)", fontSize: 14, background: "white" }}/>
    </label>
  );
}
function ColorRow({ label, value, onChange }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, color: "var(--brand-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 40, height: 40, border: "1px solid var(--brand-border)", padding: 2, background: "white" }}/>
        <input value={value} onChange={e => onChange(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--brand-border)", fontFamily: "var(--font-mono)", fontSize: 12, background: "white" }}/>
      </div>
    </div>
  );
}
function Select({ label, value, onChange, options = [] }) {
  return (
    <label style={{ display: "block" }}>
      <div className="mono" style={{ fontSize: 10, color: "var(--brand-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <select value={value} onChange={e => onChange?.(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--brand-border)", fontSize: 14, background: "white" }}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
function Uploader({ label }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, color: "var(--brand-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ border: "1px dashed var(--brand-border)", padding: 20, textAlign: "center", fontSize: 12, color: "var(--brand-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <I.Upload size={14}/> Enviar arquivo
      </div>
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div style={{ padding: 20, border: "1px solid var(--brand-border)" }}>
      <div className="display" style={{ fontSize: 44 }}>{value}</div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)", marginTop: 8 }}>{label}</div>
    </div>
  );
}

Object.assign(window, { Lookbook, Admin });
