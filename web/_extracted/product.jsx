// product.jsx — Product detail with wholesale size grid + Virtual Try-On

function Product({ productId, setScreen, addToCart }) {
  const p = window.PRODUCTS.find(x => x.id === productId) || window.PRODUCTS[0];
  const [colorId, setColorId] = React.useState(p.colors[0].id);
  const [qty, setQty] = React.useState(Object.fromEntries(p.sizes.map(s => [s, 0])));
  const [tryOnOpen, setTryOnOpen] = React.useState(false);
  const [tab, setTab] = React.useState("grade"); // grade | composicao | entrega
  const total = Object.values(qty).reduce((a,b)=>a+b,0);
  const color = p.colors.find(c => c.id === colorId);

  const tierDiscount = window.TIERS.filter(t => total >= t.min && (!t.max || total <= t.max))[0]?.discount || 0;
  const unitPrice = p.price * (1 - tierDiscount/100);
  const orderTotal = total * unitPrice;

  return (
    <main>
      {/* Breadcrumb */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)" }}>
          <button onClick={() => setScreen("home")}>Início</button> / <button onClick={() => setScreen("catalog")}>Catálogo</button> / <span style={{ color: "var(--brand-foreground)" }}>{p.name}</span>
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {/* Gallery */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, borderRight: "1px solid var(--brand-border)" }}>
          <Photo tone={color.tone} ratio="3/4" product={p} view="front" caption={`${p.id} · 01/04`}/>
          <Photo tone={color.tone} ratio="3/4" product={p} view="detail" caption="02/04 · detalhe"/>
          <Photo tone={color.tone} ratio="3/4" product={p} view="back" caption="03/04 · costas"/>
          <Photo tone={color.tone} ratio="3/4" product={p} view="movement" caption="04/04 · movimento"/>
        </div>

        {/* Info + order */}
        <div style={{ padding: "48px 64px", position: "sticky", top: 110, height: "fit-content", maxHeight: "calc(100vh - 110px)", overflow: "auto" }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--brand-muted)", textTransform: "uppercase" }}>
            {p.id} · {p.collection}
          </div>
          <h1 className="display" style={{ fontSize: 64, marginTop: 8, marginBottom: 16 }}>{p.name}</h1>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
            <div className="display" style={{ fontSize: 40 }}>{brl(unitPrice)}</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--brand-muted)" }}>atacado · un</div>
            <div style={{ fontSize: 12, color: "var(--brand-muted)", textDecoration: "line-through" }}>
              Sugerido {brl(p.priceRetail)}
            </div>
          </div>

          {p.description && (
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--brand-muted)", marginBottom: 32, maxWidth: 480 }}>
              {p.description}
            </p>
          )}

          {/* Virtual try-on callout */}
          <button onClick={() => setTryOnOpen(true)} style={{
            width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", marginBottom: 24,
            background: "var(--brand-foreground)", color: "white",
            textAlign: "left",
          }}>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.6, marginBottom: 4 }}>
                Diferencial do mostruário
              </div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Provar no corpo com uma foto</div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              <I.Camera/> Abrir
            </div>
          </button>

          {/* Color */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span className="eyebrow">Cor · {color.name}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--brand-muted)" }}>{p.colors.length} opções</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {p.colors.map(c => (
                <button key={c.id} onClick={() => setColorId(c.id)} style={{
                  padding: "8px 14px", display: "inline-flex", gap: 8, alignItems: "center",
                  border: "1px solid " + (colorId === c.id ? "var(--brand-foreground)" : "var(--brand-border)"),
                  fontSize: 12,
                }}>
                  <span style={{ width: 14, height: 14, background: window.TONE[c.tone].bg, borderRadius: 999 }}/>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Size grid — the hallmark wholesale UX */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span className="eyebrow">Grade de tamanhos</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--brand-muted)" }}>MOQ {p.moq} un</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${p.sizes.length}, 1fr)`, gap: 4 }}>
              {p.sizes.map(s => {
                const stock = p.stockBySize?.[s] ?? 60;
                const low = stock < 30;
                return (
                  <div key={s} style={{ border: "1px solid var(--brand-border)", padding: 12, textAlign: "center", background: qty[s] > 0 ? "var(--brand-surface)" : "white" }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{s}</div>
                    <div className="mono" style={{ fontSize: 9, color: low ? "var(--brand-primary)" : "var(--brand-muted)", marginBottom: 8 }}>
                      {low ? `últimas ${stock}` : `${stock} pç`}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <button onClick={() => setQty({...qty, [s]: Math.max(0, qty[s]-1)})}
                        style={{ width: 20, height: 20, border: "1px solid var(--brand-border)" }}><I.Minus size={10}/></button>
                      <input value={qty[s]} onChange={e => setQty({...qty, [s]: Math.max(0, parseInt(e.target.value||0))})}
                        style={{ width: 30, textAlign: "center", border: 0, fontFamily: "var(--font-mono)", fontSize: 13, background: "transparent" }}/>
                      <button onClick={() => setQty({...qty, [s]: qty[s]+1})}
                        style={{ width: 20, height: 20, border: "1px solid var(--brand-border)" }}><I.Plus size={10}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: "var(--brand-surface-2)", padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span>Total de peças</span><span className="mono">{total}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span>Preço unitário</span><span className="mono">{brl(unitPrice)}</span>
            </div>
            {tierDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: "var(--brand-primary)" }}>
                <span>Desconto por volume</span><span className="mono">−{tierDiscount}%</span>
              </div>
            )}
            <div style={{ height: 1, background: "var(--brand-border)", margin: "12px 0" }}/>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 14 }}>Subtotal</span>
              <span className="display" style={{ fontSize: 28 }}>{brl(orderTotal)}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <Btn variant="primary" size="lg" disabled={total < p.moq}
              onClick={() => addToCart({ ...p, colorId, qty, total })}>
              {total < p.moq ? `FALTAM ${p.moq - total} PARA MOQ` : "ADICIONAR AO PEDIDO"}
            </Btn>
            <Btn variant="outline" size="lg" icon={<I.Whats/>}>WHATSAPP</Btn>
          </div>

          {/* Info tabs */}
          <div style={{ marginTop: 32, borderTop: "1px solid var(--brand-border)" }}>
            <div style={{ display: "flex" }}>
              {[["grade", "Ficha técnica"], ["composicao", "Composição"], ["entrega", "Produção & entrega"]].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  flex: 1, padding: "14px 0",
                  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                  borderBottom: "1px solid " + (tab === id ? "var(--brand-foreground)" : "transparent"),
                  color: tab === id ? "var(--brand-foreground)" : "var(--brand-muted)",
                }}>{label}</button>
              ))}
            </div>
            <div style={{ padding: "20px 0", fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.6 }}>
              {tab === "grade" && (
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {(p.tags || []).map(t => <li key={t}>— {t}</li>)}
                  <li>— Modelagem brasileira, forma padrão</li>
                  <li>— Etiqueta com QR de reposição</li>
                </ul>
              )}
              {tab === "composicao" && (
                <div>
                  <div>{p.fabric || "82% Poliamida · 18% Elastano"}</div>
                  <div>Forro interno · mesma composição</div>
                  <div>Tingimento reativo · baixo uso de água</div>
                </div>
              )}
              {tab === "entrega" && (
                <div>
                  <div>Feito em {p.madeIn || "São Paulo, BR"}</div>
                  <div>Produção 30 dias após confirmação do pedido</div>
                  <div>Envio Jadlog / transportadora própria</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {tryOnOpen && <VirtualTryOn p={p} color={color} onClose={() => setTryOnOpen(false)}/>}
    </main>
  );
}

// Virtual Try-On — upload a photo and preview piece on "body"
function VirtualTryOn({ p, color, onClose }) {
  const [step, setStep] = React.useState(1); // 1 upload, 2 adjust, 3 result
  const [uploaded, setUploaded] = React.useState(null);
  const [size, setSize] = React.useState(p.sizes[Math.floor(p.sizes.length/2)]);
  const [activeColorId, setActiveColorId] = React.useState(color.id);
  const [processing, setProcessing] = React.useState(false);
  const fileRef = React.useRef(null);
  const activeColor = p.colors.find(c => c.id === activeColorId);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setUploaded(url);
    setStep(2);
  };
  const onGenerate = () => {
    setProcessing(true);
    setTimeout(() => { setProcessing(false); setStep(3); }, 1800);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "white", width: "min(1100px, 100%)", height: "min(720px, 90vh)",
        display: "grid", gridTemplateColumns: "1.2fr 1fr", overflow: "hidden",
      }}>
        {/* Left — canvas */}
        <div style={{ background: "var(--brand-surface)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          {step === 1 && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 280, height: 360, border: "1.5px dashed var(--brand-border)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 12, margin: "0 auto", cursor: "pointer",
              }} onClick={() => fileRef.current?.click()}>
                <I.Upload size={28}/>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Arraste uma foto</div>
                <div style={{ fontSize: 11, color: "var(--brand-muted)" }}>ou clique para escolher · JPG/PNG · até 10MB</div>
              </div>
              <input type="file" accept="image/*" ref={fileRef} onChange={onFile} style={{ display: "none" }}/>
              <div style={{ marginTop: 24 }}>
                <button onClick={() => setStep(2)} className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand-muted)", borderBottom: "1px solid var(--brand-muted)" }}>
                  ou usar modelo demo →
                </button>
              </div>
            </div>
          )}
          {step >= 2 && (
            <div style={{ position: "relative", width: "min(100%, 380px)", aspectRatio: "3/4", background: window.TONE[activeColor.tone].bg, overflow: "hidden" }}>
              {uploaded ? (
                <img src={uploaded} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: step === 3 ? "none" : "grayscale(0.3) brightness(0.9)" }}/>
              ) : (
                <div className="ph" style={{ width: "100%", height: "100%" }}>FOTO DA LOJISTA</div>
              )}
              {/* Overlay garment shape */}
              {step >= 2 && (
                <div style={{
                  position: "absolute", left: "30%", right: "30%", top: "28%", bottom: "30%",
                  background: window.TONE[activeColor.tone].bg,
                  opacity: step === 3 ? 0.92 : 0.55,
                  mixBlendMode: "multiply",
                  transition: "all var(--dur-3) var(--ease)",
                  clipPath: p.category === "biquini"
                    ? "polygon(10% 0, 90% 0, 85% 30%, 70% 45%, 30% 45%, 15% 30%)"
                    : "polygon(10% 0, 90% 0, 95% 100%, 5% 100%)",
                }}/>
              )}
              {processing && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.7)" }}>
                  <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Renderizando <span className="blink">_</span>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div style={{ position: "absolute", top: 12, left: 12, background: "white", padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <I.Sparkle size={10}/> Prova virtual · {p.id} · {activeColor.name} · {size}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — controls */}
        <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 24, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="eyebrow">Prova virtual · passo {step}/3</div>
            <button onClick={onClose}><I.X/></button>
          </div>
          <h2 className="display" style={{ fontSize: 40, lineHeight: 1 }}>{p.name}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {[1,2,3].map(n => (
              <div key={n} style={{ flex: 1, height: 2, background: step >= n ? "var(--brand-foreground)" : "var(--brand-border)" }}/>
            ))}
          </div>

          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>1. Envie uma foto</h3>
              <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
                Use uma foto de corpo inteiro, boa iluminação, roupa justa.
                A IA ajusta a peça à silhueta, mantém a textura do tecido e respeita o tom de pele.
              </p>
              <ul style={{ listStyle: "none", marginTop: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                <li style={{ display: "flex", gap: 8 }}><I.Check/> As fotos ficam privadas na sua conta</li>
                <li style={{ display: "flex", gap: 8 }}><I.Check/> Descarte em 24h</li>
                <li style={{ display: "flex", gap: 8 }}><I.Check/> Funciona com qualquer peça do mostruário</li>
              </ul>
              <Btn variant="primary" size="lg" style={{ marginTop: 24, width: "100%" }}
                onClick={() => fileRef.current?.click()} icon={<I.Upload/>}>
                Escolher foto
              </Btn>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Trocar cor ao vivo</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {p.colors.map(c => (
                    <button key={c.id} onClick={() => setActiveColorId(c.id)} style={{
                      padding: "8px 12px", display: "inline-flex", gap: 8, alignItems: "center",
                      border: "1px solid " + (activeColorId === c.id ? "var(--brand-foreground)" : "var(--brand-border)"),
                      fontSize: 12,
                    }}>
                      <span style={{ width: 14, height: 14, background: window.TONE[c.tone].bg, borderRadius: 999 }}/>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Tamanho</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${p.sizes.length}, 1fr)`, gap: 4 }}>
                  {p.sizes.map(s => (
                    <button key={s} onClick={() => setSize(s)} style={{
                      padding: "10px", border: "1px solid " + (size === s ? "var(--brand-foreground)" : "var(--brand-border)"),
                      background: size === s ? "var(--brand-foreground)" : "white", color: size === s ? "white" : "inherit",
                      fontFamily: "var(--font-mono)", fontSize: 12,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
              <div style={{ background: "var(--brand-surface)", padding: 16, fontSize: 12, color: "var(--brand-muted)" }}>
                Altura estimada 1,68m · modelagem serve em M · caimento solto no quadril
              </div>
              <Btn variant="primary" size="lg" onClick={onGenerate} icon={<I.Sparkle/>}>
                Gerar prova virtual
              </Btn>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>Pronto.</h3>
              <p style={{ fontSize: 13, color: "var(--brand-muted)", lineHeight: 1.55 }}>
                Você pode salvar, trocar cor/tamanho sem refazer, ou mandar direto pela sua cliente no WhatsApp com o link de compra.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
                <Btn variant="primary" icon={<I.Whats/>}>Enviar para cliente</Btn>
                <Btn variant="outline">Salvar</Btn>
                <Btn variant="ghost" onClick={() => setStep(2)}>Ajustar</Btn>
              </div>
              <div style={{ marginTop: 32, padding: 16, background: "var(--brand-foreground)", color: "white" }}>
                <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Taxa de conversão desta loja</div>
                <div style={{ display: "flex", gap: 24 }}>
                  <div><div className="display" style={{ fontSize: 36 }}>3.2×</div><div style={{ fontSize: 11, opacity: 0.6 }}>mais pedidos após a prova</div></div>
                  <div><div className="display" style={{ fontSize: 36 }}>−42%</div><div style={{ fontSize: 11, opacity: 0.6 }}>em trocas</div></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Product });
