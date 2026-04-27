// cart.jsx — Order drawer with WhatsApp checkout

function CartDrawer({ open, onClose, cart, removeItem, updateItem }) {
  if (!open) return null;
  const subtotal = cart.reduce((a, item) => a + item.total * item.price, 0);
  const unitsTotal = cart.reduce((a, item) => a + item.total, 0);
  const tier = window.TIERS.filter(t => unitsTotal >= t.min && (!t.max || unitsTotal <= t.max))[0] || window.TIERS[0];
  const discount = subtotal * (tier.discount/100);
  const total = subtotal - discount;

  const metMinUnits = unitsTotal >= window.TENANT.minOrder.units;
  const metMinAmount = total >= window.TENANT.minOrder.amount;
  const canCheckout = metMinUnits && metMinAmount && cart.length > 0;

  const whatsapp = () => {
    const lines = cart.map(i => {
      const color = i.colors.find(c => c.id === i.colorId);
      const grade = Object.entries(i.qty).filter(([,q])=>q>0).map(([s,q]) => `${s}×${q}`).join(" ");
      return `• ${i.name} (${i.id}) · ${color.name} · ${grade} = ${i.total}un`;
    }).join("\n");
    const msg = `Olá ${window.TENANT.name}, quero fechar pedido:\n\n${lines}\n\nTotal: ${unitsTotal}un · ${window.brl(total)}`;
    alert("Abriria WhatsApp com:\n\n" + msg);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.4)", zIndex: 150, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, background: "white", height: "100%", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: 24, borderBottom: "1px solid var(--brand-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="eyebrow">Pedido em andamento</div>
            <div className="display" style={{ fontSize: 32, marginTop: 4 }}>Seu mostruário</div>
          </div>
          <button onClick={onClose}><I.X/></button>
        </div>

        {/* MOQ progress */}
        <div style={{ padding: 16, background: "var(--brand-surface-2)", borderBottom: "1px solid var(--brand-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            <span>Pedido mínimo</span>
            <span>{unitsTotal}/{window.TENANT.minOrder.units} peças · {window.brl(total)}/{window.brl(window.TENANT.minOrder.amount)}</span>
          </div>
          <div style={{ height: 3, background: "var(--brand-border)" }}>
            <div style={{ height: "100%", background: canCheckout ? "var(--brand-primary)" : "var(--brand-foreground)", width: `${Math.min(100, (unitsTotal/window.TENANT.minOrder.units)*100)}%`, transition: "width var(--dur-2) var(--ease)" }}/>
          </div>
          {tier.discount > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--brand-primary)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              · Nível {tier.label} · −{tier.discount}% aplicado
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {cart.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div className="display" style={{ fontSize: 40, marginBottom: 12 }}>Vazio por ora.</div>
              <p style={{ fontSize: 13, color: "var(--brand-muted)" }}>Monte a grade no catálogo ou na página da peça.</p>
            </div>
          ) : cart.map((item, i) => {
            const color = item.colors.find(c => c.id === item.colorId);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 16, padding: 20, borderBottom: "1px solid var(--brand-border)" }}>
                <div style={{ width: 80, height: 100, background: window.TONE[color.tone].bg }}/>
                <div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--brand-muted)", letterSpacing: "0.1em" }}>{item.id}</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: "var(--brand-muted)", marginBottom: 8 }}>{color.name}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {Object.entries(item.qty).filter(([,q])=>q>0).map(([s, q]) => (
                      <span key={s} className="mono" style={{ fontSize: 11, padding: "3px 8px", background: "var(--brand-surface)" }}>{s}×{q}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{window.brl(item.total * item.price)}</div>
                  <button onClick={() => removeItem(i)} className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)", borderBottom: "1px solid var(--brand-border)" }}>Remover</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {cart.length > 0 && (
          <div style={{ padding: 24, borderTop: "1px solid var(--brand-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span>Subtotal ({unitsTotal} peças)</span><span className="mono">{window.brl(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: "var(--brand-primary)" }}>
                <span>Desconto {tier.label} (−{tier.discount}%)</span><span className="mono">−{window.brl(discount)}</span>
              </div>
            )}
            <div style={{ height: 1, background: "var(--brand-border)", margin: "12px 0" }}/>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <span style={{ fontSize: 14 }}>Total</span>
              <span className="display" style={{ fontSize: 36 }}>{window.brl(total)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Btn variant="accent" size="lg" icon={<I.Whats/>} disabled={!canCheckout} onClick={whatsapp}>WhatsApp</Btn>
              <Btn variant="primary" size="lg" disabled={!canCheckout}>Fechar via portal</Btn>
            </div>
            {!canCheckout && (
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--brand-primary)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Faltam {!metMinUnits ? `${window.TENANT.minOrder.units - unitsTotal} peças` : ""}{!metMinUnits && !metMinAmount ? " e " : ""}{!metMinAmount ? `${window.brl(window.TENANT.minOrder.amount - total)}` : ""} para fechar
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoginModal({ open, onClose }) {
  if (!open) return null;
  const [mode, setMode] = React.useState("login"); // login | register
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.6)", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", width: "min(880px, 100%)", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <Photo tone="clay" ratio="auto" product={window.PRODUCTS.find(x=>x.id==="OFF-022")} caption="Área do lojista" style={{ aspectRatio: "auto", minHeight: 480 }}/>
        <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="eyebrow">Multimarca · B2B</div>
            <button onClick={onClose}><I.X/></button>
          </div>
          <h2 className="display" style={{ fontSize: 48, lineHeight: 1 }}>
            {mode === "login" ? <>Área do <em>lojista</em>.</> : <>Cadastrar <em>multimarca</em>.</>}
          </h2>
          {mode === "login" ? (
            <>
              <Field label="E-mail" placeholder="contato@sualoja.com.br"/>
              <Field label="Senha" type="password" placeholder="••••••••"/>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: -8 }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox"/> Manter conectada</label>
                <button style={{ borderBottom: "1px solid currentColor" }}>Esqueci a senha</button>
              </div>
              <Btn variant="primary" size="lg">Entrar</Btn>
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--brand-muted)" }}>
                Ainda não tem cadastro? <button onClick={() => setMode("register")} style={{ borderBottom: "1px solid currentColor", color: "var(--brand-foreground)" }}>Criar conta B2B</button>
              </div>
            </>
          ) : (
            <>
              <Field label="CNPJ" placeholder="00.000.000/0001-00"/>
              <Field label="Nome da loja" placeholder="Sua Marca"/>
              <Field label="E-mail do comprador"/>
              <Field label="Cidade / UF"/>
              <Btn variant="primary" size="lg">Enviar cadastro</Btn>
              <div style={{ fontSize: 11, color: "var(--brand-muted)", lineHeight: 1.5 }}>
                Aprovação em até 24h. Você recebe e-mail com acesso ao mostruário, tabela de preços e regras de pagamento.
              </div>
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--brand-muted)" }}>
                Já tem conta? <button onClick={() => setMode("login")} style={{ borderBottom: "1px solid currentColor", color: "var(--brand-foreground)" }}>Entrar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", placeholder }) {
  return (
    <label style={{ display: "block" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <input type={type} placeholder={placeholder}
        style={{ width: "100%", padding: "12px 0", border: 0, borderBottom: "1px solid var(--brand-foreground)", fontSize: 15, background: "transparent", outline: "none" }}/>
    </label>
  );
}

Object.assign(window, { CartDrawer, LoginModal });
